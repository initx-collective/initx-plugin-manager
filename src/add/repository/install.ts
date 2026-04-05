import process from 'node:process'
import { inquirer, loadingFunction, logger } from '@initx-plugin/utils'
import fs from 'fs-extra'
import { resolveCommand } from 'package-manager-detector/commands'
import { detect } from 'package-manager-detector/detect'
import { resolve } from 'pathe'
import { runStageCommand } from 'stagetty'
import { createRepositorySourceDirectory, hasRepositorySource, setRepositorySource } from '../../utils/repository-source'
import { addFromDirectory } from '../local'
import { findLatestSemverTag } from './git-version'

interface RepositoryInstallOptions {
  branch?: string
  commit?: string
  tag?: string
}

export async function addFromRepository(gitUrl: string, cliOptions: RepositoryInstallOptions = {}) {
  const sourceDir = await loadingFunction(
    'Preparing repository workspace',
    () => createRepositorySourceDirectory(gitUrl)
  )
  let keepSourceDir = false

  try {
    const checkoutTarget = await resolveCheckoutTarget(gitUrl, cliOptions)
    const cloneArgs = getCloneArgs(gitUrl, sourceDir, checkoutTarget)

    if (!checkoutTarget) {
      logger.warn('No semver tag matching v*.*.* was found, installing the latest commit from the default branch')
    }

    await runStageCommand(
      checkoutTarget ? `Cloning plugin repository at ${checkoutTarget.label}` : 'Cloning plugin repository',
      'git',
      cloneArgs
    )

    if (checkoutTarget?.type === 'commit') {
      await runStageCommand(
        `Fetching commit ${checkoutTarget.ref}`,
        'git',
        ['fetch', '--depth', '1', 'origin', checkoutTarget.ref],
        { cwd: sourceDir }
      )

      await runStageCommand(
        `Checking out commit ${checkoutTarget.ref}`,
        'git',
        ['checkout', checkoutTarget.ref],
        { cwd: sourceDir }
      )
    }

    const packageJsonPath = resolve(sourceDir, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
      logger.error('The git repository is not a valid plugin package')
      process.exit(1)
    }

    const packageJson = fs.readJSONSync(packageJsonPath)
    if (!packageJson.scripts?.build) {
      logger.error('The plugin package has no build script')
      process.exit(1)
    }

    const detectedPm = await loadingFunction(
      'Detecting package manager',
      () => detect({ cwd: sourceDir })
    )
    if (!detectedPm) {
      logger.error('Could not detect package manager in the plugin repository')
      process.exit(1)
    }

    const installCommand = resolveCommand(detectedPm.agent, 'install', [])
    if (!installCommand) {
      logger.error(`Could not resolve install command for package manager: ${detectedPm.agent}`)
      process.exit(1)
    }

    await runStageCommand(
      `Installing dependencies with ${installCommand.command}`,
      installCommand.command,
      installCommand.args,
      { cwd: sourceDir }
    )

    const buildCommand = resolveCommand(detectedPm.agent, 'run', ['build'])
    if (!buildCommand) {
      logger.error(`Could not resolve build command for package manager: ${detectedPm.agent}`)
      process.exit(1)
    }

    await runStageCommand(
      `Building plugin with ${buildCommand.command}`,
      buildCommand.command,
      buildCommand.args,
      { cwd: sourceDir }
    )

    const pluginName = await loadingFunction('Registering plugin', () => addFromDirectory(sourceDir, 'repository'))
    if (!pluginName) {
      logger.error('Failed to register plugin from repository directory')
      process.exit(1)
    }

    const previousSourceDir = await setRepositorySource(pluginName, sourceDir)
    if (previousSourceDir && previousSourceDir !== sourceDir) {
      await fs.remove(previousSourceDir)
    }

    logger.info(`Repository source directory: ${sourceDir}`)
  }
  catch (error) {
    logger.error(`Failed to install plugin from repository: ${gitUrl}`)
    logger.error(error instanceof Error ? error.message : String(error))

    keepSourceDir = await inquirer.confirm(`Keep repository source directory for debugging? (${sourceDir})`)
    if (keepSourceDir) {
      logger.info(`Repository source directory kept at ${sourceDir}`)
    }

    return
  }
  finally {
    const tracked = await hasRepositorySource(sourceDir)
    if (!keepSourceDir && !tracked) {
      await fs.remove(sourceDir)
    }
  }
}

async function resolveCheckoutTarget(gitUrl: string, cliOptions: RepositoryInstallOptions) {
  const commit = normalizeRef(cliOptions.commit)
  const tag = normalizeRef(cliOptions.tag)
  const branch = normalizeRef(cliOptions.branch)

  const explicitTargets = [
    commit ? `--commit ${commit}` : undefined,
    tag ? `--tag ${tag}` : undefined,
    branch ? `--branch ${branch}` : undefined
  ].filter((target): target is string => Boolean(target))

  if (explicitTargets.length > 1) {
    logger.warn(`Multiple git refs were provided, using ${explicitTargets[0]} and ignoring ${explicitTargets.slice(1).join(', ')}`)
  }

  if (commit) {
    return {
      type: 'commit' as const,
      ref: commit,
      label: `commit ${commit}`
    }
  }

  if (tag) {
    return {
      type: 'tag' as const,
      ref: tag,
      label: `tag ${tag}`
    }
  }

  if (branch) {
    return {
      type: 'branch' as const,
      ref: branch,
      label: `branch ${branch}`
    }
  }

  const latestTag = await loadingFunction(
    'Resolving repository version',
    () => findLatestSemverTag(gitUrl)
  )

  if (!latestTag) {
    return undefined
  }

  return {
    type: 'tag' as const,
    ref: latestTag.tag,
    label: `tag ${latestTag.tag}`
  }
}

function getCloneArgs(gitUrl: string, sourceDir: string, checkoutTarget: Awaited<ReturnType<typeof resolveCheckoutTarget>>) {
  if (!checkoutTarget) {
    return ['clone', '--depth', '1', gitUrl, sourceDir]
  }

  if (checkoutTarget.type === 'commit') {
    return ['clone', '--no-checkout', '--depth', '1', gitUrl, sourceDir]
  }

  return ['clone', '--branch', checkoutTarget.ref, '--depth', '1', gitUrl, sourceDir]
}

function normalizeRef(value: string | undefined) {
  const normalized = value?.trim()
  return normalized || undefined
}
