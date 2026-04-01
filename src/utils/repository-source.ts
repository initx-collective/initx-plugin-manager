import { PLUGIN_DIR } from '@initx-plugin/core'
import fs from 'fs-extra'
import { resolve } from 'pathe'

const REPOSITORY_SOURCE_ROOT = resolve(PLUGIN_DIR, 'repository')
const REPOSITORY_SOURCE_MAP_PATH = resolve(REPOSITORY_SOURCE_ROOT, 'sources.json')
const TRAILING_SLASH_REGEX = /\/$/
const TRAILING_GIT_REGEX = /\.git$/i
const UNSAFE_DIRECTORY_NAME_REGEX = /[^\w.-]/g

type RepositorySourceMap = Record<string, string>

function normalizeRepoName(gitUrl: string) {
  const value = gitUrl.trim().replace(TRAILING_SLASH_REGEX, '').replace(TRAILING_GIT_REGEX, '')

  if (value.startsWith('git@')) {
    const repositoryPath = value.split(':')[1] || ''
    const scpName = repositoryPath.split('/').pop() || ''
    return scpName || 'plugin'
  }

  try {
    const parsed = new URL(value.startsWith('git+') ? value.slice(4) : value)
    const pathName = parsed.pathname.split('/').filter(Boolean).pop() || ''
    return pathName || 'plugin'
  }
  catch {
    return 'plugin'
  }
}

function safeDirectoryName(value: string) {
  const sanitized = value.replace(UNSAFE_DIRECTORY_NAME_REGEX, '-')
  return sanitized || 'plugin'
}

async function readRepositorySourceMap(): Promise<RepositorySourceMap> {
  if (!await fs.pathExists(REPOSITORY_SOURCE_MAP_PATH)) {
    return {}
  }

  return fs.readJSON(REPOSITORY_SOURCE_MAP_PATH)
}

async function writeRepositorySourceMap(map: RepositorySourceMap) {
  await fs.ensureDir(REPOSITORY_SOURCE_ROOT)
  await fs.writeJSON(REPOSITORY_SOURCE_MAP_PATH, map, { spaces: 2 })
}

export async function createRepositorySourceDirectory(gitUrl: string) {
  await fs.ensureDir(REPOSITORY_SOURCE_ROOT)

  const baseName = safeDirectoryName(normalizeRepoName(gitUrl))
  const directory = resolve(REPOSITORY_SOURCE_ROOT, baseName)

  if (await fs.pathExists(directory)) {
    await fs.remove(directory)
  }

  return directory
}

export async function setRepositorySource(pluginName: string, sourceDirectory: string) {
  const map = await readRepositorySourceMap()
  const previousSource = map[pluginName]

  map[pluginName] = sourceDirectory
  await writeRepositorySourceMap(map)

  return previousSource
}

export async function consumeRepositorySource(pluginName: string) {
  const map = await readRepositorySourceMap()
  const sourceDirectory = map[pluginName]

  if (!sourceDirectory) {
    return undefined
  }

  delete map[pluginName]
  await writeRepositorySourceMap(map)
  return sourceDirectory
}

export async function hasRepositorySource(sourceDirectory: string) {
  const map = await readRepositorySourceMap()
  return Object.values(map).includes(sourceDirectory)
}

export async function hasRepositorySourceByPlugin(pluginName: string) {
  const map = await readRepositorySourceMap()
  return Boolean(map[pluginName])
}
