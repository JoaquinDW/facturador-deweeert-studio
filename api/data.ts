import { createHmac, timingSafeEqual } from 'node:crypto'
import { get, head, put, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob'

/**
 * GET  /api/data  -> devuelve el JSON guardado en Vercel Blob (404 si todavía no existe)
 * PUT  /api/data  -> guarda el JSON completo. Header `x-etag` = versión que tenía el cliente;
 *                    si otro dispositivo guardó antes, responde 409 para no pisar cambios.
 * POST /api/data  -> igual que PUT (lo usa navigator.sendBeacon al cerrar la pestaña, con ?etag=)
 */

const DATA_PATH = 'facturador/data.json'
const COOKIE = 'fx_session'

function sessionToken(password: string) {
  return createHmac('sha256', password).update('facturador-session-v1').digest('hex')
}

function isAuthed(req: Request) {
  const pw = process.env.APP_PASSWORD
  if (!pw) return false
  const cookie = req.headers.get('cookie') ?? ''
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]+)`))
  if (!m) return false
  const a = Buffer.from(m[1])
  const b = Buffer.from(sessionToken(pw))
  return a.length === b.length && timingSafeEqual(a, b)
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } })

export async function GET(req: Request) {
  if (!isAuthed(req)) return json({ error: 'unauthorized' }, 401)
  const r = await get(DATA_PATH, { access: 'private', useCache: false })
  if (!r || r.statusCode !== 200) return json({ error: 'not_found' }, 404)
  const text = await new Response(r.stream).text()
  return new Response(text, {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-etag': r.blob.etag, 'x-auth': '1' },
  })
}

let lastBackupDay = ''

async function dailyBackup(body: string) {
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' }) // YYYY-MM-DD
  if (day === lastBackupDay) return
  const path = `facturador/backups/data-${day}.json`
  try {
    await head(path)
  } catch (e) {
    if (!(e instanceof BlobNotFoundError)) throw e
    await put(path, body, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true })
  }
  lastBackupDay = day
}

async function save(req: Request) {
  if (!isAuthed(req)) return json({ error: 'unauthorized' }, 401)
  const etag = req.headers.get('x-etag') || new URL(req.url).searchParams.get('etag') || undefined
  const body = await req.text()
  try {
    const parsed = JSON.parse(body)
    if (!parsed || !Array.isArray(parsed.clients) || !parsed.settings) throw new Error('Formato inválido')
  } catch (e) {
    return json({ ok: false, error: String(e) }, 400)
  }
  try {
    const res = await put(DATA_PATH, body, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      ifMatch: etag,
    })
    try {
      await dailyBackup(body)
    } catch {
      /* el backup nunca debe romper el guardado */
    }
    return json({ ok: true, etag: res.etag })
  } catch (e) {
    if (e instanceof BlobPreconditionFailedError) return json({ ok: false, error: 'conflict' }, 409)
    return json({ ok: false, error: String(e) }, 500)
  }
}

export const PUT = save
export const POST = save
