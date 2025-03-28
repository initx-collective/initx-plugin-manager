import type { PluginInfo } from './types'
import { fetchPlugins, PLUGIN_DIR } from '@initx-plugin/core'

import { c } from '@initx-plugin/utils'

import { blue, green } from 'picocolors'

const installedPluginInfo = {
  once: false,
  names: [] as string[]
}

export const officialName = (targetName: string) => `@initx-plugin/${targetName}`
export const communityName = (targetName: string) => `initx-plugin-${targetName}`

export function isInitxPlugin(name: string) {
  return /^@initx-plugin\/|^initx-plugin-/.test(name)
}

export function isCompleteMatchName(targetName: string, searchedName: string) {
  return officialName(targetName) === searchedName || communityName(targetName) === searchedName
}

export function nameColor(name: string) {
  if (/^@initx-plugin\//.test(name)) {
    return green(name)
  }

  return blue(name)
}

export async function getInstalledPluginNames() {
  if (installedPluginInfo.once) {
    return installedPluginInfo.names
  }

  const fetchedPlugins = await fetchPlugins()

  installedPluginInfo.names = fetchedPlugins.map(({ name }) => name)
  installedPluginInfo.once = true

  return installedPluginInfo.names
}

export async function isInstalledPlugin(name: string) {
  const installedPluginNames = await getInstalledPluginNames()
  return installedPluginNames.includes(name)
}

export async function searchPlugin(pluginNames: string[]): Promise<PluginInfo[]> {
  const plugins: PluginInfo[] = []
  const finedNames: string[] = []

  for (const name of pluginNames) {
    const result = await c('npm', ['search', '--json', name])

    if (!result.success) {
      continue
    }

    try {
      const json = JSON.parse(result.content)

      json.forEach((plugin: Record<string, any>) => {
        if (finedNames.includes(plugin.name)) {
          return
        }

        finedNames.push(plugin.name)

        plugins.push({
          name: plugin.name,
          version: plugin.version,
          description: plugin.description
        })
      })
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (e) {
      return []
    }
  }

  return plugins
}

export function withPrefix(commands: string[]) {
  commands.push('--prefix', PLUGIN_DIR)
  return commands
}
