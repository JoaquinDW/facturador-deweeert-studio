# Facturador · De Weert Studio

App para gestionar clientes, mantenimientos mensuales, pendientes y facturas en PDF.
Corre en local (datos en `data/data.json`) o en Vercel (datos en Vercel Blob, con contraseña).

## Uso local

```bash
npm install     # solo la primera vez
npm run dev     # abre http://localhost:5190
```

En local todo se guarda en `data/data.json` (se crea la primera vez que guardás, con Gonzamasmotos precargado)
y cada día queda una copia en `data/backups/`. Para probar el login en local: `APP_PASSWORD=algo npm run dev`.

## Deploy en Vercel (datos en Vercel Blob)

1. Subí la carpeta a un repo **privado** de GitHub e importalo en Vercel (detecta Vite solo).
2. En el proyecto de Vercel → **Storage** → **Create** → **Blob**, con acceso **Private**, y conectalo al proyecto.
   Esto agrega sola la variable `BLOB_READ_WRITE_TOKEN`.
3. **Settings → Environment Variables**: agregá `APP_PASSWORD` con una contraseña larga.
4. Redeploy. Entrás con esa contraseña (la sesión dura 60 días; cambiar la contraseña cierra todas las sesiones).

- Los datos quedan en el blob `facturador/data.json`, con una copia por día en `facturador/backups/`.
- Si editás desde dos dispositivos a la vez, el que guarda segundo recibe un aviso para recargar en vez de pisar los cambios.
- Para pasar datos locales a Vercel: en local **Ajustes → Descargar backup**; en Vercel **Ajustes → Importar backup**.

## Cómo funciona

- **Clientes**: datos de contacto, mantenimiento mensual, valor hora y *gastos fijos mensuales*
  (Supabase, Resend, hosting…) que se re-facturan cada mes.
- **Pendientes**: lo que te pidió cada cliente (pendiente → en curso → hecho). Al marcar uno como hecho
  podés cargarlo como trabajo facturable (cantidad/horas × precio) en el mes que corresponda.
- **Trabajos y gastos**: desarrollos a medida o gastos puntuales de un mes.
- **Facturas**: al generar la factura de un cliente para un mes se precargan gastos fijos + trabajos del
  mes sin facturar + mantenimiento. Todo es editable. El número se autoincrementa (Ajustes).
  Desde la factura podés descargar el PDF, marcarla pagada o anularla.
- **Panel**: por mes, qué clientes ya tienen factura y cuáles faltan, total recurrente y por cobrar.

## Estructura

- `api/data.ts`, `api/login.ts`, `api/logout.ts` — funciones de Vercel (Blob + contraseña)
- `server/jsonApi.ts` — la misma API en local sobre `data/data.json` (solo para `npm run dev`)
- `server/seed.json` — datos iniciales
- `src/pdf/InvoicePDF.tsx` — diseño del PDF de la factura
- `src/pages/*` — pantallas
