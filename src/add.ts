import type { PluginInfo } from './types'
import { cwd } from 'node:process'
import { pluginSystem } from '@initx-plugin/core'
import { inquirer, loadingFunction, logger, useColors } from '@initx-plugin/utils'
import fs from 'fs-extra'
import { resolve } from 'pathe'
import { communityName, isCompleteMatchName, isInitxPlugin, isInstalledPlugin, nameColor, officialName, searchPlugin } from './utils'

export async function addPlugin(targetPlugin: string) {
  if (targetPlugin === '.') {
    await addCurrentDirectoryPlugin()
    return
  }

  // search plugin
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

  // install plugin
  try {
    await loadingFunction('Installing plugin', () => installPlugin(pluginInfo.name))
  }
  catch {
    logger.error(`Failed to install plugin ${nameColor(pluginInfo.name)}`)
    return
  }

  logger.success(`Plugin ${nameColor(pluginInfo.name)} installed`)
}

async function addCurrentDirectoryPlugin() {
  const packageJsonPath = resolve(cwd(), 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    logger.error('Is not a valid plugin directory')
    return
  }

  const packageJson = fs.readJSONSync(packageJsonPath)

  if (!packageJson.name || !isInitxPlugin(packageJson.name)) {
    logger.error('Is not a valid plugin name')
    return
  }

  await pluginSystem.install('.')

  logger.success(`Plugin ${nameColor(packageJson.name)} installed`)
}

async function searchAvailablePlugins(targetPlugin: string) {
  // search plugin
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
