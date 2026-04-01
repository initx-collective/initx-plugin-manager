import { fetchPlugins, pluginSystem } from '@initx-plugin/core'
import { inquirer, loadingFunction, logger } from '@initx-plugin/utils'
import fs from 'fs-extra'
import { communityName, nameColor, officialName } from './utils'
import { consumeLocalSource } from './utils/local-source'
import { consumeRepositorySource } from './utils/repository-source'

export async function removePlugin(targetName: string) {
  const plugins = await loadingFunction('Fetching plugins', fetchPlugins)

  const removePluginNames = [
    officialName(targetName),
    communityName(targetName)
  ]

  const removePlugins = plugins.filter(({ name }) => removePluginNames.includes(name))

  if (removePlugins.length === 0) {
    const displayNames = removePluginNames.map(nameColor).join(' or ')
    logger.warn(`Plugin ${displayNames} is not installed`)
    return
  }

  let index = 0
  let needConfirm = true

  if (removePlugins.length === 2) {
    index = await inquirer.select('Which plugin do you want to remove?', removePlugins.map(({ name }) => nameColor(name)))
    needConfirm = false
  }

  const removePlugin = removePlugins[index]

  if (needConfirm) {
    const confirmResult = await inquirer.confirm(`Are you sure you want to remove ${nameColor(removePlugin.name)}?`)

    if (!confirmResult) {
      return
    }
  }

  await loadingFunction(
    `Removing ${nameColor(removePlugin.name)}...`,
    () => pluginSystem.uninstall(removePlugin.name)
  )

  const repositorySourceDirectory = await consumeRepositorySource(removePlugin.name)
  if (repositorySourceDirectory) {
    await fs.remove(repositorySourceDirectory)
    logger.info(`Cleaned repository source directory: ${repositorySourceDirectory}`)
  }

  await consumeLocalSource(removePlugin.name)

  logger.success(`Removed ${nameColor(removePlugin.name)}`)
}
