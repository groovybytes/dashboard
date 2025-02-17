import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function SettingsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>
          <p>Adjust your application settings here.</p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

