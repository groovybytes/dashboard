"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MultiSelect } from "@/components/multi-select"

export interface DeviceFormData {
  deviceID?: string
  deviceName: string
  sensorType: string[] // Changed from string to string[]
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
    deviceName: "",
    sensorType: [], // Changed from "" to []
    location: "",
    purpose: "",
  })

  useEffect(() => {
    if (initialData) {
      // Ensure sensorType is an array even if it comes as a string from legacy data
      const sensorType = Array.isArray(initialData.sensorType)
        ? initialData.sensorType
        : initialData.sensorType
          ? [initialData.sensorType]
          : []

      setFormData({
        ...initialData,
        sensorType,
      })
    } else {
      setFormData({
        deviceName: "",
        sensorType: [],
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
            <Label htmlFor="sensorType">Sensor Types</Label>
            <MultiSelect
              selected={formData.sensorType}
              onChange={(types) => setFormData((prev) => ({ ...prev, sensorType: types }))}
              placeholder="Select sensor types"
              options={[
                { value: "Infrared", label: "Infrared" },
                { value: "Camera", label: "Camera" },
                { value: "Weight", label: "Weight" },
                { value: "RFID", label: "RFID" },
                { value: "Transaction logs", label: "Transaction logs" },
                { value: "Temperature", label: "Temperature" },
                { value: "Humidity", label: "Humidity" },
                { value: "Power consumption", label: "Power consumption" },
                { value: "Motion", label: "Motion" },
                { value: "Occupancy", label: "Occupancy" },
                { value: "Light level", label: "Light level" },
                { value: "Display content usage", label: "Display content usage" },
                { value: "Interactions", label: "Interactions" },
              ]}
            />
            <p className="text-xs text-muted-foreground">Select multiple sensor types if applicable</p>
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

