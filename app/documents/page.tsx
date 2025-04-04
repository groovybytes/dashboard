"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { FileUploader } from "@/components/file-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Download, FileText, ChevronRight, File, FileJson, FileSpreadsheet, Trash2 } from "lucide-react"
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

// Simulated blob storage service
const blobStorage = {
  listDocuments: async (): Promise<Document[]> => {
    console.log("Fetching documents from storage...")
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: "1",
            name: "sensor_data_2023.json",
            type: "json",
            size: 1024 * 1024 * 2.5, // 2.5 MB
            uploadedAt: "2023-10-15T14:30:00Z",
            url: "#",
          },
          {
            id: "2",
            name: "device_readings_q1.csv",
            type: "csv",
            size: 1024 * 512, // 512 KB
            uploadedAt: "2023-09-22T09:15:00Z",
            url: "#",
          },
          {
            id: "3",
            name: "maintenance_schedule.xlsx",
            type: "xlsx",
            size: 1024 * 1024 * 1.2, // 1.2 MB
            uploadedAt: "2023-11-05T11:45:00Z",
            url: "#",
          },
          {
            id: "4",
            name: "sales_data_2023.csv",
            type: "csv",
            size: 1024 * 1024 * 3.8, // 3.8 MB
            uploadedAt: "2023-10-10T13:25:00Z",
            url: "#",
          },
          {
            id: "5",
            name: "historical_data_2022.csv",
            type: "csv",
            size: 1024 * 1024 * 5.7, // 5.7 MB
            uploadedAt: "2023-07-12T13:10:00Z",
            url: "#",
          },
          {
            id: "6",
            name: "inventory_report.xlsx",
            type: "xlsx",
            size: 1024 * 1024 * 8.2, // 8.2 MB
            uploadedAt: "2023-08-18T15:40:00Z",
            url: "#",
          },
          {
            id: "7",
            name: "customer_feedback.json",
            type: "json",
            size: 1024 * 768, // 768 KB
            uploadedAt: "2023-09-05T10:20:00Z",
            url: "#",
          },
          {
            id: "8",
            name: "monthly_metrics.xlsx",
            type: "xlsx",
            size: 1024 * 1024 * 1.8, // 1.8 MB
            uploadedAt: "2023-10-01T09:00:00Z",
            url: "#",
          },
          {
            id: "9",
            name: "device_logs_q2.csv",
            type: "csv",
            size: 1024 * 1024 * 4.2, // 4.2 MB
            uploadedAt: "2023-07-01T16:45:00Z",
            url: "#",
          },
          {
            id: "10",
            name: "api_responses.json",
            type: "json",
            size: 1024 * 1024 * 1.1, // 1.1 MB
            uploadedAt: "2023-08-30T14:15:00Z",
            url: "#",
          },
          {
            id: "11",
            name: "employee_performance.xlsx",
            type: "xlsx",
            size: 1024 * 1024 * 2.3, // 2.3 MB
            uploadedAt: "2023-09-15T11:30:00Z",
            url: "#",
          },
          {
            id: "12",
            name: "traffic_analysis.csv",
            type: "csv",
            size: 1024 * 1024 * 6.5, // 6.5 MB
            uploadedAt: "2023-10-20T10:10:00Z",
            url: "#",
          },
          {
            id: "13",
            name: "system_config.json",
            type: "json",
            size: 1024 * 256, // 256 KB
            uploadedAt: "2023-11-01T08:45:00Z",
            url: "#",
          },
          {
            id: "14",
            name: "quarterly_report.xlsx",
            type: "xlsx",
            size: 1024 * 1024 * 3.4, // 3.4 MB
            uploadedAt: "2023-10-05T15:20:00Z",
            url: "#",
          },
          {
            id: "15",
            name: "user_activity.csv",
            type: "csv",
            size: 1024 * 1024 * 7.8, // 7.8 MB
            uploadedAt: "2023-09-10T12:30:00Z",
            url: "#",
          },
          {
            id: "16",
            name: "device_settings.json",
            type: "json",
            size: 1024 * 384, // 384 KB
            uploadedAt: "2023-08-25T09:50:00Z",
            url: "#",
          },
          {
            id: "17",
            name: "annual_budget.xlsx",
            type: "xlsx",
            size: 1024 * 1024 * 4.7, // 4.7 MB
            uploadedAt: "2023-07-20T14:00:00Z",
            url: "#",
          },
        ])
      }, 800)
    })
  },
  uploadDocument: async (file: File): Promise<Document> => {
    console.log("Uploading document:", file.name)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.name.split(".").pop() || "",
          size: file.size,
          uploadedAt: new Date().toISOString(),
          url: "#",
        })
      }, 1500)
    })
  },
  deleteDocument: async (documentId: string): Promise<void> => {
    console.log("Deleting document:", documentId)
    return new Promise((resolve) => {
      // Simulate API call delay
      setTimeout(() => {
        resolve()
      }, 1000)
    })
  },
  downloadDocument: async (document: Document): Promise<void> => {
    console.log("Downloading document:", document.name)
    return new Promise((resolve) => {
      // Simulate download delay
      setTimeout(() => {
        resolve()
      }, 1000)
    })
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
    // Check if file type is allowed (CSV, JSON, XLSX only)
    const fileType = file.name.split(".").pop()?.toLowerCase()
    if (!["csv", "json", "xlsx"].includes(fileType || "")) {
      toast({
        title: "Invalid file type",
        description: "Only CSV, JSON, and XLSX files are supported.",
        variant: "destructive",
      })
      throw new Error("Invalid file type")
    }

    try {
      // Upload the document and get the response
      const newDocument = await blobStorage.uploadDocument(file)

      // Add the new document to the documents list
      setDocuments((prevDocuments) => [newDocument, ...prevDocuments])

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
      await blobStorage.deleteDocument(documentToDelete.id)
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
      default:
        return <File className="h-8 w-8 text-gray-500" />
    }
  }

  // Display only 6 documents if not showing all
  const displayedDocuments = showAll ? documents : documents.slice(0, 6)

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
                <p className="text-xs text-muted-foreground mt-2">Supported file types: JSON, XLSX, CSV</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Document Library</h2>
              {documents.length > 6 && (
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
                    Upload JSON, XLSX, or CSV files to see them here
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

            {!showAll && documents.length > 6 && (
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

