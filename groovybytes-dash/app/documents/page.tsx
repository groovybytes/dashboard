"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { FileUploader } from "@/components/file-uploader2"
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
import { BlobServiceClient } from "@azure/storage-blob"

// Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=groovybytesassetsstorage;AccountKey=FrNFiHf0Y8Y3y6Jj4Gcq9CED/FvVbaFoHxQdbpBbGHBEPD+2nOEzirCMVfcAy6GTdSoyNH4k/Jvw+AStdTgNuQ==;EndpointSuffix=core.windows.net"
const CONTAINER_NAME = "your-container-name"

interface Document {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  url: string
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)

// Azure Blob Storage service
const blobStorage = {
  listDocuments: async (): Promise<Document[]> => {
    try {
      let blobs = []
      for await (const blob of containerClient.listBlobsFlat()) {
        const url = `${containerClient.url}/${blob.name}`
        blobs.push({
          id: blob.name,
          name: blob.name,
          type: blob.name.split(".").pop() || "unknown",
          size: blob.properties.contentLength || 0,
          uploadedAt: blob.properties.createdOn?.toISOString() || "Unknown",
          url,
        })
      }
      return blobs
    } catch (error) {
      console.error("Error listing blobs:", error)
      throw error
    }
  },

  uploadDocument: async (file: File): Promise<Document> => {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(file.name)
      await blockBlobClient.uploadData(await file.arrayBuffer(), {
        blobHTTPHeaders: { blobContentType: file.type },
      })
      return {
        id: file.name,
        name: file.name,
        type: file.name.split(".").pop() || "unknown",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        url: blockBlobClient.url,
      }
    } catch (error) {
      console.error("Error uploading blob:", error)
      throw error
    }
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(documentId)
      await blockBlobClient.delete()
    } catch (error) {
      console.error("Error deleting blob:", error)
      throw error
    }
  },

  downloadDocument: async (document: Document): Promise<void> => {
    try {
      const response = await fetch(document.url)
      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = document.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading blob:", error)
      throw error
    }
  },
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

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const fetchedDocuments = await blobStorage.listDocuments()
      setDocuments(fetchedDocuments)
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to fetch documents. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      await blobStorage.uploadDocument(file)
      await fetchDocuments()
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      })
      throw error // Re-throw to be caught by the FileUploader component
    }
  }

  const confirmDeleteDocument = (document: Document) => {
    setDocumentToDelete(document)
  }

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return

    setIsDeleting(true)
    try {
      await blobStorage.deleteDocument(documentToDelete.id, documentToDelete.name)
      // Update local state to remove the deleted document
      setDocuments(documents.filter((doc) => doc.id !== documentToDelete.id))
      toast({
        title: "Success",
        description: `"${documentToDelete.name}" has been deleted.`,
      })
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDocumentToDelete(null)
    }
  }

  const handleDownloadDocument = async (document: Document) => {
    setIsDownloading(document.id)
    try {
      await blobStorage.downloadDocument(document)
      toast({
        title: "Success",
        description: `"${document.name}" has been downloaded.`,
      })
    } catch (error) {
      console.error("Error downloading document:", error)
      toast({
        title: "Error",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "json":
        return <FileJson className="h-8 w-8 text-blue-500" />
      case "csv":
        return <FileText className="h-8 w-8 text-green-500" />
      case "xlsx":
        return <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
      case "pdf":
        return <FileType className="h-8 w-8 text-red-500" />
      default:
        return <File className="h-8 w-8 text-gray-500" />
    }
  }

  // Display only 3 documents if not showing all
  const displayedDocuments = showAll ? documents : documents.slice(0, 3)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Documents</h1>
          </div>

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Document Library</h2>
              {documents.length > 3 && (
                <Button variant="link" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Show Less" : "Show All"}
                  <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
                </Button>
              )}
            </div>

            {isLoading && documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No documents found</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Upload JSON, XLSX, CSV, or PDF files to see them here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayedDocuments.map((doc) => (
                  <Card key={doc.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-medium truncate" title={doc.name}>
                          {doc.name}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center space-x-4">
                        {getFileIcon(doc.type)}
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {doc.type.toUpperCase()}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{formatFileSize(doc.size)}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <span className="text-xs text-muted-foreground">{formatDate(doc.uploadedAt)}</span>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Download"
                          onClick={() => handleDownloadDocument(doc)}
                          disabled={isDownloading === doc.id}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => confirmDeleteDocument(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {!showAll && documents.length > 3 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => setShowAll(true)}>
                  Show All Documents ({documents.length})
                </Button>
              </div>
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
                <AlertDialogAction
                  onClick={handleDeleteDocument}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
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

