import type { PluginPackageJson } from '../types/package-json'
import { pluginSystem } from '@initx-plugin/core'
import { loadingFunction, logger } from '@initx-plugin/utils'
import { resolve } from 'pathe'
import { isInitxPlugin, nameColor } from '../utils'
import { pathExistsSync, readJsonSync, remove } from '../utils/fs'
import { consumeLocalSource, setLocalSource } from '../utils/local-source'
import { consumeRepositorySource } from '../utils/repository-source'

export enum AddSource {
  Local = 'local',
  Registry = 'registry',
  Repository = 'repository'
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
