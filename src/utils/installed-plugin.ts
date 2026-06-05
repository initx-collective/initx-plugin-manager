import type { InstalledPlugin } from '../types/installed-plugin'
import { pluginSystem } from '@initx-plugin/core'

const PLUGIN_NAME_REGEX = /^@initx-plugin\/|^initx-plugin-/
const EXCLUDE_REGEX = /@initx-plugin\/(?:core|utils)$/

export function isListedPlugin(name: string) {
  return PLUGIN_NAME_REGEX.test(name) && !EXCLUDE_REGEX.test(name)
}

export async function listInstalledPlugins(): Promise<InstalledPlugin[]> {
  const plugins = await pluginSystem.list()
  return plugins
    .filter(({ name }) => isListedPlugin(name))
    .map(({ name, packageInfo, plugin }) => ({
      name,
      package: packageInfo as InstalledPlugin['package'],
      plugin
    }))
}

export function formatPackageAuthor(author: unknown) {
  if (!author) {
    return '-'
  }

  if (typeof author === 'string') {
    return author
  }

  if (typeof author === 'object' && author !== null && 'name' in author) {
    const name = (author as { name?: unknown }).name
    return typeof name === 'string' ? name : '-'
  }

  return '-'
}
