import { PLUGIN_DIR, pluginSystem } from '@initx-plugin/core'
import { logger } from '@initx-plugin/utils'
import fs from 'fs-extra'
import { resolve } from 'pathe'
import { isInitxPlugin, nameColor } from '../utils'
import { consumeLocalSource, setLocalSource } from '../utils/local-source'
import { consumeRepositorySource } from '../utils/repository-source'

type AddSource = 'local' | 'repository' | 'registry'

const BACKSLASH_REGEX = /\\/g

async function normalizePluginCacheAfterDirectoryInstall(directory: string, packageName: string) {
  const cachePath = resolve(PLUGIN_DIR, '.plugins.json')
  if (!await fs.pathExists(cachePath)) {
    return
  }

  const cache = await fs.readJSON(cachePath) as Record<string, any>
  const pluginPackagePath = resolve(PLUGIN_DIR, 'node_modules', packageName, 'package.json')
  if (!await fs.pathExists(pluginPackagePath)) {
    return
  }

  const pluginPackage = await fs.readJSON(pluginPackagePath) as {
    version?: string
    description?: string
  }

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
  await fs.writeJSON(cachePath, cache)
}

export async function addFromDirectory(directory: string, source: AddSource = 'local') {
  const packageJsonPath = resolve(directory, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    logger.error('Is not a valid plugin directory')
    return
  }

  const packageJson = fs.readJSONSync(packageJsonPath)

  if (!packageJson.name || !isInitxPlugin(packageJson.name)) {
    logger.error('Is not a valid plugin name')
    return undefined
  }

  await pluginSystem.install(directory)
  await normalizePluginCacheAfterDirectoryInstall(directory, packageJson.name)

  if (source === 'local') {
    const previousRepositoryDirectory = await consumeRepositorySource(packageJson.name)
    if (previousRepositoryDirectory) {
      await fs.remove(previousRepositoryDirectory)
    }

    await setLocalSource(packageJson.name, directory)
  }
  else {
    await consumeLocalSource(packageJson.name)
  }

  logger.success(`Plugin ${nameColor(packageJson.name)} installed`)
  return packageJson.name as string
}
