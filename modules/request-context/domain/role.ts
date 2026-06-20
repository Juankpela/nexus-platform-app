/**
 * Gating por rol para decidir la "casa" del usuario en un tenant.
 * El técnico vive en el móvil de campo (/worker), no en el back-office: si su
 * ÚNICO rol es `technician`, su pantalla de inicio es Campo, no el Centro
 * Operacional (que mezcla decisiones de Nexus y operaciones de todos los técnicos).
 * Un usuario con cualquier rol adicional (admin, supervisor, ventas) sigue yendo
 * al back-office aunque también sea técnico.
 */

export const TECHNICIAN_ROLE_KEY = "technician"

/** ¿El único rol del usuario en el tenant es técnico? */
export function isTechnicianOnly(roleKeys: readonly string[]): boolean {
  return roleKeys.length > 0 && roleKeys.every((k) => k === TECHNICIAN_ROLE_KEY)
}

/** Ruta de inicio según el rol: Campo para técnicos puros, Centro Operacional para el resto. */
export function landingPathFor(tenantSlug: string, roleKeys: readonly string[]): string {
  return isTechnicianOnly(roleKeys)
    ? `/app/${tenantSlug}/worker`
    : `/app/${tenantSlug}/dashboard`
}
