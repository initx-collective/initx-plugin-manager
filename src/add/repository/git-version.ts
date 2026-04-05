import { c } from '@initx-plugin/utils'

const GIT_SEMVER_TAG_REGEX = /^refs\/tags\/(v\d+\.\d+\.\d+)$/
const GIT_LATEST_TAG_ARGS = ['ls-remote', '--tags', '--refs', '--sort=-v:refname'] as const
const WHITESPACE_REGEX = /\s+/

interface SemverTagInfo {
  tag: string
}

export async function findLatestSemverTag(gitUrl: string) {
  try {
    const output = await runGitCommand([...GIT_LATEST_TAG_ARGS, gitUrl])
    const latestTag = output
      .split(/\r?\n/g)
      .map(parseSemverTag)
      .filter((tag): tag is SemverTagInfo => Boolean(tag))
      .at(0)

    return latestTag
  }
  catch {
    return undefined
  }
}

async function runGitCommand(args: string[]) {
  const result = await c('git', args)
  if (!result.success) {
    throw new Error(result.content)
  }

  return result.content.trim()
}

function parseSemverTag(line: string): SemverTagInfo | undefined {
  const ref = line.trim().split(WHITESPACE_REGEX).at(-1)
  if (!ref) {
    return undefined
  }

  const matched = ref.match(GIT_SEMVER_TAG_REGEX)
  if (!matched) {
    return undefined
  }

  const [, tag] = matched

  return {
    tag
  }
}
