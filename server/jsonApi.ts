import fs from 'node:fs'
import path from 'node:path'
import { createHmac } from 'node:crypto'
import type { Plugin, Connect } from 'vite'
import type { ServerResponse } from 'node:http'

/**
 * Versión LOCAL de la API (solo para `npm run dev`). En Vercel se usan las funciones de /api
 * que guardan en Vercel Blob. Mismo protocolo en ambos:
 *  GET  /api/data   -> JSON (404 si no existe todavía), header x-etag con la versión
 *  PUT  /api/data   -> guarda; si x-etag no coincide con la versión actual responde 409
 *  POST /api/login  -> solo si definís APP_PASSWORD al correr `npm run dev`
 * Localmente los datos quedan en data/data.json con backups diarios en data/backups.
 */
const DATA_DIR = path.resolve(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'data.json')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const COOKIE = 'fx_session'

const etagOf = () => (fs.existsSync(DATA_FILE) ? String(fs.statSync(DATA_FILE).mtimeMs) : '')

function backup() {
  if (!fs.existsSync(DATA_FILE)) return
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const day = new Date().toISOString().slice(0, 10)
  fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `data-${day}.json`))
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('data-')).sort()
  for (const f of files.slice(0, Math.max(0, files.length - 30))) fs.unlinkSync(path.join(BACKUP_DIR, f))
}

const token = (pw: string) => createHmac('sha256', pw).update('facturador-session-v1').digest('hex')
function authed(req: Connect.IncomingMessage) {
  const pw = process.env.APP_PASSWORD
  if (!pw) return true // sin contraseña en local
  return (req.headers.cookie ?? '').includes(`${COOKIE}=${token(pw)}`)
}

const send = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

const readBody = (req: Connect.IncomingMessage) =>
  new Promise<string>((resolve) => {
    let b = ''
    req.on('data', (c) => (b += c))
    req.on('end', () => resolve(b))
  })

const handler: Connect.NextHandleFunction = async (req, res, next) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/')) return next()
  try {
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const pw = process.env.APP_PASSWORD
      const { password } = JSON.parse((await readBody(req)) || '{}')
      if (pw && password !== pw) return send(res, 401, { ok: false, error: 'Contraseña incorrecta' })
      return send(res, 200, { ok: true }, pw ? { 'Set-Cookie': `${COOKIE}=${token(pw)}; Path=/; HttpOnly; SameSite=Lax` } : {})
    }
    if (url.pathname === '/api/logout') return send(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0` })
    if (url.pathname !== '/api/data') return next()
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' })

    if (req.method === 'GET') {
      if (!fs.existsSync(DATA_FILE)) return send(res, 404, { error: 'not_found' })
      return send(res, 200, fs.readFileSync(DATA_FILE, 'utf8'), { 'x-etag': etagOf(), 'x-auth': process.env.APP_PASSWORD ? '1' : '0' })
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await readBody(req)
      const parsed = JSON.parse(body)
      if (!parsed || !Array.isArray(parsed.clients) || !parsed.settings) return send(res, 400, { ok: false, error: 'Formato inválido' })
      const clientEtag = (req.headers['x-etag'] as string) || url.searchParams.get('etag') || ''
      if (clientEtag && fs.existsSync(DATA_FILE) && clientEtag !== etagOf()) return send(res, 409, { ok: false, error: 'conflict' })
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
      backup()
      const tmp = DATA_FILE + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2))
      fs.renameSync(tmp, DATA_FILE)
      return send(res, 200, { ok: true, etag: etagOf() })
    }
    send(res, 405, {})
  } catch (e) {
    send(res, 500, { ok: false, error: String(e) })
  }
}

export function jsonApi(): Plugin {
  return {
    name: 'facturador-json-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
