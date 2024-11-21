export interface PluginInfo {
  name: string
  version: string
  description: string
}

export interface NeedUpdatePlugin {
  name: string
  version: string
  target: string
  isDev: boolean
}
