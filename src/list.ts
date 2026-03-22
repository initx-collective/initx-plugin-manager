import type { PluginInfo } from './types'
import { fetchPlugins } from '@initx-plugin/core'
import { loadingFunction, useColors } from '@initx-plugin/utils'
import columnify from 'columnify'
import { nameColor } from './utils'

export async function showPluginList() {
  const plugins = await loadingFunction('Fetching plugins', fetchPlugins)

  const displayTable: PluginInfo[] = []

  plugins.forEach((plugin) => {
    displayTable.push({
      name: nameColor(plugin.name),
      version: useColors(plugin.version).gray().toString(),
      description: useColors(plugin.description).gray().toString()
    })
  })

  // eslint-disable-next-line no-console
  console.log(columnify(displayTable))
}
