import type { NeedUpdatePlugin } from './types'
import path from 'node:path'

import { fetchPlugins } from '@initx-plugin/core'
import { c, inquirer, loadingFunction, log } from '@initx-plugin/utils'
import fs from 'fs-extra'

import { dim, gray } from 'picocolors'
import { nameColor, searchPlugin } from './utils'

export async function updatePlugin() {
  const [excludedPlugins, fetchedPlugins] = await loadingFunction(
    'Fetching plugins',
    () => Promise.all([
      fetchExcludedPlugins(),
      fetchPlugins()
    ])
  )

  const pluginNames: string[] = []
  const pluginRootMap: Record<string, string> = fetchedPlugins.reduce((acc, { name, root }) => {
    if (excludedPlugins.includes(name)) {
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

    if (!pluginInfo || packageInfo.version === pluginInfo.version) {
      return
    }

    needUpdatePlugins.push({
      name,
      version: packageInfo.version,
      target: pluginInfo.version
    })
  })

  if (needUpdatePlugins.length === 0) {
    log.success('All plugins are up to date')
    return
  }

  log.info('Need update plugins:')
  needUpdatePlugins.forEach(({ name, version, target }) => {
    // eslint-disable-next-line no-console
    console.log(`${nameColor(name)}\t${dim(gray(`${version}\t->`))} ${target}`)
  })

  const confirm = await inquirer.confirm('Do you want to update these plugins?')

  if (!confirm) {
    log.warn('Update canceled')
    return
  }

  const displayNames = needUpdatePlugins.map(({ name, target }) => `${nameColor(name)}${dim(gray(`@${target}`))}`).join(' ')

  await loadingFunction(
    `Updating ${displayNames}`,
    () => c('npm', ['install', '-g', ...needUpdatePlugins.map(({ name, target }) => `${name}@${target}`)])
  )

  log.success(`Plugins updated: ${displayNames}`)
}

async function fetchExcludedPlugins() {
  const npmListResult = await c('npm', ['list', '-g', '--depth=0'])

  // Exclude locally installed development plugins
  const excludedPlugins: string[] = []
  npmListResult.content.split(/\r?\n/).forEach((line) => {
    const metched = /(?:@initx-plugin\/|initx-plugin-)[^@]+/.exec(line)

    if (metched && line.includes('->')) {
      excludedPlugins.push(metched[0])
    }
  })

  return excludedPlugins
}
