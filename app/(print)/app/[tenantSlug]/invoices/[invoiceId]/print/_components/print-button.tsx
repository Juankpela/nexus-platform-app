"use client"

export function PrintButton() {
  return (
    <button
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        padding: "10px 20px",
        background: "#111",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 14,
        cursor: "pointer",
        zIndex: 100,
      }}
      className="print:hidden"
      onClick={() => window.print()}
    >
      Imprimir / Guardar PDF
    </button>
  )
}
