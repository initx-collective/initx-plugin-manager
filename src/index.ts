import { type InitxContext, InitxPlugin } from '@initx-plugin/core'
import { log } from '@initx-plugin/utils'

import { showPluginList } from './list'

export default class PluginManagerPlugin extends InitxPlugin {
  matchers = [
    {
      matching: 'plugin',
      description: 'Plugin Manager'
    }
  ]

  async handle(_ctx: InitxContext, type: string) {
    switch (type) {
      case 'list': {
        showPluginList()
        break
      }

      default: {
        log.warn(`Unknown command: ${type}`)
      }
    }
  }
}
