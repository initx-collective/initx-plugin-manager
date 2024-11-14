import { fetchPlugins } from '@initx-plugin/core'
import { c, inquirer, log } from '@initx-plugin/utils'

import { dim, gray, greenBright, reset } from 'picocolors'

import { communityName, isCompleteMatchName, isInitxPlugin, loadingFunction, nameColor, officialName } from './utils'

interface PluginInfo {
  name: string
  version: string
  description: string
}

const installedPluginInfo = {
  once: false,
  names: [] as string[]
}

export async function addPlugin(targetPlugin: string) {
  // search plugin
  const availablePlugins = await loadingFunction('Searching plugin', () => searchAvailablePlugins(targetPlugin))

  if (availablePlugins.length === 0) {
    log.error(`Plugin ${nameColor(officialName(targetPlugin))} or ${nameColor(communityName(targetPlugin))} not found`)
    return
  }

  let index = 0
  let needConfirm = true

  if (availablePlugins.length === 2) {
    const displayContnet: string[] = []

    for (const plugin of availablePlugins) {
      displayContnet.push(await displayInfo(plugin))
    }

    index = await inquirer.select(
      'Which plugin do you want to install?',
      displayContnet
    )

    needConfirm = false
  }

  const {
    name,
    version,
    description
  } = availablePlugins[index]

  if (needConfirm) {
    const confirm = await inquirer.confirm(`Do you want to install ${await displayInfo({
      name,
      version,
      description
    })} ?`)

    if (!confirm) {
      log.warn('Installation canceled')
      return
    }
  }

  // install plugin
  const installResult = await loadingFunction('Installing plugin', () => installPlugin(name))

  if (!installResult.success) {
    log.error(`Failed to install plugin ${nameColor(name)}`)
    // eslint-disable-next-line no-console
    console.log(installResult.content)
    return
  }

  log.success(`Plugin ${nameColor(name)} installed`)
}

async function searchAvailablePlugins(targetPlugin: string) {
  // search plugin
  const detectePluginName = [
    officialName(targetPlugin),
    communityName(targetPlugin)
  ]

  const searchResults = await c('npm', ['search', '--json', ...detectePluginName])

  let searchResultsJson = []

  try {
    searchResultsJson = JSON.parse(searchResults.content)
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
  catch (e) {
    log.error(`Failed to install plugin ${targetPlugin}`)
    return
  }

  const availablePlugins = searchResultsJson?.filter(
    (plugin: any) => isInitxPlugin(plugin.name) && isCompleteMatchName(targetPlugin, plugin.name)
  )

  return availablePlugins
}

async function installPlugin(name: string) {
  return c('npm', ['install', '-g', name])
}

async function getInstalledPluginNames() {
  if (installedPluginInfo.once) {
    return installedPluginInfo.names
  }

  const fetchedPlugins = await fetchPlugins()

  installedPluginInfo.names = fetchedPlugins.map(({ name }) => name)
  installedPluginInfo.once = true

  return installedPluginInfo.names
}

async function displayInfo({ name, version, description }: PluginInfo) {
  const pluginNames = await getInstalledPluginNames()

  const display = {
    name: nameColor(name),
    version: reset(dim(gray(`@${version}`))),
    description: reset(description),
    installed: pluginNames.includes(name) ? dim(greenBright(' [already]')) : '\t'
  }

  return `${display.name}${display.version}${display.installed}\t${display.description}`
}
