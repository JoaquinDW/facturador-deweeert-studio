import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
export function Button({ variant = 'secondary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-dark shadow-sm',
        variant === 'accent' && 'bg-accent text-white hover:opacity-90 shadow-sm',
        variant === 'secondary' && 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        variant === 'danger' && 'text-red-600 hover:bg-red-50',
        className,
      )}
    />
  )
}

export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15'
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, className)} />
export const NumberInput = ({ value, onValue, className, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number; onValue: (n: number) => void }) => (
  <input
    type="number"
    step="any"
    {...p}
    value={Number.isFinite(value) ? value : ''}
    onChange={(e) => onValue(e.target.value === '' ? 0 : Number(e.target.value))}
    className={cx(inputCls, 'tabular-nums', className)}
  />
)
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, 'pr-8', className)} />
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={cx(inputCls, className)} />

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <div className="flex gap-2">{actions}</div>
        </header>
      )}
      <div>{children}</div>
    </section>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}

const badgeColors: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  en_curso: 'bg-sky-50 text-sky-700 ring-sky-200',
  hecho: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  emitida: 'bg-amber-50 text-amber-700 ring-amber-200',
  pagada: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  anulada: 'bg-slate-100 text-slate-500 ring-slate-200',
  alta: 'bg-rose-50 text-rose-700 ring-rose-200',
  media: 'bg-slate-50 text-slate-600 ring-slate-200',
  baja: 'bg-slate-50 text-slate-400 ring-slate-200',
  desarrollo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  gestion: 'bg-sky-50 text-sky-700 ring-sky-200',
  gasto: 'bg-orange-50 text-orange-700 ring-orange-200',
  otro: 'bg-slate-50 text-slate-600 ring-slate-200',
  facturado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'sin facturar': 'bg-amber-50 text-amber-700 ring-amber-200',
  previsto: 'bg-violet-50 text-violet-700 ring-violet-200',
  'no facturable': 'bg-slate-50 text-slate-500 ring-slate-200',
}
const badgeLabels: Record<string, string> = { en_curso: 'en curso', gestion: 'gestión / comunicación' }
export function Badge({ value, children }: { value: string; children?: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', badgeColors[value] ?? badgeColors.otro)}>
      {children ?? badgeLabels[value] ?? value}
    </span>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div className={cx('w-full rounded-2xl bg-white shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="cursor-pointer text-xl leading-none text-slate-400 hover:text-slate-600">×</button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-400">{children}</div>
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'accent' | 'brand' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cx('mt-2 text-2xl font-bold tabular-nums', tone === 'accent' ? 'text-accent' : 'text-brand')}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export const confirmAction = (msg: string) => window.confirm(msg)
export { cx }
