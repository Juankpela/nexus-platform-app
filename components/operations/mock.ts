import type { Evidence } from "@/components/operations/evidence-panel"
import type { HealthSnapshot } from "@/components/operations/health-strip"

/**
 * Datos simulados del Vertical Slice. Viven en el contenedor: ningún bloque
 * presentacional los conoce. El Read Model producirá `SupervisionItem[]` con la
 * misma forma en un PR posterior, sin tocar la UI.
 */
export interface SupervisionItem {
  id: string
  /** Compromiso (etiqueta corta para la cola y la cabecera de evidencia). */
  commitment: string
  /** Titular del Hero (qué ocurre · por qué importa). */
  headline: string
  valueExposed: string
  timeToPointOfNoReturn: string
  /** El porqué en una palabra (cola). */
  reasonWord: string
  /** Acción reversible recomendada (texto corto). */
  recommendedAction: string
  /** Una línea de evidencia para el Hero. */
  evidenceLine: string
  tone: "tension" | "watch"
  evidence: Evidence
}

export const MOCK_HEALTH: HealthSnapshot = {
  protectedToday: "$12.400.000",
  exposedInWindow: "$18.500.000",
  lostToday: "$2.100.000",
  capacity: "2 de 6 libres",
  trend: "up",
  tone: "tension",
}

export const MOCK_BELOW_THRESHOLD = 12

export const MOCK_ITEMS: SupervisionItem[] = [
  {
    id: "wo-1423",
    commitment: "Orden #1423 · Torre Empresarial Norte",
    headline: "La orden #1423 (Torre Empresarial Norte) va a incumplir su compromiso",
    valueExposed: "$8.000.000",
    timeToPointOfNoReturn: "en 46 h",
    reasonWord: "Sobrecarga",
    recommendedAction: "Reasignar a Carlos",
    evidenceLine:
      "Carlos es el único técnico certificado libre y la carga actual no permite cerrar a tiempo.",
    tone: "tension",
    evidence: {
      observed: [
        "Compromiso: mantenimiento correctivo de chiller, contrato con penalización por demora.",
        "Asignado a Andrés, que ya tiene 3 órdenes el jueves.",
        "Carlos —único otro técnico certificado en chillers— tiene el martes libre.",
      ],
      concluded:
        "Con la carga de Andrés, la orden se atiende el viernes; el plazo contractual cierra el miércoles. La ventana para reasignar sin penalización se cierra en 46 horas.",
      uncertainty:
        "NEXUS no sabe si Andrés planea adelantar trabajo el fin de semana. Confianza: media-alta.",
      proposedAction: "Reasignar la orden a Carlos para el martes.",
      feasibility: "Carlos tiene slack el martes (1 de 3 franjas libre). Acción factible hoy.",
      ifNothing: "Incumplimiento contractual + penalización estimada de $8.000.000.",
    },
  },
  {
    id: "wo-1391",
    commitment: "Orden #1391 · Clínica San Rafael",
    headline: "El preventivo de la Clínica San Rafael está asignado a un técnico sin certificación",
    valueExposed: "$5.200.000",
    timeToPointOfNoReturn: "en 28 h",
    reasonWord: "Certificación",
    recommendedAction: "Reasignar",
    evidenceLine: "El técnico asignado no tiene la certificación que exige el contrato hospitalario.",
    tone: "tension",
    evidence: {
      observed: [
        "Compromiso: mantenimiento preventivo de aire grado hospitalario.",
        "El contrato exige certificación de salas limpias; el técnico asignado no la tiene.",
        "Dos técnicos certificados disponibles esta semana.",
      ],
      concluded:
        "Si el preventivo se ejecuta sin certificación, el acta no es válida y el cliente puede rechazar el cobro. La ventana para reasignar cierra en 28 horas.",
      uncertainty: "NEXUS no sabe si el cliente flexibilizaría el requisito. Confianza: alta.",
      proposedAction: "Reasignar a un técnico certificado en salas limpias.",
      feasibility: "Hay 2 técnicos certificados con franja disponible. Factible.",
      ifNothing: "Acta rechazada y reproceso; valor expuesto $5.200.000.",
    },
  },
  {
    id: "wo-1404",
    commitment: "Orden #1404 · Conjunto Las Palmas",
    headline: "La instalación en Las Palmas depende de un repuesto aún en tránsito",
    valueExposed: "$3.400.000",
    timeToPointOfNoReturn: "en 3 días",
    reasonWord: "Repuesto",
    recommendedAction: "Expeditar",
    evidenceLine: "El compresor llega el jueves; la instalación está comprometida para el miércoles.",
    tone: "watch",
    evidence: {
      observed: [
        "Compromiso: instalación de unidad central, fecha comprometida el miércoles.",
        "El compresor está en tránsito con entrega estimada el jueves.",
        "El proveedor ofrece envío exprés con un día de adelanto.",
      ],
      concluded:
        "Sin adelantar el repuesto, la instalación se corre al jueves y el compromiso se incumple por un día. La ventana para expeditar cierra en 3 días.",
      uncertainty: "NEXUS no sabe si el cliente acepta un día de holgura. Confianza: media.",
      proposedAction: "Expeditar el envío del compresor con el proveedor.",
      feasibility: "Envío exprés disponible con sobrecosto menor al valor expuesto. Factible.",
      ifNothing: "Instalación tardía un día; posible descuento de $3.400.000.",
    },
  },
  {
    id: "wo-1376",
    commitment: "Orden #1376 · Hotel Mirador",
    headline: "La visita de garantía del Hotel Mirador no ha sido confirmada por el cliente",
    valueExposed: "$1.900.000",
    timeToPointOfNoReturn: "en 4 días",
    reasonWord: "Confirmación",
    recommendedAction: "Renegociar",
    evidenceLine: "El cliente no responde para confirmar el acceso; la cuadrilla quedaría ociosa.",
    tone: "watch",
    evidence: {
      observed: [
        "Compromiso: visita de garantía agendada, requiere acceso coordinado con el hotel.",
        "El cliente no ha confirmado la franja tras dos contactos.",
        "La cuadrilla está reservada para esa franja.",
      ],
      concluded:
        "Sin confirmación, la cuadrilla viaja sin garantía de acceso y se pierde la franja. La ventana para reagendar cierra en 4 días.",
      uncertainty: "NEXUS no sabe si el cliente confirmará a último momento. Confianza: media-baja.",
      proposedAction: "Renegociar la franja y liberar la cuadrilla hasta confirmar.",
      feasibility: "La franja se puede reasignar a otra orden en espera. Factible.",
      ifNothing: "Cuadrilla ociosa y costo de desplazamiento perdido; $1.900.000 expuestos.",
    },
  },
]
