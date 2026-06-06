import { Boxes } from "lucide-react"
import Link from "next/link"

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
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background">
              <Boxes className="size-4" />
            </span>
            Nexus
          </Link>
          <ThemeSwitcher />
        </header>
        <div className="mx-auto flex w-full max-w-sm flex-1 items-center py-12">
          {children}
        </div>
      </section>
      <aside className="relative hidden overflow-hidden border-l bg-zinc-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.28),transparent_42%)]" />
        <p className="relative text-sm font-medium text-zinc-400">PROJECT NEXUS</p>
        <div className="relative max-w-xl">
          <p className="text-balance text-4xl font-medium tracking-tight">
            One operating layer for teams that expect clarity at scale.
          </p>
          <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400">
            Secure, tenant-aware infrastructure for the next generation of
            enterprise workflows.
          </p>
        </div>
        <p className="relative text-xs text-zinc-500">
          Enterprise workspace foundation
        </p>
      </aside>
    </main>
  )
}
