/** POST /api/logout -> borra la cookie de sesión */
export async function POST() {
  return Response.json({ ok: true }, { headers: { 'set-cookie': 'fx_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' } })
}
