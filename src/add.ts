import type { PluginInfo } from './types'
import { cwd } from 'node:process'
import { withPluginPrefix } from '@initx-plugin/core'
import { c, inquirer, loadingFunction, log } from '@initx-plugin/utils'
import { existsSync, readJSONSync } from 'fs-extra'
import { resolve } from 'pathe'
import { dim, gray, green, reset } from 'picocolors'
import { communityName, isCompleteMatchName, isInitxPlugin, isInstalledPlugin, nameColor, officialName, searchPlugin } from './utils'

export async function addPlugin(targetPlugin: string) {
  if (targetPlugin === '.') {
    await addCurrentDirectoryPlugin()
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
      log.warn('Installation canceled')
      return
    }
  }

  // install plugin
  const installResult = await loadingFunction('Installing plugin', () => installPlugin(pluginInfo.name))

  if (!installResult.success) {
    log.error(`Failed to install plugin ${nameColor(pluginInfo.name)}`)
    // eslint-disable-next-line no-console
    console.log(installResult.content)
    return
  }

  log.success(`Plugin ${nameColor(pluginInfo.name)} installed`)
}

async function addCurrentDirectoryPlugin() {
  const packageJsonPath = resolve(cwd(), 'package.json')

  if (!existsSync(packageJsonPath)) {
    log.error('Is not a valid plugin directory')
    return
  }

  const packageJson = readJSONSync(packageJsonPath)

  if (!packageJson.name || !isInitxPlugin(packageJson.name)) {
    log.error('Is not a valid plugin name')
    return
  }

  await c('npm', withPluginPrefix(['install', '.', '--silent']))

  log.success(`Plugin ${nameColor(packageJson.name)} installed`)
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
  return c('npm', withPluginPrefix(['install', name, '--silent']))
}

async function displayInfo({ name, version, description }: PluginInfo, hasTab = false) {
  const isInstalled = await isInstalledPlugin(name)

  const spaceChar = hasTab ? '\t' : ' '

  const display = {
    name: nameColor(name),
    version: reset(dim(gray(`@${version}`))),
    description: `${spaceChar}${reset(description)}`,
    installed: isInstalled ? dim(green(' [already]')) : spaceChar
  }

  return `${display.name}${display.version}${display.installed}${display.description}`
}
