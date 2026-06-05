export interface PluginPackageJson {
  name?: string
  version?: string
  description?: string
  scripts?: {
    build?: string
  }
  repository?: string | {
    url?: string
  }
}
