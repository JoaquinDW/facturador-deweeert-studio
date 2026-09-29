import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PDFViewer } from '@react-pdf/renderer'
import { useStore } from '../store'
import { Badge, Button, Card, Empty, PageHeader, confirmAction } from '../components/ui'
import { InvoiceDocument, downloadInvoicePdf } from '../pdf/InvoicePDF'
import { fmtDate, invoiceTotal, money, periodLabel, todayISO } from '../utils'

export default function InvoiceView() {
  const { id } = useParams()
  const { data, update } = useStore()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const inv = data.invoices.find((i) => i.id === id)
  if (!inv) return <Empty>Factura no encontrada. <Link to="/facturas" className="text-brand underline">Volver</Link></Empty>

  const setStatus = (status: typeof inv.status) =>
    update((d) => {
      const x = d.invoices.find((y) => y.id === inv.id)!
      x.status = status
      x.paidAt = status === 'pagada' ? todayISO() : undefined
      if (status === 'anulada') {
        // liberar los trabajos para poder facturarlos de nuevo
        d.charges.forEach((ch) => { if (ch.invoiceId === inv.id) ch.invoiceId = null })
        x.chargeIds = []
      }
    })

  const remove = () => {
    if (!confirmAction(`¿Eliminar la factura N.º ${inv.number}? Los trabajos vinculados vuelven a "sin facturar".`)) return
    update((d) => {
      d.invoices = d.invoices.filter((x) => x.id !== inv.id)
      d.charges.forEach((ch) => { if (ch.invoiceId === inv.id) ch.invoiceId = null })
      const client = d.clients.find((c) => c.id === inv.clientId)
      if (client?.nextInvoiceNumber === inv.number + 1) client.nextInvoiceNumber = inv.number
    })
    nav('/facturas')
  }

  const download = async () => {
    setBusy(true)
    try { await downloadInvoicePdf(inv, data.settings) } finally { setBusy(false) }
  }

  return (
    <>
      <div className="mb-2 text-sm"><Link to="/facturas" className="text-slate-400 hover:text-brand">← Facturas</Link></div>
      <PageHeader
        title={<>Factura N.º {inv.number} <Badge value={inv.status} /></>}
        subtitle={<><Link className="hover:text-brand" to={`/clientes/${inv.clientId}`}>{inv.client.name}</Link> · {periodLabel(inv.period)} · {fmtDate(inv.date)}{inv.paidAt && ` · pagada el ${fmtDate(inv.paidAt)}`}</>}
        actions={
          <>
            <Button variant="danger" onClick={remove}>Eliminar</Button>
            <Button onClick={() => nav(`/facturas/${inv.id}/editar`)}>Editar</Button>
            {inv.status === 'emitida' && <Button onClick={() => setStatus('pagada')}>✓ Marcar pagada</Button>}
            {inv.status === 'pagada' && <Button onClick={() => setStatus('emitida')}>Marcar impaga</Button>}
            {inv.status !== 'anulada' ? <Button variant="ghost" onClick={() => confirmAction('¿Anular esta factura?') && setStatus('anulada')}>Anular</Button> : <Button onClick={() => setStatus('emitida')}>Reactivar</Button>}
            <Button variant="accent" onClick={download} disabled={busy}>{busy ? 'Generando…' : '⬇ Descargar PDF'}</Button>
          </>
        }
      />
      <div className="grid grid-cols-[1fr_260px] gap-6">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <PDFViewer width="100%" height={880} showToolbar style={{ border: 0 }}>
            <InvoiceDocument invoice={inv} settings={data.settings} />
          </PDFViewer>
        </div>
        <Card title="Resumen" className="self-start">
          <div className="space-y-2 px-5 py-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Ítems</span><span>{inv.items.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ajustes</span><span className="tabular-nums">{money(inv.adjustments)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-lg font-bold text-accent"><span>Total</span><span className="tabular-nums">{money(invoiceTotal(inv))}</span></div>
          </div>
        </Card>
      </div>
    </>
  )
}
