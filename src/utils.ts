import type { Client, Data, Invoice, InvoiceItem } from './types'

export const uid = (prefix = '') =>
  prefix + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 12)

const nf = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const money = (n: number) => (n < 0 ? '-$' : '$') + nf.format(Math.abs(n || 0))
export const qty = (n: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n || 0)

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const currentPeriod = () => todayISO().slice(0, 7)
export const periodLabel = (p: string) => {
  const [y, m] = p.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}
export const shiftPeriod = (p: string, delta: number) => {
  const [y, m] = p.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const fmtDate = (iso?: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const lineTotal = (i: { quantity: number; unitPrice: number }) => Math.round(i.quantity * i.unitPrice * 100) / 100
export const subtotal = (items: InvoiceItem[]) => items.reduce((s, i) => s + lineTotal(i), 0)
export const invoiceTotal = (inv: Pick<Invoice, 'items' | 'adjustments'>) => subtotal(inv.items) + (inv.adjustments || 0)

/** Total mensual fijo del cliente (mantenimiento + gastos recurrentes) */
export const monthlyRecurring = (c: Client) =>
  (c.maintenanceActive ? c.maintenanceAmount : 0) +
  c.recurring.filter((r) => r.active).reduce((s, r) => s + lineTotal(r), 0)

/** Ítems sugeridos para la factura de un cliente en un período */
export function suggestedItems(data: Data, client: Client, period: string): InvoiceItem[] {
  const items: InvoiceItem[] = []
  for (const r of client.recurring.filter((r) => r.active))
    items.push({ description: r.description, quantity: r.quantity, unitPrice: r.unitPrice })
  for (const ch of data.charges.filter((c) => c.clientId === client.id && c.period === period && !c.invoiceId))
    items.push({ description: ch.description, quantity: ch.quantity, unitPrice: ch.unitPrice, chargeId: ch.id })
  if (client.maintenanceActive && client.maintenanceAmount > 0) {
    const desc = client.maintenanceDescription || `Mantenimiento ${client.website || client.name}`
    items.push({
      description: desc,
      quantity: 1,
      unitPrice: client.maintenanceAmount,
      link: client.website && desc.includes(client.website) ? client.website : undefined,
    })
  }
  return items
}

export const invoiceFileName = (inv: Invoice) =>
  `Factura ${inv.client.name} - ${periodLabel(inv.period).split(' ')[0]} ${inv.period.slice(0, 4)} N${inv.number}.pdf`

export const parseNum = (v: string) => {
  // acepta "0,5", "48.275,00", "48275.5"
  const s = v.trim()
  if (!s) return 0
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.')) || 0
  return Number(s) || 0
}
