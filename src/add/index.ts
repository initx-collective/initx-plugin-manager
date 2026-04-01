import { cwd } from 'node:process'
import { addFromDirectory } from './local'
import { addFromRegistry } from './registry'
import { addFromRepository, isGitUrl } from './repository'

export async function addFromTarget(targetPlugin: string, cliOptions: Record<string, any> = {}) {
  if (targetPlugin === '.') {
    await addFromDirectory(cwd(), 'local')
    return
  }

  if (isGitUrl(targetPlugin)) {
    await addFromRepository(targetPlugin)
    return
  }

  await addFromRegistry(targetPlugin, cliOptions)
}
