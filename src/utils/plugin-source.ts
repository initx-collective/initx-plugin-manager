import { AddSource } from '../add/local'
import { hasLocalSource } from './local-source'
import { hasRepositorySourceByPlugin } from './repository-source'

export async function detectPluginSource(pluginName: string) {
  if (await hasRepositorySourceByPlugin(pluginName)) {
    return AddSource.Repository
  }

  if (await hasLocalSource(pluginName)) {
    return AddSource.Local
  }

  return AddSource.Registry
}
