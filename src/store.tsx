import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Data } from './types'
import seed from '../server/seed.json'

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

interface Store {
  data: Data
  update: (fn: (draft: Data) => void) => void
  replaceAll: (d: Data) => void
  saveState: SaveState
  authEnabled: boolean
  logout: () => void
}

const Ctx = createContext<Store | null>(null)

function normalizeData(d: Data) {
  d.tasks ??= []
  d.charges ??= []
  d.invoices ??= []
  for (const task of d.tasks) {
    const charge = d.charges.find((item) => item.id === task.chargeId || item.taskId === task.id)
    if (charge && !task.chargeId) task.chargeId = charge.id
    task.category ??= charge?.kind === 'desarrollo' ? 'desarrollo' : charge?.kind === 'gasto' ? 'gasto' : 'otro'
    task.billable ??= !!charge
    if (charge) {
      task.billingDescription ??= charge.description
      task.billingQuantity ??= charge.quantity
      task.billingUnitPrice ??= charge.unitPrice
      task.billingPeriod ??= charge.period
    }
  }
  for (const client of d.clients) {
    const highestNumber = d.invoices
      .filter((invoice) => invoice.clientId === client.id)
      .reduce((highest, invoice) => Math.max(highest, invoice.number), 0)
    client.nextInvoiceNumber = Math.max(1, Math.round(client.nextInvoiceNumber ?? highestNumber + 1))
  }
  return d
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    setBusy(false)
    if (r.ok) onDone()
    else setErr((await r.json().catch(() => ({}))).error ?? 'Error')
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-lg font-semibold text-brand-soft">Facturador</div>
        <h1 className="mt-1 text-2xl font-bold text-brand">Ingresar</h1>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Contraseña"
          className="mt-6 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <button disabled={busy || !pw} className="mt-4 w-full cursor-pointer rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needLogin, setNeedLogin] = useState(false)
  const [authEnabled, setAuthEnabled] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<Data | null>(null)
  const saving = useRef(false)
  const etag = useRef<string>('')
  const conflict = useRef(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await fetch('/api/data', { cache: 'no-store' })
      if (r.status === 401) return setNeedLogin(true)
      setNeedLogin(false)
      let d: Data
      if (r.status === 404) {
        d = structuredClone(seed) as Data // primera vez: datos iniciales
        etag.current = ''
      } else if (r.ok) {
        d = await r.json()
        etag.current = r.headers.get('x-etag') ?? ''
        setAuthEnabled(r.headers.get('x-auth') === '1')
      } else {
        const message = (await r.json().catch(() => ({}))).error
        throw new Error(message || `Error ${r.status} al leer los datos`)
      }
      setData(normalizeData(d))
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const flush = useCallback(async () => {
    if (saving.current || conflict.current) return
    const d = pending.current
    if (!d) return
    pending.current = null
    saving.current = true
    try {
      const r = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(etag.current ? { 'x-etag': etag.current } : {}) },
        body: JSON.stringify(d),
      })
      if (r.status === 409) {
        conflict.current = true
        pending.current = d
        setSaveState('conflict')
        return
      }
      if (r.status === 401) {
        pending.current = d
        setNeedLogin(true)
        return
      }
      if (!r.ok) throw new Error(await r.text())
      const res = await r.json()
      if (res.etag) etag.current = res.etag
      setSaveState(pending.current ? 'saving' : 'saved')
    } catch {
      pending.current ??= d
      setSaveState('error')
    } finally {
      saving.current = false
      if (pending.current && !conflict.current) timer.current = window.setTimeout(flush, 1500)
    }
  }, [])

  const persist = useCallback(
    (d: Data) => {
      pending.current = d
      if (conflict.current) return
      setSaveState('saving')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, 1000)
    },
    [flush],
  )

  // guardar antes de cerrar la pestaña
  useEffect(() => {
    const onUnload = () => {
      if (pending.current && !conflict.current)
        navigator.sendBeacon?.(`/api/data?etag=${encodeURIComponent(etag.current)}`, new Blob([JSON.stringify(pending.current)], { type: 'application/json' }))
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  const update = useCallback(
    (fn: (draft: Data) => void) => {
      setData((prev) => {
        if (!prev) return prev
        const next = structuredClone(prev)
        fn(next)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const replaceAll = useCallback(
    (d: Data) => {
      const normalized = normalizeData(d)
      setData(normalized)
      persist(normalized)
    },
    [persist],
  )

  const logout = useCallback(async () => {
    await fetch('/api/logout', { method: 'POST' })
    setData(null)
    setNeedLogin(true)
  }, [])

  if (needLogin) return <Login onDone={load} />
  if (error)
    return (
      <div className="p-10 text-red-700">
        <h1 className="text-xl font-semibold">Error cargando datos</h1>
        <p className="mt-2">{error}</p>
        <button onClick={load} className="mt-4 cursor-pointer rounded-lg border px-3 py-1.5 text-sm">Reintentar</button>
      </div>
    )
  if (!data) return <div className="p-10 text-slate-500">Cargando…</div>

  return (
    <Ctx.Provider value={{ data, update, replaceAll, saveState, authEnabled, logout }}>
      {saveState === 'conflict' && (
        <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-4 bg-amber-500 px-4 py-2 text-sm text-white">
          Los datos se modificaron desde otro dispositivo. Tus últimos cambios no se guardaron.
          <button onClick={() => location.reload()} className="cursor-pointer rounded bg-white/20 px-3 py-1 font-medium hover:bg-white/30">Recargar</button>
        </div>
      )}
      {children}
    </Ctx.Provider>
  )
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fuera de StoreProvider')
  return s
}
