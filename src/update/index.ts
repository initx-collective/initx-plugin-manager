import type { InitxContext } from '@initx-plugin/core'
import { pluginSystem } from '@initx-plugin/core'
import { inquirer, loadingFunction, logger, useColors } from '@initx-plugin/utils'
import columnify from 'columnify'
import { nameColor } from '../utils'
import { applyPluginUpdates } from './apply'
import { collectNeedUpdatePlugins, getLocalPluginNames } from './collect'
import { updateCorePackages } from './core'

export async function updatePlugin(options: InitxContext['cliOptions']) {
  await loadingFunction('Updating core packages', updateCorePackages)

  const plugins = await loadingFunction('Fetching plugins', () => pluginSystem.list())
  const needUpdatePlugins = await collectNeedUpdatePlugins(plugins)
  const localPluginNames = await getLocalPluginNames(plugins)

  if (options.dev && localPluginNames.length > 0) {
    logger.warn('Local plugins cannot be updated and were skipped')
  }

  if (needUpdatePlugins.length === 0) {
    if (localPluginNames.length > 0) {
      logger.info(`Skipped local plugins: ${localPluginNames.map(nameColor).join(' ')}`)
    }

    logger.success('All plugins are up to date')
    return
  }

  if (localPluginNames.length > 0) {
    logger.info(`Skipped local plugins: ${localPluginNames.map(nameColor).join(' ')}`)
  }

  logger.info('Need update plugins:')
  // eslint-disable-next-line no-console
  console.log(columnify(needUpdatePlugins.map(({ name, source, version, target }) => ({
    name: nameColor(name),
    source: useColors(source).gray().toString(),
    version: useColors(version).dim().gray().toString(),
    target
  }))))

  const confirm = await inquirer.confirm('Do you want to update these plugins?')
  if (!confirm) {
    logger.warn('Update canceled')
    return
  }

  await applyPluginUpdates(needUpdatePlugins)

  const displayNames = needUpdatePlugins.map(({ name, target }) => `${nameColor(name)}${useColors(`@${target}`).dim().gray().toString()}`).join(' ')
  logger.success(`Plugins updated: ${displayNames}`)
}
