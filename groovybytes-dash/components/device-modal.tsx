"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface DeviceFormData {
  deviceID?: string
  deviceName: string
  sensorType: string
  location: string
  purpose: string
}

interface DeviceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: DeviceFormData) => void
  initialData?: DeviceFormData
  isEditing?: boolean
}

export function DeviceModal({ isOpen, onClose, onSubmit, initialData, isEditing = false }: DeviceModalProps) {
  const [formData, setFormData] = useState<DeviceFormData>({
    deviceName: initialData?.deviceName || "",
    sensorType: initialData?.sensorType || "",
    location: initialData?.location || "",
    purpose: initialData?.purpose || "",  
  })

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    } else {
      setFormData({
        deviceName: "",
        sensorType: "",
        location: "",
        purpose: "",
      })
    }
  }, [initialData, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Device" : "Add New Device"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deviceName">Device Name *</Label>
            <Input
              id="deviceName"
              name="deviceName"
              value={formData.deviceName}
              onChange={handleChange}
              placeholder="Enter device name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sensorType">Sensor Type</Label>
            <Input
              id="sensorType"
              name="sensorType"
              value={formData.sensorType}
              onChange={handleChange}
              placeholder="Enter sensor type"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter device location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              placeholder="Enter device purpose"
              rows={3}
            />
          </div>

          {isEditing && formData.deviceID && (
            <div className="space-y-2">
              <Label htmlFor="deviceID">Device ID</Label>
              <Input id="deviceID" value={formData.deviceID} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Device ID cannot be changed</p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Update Device" : "Add Device"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

