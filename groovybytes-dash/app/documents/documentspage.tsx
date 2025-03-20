"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { FileUploader } from "@/components/file-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Download, FileText, ChevronRight, File, FileJson, FileSpreadsheet, FileType, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Document {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  url: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  // Fetch documents from Azure Functions
  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/documents/list")
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({ title: "Error", description: "Failed to fetch documents.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      await fetchDocuments()
      toast({ title: "Success", description: "Document uploaded successfully." })
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({ title: "Error", description: "Upload failed.", variant: "destructive" })
    }
  }

  // Confirm delete document
  const confirmDeleteDocument = (document: Document) => {
    setDocumentToDelete(document)
  }

  // Handle document deletion
  const handleDeleteDocument = async () => {
    if (!documentToDelete) return

    setIsDeleting(true)
    try {
      await fetch(`/api/documents/${documentToDelete.name}`, { method: "DELETE" })
      setDocuments(documents.filter((doc) => doc.name !== documentToDelete.name))
      toast({ title: "Success", description: `"${documentToDelete.name}" has been deleted.` })
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setDocumentToDelete(null)
    }
  }

  // Handle document download
  const handleDownloadDocument = async (document: Document) => {
    setIsDownloading(document.id)
    try {
      const response = await fetch(`/api/documents/download/${document.name}`)
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = document.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({ title: "Success", description: `"${document.name}" has been downloaded.` })
    } catch (error) {
      console.error("Error downloading document:", error)
      toast({ title: "Error", description: "Failed to download document.", variant: "destructive" })
    } finally {
      setIsDownloading(null)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <h1 className="text-3xl font-bold">Documents</h1>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
            <Card>
              <CardContent className="pt-6">
                <FileUploader onFileUpload={handleFileUpload} />
                <p className="text-xs text-muted-foreground mt-2">Supported file types: JSON, XLSX, CSV, PDF</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Document Library</h2>
            {isLoading ? (
              <p>Loading...</p>
            ) : documents.length === 0 ? (
              <p>No documents available.</p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id}>
                  <span>{doc.name}</span>
                  <Button onClick={() => handleDownloadDocument(doc)} disabled={isDownloading === doc.id}>
                    Download
                  </Button>
                  <Button onClick={() => confirmDeleteDocument(doc)}>Delete</Button>
                </div>
              ))
            )}
          </div>

          <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDocument} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
