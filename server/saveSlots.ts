import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type ServerSaveSlot = { id: string; name: string; savedAt: number }
type StoredSaveSlot = ServerSaveSlot & { snapshot: string }

const SAVE_DIRECTORY = resolve(fileURLToPath(new URL('../saves', import.meta.url)))
const MAX_SAVE_BYTES = 24 * 1024 * 1024
const validId = (id: string) => /^[a-f0-9-]{36}$/i.test(id)

function fileOf(id: string): string {
  if (!validId(id)) throw new Error('Ungültige Spielstand-ID')
  return join(SAVE_DIRECTORY, `${id}.json`)
}

function publicSlot(slot: StoredSaveSlot): ServerSaveSlot {
  return { id: slot.id, name: slot.name, savedAt: slot.savedAt }
}

function cleanName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 40) : ''
}

async function readSlot(id: string): Promise<StoredSaveSlot | null> {
  try {
    const parsed = JSON.parse(await readFile(fileOf(id), 'utf8')) as StoredSaveSlot
    return parsed && parsed.id === id && typeof parsed.name === 'string' &&
      typeof parsed.savedAt === 'number' && typeof parsed.snapshot === 'string' ? parsed : null
  } catch { return null }
}

export async function listServerSaves(): Promise<ServerSaveSlot[]> {
  await mkdir(SAVE_DIRECTORY, { recursive: true })
  const files = await readdir(SAVE_DIRECTORY)
  const slots = await Promise.all(files.filter(file => extname(file) === '.json').map(async file => readSlot(file.slice(0, -5))))
  return slots.filter((slot): slot is StoredSaveSlot => slot !== null).map(publicSlot).sort((a, b) => b.savedAt - a.savedAt)
}

async function writeSlot(id: string, name: string, snapshot: string): Promise<ServerSaveSlot> {
  if (!snapshot || Buffer.byteLength(snapshot, 'utf8') > MAX_SAVE_BYTES) throw new Error('Spielstand ist leer oder zu groß')
  try { JSON.parse(snapshot) } catch { throw new Error('Spielstand ist ungültig') }
  await mkdir(SAVE_DIRECTORY, { recursive: true })
  const slot: StoredSaveSlot = { id, name, savedAt: Date.now(), snapshot }
  const target = fileOf(id), temporary = `${target}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(slot), 'utf8')
  await rename(temporary, target)
  return publicSlot(slot)
}

async function bodyOf(request: IncomingMessage): Promise<unknown> {
  let body = ''
  for await (const chunk of request) {
    body += String(chunk)
    if (Buffer.byteLength(body, 'utf8') > MAX_SAVE_BYTES + 1024 * 64) throw new Error('Anfrage zu groß')
  }
  return JSON.parse(body || '{}')
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

/** Local-only JSON API. Saves are stored in the project's `saves` directory. */
export async function handleSaveRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/'
  if (!pathname.startsWith('/api/saves')) return false
  const parts = pathname.split('/').filter(Boolean)
  const id = parts[2]
  try {
    if (request.method === 'GET' && parts.length === 2) { send(response, 200, await listServerSaves()); return true }
    if (request.method === 'GET' && id) { const slot = await readSlot(id); send(response, slot ? 200 : 404, slot ?? { error: 'Nicht gefunden' }); return true }
    if (request.method === 'POST' && parts.length === 2) {
      const body = await bodyOf(request) as { name?: unknown; snapshot?: unknown }
      const name = cleanName(body.name)
      if (!name || typeof body.snapshot !== 'string') { send(response, 400, { error: 'Name und Spielstand sind erforderlich' }); return true }
      const slots = await listServerSaves()
      if (slots.length >= 20) { send(response, 409, { error: 'Maximal 20 Spielstände möglich' }); return true }
      send(response, 201, await writeSlot(randomUUID(), name, body.snapshot)); return true
    }
    if (request.method === 'PUT' && id) {
      if (!await readSlot(id)) { send(response, 404, { error: 'Nicht gefunden' }); return true }
      const body = await bodyOf(request) as { name?: unknown; snapshot?: unknown }
      const name = cleanName(body.name)
      if (!name || typeof body.snapshot !== 'string') { send(response, 400, { error: 'Name und Spielstand sind erforderlich' }); return true }
      send(response, 200, await writeSlot(id, name, body.snapshot)); return true
    }
    if (request.method === 'DELETE' && id) { await rm(fileOf(id), { force: true }); send(response, 200, { ok: true }); return true }
    send(response, 405, { error: 'Methode nicht erlaubt' })
  } catch (error) {
    send(response, 400, { error: error instanceof Error ? error.message : 'Spielstand konnte nicht verarbeitet werden' })
  }
  return true
}
