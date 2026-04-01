import type { PluginInfo } from '../types'
import process from 'node:process'
import { pluginSystem } from '@initx-plugin/core'
import { inquirer, loadingFunction, logger, useColors } from '@initx-plugin/utils'
import { communityName, isCompleteMatchName, isInitxPlugin, isInstalledPlugin, nameColor, officialName, searchPlugin } from '../utils'

export async function addFromRegistry(targetPlugin: string, cliOptions: Record<string, any> = {}) {
  if (cliOptions.raw) {
    try {
      await loadingFunction('Installing plugin', () => installPlugin(targetPlugin))
      logger.success(`Plugin ${nameColor(targetPlugin)} installed`)
    }
    catch (error) {
      logger.error(`Failed to install plugin ${nameColor(targetPlugin)}`)
      logger.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }

    return
  }

  const availablePlugins = await loadingFunction('Searching plugin', () => searchAvailablePlugins(targetPlugin))

  if (availablePlugins.length === 0) {
    logger.error(`Plugin ${nameColor(officialName(targetPlugin))} or ${nameColor(communityName(targetPlugin))} not found`)
    return
  }

  let index = 0
  let needConfirm = true

  if (availablePlugins.length === 2) {
    const displayContnet: string[] = []

    for (const plugin of availablePlugins) {
      displayContnet.push(await displayInfo(plugin, true))
    }

    index = await inquirer.select(
      'Which plugin do you want to install?',
      displayContnet
    )

    needConfirm = false
  }

  const pluginInfo: PluginInfo = {
    name: availablePlugins[index].name,
    version: availablePlugins[index].version,
    description: availablePlugins[index].description
  }

  if (needConfirm) {
    const confirm = await inquirer.confirm(
      `Do you want to install ${await displayInfo(pluginInfo)} ?`
    )

    if (!confirm) {
      logger.warn('Installation canceled')
      return
    }
  }

  try {
    await loadingFunction('Installing plugin', () => installPlugin(pluginInfo.name))
  }
  catch {
    logger.error(`Failed to install plugin ${nameColor(pluginInfo.name)}`)
    return
  }

  logger.success(`Plugin ${nameColor(pluginInfo.name)} installed`)
}

async function searchAvailablePlugins(targetPlugin: string) {
  const searchPluginNames = [
    officialName(targetPlugin),
    communityName(targetPlugin)
  ]

  const searchResults = await searchPlugin(searchPluginNames)

  const availablePlugins = searchResults?.filter(
    (plugin: any) => isInitxPlugin(plugin.name) && isCompleteMatchName(targetPlugin, plugin.name)
  )

  return availablePlugins
}

async function installPlugin(name: string) {
  await pluginSystem.install(name)
}

async function displayInfo({ name, version, description }: PluginInfo, hasTab = false) {
  const isInstalled = await isInstalledPlugin(name)
  const spaceChar = hasTab ? '\t' : ' '

  const display = {
    name: nameColor(name),
    version: useColors(`@${version}`).dim().gray().toString(),
    description: `${spaceChar}${description}`,
    installed: isInstalled ? useColors(' [already]').dim().green().toString() : spaceChar
  }

  return `${display.name}${display.version}${display.installed}${display.description}`
}
