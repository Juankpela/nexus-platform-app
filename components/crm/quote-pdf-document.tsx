import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from "@react-pdf/renderer"
import type { ReactElement } from "react"

import { QUOTE_STATUS_LABELS, type QuoteDetail, type QuoteLine } from "@/modules/crm/domain/quote"
import type { TenantBusinessProfile } from "@/modules/tenancy/domain/tenant"

const BRAND = "#2563eb"
const INK = "#111827"
const MUTED = "#6b7280"
const LINE = "#e5e7eb"

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const fmtMoney = (n: number) => money.format(n)

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Bogota",
  })
}

const s = StyleSheet.create({
  page: { paddingVertical: 40, paddingHorizontal: 44, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND },
  issuerLine: { fontSize: 9, color: MUTED, marginTop: 2 },
  issuerBox: { maxWidth: 260 },
  metaBox: { alignItems: "flex-end" },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  metaLine: { fontSize: 9, color: MUTED, marginTop: 2 },
  parties: { flexDirection: "row", gap: 28, marginBottom: 24 },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, marginBottom: 3, textTransform: "uppercase" },
  value: { fontSize: 10 },
  subValue: { fontSize: 9, color: MUTED, marginTop: 2 },
  thead: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#d1d5db", paddingBottom: 6, marginBottom: 2 },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 7 },
  cProduct: { width: "42%" },
  cQty: { width: "12%", textAlign: "right" },
  cPrice: { width: "18%", textAlign: "right" },
  cDisc: { width: "12%", textAlign: "right" },
  cTotal: { width: "16%", textAlign: "right" },
  sku: { fontSize: 8, color: MUTED, marginTop: 2 },
  totals: { marginTop: 14, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 1.5, borderTopColor: "#d1d5db", marginTop: 4, paddingTop: 8 },
  grandText: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 26, padding: 12, backgroundColor: "#f9fafb", borderRadius: 4 },
  notesText: { fontSize: 9, color: "#374151", marginTop: 4, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, textAlign: "center", fontSize: 8, color: "#9ca3af" },
})

export type QuotePdfProps = {
  quote: QuoteDetail
  lines: QuoteLine[]
  tenantName: string
  issuer: TenantBusinessProfile
}

function QuotePdf({ quote, lines, tenantName, issuer }: QuotePdfProps): ReactElement<DocumentProps> {
  return (
    <Document title={`Cotización ${quote.quoteNumber}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.issuerBox}>
            <Text style={s.brand}>{issuer.legalName ?? tenantName}</Text>
            {issuer.taxId ? <Text style={s.issuerLine}>NIT: {issuer.taxId}</Text> : null}
            {issuer.phone ? <Text style={s.issuerLine}>Tel: {issuer.phone}</Text> : null}
            {issuer.address ? <Text style={s.issuerLine}>{issuer.address}</Text> : null}
            {issuer.email ? <Text style={s.issuerLine}>{issuer.email}</Text> : null}
          </View>
          <View style={s.metaBox}>
            <Text style={s.docTitle}>COTIZACIÓN</Text>
            <Text style={s.metaLine}>{quote.quoteNumber} · v{quote.version}</Text>
            <Text style={s.metaLine}>Estado: {QUOTE_STATUS_LABELS[quote.status]}</Text>
            <Text style={s.metaLine}>Fecha: {fmtDate(quote.createdAt)}</Text>
            {quote.expirationDate ? (
              <Text style={s.metaLine}>Vence: {fmtDate(quote.expirationDate)}</Text>
            ) : null}
          </View>
        </View>

        <View style={s.parties}>
          {quote.companyName ? (
            <View>
              <Text style={s.label}>Para</Text>
              <Text style={s.value}>{quote.companyName}</Text>
              {quote.contactName ? <Text style={s.subValue}>{quote.contactName}</Text> : null}
            </View>
          ) : null}
          {quote.opportunityName ? (
            <View>
              <Text style={s.label}>Oportunidad</Text>
              <Text style={s.value}>{quote.opportunityName}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.thead}>
          <Text style={[s.th, s.cProduct]}>Producto</Text>
          <Text style={[s.th, s.cQty]}>Cant.</Text>
          <Text style={[s.th, s.cPrice]}>Precio unit.</Text>
          <Text style={[s.th, s.cDisc]}>Desc.</Text>
          <Text style={[s.th, s.cTotal]}>Total</Text>
        </View>
        {lines.map((l) => (
          <View key={l.id} style={s.row} wrap={false}>
            <View style={s.cProduct}>
              <Text>{l.productName}</Text>
              {l.productSku ? <Text style={s.sku}>{l.productSku}</Text> : null}
            </View>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cPrice}>{fmtMoney(l.unitPrice)}</Text>
            <Text style={s.cDisc}>{l.discountAmount > 0 ? fmtMoney(l.discountAmount) : "—"}</Text>
            <Text style={s.cTotal}>{fmtMoney(l.lineTotal)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{fmtMoney(quote.subtotal)}</Text>
          </View>
          {quote.discountAmount > 0 ? (
            <View style={s.totalRow}>
              <Text>Descuento</Text>
              <Text>−{fmtMoney(quote.discountAmount)}</Text>
            </View>
          ) : null}
          {quote.taxAmount > 0 ? (
            <View style={s.totalRow}>
              <Text>Impuesto</Text>
              <Text>{fmtMoney(quote.taxAmount)}</Text>
            </View>
          ) : null}
          <View style={[s.totalRow, s.grand]}>
            <Text style={s.grandText}>Total</Text>
            <Text style={s.grandText}>{fmtMoney(quote.totalAmount)}</Text>
          </View>
        </View>

        {quote.notes ? (
          <View style={s.notes}>
            <Text style={s.label}>Notas</Text>
            <Text style={s.notesText}>{quote.notes}</Text>
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          {tenantName} · {quote.quoteNumber} v{quote.version} · Generado con NEXUS
        </Text>
      </Page>
    </Document>
  )
}

/** Builds the quote PDF element (route handlers are .ts and cannot use JSX). */
export function buildQuotePdf(props: QuotePdfProps): ReactElement<DocumentProps> {
  return <QuotePdf {...props} />
}
