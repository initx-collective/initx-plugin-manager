import { PLUGIN_DIR } from '@initx-plugin/core'
import { c } from '@initx-plugin/utils'

export async function updateCorePackages() {
  await c('npm', ['install', '@initx-plugin/core', '@initx-plugin/utils', '--prefix', PLUGIN_DIR])
}
