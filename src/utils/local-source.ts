import { PLUGIN_DIR } from '@initx-plugin/core'
import fs from 'fs-extra'
import { resolve } from 'pathe'

const LOCAL_SOURCE_ROOT = resolve(PLUGIN_DIR, 'local')
const LOCAL_SOURCE_MAP_PATH = resolve(LOCAL_SOURCE_ROOT, 'sources.json')

type LocalSourceMap = Record<string, string>

async function readLocalSourceMap(): Promise<LocalSourceMap> {
  if (!await fs.pathExists(LOCAL_SOURCE_MAP_PATH)) {
    return {}
  }

  return fs.readJSON(LOCAL_SOURCE_MAP_PATH)
}

async function writeLocalSourceMap(map: LocalSourceMap) {
  await fs.ensureDir(LOCAL_SOURCE_ROOT)
  await fs.writeJSON(LOCAL_SOURCE_MAP_PATH, map, { spaces: 2 })
}

export async function setLocalSource(pluginName: string, sourceDirectory: string) {
  const map = await readLocalSourceMap()
  map[pluginName] = sourceDirectory
  await writeLocalSourceMap(map)
}

export async function hasLocalSource(pluginName: string) {
  const map = await readLocalSourceMap()
  return Boolean(map[pluginName])
}

export async function consumeLocalSource(pluginName: string) {
  const map = await readLocalSourceMap()
  const sourceDirectory = map[pluginName]

  if (!sourceDirectory) {
    return undefined
  }

  delete map[pluginName]
  await writeLocalSourceMap(map)
  return sourceDirectory
}
