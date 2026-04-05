import type { pluginSystem } from '@initx-plugin/core'

export type InstalledPlugins = Awaited<ReturnType<typeof pluginSystem.list>>
export type InstalledPlugin = InstalledPlugins[number]
