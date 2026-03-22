import type { InitxContext, InitxMatcherRules } from '@initx-plugin/core'
import { InitxPlugin } from '@initx-plugin/core'
import { logger } from '@initx-plugin/utils'

import { addPlugin } from './add'
import { showPluginList } from './list'
import { removePlugin } from './remove'
import { updatePlugin } from './update'

export default class PluginManagerPlugin extends InitxPlugin {
  rules: InitxMatcherRules = [
    {
      matching: 'plugin',
      description: 'Plugin Manager',
      optional: [
        'list',
        'add',
        'update',
        'remove'
      ]
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
        logger.warn(`Unknown command: ${type}`)
      }
    }
  }
}
