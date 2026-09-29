import { Document, Font, Link, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import roboto400 from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url'
import roboto500 from '@fontsource/roboto/files/roboto-latin-500-normal.woff?url'
import roboto700 from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url'
import type { Invoice, Settings } from '../types'
import { fmtDate, invoiceFileName, lineTotal, money, qty, subtotal } from '../utils'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: roboto400, fontWeight: 400 },
    { src: roboto500, fontWeight: 500 },
    { src: roboto700, fontWeight: 700 },
  ],
})
Font.registerHyphenationCallback((w) => [w])

const NAVY = '#25318f'
const VIOLET = '#6b63e0'
const MAGENTA = '#e5157a'
const GRAY = '#6b6b6b'
const LIGHT = '#f3f3f3'
const LINK = '#1155cc'

const s = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 7.5, color: '#222', paddingTop: 50, paddingBottom: 50, paddingLeft: 82, paddingRight: 83 },
  bar: { position: 'absolute', top: 53, left: 49, right: 50, height: 5, backgroundColor: NAVY },
  studio: { marginTop: 26, fontSize: 15, color: VIOLET },
  location: { marginTop: 18, fontSize: 7.5, color: GRAY },
  title: { marginTop: 30, fontSize: 27, fontWeight: 700, color: NAVY },
  date: { marginTop: 7, fontSize: 8.5, fontWeight: 700, color: MAGENTA },
  metaRow: { flexDirection: 'row', marginTop: 15 },
  metaCol1: { width: 139 },
  metaCol2: { width: 102 },
  metaLabel: { fontSize: 9, fontWeight: 500, color: '#333' },
  metaValue: { marginTop: 7, fontSize: 7.5, color: GRAY },
  divider: { marginTop: 19, borderBottomWidth: 0.75, borderBottomColor: '#bdbdbd' },
  thead: { flexDirection: 'row', marginTop: 18, paddingBottom: 8 },
  th: { fontSize: 9, fontWeight: 500, color: NAVY },
  row: { flexDirection: 'row', alignItems: 'center', fontSize: 7.8, paddingVertical: 4, paddingHorizontal: 0 },
  cDesc: { flex: 1, paddingRight: 8, paddingLeft: 2 },
  cQty: { width: 50, textAlign: 'right' },
  cUnit: { width: 120, textAlign: 'right' },
  cTotal: { width: 75, textAlign: 'right', paddingRight: 2 },
  muted: { color: GRAY },
  totals: { flexDirection: 'row', marginTop: 6, borderTopWidth: 0.75, borderTopColor: '#bdbdbd', paddingTop: 6 },
  notesLabel: { color: '#9a9a9a', width: 38 },
  notes: { color: '#9a9a9a', flex: 1, paddingRight: 20 },
  sumBox: { width: 180 },
  sumRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 7 },
  sumLabel: { color: NAVY, width: 100, textAlign: 'right', paddingRight: 22 },
  sumValue: { width: 80, textAlign: 'right', fontWeight: 700, paddingRight: 2 },
  total: { fontSize: 15.5, fontWeight: 700, color: MAGENTA, textAlign: 'right', marginTop: 1, paddingRight: 2 },
  payment: { marginTop: 36, fontSize: 7.5, color: GRAY },
})

function Description({ text, link }: { text: string; link?: string }) {
  if (!link || !text.includes(link)) return <Text>{text}</Text>
  const i = text.indexOf(link)
  const href = /^https?:\/\//.test(link) ? link : `https://${link}`
  return (
    <Text>
      {text.slice(0, i)}
      <Link src={href} style={{ color: LINK, textDecoration: 'underline' }}>{link}</Link>
      {text.slice(i + link.length)}
    </Text>
  )
}

export function InvoiceDocument({ invoice, settings }: { invoice: Invoice; settings: Settings }) {
  const sub = subtotal(invoice.items)
  const total = sub + (invoice.adjustments || 0)
  return (
    <Document title={invoiceFileName(invoice).replace(/\.pdf$/, '')} author={settings.payTo} creator={settings.studioName}>
      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />
        <Text style={s.studio}>{settings.studioName}</Text>
        <Text style={s.location}>{settings.studioLocation}</Text>

        <Text style={s.title}>Factura</Text>
        <Text style={s.date}>Fecha: {fmtDate(invoice.date)}</Text>

        <View style={s.metaRow}>
          <View style={s.metaCol1}>
            <Text style={s.metaLabel}>A la atención de</Text>
            <Text style={s.metaValue}>{invoice.client.contactName || invoice.client.name}</Text>
          </View>
          <View style={s.metaCol2}>
            <Text style={s.metaLabel}>Pagar a</Text>
            <Text style={s.metaValue}>{settings.payTo}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>N.º de factura</Text>
            <Text style={s.metaValue}>{invoice.number}</Text>
          </View>
        </View>
        <View style={[s.metaRow, { marginTop: 19 }]}>
          <View style={s.metaCol1} />
          <View>
            <Text style={s.metaLabel}>Proyecto</Text>
            <Text style={s.metaValue}>{invoice.client.name}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.thead}>
          <Text style={[s.th, s.cDesc]}>Descripción</Text>
          <Text style={[s.th, s.cQty]}>Cantidad</Text>
          <Text style={[s.th, s.cUnit]}>Precio unitario</Text>
          <Text style={[s.th, s.cTotal]}>Precio total</Text>
        </View>

        {invoice.items.map((it, i) => (
          <View key={i} style={[s.row, { backgroundColor: i % 2 === 0 ? LIGHT : '#ffffff' }]} wrap={false}>
            <View style={s.cDesc}><Description text={it.description} link={it.link} /></View>
            <Text style={[s.cQty, s.muted]}>{qty(it.quantity)}</Text>
            <Text style={[s.cUnit, s.muted]}>{money(it.unitPrice)}</Text>
            <Text style={[s.cTotal, s.muted]}>{money(lineTotal(it))}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <Text style={s.notesLabel}>Notas:</Text>
          <Text style={s.notes}>{invoice.notes}</Text>
          <View style={s.sumBox}>
            <View style={s.sumRow}>
              <Text style={s.sumLabel}>Subtotal</Text>
              <Text style={s.sumValue}>{money(sub)}</Text>
            </View>
            <View style={s.sumRow}>
              <Text style={s.sumLabel}>Ajustes</Text>
              <Text style={s.sumValue}>{money(invoice.adjustments || 0)}</Text>
            </View>
            <Text style={s.total}>{money(total)}</Text>
          </View>
        </View>

        {settings.paymentInfo ? <Text style={s.payment}>{settings.paymentInfo}</Text> : null}
      </Page>
    </Document>
  )
}

export async function downloadInvoicePdf(invoice: Invoice, settings: Settings) {
  const blob = await pdf(<InvoiceDocument invoice={invoice} settings={settings} />).toBlob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = invoiceFileName(invoice)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
