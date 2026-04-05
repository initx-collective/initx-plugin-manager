import { cwd } from 'node:process'
import { addFromDirectory } from './local'
import { addFromRegistry } from './registry'
import { addFromRepository, isGitUrl } from './repository/index'

export async function addFromTarget(targetPlugin: string, cliOptions: Record<string, any> = {}) {
  if (targetPlugin === '.') {
    await addFromDirectory(cwd(), 'local')
    return
  }

  if (isGitUrl(targetPlugin)) {
    await addFromRepository(targetPlugin, cliOptions)
    return
  }

  await addFromRegistry(targetPlugin, cliOptions)
}
