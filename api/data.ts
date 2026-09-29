import { createHmac, timingSafeEqual } from 'node:crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'

/**
 * GET  /api/data  -> devuelve el JSON guardado en Neon Postgres
 * PUT  /api/data  -> guarda si x-etag coincide con la versión actual
 * POST /api/data  -> igual que PUT (lo usa sendBeacon al cerrar la pestaña)
 */

const STATE_KEY = 'main'
const BACKUP_BUCKET = 'archivos'
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

function database() {
  const url = process.env.DATABASE_URL
  return url ? neon(url) : null
}

export async function GET(req: Request) {
  if (!isAuthed(req)) return json({ error: 'unauthorized' }, 401)
  const sql = database()
  if (!sql) return json({ error: 'Falta configurar DATABASE_URL en Vercel' }, 500)
  try {
    const rows = (await sql`
      SELECT data, version::text AS version
      FROM facturador_state
      WHERE key = ${STATE_KEY}
    `) as Array<{ data: unknown; version: string }>
    const row = rows[0]
    if (!row) return json({ error: 'not_found' }, 404)
    return json(row.data, 200, { 'x-etag': row.version, 'x-auth': '1' })
  } catch (e) {
    console.error('Error leyendo datos de Neon Postgres', e)
    return json({ error: 'No se pudieron leer los datos de Neon Postgres' }, 500)
  }
}

let lastBackupDay = ''

async function dailyBackup(body: string) {
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' })
  if (day === lastBackupDay) return
  const s3 = new S3Client({ forcePathStyle: true })
  await s3.send(new PutObjectCommand({
    Bucket: BACKUP_BUCKET,
    Key: `backups/data-${day}.json`,
    Body: body,
    ContentType: 'application/json',
  }))
  lastBackupDay = day
}

async function save(req: Request) {
  if (!isAuthed(req)) return json({ error: 'unauthorized' }, 401)
  const sql = database()
  if (!sql) return json({ error: 'Falta configurar DATABASE_URL en Vercel' }, 500)
  const etag = req.headers.get('x-etag') || new URL(req.url).searchParams.get('etag') || ''
  if (etag && !/^\d+$/.test(etag)) return json({ ok: false, error: 'conflict' }, 409)

  const body = await req.text()
  try {
    const parsed = JSON.parse(body)
    if (!parsed || !Array.isArray(parsed.clients) || !parsed.settings) throw new Error('Formato inválido')
  } catch (e) {
    return json({ ok: false, error: String(e) }, 400)
  }

  try {
    const rows = etag
      ? await sql`
          UPDATE facturador_state
          SET data = ${body}::jsonb, version = version + 1, updated_at = now()
          WHERE key = ${STATE_KEY} AND version = ${etag}::bigint
          RETURNING version::text AS version
        `
      : await sql`
          INSERT INTO facturador_state (key, data)
          VALUES (${STATE_KEY}, ${body}::jsonb)
          ON CONFLICT (key) DO NOTHING
          RETURNING version::text AS version
        `
    const saved = rows[0] as { version: string } | undefined
    if (!saved) return json({ ok: false, error: 'conflict' }, 409)

    try {
      await dailyBackup(body)
    } catch (e) {
      console.error('Error creando backup en Neon Object Storage', e)
    }
    return json({ ok: true, etag: saved.version })
  } catch (e) {
    console.error('Error guardando datos en Neon Postgres', e)
    return json({ ok: false, error: 'No se pudieron guardar los datos en Neon Postgres' }, 500)
  }
}

export const PUT = save
export const POST = save
