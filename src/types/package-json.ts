export interface PluginPackageJson {
  name?: string
  version?: string
  description?: string
  author?: string | {
    name?: string
    email?: string
    url?: string
  }
  scripts?: {
    build?: string
  }
  repository?: string | {
    url?: string
  }
}
