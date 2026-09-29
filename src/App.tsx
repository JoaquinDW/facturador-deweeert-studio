import { NavLink, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Tasks from './pages/Tasks'
import Charges from './pages/Charges'
import Invoices from './pages/Invoices'
import InvoiceEditor from './pages/InvoiceEditor'
import InvoiceView from './pages/InvoiceView'
import SettingsPage from './pages/Settings'
import { cx } from './components/ui'

const nav = [
  { to: '/', label: 'Panel', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/clientes', label: 'Clientes', icon: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0' },
  { to: '/pendientes', label: 'Pendientes', icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9' },
  { to: '/cargos', label: 'Trabajos y gastos', icon: 'M12 8v8M8 12h8M4 4h16v16H4z' },
  { to: '/facturas', label: 'Facturas', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
  { to: '/ajustes', label: 'Ajustes', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 14H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 009 4.6V4a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V10a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z' },
]

function SaveIndicator() {
  const { saveState, authEnabled, logout } = useStore()
  const map = {
    idle: ['bg-slate-300', 'Sin cambios'],
    saving: ['bg-amber-400 animate-pulse', 'Guardando…'],
    saved: ['bg-emerald-500', 'Guardado'],
    error: ['bg-red-500', 'Error al guardar, reintentando…'],
    conflict: ['bg-amber-400', 'Cambios sin guardar'],
  } as const
  const [dot, text] = map[saveState]
  return (
    <div className="flex items-center gap-2 text-xs text-white/60">
      <span className={cx('h-2 w-2 rounded-full', dot)} />
      <span className="flex-1">{text}</span>
      {authEnabled && <button onClick={logout} className="cursor-pointer text-white/50 hover:text-white">Salir</button>}
    </div>
  )
}

export default function App() {
  const { data } = useStore()
  const openTasks = data.tasks.filter((t) => t.status !== 'hecho').length
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-brand px-4 py-6 text-white print:hidden">
        <div className="px-2">
          <div className="text-lg font-semibold text-white">{data.settings.studioName}</div>
          <div className="text-xs text-white/50">Clientes y facturación</div>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition', isActive ? 'bg-white/15 font-medium text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')
              }
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              <span className="flex-1">{n.label}</span>
              {n.to === '/pendientes' && openTasks > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-semibold">{openTasks}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="px-2">
          <SaveIndicator />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/clientes/:id" element={<ClientDetail />} />
            <Route path="/pendientes" element={<Tasks />} />
            <Route path="/cargos" element={<Charges />} />
            <Route path="/facturas" element={<Invoices />} />
            <Route path="/facturas/nueva" element={<InvoiceEditor />} />
            <Route path="/facturas/:id" element={<InvoiceView />} />
            <Route path="/facturas/:id/editar" element={<InvoiceEditor />} />
            <Route path="/ajustes" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
