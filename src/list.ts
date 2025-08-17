import type { PluginInfo } from './types'
import { fetchPlugins } from '@initx-plugin/core'
import { loadingFunction } from '@initx-plugin/utils'
import columnify from 'columnify'
import { gray } from 'picocolors'
import { nameColor } from './utils'

export async function showPluginList() {
  const plugins = await loadingFunction('Fetching plugins', fetchPlugins)

  const displayTable: PluginInfo[] = []

  plugins.forEach((plugin) => {
    displayTable.push({
      name: nameColor(plugin.name),
      version: gray(plugin.version),
      description: gray(plugin.description)
    })
  })

  // eslint-disable-next-line no-console
  console.log(columnify(displayTable))
}
