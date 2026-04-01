import type { PluginInfo } from './types'
import { fetchPlugins } from '@initx-plugin/core'
import { loadingFunction, useColors } from '@initx-plugin/utils'
import columnify from 'columnify'
import { nameColor } from './utils'
import { hasLocalSource } from './utils/local-source'
import { hasRepositorySourceByPlugin } from './utils/repository-source'

type PluginSource = 'registry' | 'local' | 'repository'

interface DisplayPluginInfo extends PluginInfo {
  source?: string
}

async function detectPluginSource(pluginName: string): Promise<PluginSource> {
  if (await hasRepositorySourceByPlugin(pluginName)) {
    return 'repository'
  }

  if (await hasLocalSource(pluginName)) {
    return 'local'
  }

  return 'registry'
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
        ? { source: useColors(source!).gray().toString() }
        : {})
    })
  }

  // eslint-disable-next-line no-console
  console.log(columnify(displayTable))
}
