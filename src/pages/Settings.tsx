import { useRef } from 'react'
import { useStore } from '../store'
import { Button, Card, Field, Input, NumberInput, PageHeader, Textarea } from '../components/ui'
import type { Data, Settings } from '../types'
import { todayISO } from '../utils'

export default function SettingsPage() {
  const { data, update, replaceAll, authEnabled } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const s = data.settings
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update((d) => { d.settings[k] = v })

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `facturador-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importJson = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as Data
      if (!d.settings || !Array.isArray(d.clients)) throw new Error()
      if (window.confirm('Esto reemplaza TODOS los datos actuales. ¿Continuar?')) replaceAll(d)
    } catch {
      alert('Archivo inválido')
    }
  }

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Datos que aparecen en tus facturas" />
      <Card title="Tu estudio">
        <div className="grid grid-cols-2 gap-4 p-5">
          <Field label="Nombre del estudio"><Input value={s.studioName} onChange={(e) => set('studioName', e.target.value)} /></Field>
          <Field label="Ubicación"><Input value={s.studioLocation} onChange={(e) => set('studioLocation', e.target.value)} /></Field>
          <Field label="Pagar a"><Input value={s.payTo} onChange={(e) => set('payTo', e.target.value)} /></Field>
          <Field label="Valor hora por defecto" hint="Se usa para clientes nuevos"><NumberInput value={s.defaultHourRate} onValue={(v) => set('defaultHourRate', v)} /></Field>
          <Field label="Datos de pago (opcional)" hint="Se imprime al pie de la factura: CBU, alias, etc." className="col-span-2">
            <Textarea rows={2} value={s.paymentInfo} onChange={(e) => set('paymentInfo', e.target.value)} placeholder="Alias: deweert.studio · CBU 000…" />
          </Field>
        </div>
      </Card>
      <Card title="Datos" className="mt-6">
        <div className="space-y-3 p-5 text-sm text-slate-600">
          <p>
            {authEnabled
              ? 'Todo se guarda automáticamente en Neon Postgres, con copias diarias en Neon Object Storage.'
              : <>Todo se guarda automáticamente en <code className="rounded bg-slate-100 px-1">data/data.json</code> dentro de la carpeta del proyecto, con copias diarias en <code className="rounded bg-slate-100 px-1">data/backups/</code>.</>}
          </p>
          <div className="flex gap-2">
            <Button onClick={exportJson}>Descargar backup</Button>
            <Button onClick={() => file.current?.click()}>Importar backup…</Button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </div>
        </div>
      </Card>
    </>
  )
}
