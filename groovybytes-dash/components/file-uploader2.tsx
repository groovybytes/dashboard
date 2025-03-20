"use client"

import { useState } from "react"
import { X, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"

export function FileUploader({ onFileUpload }: { onFileUpload: (file: File) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setProgress(0) // Reset progress when a new file is selected
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Create an XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/documents/upload", true)

      // Progress event listener
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
        }
      }

      // On successful upload
      xhr.onload = async () => {
        if (xhr.status === 201) {
          await onFileUpload(file) // Refresh document list
          setProgress(100)
          toast({ title: "Success", description: "Document uploaded successfully." })
        } else {
          toast({ title: "Error", description: "Upload failed.", variant: "destructive" })
        }
        setUploading(false)
        setFile(null)
      }

      // On error
      xhr.onerror = () => {
        toast({ title: "Error", description: "Upload failed.", variant: "destructive" })
        setUploading(false)
      }

      // Send the request
      xhr.send(formData)
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({ title: "Error", description: "Upload failed.", variant: "destructive" })
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Input type="file" accept=".json,.xlsx,.csv,.pdf" onChange={handleFileChange} className="flex-1" />
        <Button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {file && !uploading && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <FileText size={16} />
          <span>{file.name}</span>
          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setFile(null)}>
            <X size={14} />
          </Button>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">Uploading: {progress}%</p>
        </div>
      )}

      {progress === 100 && !uploading && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle size={16} />
          <span>Upload complete!</span>
        </div>
      )}
    </div>
  )
}
