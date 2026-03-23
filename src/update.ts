import type { InitxContext } from '@initx-plugin/core'
import type { NeedUpdatePlugin } from './types'
import { PLUGIN_DIR, pluginSystem } from '@initx-plugin/core'
import { c, inquirer, loadingFunction, logger, useColors } from '@initx-plugin/utils'
import columnify from 'columnify'
import { nameColor, searchPlugin } from './utils'

export async function updatePlugin(options: InitxContext['cliOptions']) {
  await loadingFunction('Updating core packages', updateCorePackages)

  const includeDev = options.dev || false
  const plugins = await loadingFunction('Fetching plugins', () => pluginSystem.list())
  const filteredPlugins = plugins.filter(plugin => includeDev || !plugin.isLocal)
  const pluginNames = filteredPlugins.map(plugin => plugin.name)
  const searchPluginsInfo = await loadingFunction('Checking plugins', () => searchPlugin(pluginNames))

  const needUpdatePlugins: NeedUpdatePlugin[] = []

  filteredPlugins.forEach((plugin) => {
    const pluginInfo = searchPluginsInfo.find(info => info.name === plugin.name)
    if (!pluginInfo)
      return

    // local development plugin
    if (plugin.isLocal && includeDev) {
      needUpdatePlugins.push({
        name: plugin.name,
        version: plugin.version,
        target: pluginInfo.version,
        isDev: true
      })
      return
    }

    if (plugin.isLocal && !includeDev)
      return

    if (plugin.version === pluginInfo.version)
      return

    needUpdatePlugins.push({
      name: plugin.name,
      version: plugin.version,
      target: pluginInfo.version,
      isDev: false
    })
  })

  if (needUpdatePlugins.length === 0) {
    logger.success('All plugins are up to date')
    return
  }

  logger.info('Need update plugins:')
  // eslint-disable-next-line no-console
  console.log(columnify(needUpdatePlugins.map(({ name, version, target, isDev }) => ({
    name: nameColor(name),
    version: useColors(`${isDev ? '[dev] ' : ''}${version}`).dim().gray().toString(),
    target
  }))))

  const confirm = await inquirer.confirm('Do you want to update these plugins?')
  if (!confirm) {
    logger.warn('Update canceled')
    return
  }

  const displayNames = needUpdatePlugins.map(({ name, target }) => `${nameColor(name)}${useColors(`@${target}`).dim().gray().toString()}`).join(' ')

  await loadingFunction(`Updating ${displayNames}`, () => Promise.all([
    ...needUpdatePlugins.map(({ name, target }) => pluginSystem.update(name, target))
  ]))

  logger.success(`Plugins updated: ${displayNames}`)
}

async function updateCorePackages() {
  await c('npm', ['install', '@initx-plugin/core', '@initx-plugin/utils', '--prefix', PLUGIN_DIR])
}
