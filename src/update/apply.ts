import type { NeedUpdatePlugin } from '../types'
import { pluginSystem } from '@initx-plugin/core'
import { loadingFunction, logger } from '@initx-plugin/utils'
import { AddSource } from '../add/local'
import { nameColor } from '../utils'
import { getRepositorySource } from '../utils/repository-source'
import { getMissingRepositoryUpdateMessage, updateRepositoryPlugin } from './repository'

export async function applyPluginUpdates(updates: NeedUpdatePlugin[]) {
  for (const update of updates) {
    if (update.source === AddSource.Registry) {
      await loadingFunction(
        `Updating ${nameColor(update.name)} from registry`,
        () => pluginSystem.update(update.name, update.target)
      )
      continue
    }

    if (update.source === AddSource.Repository) {
      const sourceDir = await getRepositorySource(update.name)
      if (!sourceDir) {
        logger.warn(getMissingRepositoryUpdateMessage(update.name, 'update'))
        continue
      }

      await updateRepositoryPlugin(update)
    }
  }
}
