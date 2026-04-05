import process from 'node:process'
import { c, inquirer, loadingFunction, logger } from '@initx-plugin/utils'
import fs from 'fs-extra'
import { resolveCommand } from 'package-manager-detector/commands'
import { detect } from 'package-manager-detector/detect'
import { resolve } from 'pathe'
import { runStageCommand } from 'stagetty'
import { createRepositorySourceDirectory, hasRepositorySource, setRepositorySource } from '../utils/repository-source'
import { addFromDirectory } from './local'

const GIT_PROTOCOL_REGEX = /^(?:https?:\/\/|ssh:\/\/|git:\/\/)/i
const GIT_SEMVER_TAG_REGEX = /^refs\/tags\/(v\d+\.\d+\.\d+)$/
const WHITESPACE_REGEX = /\s+/

interface SemverTagInfo {
  ref: string
  tag: string
  version: [major: number, minor: number, patch: number]
}

export async function addFromRepository(gitUrl: string) {
  const sourceDir = await loadingFunction(
    'Preparing repository workspace',
    () => createRepositorySourceDirectory(gitUrl)
  )
  let keepSourceDir = false

  try {
    const latestTag = await loadingFunction(
      'Resolving repository version',
      () => findLatestSemverTag(gitUrl)
    )
    const cloneArgs = latestTag
      ? ['clone', '--branch', latestTag.tag, '--depth', '1', gitUrl, sourceDir]
      : ['clone', '--depth', '1', gitUrl, sourceDir]

    if (!latestTag) {
      logger.warn('No semver tag matching v*.*.* was found, installing the latest commit from the default branch')
    }

    await runStageCommand(
      latestTag ? `Cloning plugin repository at ${latestTag.tag}` : 'Cloning plugin repository',
      'git',
      cloneArgs
    )

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

async function findLatestSemverTag(gitUrl: string) {
  try {
    const output = await runGitCommand(['ls-remote', '--tags', '--refs', gitUrl])
    const tags = output
      .split(/\r?\n/g)
      .map(parseSemverTag)
      .filter((tag): tag is SemverTagInfo => Boolean(tag))

    if (tags.length === 0) {
      return undefined
    }

    tags.sort(compareSemverTagDesc)
    return tags[0]
  }
  catch {
    return undefined
  }
}

async function runGitCommand(args: string[]) {
  const result = await c('git', args)
  if (!result.success) {
    throw new Error(result.content)
  }

  return result.content.trim()
}

function parseSemverTag(line: string) {
  const ref = line.trim().split(WHITESPACE_REGEX).at(-1)
  if (!ref) {
    return undefined
  }

  const matched = ref.match(GIT_SEMVER_TAG_REGEX)
  if (!matched) {
    return undefined
  }

  const [, tag] = matched
  const version = tag.slice(1).split('.').map(Number)
  if (version.length !== 3 || version.some(Number.isNaN)) {
    return undefined
  }

  return {
    ref,
    tag,
    version: [version[0], version[1], version[2]]
  } satisfies SemverTagInfo
}

function compareSemverTagDesc(a: SemverTagInfo, b: SemverTagInfo) {
  return (
    b.version[0] - a.version[0]
    || b.version[1] - a.version[1]
    || b.version[2] - a.version[2]
  )
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
