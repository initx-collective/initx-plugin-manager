import { PLUGIN_DIR } from '@initx-plugin/core'
import { resolve } from 'pathe'
import { ensureDir, pathExists, readJson, writeJson } from './fs'

const LOCAL_SOURCE_ROOT = resolve(PLUGIN_DIR, 'local')
const LOCAL_SOURCE_MAP_PATH = resolve(LOCAL_SOURCE_ROOT, 'sources.json')

type LocalSourceMap = Record<string, string>

async function readLocalSourceMap(): Promise<LocalSourceMap> {
  if (!await pathExists(LOCAL_SOURCE_MAP_PATH)) {
    return {}
  }

  return readJson<LocalSourceMap>(LOCAL_SOURCE_MAP_PATH)
}

async function writeLocalSourceMap(map: LocalSourceMap) {
  await ensureDir(LOCAL_SOURCE_ROOT)
  await writeJson(LOCAL_SOURCE_MAP_PATH, map, { spaces: 2 })
}

export async function setLocalSource(pluginName: string, sourceDirectory: string) {
  const map = await readLocalSourceMap()
  map[pluginName] = sourceDirectory
  await writeLocalSourceMap(map)
}

export async function getLocalSource(pluginName: string) {
  const map = await readLocalSourceMap()
  return map[pluginName]
}

export async function hasLocalSource(pluginName: string) {
  return Boolean(await getLocalSource(pluginName))
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
