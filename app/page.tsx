import { cookies } from "next/headers"
import { decryptJWE } from "@/lib/auth/jwt"
import { DashboardClient } from "@/components/dashboard-client"

export default async function HomePage() {
  // Server-side operations
  const cookieStore = cookies()
  const session = (await cookieStore).get("session")?.value
  const profile = session ? await decryptJWE(session) : null

  // Pass the server data to the client component
  return <DashboardClient profile={profile} />
}

