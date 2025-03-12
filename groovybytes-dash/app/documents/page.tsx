"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { FileUploader } from "@/components/file-uploader"

export default function DocumentsPage() {
  const handleFileUpload = async (file: File) => {
    // Placeholder for Azure Storage upload logic
    console.log(`Uploading file: ${file.name}`)

    // Simulate an API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log("File uploaded successfully")
    // In a real implementation, you would:
    // 1. Get a SAS token from your server
    // 2. Use @azure/storage-blob to upload the file
    // 3. Handle success/failure
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">Documents</h1>
          <p className="mb-4">Upload your JSON, XLSX, or CSV documents here.</p>
          <FileUploader onFileUpload={handleFileUpload} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

