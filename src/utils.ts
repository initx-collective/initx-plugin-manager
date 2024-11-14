import { fetchPlugins } from '@initx-plugin/core'
import ora from 'ora'
import { blueBright, greenBright } from 'picocolors'

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
    return greenBright(name)
  }

  return blueBright(name)
}

export function loadingFunction(message: string, fn: () => any) {
  const spinner = ora(message).start()

  return fn().finally(() => {
    spinner.stop()
  })
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
