import { cwd } from 'node:process'
import { isAbsolute, resolve } from 'pathe'
import { addFromDirectory, AddSource } from './local'
import { addFromRegistry } from './registry'
import { addFromRepository, isGitUrl } from './repository/index'

const RELATIVE_PATH_REGEX = /^\.{1,2}(?:[\\/]|$)/

export async function addFromTarget(targetPlugin: string, cliOptions: Record<string, any> = {}) {
  if (isLocalPath(targetPlugin)) {
    const pluginPath = isAbsolute(targetPlugin) ? targetPlugin : resolve(cwd(), targetPlugin)
    await addFromDirectory(pluginPath, AddSource.Local)
    return
  }

  if (isGitUrl(targetPlugin)) {
    await addFromRepository(targetPlugin, cliOptions)
    return
  }

  await addFromRegistry(targetPlugin, cliOptions)
}

function isLocalPath(targetPlugin: string) {
  return isAbsolute(targetPlugin) || RELATIVE_PATH_REGEX.test(targetPlugin)
}
