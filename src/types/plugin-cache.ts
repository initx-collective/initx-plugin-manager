export interface PluginCacheEntry {
  version: string
  resolved: string
  overridden: boolean
  description: string
}

export type PluginCache = Record<string, PluginCacheEntry>
