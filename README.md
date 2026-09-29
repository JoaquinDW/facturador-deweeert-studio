# Facturador · De Weert Studio

App para gestionar clientes, trabajos, mantenimientos mensuales y facturas en PDF.
Corre en local (datos en `data/data.json`) o en Vercel (datos en Neon Postgres, con contraseña).

## Uso local

```bash
npm install     # solo la primera vez
npm run dev     # abre http://localhost:5190
```

En local todo se guarda en `data/data.json` (se crea la primera vez que guardás, con Gonzamasmotos precargado)
y cada día queda una copia en `data/backups/`. Para probar el login en local: `APP_PASSWORD=algo npm run dev`.

## Deploy en Vercel (datos en Neon)

1. Subí la carpeta a un repo **privado** de GitHub e importalo en Vercel (detecta Vite solo).
2. Vinculá el proyecto de Neon y ejecutá `neon deploy` para crear el bucket privado `archivos`.
3. En Vercel → **Settings → Environment Variables**, agregá `DATABASE_URL`, `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` y `APP_PASSWORD`.
4. Redeploy. Entrás con esa contraseña (la sesión dura 60 días; cambiar la contraseña cierra todas las sesiones).

- Los datos quedan en la tabla `facturador_state`, con una copia por día en `archivos/backups/`.
- Si editás desde dos dispositivos a la vez, el que guarda segundo recibe un aviso para recargar en vez de pisar los cambios.
- Para pasar datos locales a Vercel: en local **Ajustes → Descargar backup**; en Vercel **Ajustes → Importar backup**.

## Cómo funciona

- **Clientes**: datos de contacto, mantenimiento mensual, valor hora y *gastos fijos mensuales*
  (Supabase, Resend, hosting…) que se re-facturan cada mes.
- **Trabajos**: seguimiento por estado y categoría. Los importes facturables se cargan al crear el trabajo
  y quedan disponibles para facturar cuando pasa a hecho.
- **Facturas**: al generar la factura de un cliente para un mes se precargan gastos fijos + trabajos del
  mes sin facturar + mantenimiento. Todo es editable. La numeración se autoincrementa por cliente.
  Desde la factura podés descargar el PDF, marcarla pagada o anularla.
- **Panel**: por mes, qué clientes ya tienen factura y cuáles faltan, total recurrente y por cobrar.

## Estructura

- `api/data.ts`, `api/login.ts`, `api/logout.ts` — funciones de Vercel (Neon + contraseña)
- `neon.ts` — infraestructura de Neon Object Storage
- `migrations/*` — esquema de Neon Postgres
- `server/jsonApi.ts` — la misma API en local sobre `data/data.json` (solo para `npm run dev`)
- `server/seed.json` — datos iniciales
- `src/pdf/InvoicePDF.tsx` — diseño del PDF de la factura
- `src/pages/*` — pantallas
