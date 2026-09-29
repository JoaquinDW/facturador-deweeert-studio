import { useState } from 'react'
import { useStore } from '../store'
import { Button, Card, Empty, PageHeader, Select } from '../components/ui'
import { ChargeModal } from '../components/forms'
import { ChargesTable } from './ClientDetail'
import { PeriodPicker } from './Dashboard'
import { currentPeriod, lineTotal, money } from '../utils'
import type { Charge } from '../types'

export default function Charges() {
  const { data } = useStore()
  const [period, setPeriod] = useState(currentPeriod())
  const [all, setAll] = useState(false)
  const [client, setClient] = useState('')
  const [modal, setModal] = useState<{ open: boolean; charge?: Charge }>({ open: false })

  const list = data.charges
    .filter((c) => all || c.period === period)
    .filter((c) => !client || c.clientId === client)
    .sort((a, b) => b.period.localeCompare(a.period) || b.date.localeCompare(a.date))
  const total = list.reduce((s, c) => s + lineTotal(c), 0)
  const unbilled = list.filter((c) => !c.invoiceId).reduce((s, c) => s + lineTotal(c), 0)

  return (
    <>
      <PageHeader
        title="Trabajos y gastos"
        subtitle="Desarrollos a medida y gastos puntuales que se suman a la factura del mes"
        actions={<Button variant="primary" onClick={() => setModal({ open: true })}>+ Trabajo / gasto</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {!all && <PeriodPicker value={period} onChange={setPeriod} />}
        <label className="flex items-center gap-2 text-sm text-slate-500"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-brand" /> Todos los meses</label>
        <Select className="max-w-56" value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">Todos los clientes</option>
          {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div className="ml-auto text-sm text-slate-500">Total <b className="text-slate-800">{money(total)}</b> · sin facturar <b className="text-accent">{money(unbilled)}</b></div>
      </div>
      <Card>
        {list.length === 0 ? <Empty>No hay trabajos ni gastos cargados para este filtro.</Empty> : <ChargesTable charges={list} showClient onEdit={(ch) => setModal({ open: true, charge: ch })} />}
      </Card>
      <ChargeModal open={modal.open} charge={modal.charge} clientId={client || undefined} period={all ? undefined : period} onClose={() => setModal({ open: false })} />
    </>
  )
}
