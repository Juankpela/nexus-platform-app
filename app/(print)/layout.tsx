/**
 * Minimal layout for print/PDF pages — no sidebar, no navigation.
 * Inherits fonts and global styles from the root layout.
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
