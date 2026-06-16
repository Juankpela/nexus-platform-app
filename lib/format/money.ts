const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Pesos colombianos: `$ 4.595.000`. Mismo formato usado en el Dashboard y PDFs. */
export function formatCOP(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return COP.format(value)
}
