import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { Charge, Client, Task } from '../types'
import { currentPeriod, lineTotal, money, syncTaskCharge, taskCategoryLabel, todayISO, uid } from '../utils'
import { Button, Field, Input, Modal, NumberInput, Select, Textarea } from './ui'

/* ---------------- Cliente ---------------- */

export const emptyClient = (hourRate: number): Client => ({
  id: '',
  name: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  active: true,
  maintenanceActive: true,
  maintenanceDescription: '',
  maintenanceAmount: 0,
  hourRate,
  nextInvoiceNumber: 1,
  recurring: [],
  notes: '',
  createdAt: '',
})

export function ClientModal({ open, onClose, client, onSaved }: { open: boolean; onClose: () => void; client?: Client; onSaved?: (id: string) => void }) {
  const { data, update } = useStore()
  const [c, setC] = useState<Client>(client ?? emptyClient(data.settings.defaultHourRate))
  useEffect(() => {
    if (open) setC(client ? structuredClone(client) : emptyClient(data.settings.defaultHourRate))
  }, [open, client, data.settings.defaultHourRate])
  const set = <K extends keyof Client>(k: K, v: Client[K]) => setC((p) => ({ ...p, [k]: v }))

  const save = () => {
    if (!c.name.trim()) return
    const id = c.id || uid('c_')
    const final: Client = {
      ...c,
      id,
      createdAt: c.createdAt || new Date().toISOString(),
      maintenanceDescription: c.maintenanceDescription.trim() || `Mantenimiento ${c.website || c.name}`,
      recurring: c.recurring.filter((r) => r.description.trim()),
    }
    update((d) => {
      const i = d.clients.findIndex((x) => x.id === id)
      if (i >= 0) d.clients[i] = final
      else d.clients.push(final)
    })
    onSaved?.(id)
    onClose()
  }

  const recurringIds = c.recurring.map((r) => r.id)
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={client ? `Editar ${client.name}` : 'Nuevo cliente'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={!c.name.trim()}>Guardar</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cliente / Proyecto *" hint="Aparece como “Proyecto” en la factura">
          <Input autoFocus value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="Gonzamasmotos" />
        </Field>
        <Field label="A la atención de" hint="Persona de contacto">
          <Input value={c.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Gonzalo Masdeu" />
        </Field>
        <Field label="Email"><Input type="email" value={c.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Teléfono"><Input value={c.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Sitio web"><Input value={c.website} onChange={(e) => set('website', e.target.value)} placeholder="cliente.com" /></Field>
        <Field label="Valor hora de desarrollo"><NumberInput value={c.hourRate} onValue={(v) => set('hourRate', v)} /></Field>
        <Field label="Próximo N.º de factura" hint="Numeración independiente para este cliente">
          <NumberInput value={c.nextInvoiceNumber} onValue={(v) => set('nextInvoiceNumber', Math.max(1, Math.round(v)))} />
        </Field>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={c.maintenanceActive} onChange={(e) => set('maintenanceActive', e.target.checked)} className="accent-brand" />
          Paga mantenimiento mensual
        </label>
        {c.maintenanceActive && (
          <div className="mt-3 grid grid-cols-3 gap-4">
            <Field label="Descripción en factura" className="col-span-2">
              <Input value={c.maintenanceDescription} onChange={(e) => set('maintenanceDescription', e.target.value)} placeholder={`Mantenimiento ${c.website || c.name || 'sitio.com'}`} />
            </Field>
            <Field label="Monto mensual"><NumberInput value={c.maintenanceAmount} onValue={(v) => set('maintenanceAmount', v)} /></Field>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">Gastos fijos mensuales</div>
            <div className="text-xs text-slate-400">Servicios que se re-facturan cada mes (Supabase, Resend, hosting, dominio…)</div>
          </div>
          <Button size="sm" onClick={() => set('recurring', [...c.recurring, { id: uid('r_'), description: '', quantity: 1, unitPrice: 0, active: true }])}>+ Agregar</Button>
        </div>
        {c.recurring.length > 0 && (
          <div className="mt-3 space-y-2">
            {c.recurring.map((r, i) => (
              <div key={recurringIds[i]} className="grid grid-cols-[auto_1fr_80px_130px_auto] items-center gap-2">
                <input type="checkbox" title="Activo" checked={r.active} className="accent-brand" onChange={(e) => set('recurring', c.recurring.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))} />
                <Input value={r.description} placeholder="Base de datos Plan Pro" onChange={(e) => set('recurring', c.recurring.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                <NumberInput value={r.quantity} title="Cantidad" onValue={(v) => set('recurring', c.recurring.map((x, j) => (j === i ? { ...x, quantity: v } : x)))} />
                <NumberInput value={r.unitPrice} title="Precio" onValue={(v) => set('recurring', c.recurring.map((x, j) => (j === i ? { ...x, unitPrice: v } : x)))} />
                <Button size="sm" variant="danger" onClick={() => set('recurring', c.recurring.filter((_, j) => j !== i))}>✕</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Field label="Notas"><Textarea value={c.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Accesos, stack, acuerdos…" /></Field>
      {client && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={c.active} onChange={(e) => set('active', e.target.checked)} className="accent-brand" />
          Cliente activo
        </label>
      )}
    </Modal>
  )
}

/* ---------------- Trabajo ---------------- */

export function TaskModal({ open, onClose, task, clientId }: { open: boolean; onClose: () => void; task?: Task; clientId?: string }) {
  const { data, update } = useStore()
  const blank = (): Task => {
    const cid = clientId ?? data.clients.find((c) => c.active)?.id ?? ''
    const client = data.clients.find((c) => c.id === cid)
    return {
      id: '',
      clientId: cid,
      title: '',
      description: '',
      category: 'desarrollo',
      status: 'pendiente',
      priority: 'media',
      billable: false,
      billingDescription: '',
      billingQuantity: 1,
      billingUnitPrice: client?.hourRate ?? data.settings.defaultHourRate,
      billingPeriod: currentPeriod(),
      createdAt: '',
    }
  }
  const [t, setT] = useState<Task>(task ?? blank())
  useEffect(() => {
    if (open) setT(task ? { ...task } : blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, clientId])
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setT((p) => ({ ...p, [k]: v }))
  const linkedCharge = task?.chargeId ? data.charges.find((charge) => charge.id === task.chargeId) : undefined
  const billingLocked = !!linkedCharge?.invoiceId
  const save = () => {
    if (!t.title.trim() || !t.clientId) return
    const final: Task = {
      ...t,
      id: t.id || uid('t_'),
      title: t.title.trim(),
      billingDescription: t.billable ? (t.billingDescription?.trim() || t.title.trim()) : undefined,
      createdAt: t.createdAt || new Date().toISOString(),
    }
    if (final.status === 'hecho' && !final.doneAt) final.doneAt = new Date().toISOString()
    if (final.status !== 'hecho') delete final.doneAt
    update((d) => {
      const i = d.tasks.findIndex((x) => x.id === final.id)
      if (i >= 0) d.tasks[i] = final
      else d.tasks.push(final)
      syncTaskCharge(d, final)
    })
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={task ? 'Editar trabajo' : 'Nuevo trabajo'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={!t.title.trim() || !t.clientId}>Guardar</Button>
        </>
      }
    >
      <Field label="Cliente">
        <Select
          value={t.clientId}
          disabled={billingLocked}
          onChange={(e) => {
            const client = data.clients.find((item) => item.id === e.target.value)
            setT((previous) => ({
              ...previous,
              clientId: e.target.value,
              billingUnitPrice: previous.billingUnitPrice || client?.hourRate || data.settings.defaultHourRate,
            }))
          }}
        >
          <option value="">Elegí un cliente…</option>
          {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Qué hay que hacer *">
        <Input autoFocus value={t.title} onChange={(e) => set('title', e.target.value)} placeholder="Nuevo flujo de inicio de sesión" />
      </Field>
      <Field label="Detalle"><Textarea value={t.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="grid grid-cols-4 gap-4">
        <Field label="Categoría">
          <Select value={t.category} disabled={billingLocked} onChange={(e) => set('category', e.target.value as Task['category'])}>
            {Object.entries(taskCategoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Prioridad">
          <Select value={t.priority} onChange={(e) => set('priority', e.target.value as Task['priority'])}>
            <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={t.status} disabled={billingLocked} onChange={(e) => set('status', e.target.value as Task['status'])}>
            <option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="hecho">Hecho</option>
          </Select>
        </Field>
        <Field label="Fecha límite"><Input type="date" value={t.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || undefined)} /></Field>
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={t.billable} disabled={billingLocked} onChange={(e) => set('billable', e.target.checked)} className="accent-brand" />
          Facturar aparte
        </label>
        <p className="mt-1 text-xs text-slate-400">El importe queda previsto ahora y estará disponible para facturar cuando el trabajo pase a Hecho.</p>
        {billingLocked && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Este trabajo ya está incluido en una factura. Sus datos económicos están bloqueados.</p>}
        {t.billable && (
          <div className="mt-4 space-y-4">
            <Field label="Descripción en factura">
              <Input disabled={billingLocked} value={t.billingDescription ?? ''} onChange={(e) => set('billingDescription', e.target.value)} placeholder={t.title || 'Descripción del trabajo'} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Cantidad / horas"><NumberInput disabled={billingLocked} value={t.billingQuantity ?? 1} onValue={(value) => set('billingQuantity', value)} /></Field>
              <Field label="Precio unitario"><NumberInput disabled={billingLocked} value={t.billingUnitPrice ?? 0} onValue={(value) => set('billingUnitPrice', value)} /></Field>
              <Field label="Mes a facturar"><Input disabled={billingLocked} type="month" value={t.billingPeriod ?? currentPeriod()} onChange={(e) => set('billingPeriod', e.target.value)} /></Field>
            </div>
            <div className="text-right text-sm text-slate-500">Total previsto: <b className="text-slate-800">{money((t.billingQuantity ?? 1) * (t.billingUnitPrice ?? 0))}</b></div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Confirma el trabajo y habilita automáticamente su importe para facturación. */
export function CompleteTaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data, update } = useStore()
  const client = data.clients.find((c) => c.id === task?.clientId)
  if (!task) return null
  const finish = () => {
    const now = new Date().toISOString()
    update((d) => {
      const t = d.tasks.find((x) => x.id === task.id)
      if (!t) return
      t.status = 'hecho'
      t.doneAt = now
      syncTaskCharge(d, t)
    })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Marcar como hecho"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={finish}>Confirmar como hecho</Button>
        </>
      }
    >
      <p className="text-sm text-slate-500"><b>{task.title}</b> se marcará como terminado para {client?.name}.</p>
      {task.billable ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="font-medium">Quedará listo para facturar</div>
          <div className="mt-1">{task.billingDescription || task.title}</div>
          <div className="mt-2 tabular-nums">{task.billingQuantity ?? 1} × {money(task.billingUnitPrice ?? 0)} = <b>{money((task.billingQuantity ?? 1) * (task.billingUnitPrice ?? 0))}</b></div>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Este trabajo no se factura aparte.</p>
      )}
    </Modal>
  )
}

/* ---------------- Cargo (trabajo / gasto) ---------------- */

export function ChargeModal({ open, onClose, charge, clientId, period }: { open: boolean; onClose: () => void; charge?: Charge; clientId?: string; period?: string }) {
  const { data, update } = useStore()
  const blank = (): Charge => {
    const cid = clientId ?? data.clients.find((c) => c.active)?.id ?? ''
    const cl = data.clients.find((c) => c.id === cid)
    return { id: '', clientId: cid, period: period ?? currentPeriod(), date: todayISO(), description: '', quantity: 1, unitPrice: cl?.hourRate ?? 0, kind: 'desarrollo', invoiceId: null }
  }
  const [c, setC] = useState<Charge>(charge ?? blank())
  useEffect(() => {
    if (open) setC(charge ? { ...charge } : blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, charge, clientId, period])
  const set = <K extends keyof Charge>(k: K, v: Charge[K]) => setC((p) => ({ ...p, [k]: v }))
  const locked = !!charge?.invoiceId
  const save = () => {
    if (!c.description.trim() || !c.clientId) return
    const final = { ...c, id: c.id || uid('ch_') }
    update((d) => {
      const i = d.charges.findIndex((x) => x.id === final.id)
      if (i >= 0) d.charges[i] = final
      else d.charges.push(final)
    })
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={charge ? 'Editar trabajo / gasto' : 'Nuevo trabajo / gasto'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={!c.description.trim() || !c.clientId}>Guardar</Button>
        </>
      }
    >
      {locked && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Este cargo ya está en una factura. Los cambios no modifican la factura emitida.</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cliente">
          <Select
            value={c.clientId}
            onChange={(e) => {
              const cl = data.clients.find((x) => x.id === e.target.value)
              setC((p) => ({ ...p, clientId: e.target.value, unitPrice: p.kind === 'desarrollo' && cl ? cl.hourRate : p.unitPrice }))
            }}
          >
            <option value="">Elegí un cliente…</option>
            {data.clients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
        </Field>
        <Field label="Tipo">
          <Select value={c.kind} onChange={(e) => set('kind', e.target.value as Charge['kind'])}>
            <option value="desarrollo">Desarrollo personalizado</option>
            <option value="gasto">Gasto / servicio (Supabase, Resend…)</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
      </div>
      <Field label="Descripción en factura *">
        <Input autoFocus value={c.description} onChange={(e) => set('description', e.target.value)} placeholder="Actualización comprobante, nuevo flujo de inicio" />
      </Field>
      <div className="grid grid-cols-4 gap-4">
        <Field label="Cantidad"><NumberInput value={c.quantity} onValue={(v) => set('quantity', v)} /></Field>
        <Field label="Precio unitario" className="col-span-1"><NumberInput value={c.unitPrice} onValue={(v) => set('unitPrice', v)} /></Field>
        <Field label="Mes a facturar"><Input type="month" value={c.period} onChange={(e) => set('period', e.target.value)} /></Field>
        <Field label="Fecha"><Input type="date" value={c.date} onChange={(e) => set('date', e.target.value)} /></Field>
      </div>
      <div className="text-right text-sm text-slate-500">Total: <b className="text-slate-800">{money(lineTotal(c))}</b></div>
    </Modal>
  )
}
