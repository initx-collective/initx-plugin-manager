import { fetchPlugins, withPluginPrefix } from '@initx-plugin/core'
import { c, inquirer, loadingFunction, log } from '@initx-plugin/utils'
import { communityName, nameColor, officialName } from './utils'

export async function removePlugin(targetName: string) {
  const plugins = await fetchPlugins()

  const removePluginNames = [
    officialName(targetName),
    communityName(targetName)
  ]

  const removePlugins = plugins.filter(({ name }) => removePluginNames.includes(name))

  if (removePlugins.length === 0) {
    const displayNames = removePluginNames.map(nameColor).join(' or ')
    log.warn(`Plugin ${displayNames} is not installed`)
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
    () => c('npm', withPluginPrefix(['uninstall', removePlugin.name, '--silent']))
  )

  log.success(`Removed ${nameColor(removePlugin.name)}`)
}
