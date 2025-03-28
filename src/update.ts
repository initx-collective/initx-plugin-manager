import type { InitxContext } from '@initx-plugin/core'
import type { NeedUpdatePlugin } from './types'
import path from 'node:path'
import { fetchPlugins, withPluginPrefix } from '@initx-plugin/core'
import { c, inquirer, loadingFunction, log } from '@initx-plugin/utils'
import columnify from 'columnify'
import fs from 'fs-extra'
import { dim, gray } from 'picocolors'
import { nameColor, searchPlugin } from './utils'

export async function updatePlugin(options: InitxContext['cliOptions']) {
  const includeDev = options.dev || false

  const [developmentPlugins, fetchedPlugins] = await loadingFunction(
    'Fetching plugins',
    () => Promise.all([
      fetchDevelopmentPlugins(),
      fetchPlugins()
    ])
  )

  const pluginNames: string[] = []
  const pluginRootMap: Record<string, string> = fetchedPlugins.reduce((acc, { name, root }) => {
    if (!includeDev && developmentPlugins.includes(name)) {
      return acc
    }

    pluginNames.push(name)
    acc[name] = root
    return acc
  }, {} as Record<string, string>)

  const searchPluginsInfo = await loadingFunction('Checking plugins', () => searchPlugin(pluginNames))

  const needUpdatePlugins: NeedUpdatePlugin[] = []

  Object.keys(pluginRootMap).forEach((name) => {
    const packageInfo = fs.readJsonSync(path.join(pluginRootMap[name], 'package.json'))
    const pluginInfo = searchPluginsInfo.find(plugin => plugin.name === name)

    if (!pluginInfo) {
      return
    }

    const isDevelopmentPlugin = developmentPlugins.includes(name)
    const condition = isDevelopmentPlugin
      ? !includeDev
      : packageInfo.version === pluginInfo.version

    if (condition) {
      return
    }

    needUpdatePlugins.push({
      name,
      version: packageInfo.version,
      target: pluginInfo.version,
      isDev: isDevelopmentPlugin
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

  await loadingFunction(
    `Updating ${displayNames}`,
    () => c(
      'npm',
      withPluginPrefix(
        [
          'install',
          ...needUpdatePlugins.map(({ name, target }) => `${name}@${target}`)
        ]
      )
    )
  )

  log.success(`Plugins updated: ${displayNames}`)
}

async function fetchDevelopmentPlugins() {
  const npmListResult = await c('npm', withPluginPrefix(['list']))

  // locally installed development plugins
  const pluginNames: string[] = []
  npmListResult.content.split(/\r?\n/).forEach((line) => {
    const metched = /(?:@initx-plugin\/|initx-plugin-)[^@]+/.exec(line)

    if (metched && line.includes('->')) {
      pluginNames.push(metched[0])
    }
  })

  return pluginNames
}
