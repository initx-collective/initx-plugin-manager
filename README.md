## @initx-plugin/manager

`initx` plugin manager

## Usage

```bash
npx initx plugin <command>
```

This command will automatically install `@initx-plugin/manager` if not already installed.

### List

```bash
npx initx plugin list
```

List all installed plugins

### Add

```bash
# npx initx plugin add <plugin-name>
npx initx plugin add git
```

This command will search and install `@initx-plugin/git` or `initx-plugin-git`

If there are multiple, let the user choose

### Update

```bash
npx initx plugin update
```

Detect the versions of all plugins and update the plugins that need to be updated

Automatically filter local development plugins

### Remove

```bash
# npx initx plugin remove <plugin-name>
npx initx plugin remove git
```

This command will remove `@initx-plugin/git` or `initx-plugin-git`

If there are multiple, let the user choose

## Documentation

[initx](https://github.com/initx-collective/initx)
