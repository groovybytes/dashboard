"use client"

import type React from "react"

import { useState } from "react"
import { X, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

type FileUploaderProps = {
  onFileUpload: (file: File) => Promise<void>
}

export function FileUploader({ onFileUpload }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const fileType = selectedFile.name.split(".").pop()?.toLowerCase()

      if (["json", "xlsx", "csv"].includes(fileType || "")) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError("Please select a JSON, XLSX, or CSV file.")
        setFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)

    try {
      await onFileUpload(file)

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i)
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      setProgress(100)
    } catch (_err) {
      console.warn(_err);
      setError("An error occurred during upload.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Input type="file" accept=".json,.xlsx,.csv" onChange={handleFileChange} className="flex-1" />
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {progress === 100 && !uploading && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle size={16} />
          <span>Upload complete!</span>
        </div>
      )}
    </div>
  )
}

