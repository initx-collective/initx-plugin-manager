import path from 'node:path'
import fs from 'fs-extra'
import { fetchPlugins } from '@initx-plugin/core'
import { blueBright, gray } from 'picocolors'

export async function showPluginList() {
  const plugins = await fetchPlugins()

  plugins.forEach(({ root }) => {
    const info = fs.readJsonSync(path.join(root, 'package.json'))
    // eslint-disable-next-line no-console
    console.log(`${blueBright(info.name)}\t${gray(info.version)}\t${gray(info.description)}`)
  })
}
