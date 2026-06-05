import type { PluginPackageJson } from '../types/package-json'
import type { PluginCache } from '../types/plugin-cache'
import { PLUGIN_DIR, pluginSystem } from '@initx-plugin/core'
import { loadingFunction, logger } from '@initx-plugin/utils'
import { resolve } from 'pathe'
import { isInitxPlugin, nameColor } from '../utils'
import { pathExists, pathExistsSync, readJson, readJsonSync, remove, writeJson } from '../utils/fs'
import { consumeLocalSource, setLocalSource } from '../utils/local-source'
import { consumeRepositorySource } from '../utils/repository-source'

export enum AddSource {
  Local = 'local',
  Registry = 'registry',
  Repository = 'repository'
}

const BACKSLASH_REGEX = /\\/g

async function normalizePluginCacheAfterDirectoryInstall(directory: string, packageName: string) {
  const cachePath = resolve(PLUGIN_DIR, '.plugins.json')
  if (!await pathExists(cachePath)) {
    return
  }

  const cache = await readJson<PluginCache>(cachePath)
  const pluginPackagePath = resolve(PLUGIN_DIR, 'node_modules', packageName, 'package.json')
  if (!await pathExists(pluginPackagePath)) {
    return
  }

  const pluginPackage = await readJson<PluginPackageJson>(pluginPackagePath)

  const normalizedEntry = {
    version: pluginPackage.version || '',
    resolved: '',
    overridden: false,
    description: pluginPackage.description || ''
  }

  const absoluteDir = resolve(directory)
  const variantKeys = new Set<string>([
    directory,
    absoluteDir,
    directory.replace(BACKSLASH_REGEX, '/'),
    absoluteDir.replace(BACKSLASH_REGEX, '/'),
    `file:${directory}`,
    `file:${absoluteDir}`,
    `file:${directory.replace(BACKSLASH_REGEX, '/')}`,
    `file:${absoluteDir.replace(BACKSLASH_REGEX, '/')}`
  ])

  for (const key of Object.keys(cache)) {
    if (variantKeys.has(key)) {
      delete cache[key]
    }
  }

  cache[packageName] = normalizedEntry
  await writeJson(cachePath, cache)
}

export async function addFromDirectory(directory: string, source: AddSource = AddSource.Local) {
  const packageJsonPath = resolve(directory, 'package.json')

  if (!pathExistsSync(packageJsonPath)) {
    logger.error('Is not a valid plugin directory')
    return
  }

  const packageJson = readJsonSync<PluginPackageJson>(packageJsonPath)

  if (!packageJson.name || !isInitxPlugin(packageJson.name)) {
    logger.error('Is not a valid plugin name')
    return undefined
  }

  await loadingFunction('Installing plugin', () => pluginSystem.install(directory))
  await normalizePluginCacheAfterDirectoryInstall(directory, packageJson.name)

  if (source === AddSource.Local) {
    const previousRepositoryDirectory = await consumeRepositorySource(packageJson.name)
    if (previousRepositoryDirectory) {
      await remove(previousRepositoryDirectory)
    }

    await setLocalSource(packageJson.name, directory)
  }
  else {
    await consumeLocalSource(packageJson.name)
  }

  logger.success(`Plugin ${nameColor(packageJson.name)} installed`)
  return packageJson.name as string
}
