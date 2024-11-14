import ora from 'ora'
import { blueBright, greenBright } from 'picocolors'

export const officialName = (targetName: string) => `@initx-plugin/${targetName}`
export const communityName = (targetName: string) => `initx-plugin-${targetName}`

export function isInitxPlugin(name: string) {
  return /^@initx-plugin\/|^initx-plugin-/.test(name)
}

export function existsPlugin(pluginsName: string[], name: string) {
  return pluginsName.some(pluginName => pluginName === officialName(name) || pluginName === communityName(name))
}

export function isCompleteMatchName(targetName: string, searchedName: string) {
  return officialName(targetName) === searchedName || communityName(targetName) === searchedName
}

export function nameColor(name: string) {
  if (/^@initx-plugin\//.test(name)) {
    return greenBright(name)
  }

  return blueBright(name)
}

export function loadingFunction(message: string, fn: () => any) {
  const spinner = ora(message).start()

  return fn().finally(() => {
    spinner.stop()
  })
}
