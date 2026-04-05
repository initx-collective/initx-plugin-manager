const GIT_PROTOCOL_REGEX = /^(?:https?:\/\/|ssh:\/\/|git:\/\/)/i

export function isGitUrl(value: string) {
  const candidate = value.trim()

  if (!candidate) {
    return false
  }

  if (candidate.startsWith('git@')) {
    return candidate.includes(':') && candidate.includes('/')
  }

  const protocolCandidate = candidate.startsWith('git+https://')
    ? candidate.slice(4)
    : candidate.startsWith('git+http://')
      ? candidate.slice(4)
      : candidate

  if (!GIT_PROTOCOL_REGEX.test(protocolCandidate)) {
    return false
  }

  try {
    const parsed = new URL(protocolCandidate)
    return Boolean(parsed.hostname && parsed.pathname && parsed.pathname !== '/')
  }
  catch {
    return false
  }
}
