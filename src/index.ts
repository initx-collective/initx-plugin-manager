import { type InitxContext, InitxPlugin } from '@initx-plugin/core'
import { log } from '@initx-plugin/utils'

import { addPlugin } from './add'
import { showPluginList } from './list'
import { updatePlugin } from './update'
import { removePlugin } from './remove'

export default class PluginManagerPlugin extends InitxPlugin {
  matchers = [
    {
      matching: 'plugin',
      description: 'Plugin Manager'
    }
  ]

  async handle(_ctx: InitxContext, type: string, ...others: string[]) {
    const [name] = others

    switch (type) {
      case 'list': {
        showPluginList()
        break
      }

      case 'add': {
        await addPlugin(name)
        break
      }

      case 'update': {
        await updatePlugin()
        break
      }

      case 'remove': {
        await removePlugin(name)
        break
      }

      default: {
        log.warn(`Unknown command: ${type}`)
      }
    }
  }
}
