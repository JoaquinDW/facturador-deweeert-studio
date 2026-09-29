import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Badge, Button, Card, Empty, PageHeader, Stat } from '../components/ui'
import { CompleteTaskModal, TaskModal } from '../components/forms'
import { currentPeriod, fmtDate, invoiceTotal, lineTotal, money, monthlyRecurring, periodLabel, shiftPeriod, taskCategoryLabel } from '../utils'
import type { Task } from '../types'

export function PeriodPicker({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
      <button className="cursor-pointer px-3 py-2 text-slate-500 hover:text-brand" onClick={() => onChange(shiftPeriod(value, -1))}>‹</button>
      <span className="min-w-36 text-center text-sm font-medium">{periodLabel(value)}</span>
      <button className="cursor-pointer px-3 py-2 text-slate-500 hover:text-brand" onClick={() => onChange(shiftPeriod(value, 1))}>›</button>
    </div>
  )
}

export default function Dashboard() {
  const { data } = useStore()
  const nav = useNavigate()
  // Por defecto: el mes anterior (se factura a mes vencido)
  const [period, setPeriod] = useState(shiftPeriod(currentPeriod(), -1))
  const [newTask, setNewTask] = useState(false)
  const [completing, setCompleting] = useState<Task | null>(null)

  const active = data.clients.filter((c) => c.active)
  const mrr = active.reduce((s, c) => s + monthlyRecurring(c), 0)
  const periodInvoices = data.invoices.filter((i) => i.period === period && i.status !== 'anulada')
  const billed = periodInvoices.reduce((s, i) => s + invoiceTotal(i), 0)
  const unpaid = data.invoices.filter((i) => i.status === 'emitida')
  const unpaidTotal = unpaid.reduce((s, i) => s + invoiceTotal(i), 0)
  const open = data.tasks
    .filter((t) => t.status !== 'hecho')
    .sort((a, b) => ({ alta: 0, media: 1, baja: 2 })[a.priority] - ({ alta: 0, media: 1, baja: 2 })[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'))

  const rows = active.map((c) => {
    const inv = periodInvoices.find((i) => i.clientId === c.id)
    const pendingCharges = data.charges.filter((ch) => ch.clientId === c.id && ch.period === period && !ch.invoiceId)
    const estimate = inv ? invoiceTotal(inv) : monthlyRecurring(c) + pendingCharges.reduce((s, ch) => s + lineTotal(ch), 0)
    return { c, inv, pendingCharges, estimate }
  })

  return (
    <>
      <PageHeader
        title="Panel"
        subtitle="Resumen de facturación y trabajos"
        actions={
          <>
            <Button onClick={() => setNewTask(true)}>+ Trabajo</Button>
            <Button variant="primary" onClick={() => nav(`/facturas/nueva?periodo=${period}`)}>+ Factura</Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Recurrente mensual" value={money(mrr)} sub={`${active.filter((c) => c.maintenanceActive).length} clientes con mantenimiento`} />
        <Stat label={`Facturado ${periodLabel(period)}`} value={money(billed)} sub={`${periodInvoices.length} de ${active.length} clientes`} />
        <Stat label="Por cobrar" value={money(unpaidTotal)} sub={`${unpaid.length} facturas emitidas`} tone="accent" />
        <Stat label="Trabajos abiertos" value={open.length} sub={`${open.filter((t) => t.priority === 'alta').length} de prioridad alta`} />
      </div>

      <Card
        className="mt-6"
        title={<span className="flex items-center gap-3">Facturación del mes <PeriodPicker value={period} onChange={setPeriod} /></span>}
      >
        {rows.length === 0 ? (
          <Empty>Todavía no hay clientes activos. <Link className="text-brand underline" to="/clientes">Agregá el primero</Link>.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Cliente</th>
                <th className="px-5 py-2 font-medium">Trabajos extra sin facturar</th>
                <th className="px-5 py-2 text-right font-medium">Monto</th>
                <th className="px-5 py-2 font-medium">Estado</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ c, inv, pendingCharges, estimate }) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link to={`/clientes/${c.id}`} className="font-medium text-slate-800 hover:text-brand">{c.name}</Link>
                    <div className="text-xs text-slate-400">{c.contactName}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{pendingCharges.length ? `${pendingCharges.length} · ${money(pendingCharges.reduce((s, ch) => s + lineTotal(ch), 0))}` : '—'}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {money(estimate)}
                    {!inv && <div className="text-xs text-slate-400">estimado</div>}
                  </td>
                  <td className="px-5 py-3">{inv ? <Badge value={inv.status}>N.º {inv.number} · {inv.status}</Badge> : <Badge value="sin facturar" />}</td>
                  <td className="px-5 py-3 text-right">
                    {inv ? (
                      <Button size="sm" onClick={() => nav(`/facturas/${inv.id}`)}>Ver factura</Button>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => nav(`/facturas/nueva?cliente=${c.id}&periodo=${period}`)}>Generar factura</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mt-6" title="Trabajos abiertos" actions={<Link to="/trabajos" className="text-xs text-brand hover:underline">Ver todos →</Link>}>
        {open.length === 0 ? (
          <Empty>No hay trabajos abiertos.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {open.slice(0, 8).map((t) => {
              const c = data.clients.find((x) => x.id === t.clientId)
              const overdue = t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10)
              return (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <button title="Marcar hecho" onClick={() => setCompleting(t)} className="h-5 w-5 shrink-0 cursor-pointer rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-slate-400">{c?.name} · {taskCategoryLabel[t.category]}{t.dueDate && <span className={overdue ? 'text-red-500' : ''}> · vence {fmtDate(t.dueDate)}</span>}</div>
                  </div>
                  <Badge value={t.priority} />
                  <Badge value={t.status} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <TaskModal open={newTask} onClose={() => setNewTask(false)} />
      <CompleteTaskModal task={completing} onClose={() => setCompleting(null)} />
    </>
  )
}
