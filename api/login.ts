import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/** POST /api/login {password} -> setea una cookie de sesión (60 días) si la contraseña coincide con APP_PASSWORD */

const COOKIE = 'fx_session'
const sha = (s: string) => createHash('sha256').update(s).digest()

export async function POST(req: Request) {
  const pw = process.env.APP_PASSWORD
  if (!pw) return Response.json({ ok: false, error: 'Falta configurar APP_PASSWORD en Vercel' }, { status: 500 })
  let password = ''
  try {
    password = String((await req.json()).password ?? '')
  } catch {
    /* body inválido */
  }
  if (!timingSafeEqual(sha(password), sha(pw))) {
    await new Promise((r) => setTimeout(r, 800)) // frena intentos por fuerza bruta
    return Response.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 })
  }
  const token = createHmac('sha256', pw).update('facturador-session-v1').digest('hex')
  return Response.json(
    { ok: true },
    { headers: { 'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 60}` } },
  )
}
