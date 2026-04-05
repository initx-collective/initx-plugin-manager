import type { NeedUpdatePlugin } from '../types'
import type { InstalledPlugins } from './shared'
import { loadingFunction } from '@initx-plugin/utils'
import { AddSource } from '../add/local'
import { searchPlugin } from '../utils'
import { detectPluginSource } from '../utils/plugin-source'
import { collectRepositoryUpdates } from './repository'

export async function collectNeedUpdatePlugins(plugins: InstalledPlugins) {
  const sourceEntries = await Promise.all(plugins.map(async plugin => ({
    plugin,
    source: await detectPluginSource(plugin.name)
  })))

  const registryUpdates = await collectRegistryUpdates(
    sourceEntries
      .filter(({ source }) => source === AddSource.Registry)
      .map(({ plugin }) => plugin)
  )

  const repositoryPlugins = sourceEntries
    .filter(({ source }) => source === AddSource.Repository)
    .map(({ plugin }) => plugin)

  const repositoryUpdates = await loadingFunction(
    'Checking repository plugins',
    () => collectRepositoryUpdates(repositoryPlugins)
  )

  return [
    ...registryUpdates,
    ...repositoryUpdates
  ]
}

export async function getLocalPluginNames(plugins: InstalledPlugins) {
  const sourceEntries = await Promise.all(plugins.map(async plugin => ({
    name: plugin.name,
    source: await detectPluginSource(plugin.name)
  })))

  return sourceEntries
    .filter(({ source }) => source === AddSource.Local)
    .map(({ name }) => name)
}

async function collectRegistryUpdates(plugins: InstalledPlugins): Promise<NeedUpdatePlugin[]> {
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
