import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from "@react-pdf/renderer"
import type { ReactElement } from "react"

import type {
  InvoiceDetail,
  InvoiceLine,
  InvoiceStatus,
} from "@/modules/billing/domain/invoice"
import type { TenantBusinessProfile } from "@/modules/tenancy/domain/tenant"

const BRAND = "#2563eb"
const INK = "#111827"
const MUTED = "#6b7280"
const LINE = "#e5e7eb"

const STATUS_ES: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  issued: "Emitida",
  partially_paid: "Parcialmente pagada",
  paid: "Pagada",
  void: "Anulada",
}

function makeMoney(currency: string) {
  const nf = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency || "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return (n: number) => nf.format(n)
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
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
  issuerBox: { maxWidth: 260 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND },
  issuerLine: { fontSize: 9, color: MUTED, marginTop: 2 },
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
  cDesc: { width: "46%" },
  cQty: { width: "12%", textAlign: "right" },
  cPrice: { width: "16%", textAlign: "right" },
  cDisc: { width: "12%", textAlign: "right" },
  cTotal: { width: "14%", textAlign: "right" },
  totals: { marginTop: 14, marginLeft: "auto", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 1.5, borderTopColor: "#d1d5db", marginTop: 4, paddingTop: 8 },
  grandText: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  balance: { color: BRAND, fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 26, padding: 12, backgroundColor: "#f9fafb", borderRadius: 4 },
  notesText: { fontSize: 9, color: "#374151", marginTop: 4, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, textAlign: "center", fontSize: 8, color: "#9ca3af" },
})

export type InvoicePdfProps = {
  invoice: InvoiceDetail
  lines: InvoiceLine[]
  tenantName: string
  issuer: TenantBusinessProfile
}

function InvoicePdf({ invoice, lines, tenantName, issuer }: InvoicePdfProps): ReactElement<DocumentProps> {
  const money = makeMoney(invoice.currency)
  const number = invoice.invoiceNumber ?? "Borrador"
  return (
    <Document title={`Factura ${number}`}>
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
            <Text style={s.docTitle}>FACTURA</Text>
            <Text style={s.metaLine}>{number}</Text>
            <Text style={s.metaLine}>Estado: {STATUS_ES[invoice.status]}</Text>
            <Text style={s.metaLine}>Emisión: {fmtDate(invoice.issueDate)}</Text>
            {invoice.dueDate ? <Text style={s.metaLine}>Vence: {fmtDate(invoice.dueDate)}</Text> : null}
          </View>
        </View>

        <View style={s.parties}>
          {invoice.companyName ? (
            <View>
              <Text style={s.label}>Para</Text>
              <Text style={s.value}>{invoice.companyName}</Text>
              {invoice.contactName ? <Text style={s.subValue}>{invoice.contactName}</Text> : null}
            </View>
          ) : null}
          {invoice.paymentTerms ? (
            <View>
              <Text style={s.label}>Condiciones</Text>
              <Text style={s.value}>{invoice.paymentTerms}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.thead}>
          <Text style={[s.th, s.cDesc]}>Descripción</Text>
          <Text style={[s.th, s.cQty]}>Cant.</Text>
          <Text style={[s.th, s.cPrice]}>Precio unit.</Text>
          <Text style={[s.th, s.cDisc]}>Desc.</Text>
          <Text style={[s.th, s.cTotal]}>Total</Text>
        </View>
        {lines.map((l) => (
          <View key={l.id} style={s.row} wrap={false}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cPrice}>{money(l.unitPrice)}</Text>
            <Text style={s.cDisc}>{l.discountAmount > 0 ? money(l.discountAmount) : "—"}</Text>
            <Text style={s.cTotal}>{money(l.lineTotal)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(invoice.subtotal)}</Text>
          </View>
          {invoice.discountAmount > 0 ? (
            <View style={s.totalRow}>
              <Text>Descuento</Text>
              <Text>−{money(invoice.discountAmount)}</Text>
            </View>
          ) : null}
          {invoice.taxAmount > 0 ? (
            <View style={s.totalRow}>
              <Text>Impuesto</Text>
              <Text>{money(invoice.taxAmount)}</Text>
            </View>
          ) : null}
          <View style={[s.totalRow, s.grand]}>
            <Text style={s.grandText}>Total</Text>
            <Text style={s.grandText}>{money(invoice.totalAmount)}</Text>
          </View>
          {invoice.amountPaid > 0 ? (
            <>
              <View style={s.totalRow}>
                <Text>Pagado</Text>
                <Text>{money(invoice.amountPaid)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.balance}>Saldo</Text>
                <Text style={s.balance}>{money(invoice.balance)}</Text>
              </View>
            </>
          ) : null}
        </View>

        {invoice.notes ? (
          <View style={s.notes}>
            <Text style={s.label}>Notas</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          {issuer.legalName ?? tenantName} · {number} · Generado con NEXUS
        </Text>
      </Page>
    </Document>
  )
}

/** Builds the invoice PDF element (route handlers are .ts and cannot use JSX). */
export function buildInvoicePdf(props: InvoicePdfProps): ReactElement<DocumentProps> {
  return <InvoicePdf {...props} />
}
