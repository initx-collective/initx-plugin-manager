import type { PluginInfo } from './types'
import { fetchPlugins } from '@initx-plugin/core'
import { loadingFunction, useColors } from '@initx-plugin/utils'
import columnify from 'columnify'
import { AddSource } from './add/local'
import { nameColor } from './utils'
import { detectPluginSource } from './utils/plugin-source'

interface DisplayPluginInfo extends PluginInfo {
  source?: string
}

export async function showPluginList(cliOptions: Record<string, any> = {}) {
  const plugins = await loadingFunction('Fetching plugins', fetchPlugins)
  const showDetail = Boolean(cliOptions.detail)

  const displayTable: DisplayPluginInfo[] = []

  for (const plugin of plugins) {
    const source = showDetail ? await detectPluginSource(plugin.name) : undefined

    displayTable.push({
      name: nameColor(plugin.name),
      version: useColors(plugin.version).gray().toString(),
      description: useColors(plugin.description).gray().toString(),
      ...(showDetail
        ? { source: useColors(source ?? AddSource.Registry).gray().toString() }
        : {})
    })
  }

  // eslint-disable-next-line no-console
  console.log(columnify(displayTable))
}
