import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Button, Card, Empty, Input, PageHeader } from '../components/ui'
import { ClientModal } from '../components/forms'
import { money, monthlyRecurring } from '../utils'

export default function Clients() {
  const { data } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const list = data.clients
    .filter((c) => showInactive || c.active)
    .filter((c) => `${c.name} ${c.contactName} ${c.website}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${data.clients.filter((c) => c.active).length} activos`} actions={<Button variant="primary" onClick={() => setOpen(true)}>+ Nuevo cliente</Button>} />
      <div className="mb-4 flex items-center gap-4">
        <Input className="max-w-xs" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-brand" /> Mostrar inactivos
        </label>
      </div>
      <Card>
        {list.length === 0 ? (
          <Empty>No hay clientes.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Cliente</th>
                <th className="px-5 py-2 font-medium">Contacto</th>
                <th className="px-5 py-2 text-right font-medium">Mantenimiento</th>
                <th className="px-5 py-2 text-right font-medium">Gastos fijos</th>
                <th className="px-5 py-2 text-right font-medium">Total mensual</th>
                <th className="px-5 py-2 text-center font-medium">Trabajos abiertos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((c) => {
                const pend = data.tasks.filter((t) => t.clientId === c.id && t.status !== 'hecho').length
                const fixed = c.recurring.filter((r) => r.active).reduce((s, r) => s + r.quantity * r.unitPrice, 0)
                return (
                  <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => nav(`/clientes/${c.id}`)}>
                    <td className="px-5 py-3">
                      <Link to={`/clientes/${c.id}`} className="font-medium text-slate-800">{c.name}</Link>
                      {!c.active && <span className="ml-2 text-xs text-slate-400">(inactivo)</span>}
                      {c.website && <div className="text-xs text-slate-400">{c.website}</div>}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c.contactName}<div className="text-xs text-slate-400">{c.email}</div></td>
                    <td className="px-5 py-3 text-right tabular-nums">{c.maintenanceActive ? money(c.maintenanceAmount) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{fixed ? money(fixed) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-brand">{money(monthlyRecurring(c))}</td>
                    <td className="px-5 py-3 text-center">{pend ? <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">{pend}</span> : <span className="text-slate-300">0</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
      <ClientModal open={open} onClose={() => setOpen(false)} onSaved={(id) => nav(`/clientes/${id}`)} />
    </>
  )
}
