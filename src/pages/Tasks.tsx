import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { Badge, Button, Card, Empty, Input, PageHeader, Select, confirmAction, cx } from '../components/ui'
import { ChargeModal, CompleteTaskModal, TaskModal } from '../components/forms'
import { fmtDate, money, syncTaskCharge, taskCategoryLabel } from '../utils'
import { ChargesTable } from './ClientDetail'
import type { Charge, Task, TaskStatus } from '../types'

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'hecho', label: 'Hecho' },
]
const prio = { alta: 0, media: 1, baja: 2 }

export default function Tasks() {
  const { data, update } = useStore()
  const [modal, setModal] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [chargeModal, setChargeModal] = useState<Charge | undefined>()
  const [completing, setCompleting] = useState<Task | null>(null)
  const [client, setClient] = useState('')
  const [category, setCategory] = useState('')
  const [billing, setBilling] = useState('')
  const [q, setQ] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const billingState = (task: Task) => {
    if (!task.billable) return 'no facturable'
    const charge = task.chargeId ? data.charges.find((item) => item.id === task.chargeId) : undefined
    if (charge?.invoiceId) return 'facturado'
    if (charge) return 'sin facturar'
    return 'previsto'
  }
  const list = data.tasks
    .filter((task) => !client || task.clientId === client)
    .filter((task) => !category || task.category === category)
    .filter((task) => !billing || billingState(task) === billing)
    .filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(q.toLowerCase()))
  const historicalCharges = data.charges
    .filter((charge) => !data.tasks.some((task) => task.id === charge.taskId || task.chargeId === charge.id))
    .filter((charge) => !client || charge.clientId === client)
    .filter((charge) => !q || charge.description.toLowerCase().includes(q.toLowerCase()))

  const move = (task: Task, status: TaskStatus) => {
    if (status === 'hecho') return setCompleting(task)
    update((draft) => {
      const changed = draft.tasks.find((item) => item.id === task.id)!
      changed.status = status
      delete changed.doneAt
      syncTaskCharge(draft, changed)
    })
  }
  const remove = (task: Task) => {
    if (!confirmAction('¿Eliminar este trabajo?')) return
    update((draft) => {
      const charge = task.chargeId ? draft.charges.find((item) => item.id === task.chargeId) : undefined
      if (charge && !charge.invoiceId) draft.charges = draft.charges.filter((item) => item.id !== charge.id)
      draft.tasks = draft.tasks.filter((item) => item.id !== task.id)
    })
  }

  return (
    <>
      <PageHeader title="Trabajos" subtitle="Seguimiento y facturación en un solo lugar" actions={<Button variant="primary" onClick={() => setModal({ open: true })}>+ Trabajo</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select className="max-w-56" value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">Todos los clientes</option>
          {data.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Select className="max-w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {Object.entries(taskCategoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Select className="max-w-48" value={billing} onChange={(e) => setBilling(e.target.value)}>
          <option value="">Toda facturación</option>
          <option value="no facturable">No facturable</option>
          <option value="previsto">Previsto</option>
          <option value="sin facturar">Listo para facturar</option>
          <option value="facturado">Facturado</option>
        </Select>
        <Input className="max-w-xs" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-5">
        {columns.map((column) => {
          let items = list.filter((task) => task.status === column.key)
          items = column.key === 'hecho'
            ? items.sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')).slice(0, 30)
            : items.sort((a, b) => prio[a.priority] - prio[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'))
          return (
            <Card key={column.key} title={<>{column.label} <span className="ml-1 text-slate-400">{list.filter((task) => task.status === column.key).length}</span></>} className="self-start">
              {items.length === 0 ? (
                <Empty>Sin trabajos</Empty>
              ) : (
                <ul className="space-y-2 p-3">
                  {items.map((task) => {
                    const taskClient = data.clients.find((item) => item.id === task.clientId)
                    const overdue = task.status !== 'hecho' && task.dueDate && task.dueDate < today
                    const chargeState = billingState(task)
                    return (
                      <li key={task.id} className="group rounded-lg border border-slate-200 bg-white p-3 hover:border-brand/40">
                        <button className="block w-full cursor-pointer text-left" onClick={() => setModal({ open: true, task })}>
                          <div className="flex items-start justify-between gap-2">
                            <span className={cx('text-sm font-medium', task.status === 'hecho' && 'text-slate-400 line-through')}>{task.title}</span>
                            {task.status !== 'hecho' && <Badge value={task.priority} />}
                          </div>
                          {task.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge value={task.category}>{taskCategoryLabel[task.category]}</Badge>
                            <Badge value={chargeState}>{chargeState === 'sin facturar' ? 'listo para facturar' : chargeState}</Badge>
                            {task.billable && <span className="text-xs tabular-nums text-slate-500">{money((task.billingQuantity ?? 1) * (task.billingUnitPrice ?? 0))}</span>}
                          </div>
                        </button>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-slate-400">
                            <Link to={`/clientes/${task.clientId}`} className="font-medium text-brand-soft hover:underline">{taskClient?.name}</Link>
                            {task.dueDate && <span className={overdue ? 'text-red-500' : ''}> · {fmtDate(task.dueDate)}</span>}
                          </span>
                          <span className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                            {column.key !== 'pendiente' && chargeState !== 'facturado' && <Button size="sm" variant="ghost" onClick={() => move(task, column.key === 'hecho' ? 'en_curso' : 'pendiente')}>←</Button>}
                            {column.key !== 'hecho' && <Button size="sm" variant="ghost" onClick={() => move(task, column.key === 'pendiente' ? 'en_curso' : 'hecho')}>{column.key === 'en_curso' ? '✓' : '→'}</Button>}
                            {chargeState !== 'facturado' && <Button size="sm" variant="danger" onClick={() => remove(task)}>✕</Button>}
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

      {historicalCharges.length > 0 && (
        <Card className="mt-6" title="Cargos anteriores" actions={<span className="text-xs text-slate-400">Registros creados antes del flujo unificado</span>}>
          <ChargesTable charges={historicalCharges} showClient onEdit={setChargeModal} />
        </Card>
      )}
      <TaskModal open={modal.open} task={modal.task} clientId={client || undefined} onClose={() => setModal({ open: false })} />
      <CompleteTaskModal task={completing} onClose={() => setCompleting(null)} />
      <ChargeModal open={!!chargeModal} charge={chargeModal} onClose={() => setChargeModal(undefined)} />
    </>
  )
}
