import type { InitxContext } from '@initx-plugin/core'
import { pluginSystem } from '@initx-plugin/core'
import { loadingFunction, logger, useColors } from '@initx-plugin/utils'
import { checkbox } from '@inquirer/prompts'
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

  const selectedUpdates = await selectUpdates(needUpdatePlugins)
  if (selectedUpdates.length === 0) {
    logger.warn('Update canceled')
    return
  }

  await applyPluginUpdates(selectedUpdates)

  const displayNames = selectedUpdates.map(({ name, target }) => `${nameColor(name)}${useColors(`@${target}`).dim().gray().toString()}`).join(' ')
  logger.success(`Plugins updated: ${displayNames}`)
}

async function selectUpdates(needUpdatePlugins: Awaited<ReturnType<typeof collectNeedUpdatePlugins>>) {
  const selectedNames = await checkbox({
    message: 'Select plugins to update',
    choices: needUpdatePlugins.map(({ name, source, version, target }) => ({
      name: `${name} (${source}) ${version} -> ${target}`,
      label: `${name} ${useColors(`(${source})`).gray().toString()} ${useColors(version).dim().gray().toString()} -> ${target}`,
      value: name,
      checked: true
    }))
  })

  return needUpdatePlugins.filter(({ name }) => selectedNames.includes(name))
}
