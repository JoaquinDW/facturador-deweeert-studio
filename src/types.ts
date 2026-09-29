export type ID = string

export interface Settings {
  studioName: string
  studioLocation: string
  payTo: string
  nextInvoiceNumber: number
  defaultHourRate: number
  /** Texto opcional (CBU/alias) que se imprime en la factura */
  paymentInfo: string
}

export interface RecurringItem {
  id: ID
  description: string
  quantity: number
  unitPrice: number
  active: boolean
}

export interface Client {
  id: ID
  /** Nombre del cliente / proyecto (aparece como "Proyecto" en la factura) */
  name: string
  /** Persona de contacto ("A la atención de") */
  contactName: string
  email: string
  phone: string
  website: string
  active: boolean
  maintenanceActive: boolean
  maintenanceDescription: string
  maintenanceAmount: number
  hourRate: number
  /** Gastos fijos que se re-facturan todos los meses (Supabase, Resend, hosting...) */
  recurring: RecurringItem[]
  notes: string
  createdAt: string
}

export type TaskStatus = 'pendiente' | 'en_curso' | 'hecho'
export type Priority = 'baja' | 'media' | 'alta'

export interface Task {
  id: ID
  clientId: ID
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueDate?: string
  createdAt: string
  doneAt?: string
  chargeId?: ID
}

export type ChargeKind = 'desarrollo' | 'gasto' | 'otro'

/** Un trabajo o gasto puntual a facturar en un período */
export interface Charge {
  id: ID
  clientId: ID
  period: string // YYYY-MM
  date: string // YYYY-MM-DD
  description: string
  quantity: number
  unitPrice: number
  kind: ChargeKind
  invoiceId?: ID | null
  taskId?: ID
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  /** Texto dentro de la descripción que se muestra como link (ej: el dominio) */
  link?: string
  chargeId?: ID
}

export type InvoiceStatus = 'emitida' | 'pagada' | 'anulada'

export interface Invoice {
  id: ID
  number: number
  clientId: ID
  period: string
  date: string
  items: InvoiceItem[]
  adjustments: number
  notes: string
  status: InvoiceStatus
  paidAt?: string
  chargeIds: ID[]
  /** Copia de los datos del cliente al momento de emitir */
  client: { name: string; contactName: string }
}

export interface Data {
  version: 1
  settings: Settings
  clients: Client[]
  tasks: Task[]
  charges: Charge[]
  invoices: Invoice[]
}
