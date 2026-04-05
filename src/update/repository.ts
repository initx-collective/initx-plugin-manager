import type { NeedUpdatePlugin } from '../types'
import type { InstalledPlugins } from './shared'
import { logger } from '@initx-plugin/utils'
import fs from 'fs-extra'
import { resolve } from 'pathe'
import { runStageCommand } from 'stagetty'
import { AddSource } from '../add/local'
import { findLatestSemverTag } from '../add/repository/git-version'
import { buildAndRegisterRepositoryPlugin } from '../add/repository/install'
import { nameColor } from '../utils'
import { getRepositorySource } from '../utils/repository-source'

export async function collectRepositoryUpdates(plugins: InstalledPlugins): Promise<NeedUpdatePlugin[]> {
  const updates: NeedUpdatePlugin[] = []

  for (const plugin of plugins) {
    const sourceDir = await getRepositorySource(plugin.name)
    if (!sourceDir) {
      logger.warn(getMissingRepositoryUpdateMessage(plugin.name, 'check'))
      continue
    }

    const repositoryUrl = await getRepositoryUrl(sourceDir)
    if (!repositoryUrl) {
      logger.warn(`Repository URL was not found for ${plugin.name}, skipping update check`)
      continue
    }

    const latestTag = await findLatestSemverTag(repositoryUrl)
    if (!latestTag) {
      continue
    }

    const targetVersion = latestTag.tag.slice(1)
    if (plugin.version === targetVersion) {
      continue
    }

    updates.push({
      name: plugin.name,
      source: AddSource.Repository,
      version: plugin.version,
      target: targetVersion
    })
  }

  return updates
}

export async function updateRepositoryPlugin(update: NeedUpdatePlugin) {
  const sourceDir = await getRepositorySource(update.name)
  if (!sourceDir) {
    return false
  }

  const targetTag = `v${update.target}`

  await runStageCommand(
    `Fetching tags for ${update.name}`,
    'git',
    ['fetch', '--tags', '--force', 'origin'],
    { cwd: sourceDir }
  )

  await runStageCommand(
    `Checking out ${targetTag}`,
    'git',
    ['checkout', targetTag],
    { cwd: sourceDir }
  )

  const pluginName = await buildAndRegisterRepositoryPlugin(sourceDir)
  if (!pluginName) {
    return false
  }

  return true
}

export async function getRepositoryUrl(sourceDir: string) {
  const packageJsonPath = resolve(sourceDir, 'package.json')
  if (!await fs.pathExists(packageJsonPath)) {
    return undefined
  }

  const packageJson = await fs.readJSON(packageJsonPath) as {
    repository?: string | { url?: string }
  }

  if (typeof packageJson.repository === 'string') {
    return packageJson.repository
  }

  return packageJson.repository?.url
}

export function getMissingRepositoryUpdateMessage(pluginName: string, stage: 'check' | 'update') {
  return `Repository source was not found for ${nameColor(pluginName)}, skipping update ${stage}`
}
