import type { AddSource } from './add/local'

export interface PluginInfo {
  name: string
  version: string
  description: string
}

export interface NeedUpdatePlugin {
  name: string
  source: AddSource
  version: string
  target: string
}
