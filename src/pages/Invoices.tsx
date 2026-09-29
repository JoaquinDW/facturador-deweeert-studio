import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Badge, Button, Card, Empty, PageHeader, Select } from '../components/ui'
import { downloadInvoicePdf } from '../pdf/InvoicePDF'
import { fmtDate, invoiceTotal, money, periodLabel } from '../utils'

export default function Invoices() {
  const { data } = useStore()
  const nav = useNavigate()
  const [status, setStatus] = useState('')
  const [client, setClient] = useState('')
  const list = data.invoices
    .filter((i) => !status || i.status === status)
    .filter((i) => !client || i.clientId === client)
    .sort((a, b) => b.number - a.number)
  const total = list.filter((i) => i.status !== 'anulada').reduce((s, i) => s + invoiceTotal(i), 0)

  return (
    <>
      <PageHeader
        title="Facturas"
        subtitle={client ? `Próximo número: ${data.clients.find((c) => c.id === client)?.nextInvoiceNumber}` : 'Numeración independiente por cliente'}
        actions={<Button variant="primary" onClick={() => nav('/facturas/nueva')}>+ Nueva factura</Button>}
      />
      <div className="mb-4 flex items-center gap-3">
        <Select className="max-w-56" value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">Todos los clientes</option>
          {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select className="max-w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="emitida">Emitidas (impagas)</option>
          <option value="pagada">Pagadas</option>
          <option value="anulada">Anuladas</option>
        </Select>
        <div className="ml-auto text-sm text-slate-500">Total: <b className="text-slate-800">{money(total)}</b></div>
      </div>
      <Card>
        {list.length === 0 ? (
          <Empty>No hay facturas.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">N.º</th>
                <th className="px-5 py-2 font-medium">Cliente</th>
                <th className="px-5 py-2 font-medium">Período</th>
                <th className="px-5 py-2 font-medium">Fecha</th>
                <th className="px-5 py-2 text-right font-medium">Total</th>
                <th className="px-5 py-2 font-medium">Estado</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((i) => (
                <tr key={i.id} className="cursor-pointer hover:bg-slate-50" onClick={() => nav(`/facturas/${i.id}`)}>
                  <td className="px-5 py-3 font-semibold text-brand">{i.number}</td>
                  <td className="px-5 py-3">{i.client.name}</td>
                  <td className="px-5 py-3">{periodLabel(i.period)}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtDate(i.date)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(invoiceTotal(i))}</td>
                  <td className="px-5 py-3"><Badge value={i.status} /></td>
                  <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" onClick={() => downloadInvoicePdf(i, data.settings)}>PDF</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
