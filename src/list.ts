import type { PluginInfo } from './types'
import path from 'node:path'

import { fetchPlugins } from '@initx-plugin/core'
import { loadingFunction } from '@initx-plugin/utils'

import columnify from 'columnify'
import fs from 'fs-extra'

import { gray } from 'picocolors'
import { nameColor } from './utils'

export async function showPluginList() {
  const plugins = await loadingFunction('Fetching plugins', fetchPlugins)

  const displayTable: PluginInfo[] = []

  plugins.forEach(({ root }) => {
    const info = fs.readJsonSync(path.join(root, 'package.json'))
    displayTable.push({
      name: nameColor(info.name),
      version: gray(info.version),
      description: gray(info.description)
    })
  })

  // eslint-disable-next-line no-console
  console.log(columnify(displayTable))
}
