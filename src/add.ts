import { fetchPlugins } from '@initx-plugin/core'
import { c, inquirer, log } from '@initx-plugin/utils'

import { dim, gray, reset } from 'picocolors'

import { communityName, existsPlugin, isCompleteMatchName, isInitxPlugin, loadingFunction, nameColor, officialName } from './utils'

interface PluginInfo {
  name: string
  version: string
  description: string
}

export async function addPlugin(targetPlugin: string) {
  const plugins = await fetchPlugins()
  const pluginsName = plugins.map(({ name }) => name)

  if (existsPlugin(pluginsName, targetPlugin)) {
    log.warn(`Plugin ${targetPlugin} already exists`)
    return
  }

  // search plugin
  const availablePlugins = await loadingFunction('Searching plugin', () => searchAvailablePlugins(targetPlugin))

  if (availablePlugins.length === 0) {
    log.error(`Plugin ${nameColor(officialName(targetPlugin))} or ${nameColor(communityName(targetPlugin))} not found`)
    return
  }

  let index = 0
  let needConfirm = true

  if (availablePlugins.length === 2) {
    index = await inquirer.select('Which plugin do you want to install?', availablePlugins.map(
      (plugin: any) => displayInfo({
        name: plugin.name,
        version: plugin.version,
        description: plugin.description
      })
    ))
    needConfirm = false
  }

  const {
    name,
    version,
    description
  } = availablePlugins[index]

  if (needConfirm) {
    const confirm = await inquirer.confirm(`Do you want to install ${displayInfo({
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

export async function searchAvailablePlugins(targetPlugin: string) {
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

export async function installPlugin(name: string) {
  return c('npm', ['install', '-g', name])
}

function displayInfo({ name, version, description }: PluginInfo) {
  return `${nameColor(name)}${reset(dim(gray(`@${version}`)))}\t${description}`
}
