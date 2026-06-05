export interface InstalledPackageInfo {
  version: string
  description: string
  author?: unknown
  homepage?: string
  repository?: string | {
    type?: string
    url?: string
  }
}

export interface InstalledPluginMeta {
  root: string
  isLocal: boolean
}

export interface InstalledPlugin {
  name: string
  package: InstalledPackageInfo
  plugin: InstalledPluginMeta
}
