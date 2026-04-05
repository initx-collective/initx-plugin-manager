import type { InitxContext } from '@initx-plugin/core'
import type { NeedUpdatePlugin } from './types'
import { PLUGIN_DIR, pluginSystem } from '@initx-plugin/core'
import { c, inquirer, loadingFunction, logger, useColors } from '@initx-plugin/utils'
import columnify from 'columnify'
import fs from 'fs-extra'
import { resolve } from 'pathe'
import { runStageCommand } from 'stagetty'
import { AddSource } from './add/local'
import { findLatestSemverTag } from './add/repository/git-version'
import { buildAndRegisterRepositoryPlugin } from './add/repository/install'
import { nameColor, searchPlugin } from './utils'
import { detectPluginSource } from './utils/plugin-source'
import { getRepositorySource } from './utils/repository-source'

export async function updatePlugin(options: InitxContext['cliOptions']) {
  await loadingFunction('Updating core packages', updateCorePackages)

  const plugins = await loadingFunction('Fetching plugins', () => pluginSystem.list())
  const needUpdatePlugins = await collectNeedUpdatePlugins(plugins)
  const localPluginNames = await getLocalPluginNames(plugins)

  if (options.dev && localPluginNames.length > 0) {
    logger.warn('Local plugins cannot be updated and were skipped')
  }

  if (needUpdatePlugins.length === 0) {
    if (localPluginNames.length > 0) {
      logger.info(`Skipped local plugins: ${localPluginNames.map(nameColor).join(' ')}`)
    }

    logger.success('All plugins are up to date')
    return
  }

  if (localPluginNames.length > 0) {
    logger.info(`Skipped local plugins: ${localPluginNames.map(nameColor).join(' ')}`)
  }

  logger.info('Need update plugins:')
  // eslint-disable-next-line no-console
  console.log(columnify(needUpdatePlugins.map(({ name, source, version, target }) => ({
    name: nameColor(name),
    source: useColors(source).gray().toString(),
    version: useColors(version).dim().gray().toString(),
    target
  }))))

  const confirm = await inquirer.confirm('Do you want to update these plugins?')
  if (!confirm) {
    logger.warn('Update canceled')
    return
  }

  await applyPluginUpdates(needUpdatePlugins)

  const displayNames = needUpdatePlugins.map(({ name, target }) => `${nameColor(name)}${useColors(`@${target}`).dim().gray().toString()}`).join(' ')
  logger.success(`Plugins updated: ${displayNames}`)
}

async function collectNeedUpdatePlugins(plugins: Awaited<ReturnType<typeof pluginSystem.list>>) {
  const sourceEntries = await Promise.all(plugins.map(async plugin => ({
    plugin,
    source: await detectPluginSource(plugin.name)
  })))

  const registryUpdates = await collectRegistryUpdates(
    sourceEntries
      .filter(({ source }) => source === AddSource.Registry)
      .map(({ plugin }) => plugin)
  )

  const repositoryUpdates = await collectRepositoryUpdates(
    sourceEntries
      .filter(({ source }) => source === AddSource.Repository)
      .map(({ plugin }) => plugin)
  )

  return [
    ...registryUpdates,
    ...repositoryUpdates
  ]
}

async function collectRegistryUpdates(plugins: Awaited<ReturnType<typeof pluginSystem.list>>): Promise<NeedUpdatePlugin[]> {
  if (plugins.length === 0) {
    return []
  }

  const pluginNames = plugins.map(plugin => plugin.name)
  const searchPluginsInfo = await loadingFunction('Checking registry plugins', () => searchPlugin(pluginNames))

  return plugins.flatMap((plugin) => {
    const pluginInfo = searchPluginsInfo.find(info => info.name === plugin.name)
    if (!pluginInfo || plugin.version === pluginInfo.version) {
      return []
    }

    return [{
      name: plugin.name,
      source: AddSource.Registry,
      version: plugin.version,
      target: pluginInfo.version
    }]
  })
}

async function collectRepositoryUpdates(plugins: Awaited<ReturnType<typeof pluginSystem.list>>): Promise<NeedUpdatePlugin[]> {
  const updates: NeedUpdatePlugin[] = []

  for (const plugin of plugins) {
    const sourceDir = await getRepositorySource(plugin.name)
    if (!sourceDir) {
      logger.warn(`Repository source was not found for ${nameColor(plugin.name)}, skipping update check`)
      continue
    }

    const repositoryUrl = await getRepositoryUrl(sourceDir)
    if (!repositoryUrl) {
      logger.warn(`Repository URL was not found for ${nameColor(plugin.name)}, skipping update check`)
      continue
    }

    const latestTag = await loadingFunction(
      `Checking repository updates for ${plugin.name}`,
      () => findLatestSemverTag(repositoryUrl)
    )

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

async function applyPluginUpdates(updates: NeedUpdatePlugin[]) {
  for (const update of updates) {
    if (update.source === AddSource.Registry) {
      await loadingFunction(
        `Updating ${nameColor(update.name)} from registry`,
        () => pluginSystem.update(update.name, update.target)
      )
      continue
    }

    if (update.source === AddSource.Repository) {
      await updateRepositoryPlugin(update)
    }
  }
}

async function updateRepositoryPlugin(update: NeedUpdatePlugin) {
  const sourceDir = await getRepositorySource(update.name)
  if (!sourceDir) {
    logger.warn(`Repository source was not found for ${nameColor(update.name)}, skipping update`)
    return
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

  await buildAndRegisterRepositoryPlugin(sourceDir)
}

async function getRepositoryUrl(sourceDir: string) {
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

async function getLocalPluginNames(plugins: Awaited<ReturnType<typeof pluginSystem.list>>) {
  const sourceEntries = await Promise.all(plugins.map(async plugin => ({
    name: plugin.name,
    source: await detectPluginSource(plugin.name)
  })))

  return sourceEntries
    .filter(({ source }) => source === AddSource.Local)
    .map(({ name }) => name)
}

async function updateCorePackages() {
  await c('npm', ['install', '@initx-plugin/core', '@initx-plugin/utils', '--prefix', PLUGIN_DIR])
}
