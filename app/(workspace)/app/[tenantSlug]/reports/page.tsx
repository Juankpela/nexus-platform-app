import { redirect } from "next/navigation"

// El generador de reportes no existe todavía. Hasta que exista, esta ruta no
// muestra un "próximamente" (vacío que resta confianza): lleva directo al
// análisis real disponible (Pronóstico). El ítem "Reportes" salió de la nav.
export default async function ReportsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  redirect(`/app/${tenantSlug}/forecasting`)
}
