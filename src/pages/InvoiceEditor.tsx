import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { Button, Card, Field, Input, NumberInput, PageHeader, Select, Textarea } from '../components/ui'
import type { Invoice, InvoiceItem } from '../types'
import { currentPeriod, lineTotal, money, periodLabel, shiftPeriod, subtotal, suggestedItems, todayISO, uid } from '../utils'

export default function InvoiceEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { data, update } = useStore()
  const nav = useNavigate()
  const existing = id ? data.invoices.find((i) => i.id === id) : undefined

  const [clientId, setClientId] = useState(existing?.clientId ?? params.get('cliente') ?? '')
  const [period, setPeriod] = useState(existing?.period ?? params.get('periodo') ?? shiftPeriod(currentPeriod(), -1))
  const [number, setNumber] = useState(existing?.number ?? data.settings.nextInvoiceNumber)
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [items, setItems] = useState<InvoiceItem[]>(existing?.items ?? [])
  const [adjustments, setAdjustments] = useState(existing?.adjustments ?? 0)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [notesTouched, setNotesTouched] = useState(!!existing)
  const [rowKeys, setRowKeys] = useState<string[]>(() => (existing?.items ?? []).map(() => uid()))

  const client = data.clients.find((c) => c.id === clientId)

  // Al elegir cliente/mes en una factura nueva, precargar mantenimiento + gastos fijos + trabajos del mes
  useEffect(() => {
    if (existing || !client) return
    const sug = suggestedItems(data, client, period)
    setItems(sug)
    setRowKeys(sug.map(() => uid()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, period])

  useEffect(() => {
    if (!notesTouched) setNotes(`Periodo ${periodLabel(period)}`)
  }, [period, notesTouched])

  const duplicate = data.invoices.find((i) => i.clientId === clientId && i.period === period && i.status !== 'anulada' && i.id !== existing?.id)
  const numberTaken = data.invoices.some((i) => i.number === number && i.id !== existing?.id)

  const usedChargeIds = new Set(items.map((i) => i.chargeId).filter(Boolean))
  const otherUnbilled = useMemo(
    () => data.charges.filter((ch) => ch.clientId === clientId && (!ch.invoiceId || ch.invoiceId === existing?.id) && !usedChargeIds.has(ch.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.charges, clientId, items, existing?.id],
  )

  const setItem = (i: number, patch: Partial<InvoiceItem>) => setItems((p) => p.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const addItem = (it: InvoiceItem) => {
    setItems((p) => [...p, it])
    setRowKeys((k) => [...k, uid()])
  }
  const removeItem = (i: number) => {
    setItems((p) => p.filter((_, j) => j !== i))
    setRowKeys((k) => k.filter((_, j) => j !== i))
  }
  const moveItem = (i: number, d: -1 | 1) => {
    const swap = <T,>(arr: T[]) => {
      const a = [...arr]
      const j = i + d
      if (j < 0 || j >= a.length) return arr
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    }
    setItems(swap)
    setRowKeys(swap)
  }

  const sub = subtotal(items)
  const canSave = !!client && items.length > 0 && items.every((i) => i.description.trim()) && !numberTaken

  const save = () => {
    if (!client || !canSave) return
    const invId = existing?.id ?? uid('inv_')
    const chargeIds = items.map((i) => i.chargeId).filter((x): x is string => !!x)
    const inv: Invoice = {
      id: invId,
      number,
      clientId: client.id,
      period,
      date,
      items: items.map((i) => ({ ...i, description: i.description.trim() })),
      adjustments,
      notes,
      status: existing?.status ?? 'emitida',
      paidAt: existing?.paidAt,
      chargeIds,
      client: { name: client.name, contactName: client.contactName },
    }
    update((d) => {
      const idx = d.invoices.findIndex((x) => x.id === invId)
      if (idx >= 0) d.invoices[idx] = inv
      else d.invoices.push(inv)
      for (const ch of d.charges) {
        if (chargeIds.includes(ch.id)) ch.invoiceId = invId
        else if (ch.invoiceId === invId) ch.invoiceId = null
      }
      if (number >= d.settings.nextInvoiceNumber) d.settings.nextInvoiceNumber = number + 1
    })
    nav(`/facturas/${invId}`)
  }

  return (
    <>
      <div className="mb-2 text-sm"><Link to="/facturas" className="text-slate-400 hover:text-brand">← Facturas</Link></div>
      <PageHeader
        title={existing ? `Editar factura N.º ${existing.number}` : 'Nueva factura'}
        subtitle="Se precarga el mantenimiento, los gastos fijos y los trabajos del mes. Podés editar todo."
        actions={
          <>
            <Button variant="ghost" onClick={() => nav(-1)}>Cancelar</Button>
            <Button variant="primary" disabled={!canSave} onClick={save}>{existing ? 'Guardar cambios' : 'Crear factura'}</Button>
          </>
        }
      />

      <Card>
        <div className="grid grid-cols-4 gap-4 p-5">
          <Field label="Cliente" className="col-span-2">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={!!existing}>
              <option value="">Elegí un cliente…</option>
              {data.clients.filter((c) => c.active || c.id === clientId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Mes facturado"><Input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="N.º"><NumberInput value={number} onValue={(v) => setNumber(Math.round(v))} className={numberTaken ? 'border-red-400' : ''} /></Field>
            <Field label="Fecha"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
        </div>
        {(duplicate || numberTaken) && (
          <div className="mx-5 mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {duplicate && <>Ya existe la factura <Link className="underline" to={`/facturas/${duplicate.id}`}>N.º {duplicate.number}</Link> para {client?.name} en {periodLabel(period)}. </>}
            {numberTaken && <>El N.º {number} ya está usado.</>}
          </div>
        )}
      </Card>

      <Card className="mt-6" title="Ítems" actions={<Button size="sm" onClick={() => addItem({ description: '', quantity: 1, unitPrice: client?.hourRate ?? 0 })}>+ Línea</Button>}>
        {!client ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">Elegí un cliente para empezar.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr>
                <th className="w-14" />
                <th className="px-2 py-2 font-medium">Descripción</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Cantidad</th>
                <th className="w-40 px-2 py-2 text-right font-medium">Precio unitario</th>
                <th className="w-32 px-2 py-2 text-right font-medium">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={rowKeys[i]} className="border-t border-slate-100">
                  <td className="pl-3 text-slate-300">
                    <button className="cursor-pointer px-0.5 hover:text-brand" onClick={() => moveItem(i, -1)}>▲</button>
                    <button className="cursor-pointer px-0.5 hover:text-brand" onClick={() => moveItem(i, 1)}>▼</button>
                  </td>
                  <td className="px-2 py-1.5">
                    <Input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Descripción" />
                    {it.chargeId && <div className="mt-0.5 text-[11px] text-emerald-600">vinculado a un trabajo cargado</div>}
                  </td>
                  <td className="px-2 py-1.5"><NumberInput className="text-right" value={it.quantity} onValue={(v) => setItem(i, { quantity: v })} /></td>
                  <td className="px-2 py-1.5"><NumberInput className="text-right" value={it.unitPrice} onValue={(v) => setItem(i, { unitPrice: v })} /></td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{money(lineTotal(it))}</td>
                  <td className="pr-3 text-right"><Button size="sm" variant="danger" onClick={() => removeItem(i)}>✕</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {otherUnbilled.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <div className="mb-2 text-xs font-medium text-slate-500">Otros trabajos sin facturar de {client?.name}</div>
            <div className="flex flex-wrap gap-2">
              {otherUnbilled.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => addItem({ description: ch.description, quantity: ch.quantity, unitPrice: ch.unitPrice, chargeId: ch.id })}
                  className="cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-brand hover:text-brand"
                >
                  + {ch.description} · {money(lineTotal(ch))} <span className="text-slate-400">({periodLabel(ch.period)})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-8 border-t border-slate-200 px-5 py-4">
          <Field label="Notas (aparecen en la factura)">
            <Textarea rows={2} value={notes} onChange={(e) => { setNotes(e.target.value); setNotesTouched(true) }} />
          </Field>
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold tabular-nums">{money(sub)}</span></div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Ajustes <span className="text-xs">(desc. negativo)</span></span>
              <NumberInput className="w-32 py-1 text-right" value={adjustments} onValue={setAdjustments} />
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-xl font-bold text-accent"><span>Total</span><span className="tabular-nums">{money(sub + adjustments)}</span></div>
          </div>
        </div>
      </Card>
    </>
  )
}
