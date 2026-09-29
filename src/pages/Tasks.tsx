import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { Badge, Button, Card, Empty, Input, PageHeader, Select, confirmAction, cx } from '../components/ui'
import { CompleteTaskModal, TaskModal } from '../components/forms'
import { fmtDate } from '../utils'
import type { Task, TaskStatus } from '../types'

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'hecho', label: 'Hecho' },
]
const prio = { alta: 0, media: 1, baja: 2 }

export default function Tasks() {
  const { data, update } = useStore()
  const [modal, setModal] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [completing, setCompleting] = useState<Task | null>(null)
  const [client, setClient] = useState('')
  const [q, setQ] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const list = data.tasks
    .filter((t) => !client || t.clientId === client)
    .filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q.toLowerCase()))

  const move = (t: Task, status: TaskStatus) => {
    if (status === 'hecho') return setCompleting(t)
    update((d) => {
      const x = d.tasks.find((y) => y.id === t.id)!
      x.status = status
      delete x.doneAt
    })
  }

  return (
    <>
      <PageHeader title="Pendientes" subtitle="Lo que te pidió cada cliente" actions={<Button variant="primary" onClick={() => setModal({ open: true })}>+ Pendiente</Button>} />
      <div className="mb-4 flex gap-3">
        <Select className="max-w-56" value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">Todos los clientes</option>
          {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input className="max-w-xs" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-5">
        {columns.map((col) => {
          let items = list.filter((t) => t.status === col.key)
          items = col.key === 'hecho'
            ? items.sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')).slice(0, 30)
            : items.sort((a, b) => prio[a.priority] - prio[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'))
          return (
            <Card key={col.key} title={<>{col.label} <span className="ml-1 text-slate-400">{list.filter((t) => t.status === col.key).length}</span></>} className="self-start">
              {items.length === 0 ? (
                <Empty>—</Empty>
              ) : (
                <ul className="space-y-2 p-3">
                  {items.map((t) => {
                    const c = data.clients.find((x) => x.id === t.clientId)
                    const overdue = t.status !== 'hecho' && t.dueDate && t.dueDate < today
                    return (
                      <li key={t.id} className="group rounded-lg border border-slate-200 bg-white p-3 hover:border-brand/40">
                        <button className="block w-full cursor-pointer text-left" onClick={() => setModal({ open: true, task: t })}>
                          <div className="flex items-start justify-between gap-2">
                            <span className={cx('text-sm font-medium', t.status === 'hecho' && 'text-slate-400 line-through')}>{t.title}</span>
                            {t.status !== 'hecho' && <Badge value={t.priority} />}
                          </div>
                          {t.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>}
                        </button>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-slate-400">
                            <Link to={`/clientes/${t.clientId}`} className="font-medium text-brand-soft hover:underline">{c?.name}</Link>
                            {t.dueDate && <span className={overdue ? 'text-red-500' : ''}> · {fmtDate(t.dueDate)}</span>}
                            {t.chargeId && <span className="text-emerald-600"> · cargado</span>}
                          </span>
                          <span className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                            {col.key !== 'pendiente' && <Button size="sm" variant="ghost" onClick={() => move(t, col.key === 'hecho' ? 'en_curso' : 'pendiente')}>←</Button>}
                            {col.key !== 'hecho' && <Button size="sm" variant="ghost" onClick={() => move(t, col.key === 'pendiente' ? 'en_curso' : 'hecho')}>{col.key === 'en_curso' ? '✓' : '→'}</Button>}
                            <Button size="sm" variant="danger" onClick={() => confirmAction('¿Eliminar pendiente?') && update((d) => { d.tasks = d.tasks.filter((x) => x.id !== t.id) })}>✕</Button>
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
      <TaskModal open={modal.open} task={modal.task} clientId={client || undefined} onClose={() => setModal({ open: false })} />
      <CompleteTaskModal task={completing} onClose={() => setCompleting(null)} />
    </>
  )
}
