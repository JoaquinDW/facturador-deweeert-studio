import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { Badge, Button, Card, Empty, PageHeader, confirmAction } from '../components/ui'
import { ChargeModal, ClientModal, CompleteTaskModal, TaskModal } from '../components/forms'
import { fmtDate, invoiceTotal, lineTotal, money, monthlyRecurring, periodLabel, qty, taskCategoryLabel } from '../utils'
import type { Charge, Task } from '../types'

export default function ClientDetail() {
  const { id } = useParams()
  const { data, update } = useStore()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [chargeModal, setChargeModal] = useState<{ open: boolean; charge?: Charge }>({ open: false })
  const [completing, setCompleting] = useState<Task | null>(null)
  const [showDone, setShowDone] = useState(false)

  const c = data.clients.find((x) => x.id === id)
  if (!c) return <Empty>Cliente no encontrado. <Link to="/clientes" className="text-brand underline">Volver</Link></Empty>

  const tasks = data.tasks.filter((t) => t.clientId === c.id && (showDone || t.status !== 'hecho')).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const charges = data.charges.filter((ch) => ch.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date))
  const historicalCharges = charges.filter((charge) => !data.tasks.some((task) => task.id === charge.taskId || task.chargeId === charge.id))
  const invoices = data.invoices.filter((i) => i.clientId === c.id).sort((a, b) => b.number - a.number)
  const due = invoices.filter((i) => i.status === 'emitida').reduce((s, i) => s + invoiceTotal(i), 0)
  const taskBillingState = (task: Task) => {
    if (!task.billable) return 'no facturable'
    const charge = task.chargeId ? charges.find((item) => item.id === task.chargeId) : undefined
    return charge?.invoiceId ? 'facturado' : charge ? 'sin facturar' : 'previsto'
  }

  const del = () => {
    if (invoices.length) {
      if (confirmAction('Este cliente tiene facturas. ¿Marcarlo como inactivo en lugar de eliminarlo?')) update((d) => { d.clients.find((x) => x.id === c.id)!.active = false })
      return
    }
    if (!confirmAction(`¿Eliminar ${c.name} con sus trabajos y cargos?`)) return
    update((d) => {
      d.clients = d.clients.filter((x) => x.id !== c.id)
      d.tasks = d.tasks.filter((x) => x.clientId !== c.id)
      d.charges = d.charges.filter((x) => x.clientId !== c.id)
    })
    nav('/clientes')
  }

  return (
    <>
      <div className="mb-2 text-sm"><Link to="/clientes" className="text-slate-400 hover:text-brand">← Clientes</Link></div>
      <PageHeader
        title={<>{c.name} {!c.active && <span className="text-base font-normal text-slate-400">(inactivo)</span>}</>}
        subtitle={[c.contactName, c.email, c.phone, c.website].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button variant="danger" onClick={del}>Eliminar</Button>
            <Button onClick={() => setEditing(true)}>Editar</Button>
            <Button variant="primary" onClick={() => nav(`/facturas/nueva?cliente=${c.id}`)}>Generar factura</Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <Card title="Mensual fijo" className="col-span-1">
          <div className="space-y-2 px-5 py-4 text-sm">
            {c.maintenanceActive ? (
              <div className="flex justify-between gap-2"><span className="text-slate-600">{c.maintenanceDescription}</span><span className="tabular-nums">{money(c.maintenanceAmount)}</span></div>
            ) : (
              <div className="text-slate-400">Sin mantenimiento mensual</div>
            )}
            {c.recurring.map((r) => (
              <div key={r.id} className={`flex justify-between gap-2 ${r.active ? '' : 'text-slate-300 line-through'}`}>
                <span className="text-slate-600">{r.description}{r.quantity !== 1 && ` ×${qty(r.quantity)}`}</span>
                <span className="tabular-nums">{money(lineTotal(r))}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-brand"><span>Total mensual</span><span className="tabular-nums">{money(monthlyRecurring(c))}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Valor hora</span><span>{money(c.hourRate)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Próxima factura</span><span>N.º {c.nextInvoiceNumber}</span></div>
            {due > 0 && <div className="flex justify-between text-xs text-accent"><span>Adeuda (facturas emitidas)</span><span>{money(due)}</span></div>}
          </div>
          {c.notes && <div className="whitespace-pre-wrap border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{c.notes}</div>}
        </Card>

        <Card
          className="col-span-2"
          title="Trabajos"
          actions={
            <>
              <label className="flex items-center gap-1.5 text-xs text-slate-400"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-brand" />Ver hechos</label>
              <Button size="sm" variant="primary" onClick={() => setTaskModal({ open: true })}>+ Trabajo</Button>
            </>
          }
        >
          {tasks.length === 0 ? (
            <Empty>Sin trabajos con este cliente.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  {t.status === 'hecho' ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">✓</span>
                  ) : (
                    <button title="Marcar hecho" onClick={() => setCompleting(t)} className="h-5 w-5 shrink-0 cursor-pointer rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50" />
                  )}
                  <button className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => setTaskModal({ open: true, task: t })}>
                    <div className={`text-sm font-medium ${t.status === 'hecho' ? 'text-slate-400 line-through' : ''}`}>{t.title}</div>
                    {(t.description || t.dueDate) && <div className="truncate text-xs text-slate-400">{t.dueDate && `vence ${fmtDate(t.dueDate)} · `}{t.description}</div>}
                  </button>
                  <Badge value={t.category}>{taskCategoryLabel[t.category]}</Badge>
                  <Badge value={taskBillingState(t)}>
                    {taskBillingState(t) === 'sin facturar' ? 'listo para facturar' : taskBillingState(t)}
                  </Badge>
                  <Badge value={t.priority} />
                  <Badge value={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {historicalCharges.length > 0 && (
        <Card className="mt-6" title="Cargos anteriores">
          <ChargesTable charges={historicalCharges} onEdit={(ch) => setChargeModal({ open: true, charge: ch })} />
          {historicalCharges.some((ch) => !ch.invoiceId) && <div className="border-t border-slate-100 px-5 py-2 text-right text-xs text-slate-500">Sin facturar: <b>{money(historicalCharges.filter((ch) => !ch.invoiceId).reduce((s, ch) => s + lineTotal(ch), 0))}</b></div>}
        </Card>
      )}

      <Card className="mt-6" title="Facturas">
        {invoices.length === 0 ? (
          <Empty>Todavía no hay facturas.</Empty>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {invoices.map((i) => (
                <tr key={i.id} className="cursor-pointer hover:bg-slate-50" onClick={() => nav(`/facturas/${i.id}`)}>
                  <td className="px-5 py-3 font-medium">N.º {i.number}</td>
                  <td className="px-5 py-3">{periodLabel(i.period)}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtDate(i.date)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(invoiceTotal(i))}</td>
                  <td className="px-5 py-3 text-right"><Badge value={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ClientModal open={editing} onClose={() => setEditing(false)} client={c} />
      <TaskModal open={taskModal.open} task={taskModal.task} clientId={c.id} onClose={() => setTaskModal({ open: false })} />
      <ChargeModal open={chargeModal.open} charge={chargeModal.charge} clientId={c.id} onClose={() => setChargeModal({ open: false })} />
      <CompleteTaskModal task={completing} onClose={() => setCompleting(null)} />
    </>
  )
}

export function ChargesTable({ charges, onEdit, showClient }: { charges: Charge[]; onEdit: (c: Charge) => void; showClient?: boolean }) {
  const { data, update } = useStore()
  const nav = useNavigate()
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-slate-400">
        <tr>
          <th className="px-5 py-2 font-medium">Mes</th>
          {showClient && <th className="px-5 py-2 font-medium">Cliente</th>}
          <th className="px-5 py-2 font-medium">Descripción</th>
          <th className="px-5 py-2 font-medium">Tipo</th>
          <th className="px-5 py-2 text-right font-medium">Cant.</th>
          <th className="px-5 py-2 text-right font-medium">Precio</th>
          <th className="px-5 py-2 text-right font-medium">Total</th>
          <th className="px-5 py-2 font-medium">Factura</th>
          <th />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {charges.map((ch) => {
          const inv = ch.invoiceId ? data.invoices.find((i) => i.id === ch.invoiceId) : undefined
          return (
            <tr key={ch.id} className="hover:bg-slate-50">
              <td className="px-5 py-2.5 whitespace-nowrap text-slate-500">{periodLabel(ch.period)}</td>
              {showClient && <td className="px-5 py-2.5">{data.clients.find((c) => c.id === ch.clientId)?.name}</td>}
              <td className="cursor-pointer px-5 py-2.5" onClick={() => onEdit(ch)}>{ch.description}</td>
              <td className="px-5 py-2.5"><Badge value={ch.kind} /></td>
              <td className="px-5 py-2.5 text-right tabular-nums">{qty(ch.quantity)}</td>
              <td className="px-5 py-2.5 text-right tabular-nums">{money(ch.unitPrice)}</td>
              <td className="px-5 py-2.5 text-right font-medium tabular-nums">{money(lineTotal(ch))}</td>
              <td className="px-5 py-2.5">
                {inv ? <button className="cursor-pointer" onClick={() => nav(`/facturas/${inv.id}`)}><Badge value="facturado">N.º {inv.number}</Badge></button> : <Badge value="sin facturar" />}
              </td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                <Button size="sm" variant="ghost" onClick={() => onEdit(ch)}>Editar</Button>
                {!inv && (
                  <Button size="sm" variant="danger" onClick={() => confirmAction('¿Eliminar este cargo?') && update((d) => { d.charges = d.charges.filter((x) => x.id !== ch.id); d.tasks.forEach((t) => { if (t.chargeId === ch.id) delete t.chargeId }) })}>✕</Button>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
