import { redirect } from "next/navigation"

import { getCachedCurrentUser } from "@/modules/identity/composition"

export default async function HomePage() {
  const user = await getCachedCurrentUser()
  redirect(user ? "/select-tenant" : "/login")
}
