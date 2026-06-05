import * as fs from 'node:fs'
import * as fsPromises from 'node:fs/promises'
import { dirname } from 'pathe'

export async function pathExists(path: string) {
  return fsPromises.access(path).then(() => true, () => false)
}

export function pathExistsSync(path: string) {
  return fs.existsSync(path)
}

export async function readJson<T = unknown>(file: string): Promise<T> {
  return JSON.parse(await fsPromises.readFile(file, 'utf8')) as T
}

export function readJsonSync<T = unknown>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T
}

export async function writeJson(file: string, obj: unknown, options?: { spaces?: number }) {
  await fsPromises.mkdir(dirname(file), { recursive: true })
  const content = options?.spaces !== undefined
    ? JSON.stringify(obj, null, options.spaces)
    : JSON.stringify(obj)
  await fsPromises.writeFile(file, content)
}

export async function ensureDir(dir: string) {
  await fsPromises.mkdir(dir, { recursive: true })
}

export async function remove(path: string) {
  await fsPromises.rm(path, { recursive: true, force: true })
}
