import type { InitxContext } from '@initx-plugin/core'
import type { NeedUpdatePlugin } from './types'
import { pluginSystem } from '@initx-plugin/core'
import { inquirer, loadingFunction, log } from '@initx-plugin/utils'
import columnify from 'columnify'
import { pathExists, readJSON } from 'fs-extra'
import { join } from 'pathe'
import { dim, gray } from 'picocolors'
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
    log.success('All plugins are up to date')
    return
  }

  log.info('Need update plugins:')
  // eslint-disable-next-line no-console
  console.log(columnify(needUpdatePlugins.map(({ name, version, target, isDev }) => ({
    name: nameColor(name),
    version: dim(gray(`${isDev ? '[dev] ' : ''}${version}`)),
    target
  }))))

  const confirm = await inquirer.confirm('Do you want to update these plugins?')
  if (!confirm) {
    log.warn('Update canceled')
    return
  }

  const displayNames = needUpdatePlugins.map(({ name, target }) => `${nameColor(name)}${dim(gray(`@${target}`))}`).join(' ')

  await loadingFunction(`Updating ${displayNames}`, () => Promise.all([
    ...needUpdatePlugins.map(({ name, target }) => pluginSystem.update(name, target))
  ]))

  log.success(`Plugins updated: ${displayNames}`)
}

async function updateCorePackages() {
  const plugins = await searchPlugin([
    '@initx-plugin/core',
    '@initx-plugin/utils'
  ])

  for (const plugin of plugins) {
    const targetPath = join('node_modules', plugin.name, 'package.json')

    if (await pathExists(targetPath)) {
      const target = await readJSON(targetPath, 'utf-8')

      if (target.version === plugin.version) {
        continue
      }

      await pluginSystem.update(plugin.name, plugin.version)
    }
  }
}
