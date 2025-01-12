import { type InitxContext, InitxPlugin } from '@initx-plugin/core'
import { log } from '@initx-plugin/utils'

import { addPlugin } from './add'
import { showPluginList } from './list'
import { removePlugin } from './remove'
import { updatePlugin } from './update'

export default class PluginManagerPlugin extends InitxPlugin {
  rules = [
    {
      matching: 'plugin',
      description: 'Plugin Manager'
    }
  ]

  async handle(context: InitxContext, type: string, ...others: string[]) {
    const [name] = others

    switch (type) {
      case 'list': {
        await showPluginList()
        break
      }

      case 'add': {
        await addPlugin(name)
        break
      }

      case 'update': {
        await updatePlugin(context.cliOptions)
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
