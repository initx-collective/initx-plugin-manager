import { c } from '@initx-plugin/utils'

const GIT_SEMVER_TAG_REGEX = /^refs\/tags\/(v\d+\.\d+\.\d+)$/
const WHITESPACE_REGEX = /\s+/

interface SemverTagInfo {
  tag: string
  version: [major: number, minor: number, patch: number]
}

export async function findLatestSemverTag(gitUrl: string) {
  try {
    const output = await runGitCommand(['ls-remote', '--tags', '--refs', gitUrl])
    const tags = output
      .split(/\r?\n/g)
      .map(parseSemverTag)
      .filter((tag): tag is SemverTagInfo => Boolean(tag))

    if (tags.length === 0) {
      return undefined
    }

    tags.sort(compareSemverTagDesc)
    return tags[0]
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

function parseSemverTag(line: string) {
  const ref = line.trim().split(WHITESPACE_REGEX).at(-1)
  if (!ref) {
    return undefined
  }

  const matched = ref.match(GIT_SEMVER_TAG_REGEX)
  if (!matched) {
    return undefined
  }

  const [, tag] = matched
  const version = tag.slice(1).split('.').map(Number)
  if (version.length !== 3 || version.some(Number.isNaN)) {
    return undefined
  }

  return {
    tag,
    version: [version[0], version[1], version[2]]
  } satisfies SemverTagInfo
}

function compareSemverTagDesc(a: SemverTagInfo, b: SemverTagInfo) {
  return (
    b.version[0] - a.version[0]
    || b.version[1] - a.version[1]
    || b.version[2] - a.version[2]
  )
}
