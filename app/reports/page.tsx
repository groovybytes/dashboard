import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function ReportsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">Reports</h1>
          <p>This is the reports page.</p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

