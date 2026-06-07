import Link from "next/link"

import { NexusLogo } from "@/components/layout/nexus-logo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="flex min-h-screen flex-col px-6 py-5 sm:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Nexus">
            <NexusLogo variant="full" theme="light" className="h-8" />
          </Link>
          <ThemeSwitcher />
        </header>
        <div className="mx-auto flex w-full max-w-sm flex-1 items-center py-12">
          {children}
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-nexus-midnight p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.32),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_40%)]" />
        <div className="relative">
          <span className="inline-block rounded-xl bg-white p-3 shadow-sm">
            <NexusLogo variant="full" theme="light" className="h-9 w-auto" />
          </span>
        </div>
        <div className="relative max-w-xl">
          <p className="text-balance text-4xl font-semibold tracking-tight">
            One operating layer for teams that expect clarity at scale.
          </p>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Sales, service and field operations — connected in one secure,
            tenant-aware platform.
          </p>
        </div>
        <p className="relative text-xs font-medium tracking-wide text-slate-400">
          Where Operations Connect.
        </p>
      </aside>
    </main>
  )
}
