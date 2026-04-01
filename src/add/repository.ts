import process from 'node:process'
import { inquirer, loadingFunction, logger } from '@initx-plugin/utils'
import fs from 'fs-extra'
import { resolveCommand } from 'package-manager-detector/commands'
import { detect } from 'package-manager-detector/detect'
import { resolve } from 'pathe'
import { runStageCommand } from 'stagetty'
import { createRepositorySourceDirectory, hasRepositorySource, setRepositorySource } from '../utils/repository-source'
import { addFromDirectory } from './local'

const GIT_PROTOCOL_REGEX = /^(?:https?:\/\/|ssh:\/\/|git:\/\/)/i

export async function addFromRepository(gitUrl: string) {
  const sourceDir = await createRepositorySourceDirectory(gitUrl)
  let keepSourceDir = false

  try {
    await runStageCommand('Cloning plugin repository', 'git', ['clone', '--depth', '1', gitUrl, sourceDir])

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

    const detectedPm = await detect({ cwd: sourceDir })
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

export function isGitUrl(value: string) {
  const candidate = value.trim()

  if (!candidate) {
    return false
  }

  if (candidate.startsWith('git@')) {
    return candidate.includes(':') && candidate.includes('/')
  }

  const protocolCandidate = candidate.startsWith('git+https://')
    ? candidate.slice(4)
    : candidate.startsWith('git+http://')
      ? candidate.slice(4)
      : candidate

  if (!GIT_PROTOCOL_REGEX.test(protocolCandidate)) {
    return false
  }

  try {
    const parsed = new URL(protocolCandidate)
    return Boolean(parsed.hostname && parsed.pathname && parsed.pathname !== '/')
  }
  catch {
    return false
  }
}
