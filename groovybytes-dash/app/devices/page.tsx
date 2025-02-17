"use client"

import type React from "react"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2 } from "lucide-react"

interface Device {
  id: string
  name: string
  type: string
}

// Simulated Azure IoT Hub service
const simulatedIoTHub = {
  addDevice: async (device: Omit<Device, "id">): Promise<Device> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...device,
          id: Math.random().toString(36).substr(2, 9),
        })
      }, 500)
    })
  },
  deleteDevice: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, 500)
    })
  },
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [newDevice, setNewDevice] = useState({ name: "", type: "" })
  const [isLoading, setIsLoading] = useState(false)

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const device = await simulatedIoTHub.addDevice(newDevice)
      setDevices([...devices, device])
      setNewDevice({ name: "", type: "" })
    } catch (error) {
      console.error("Error adding device:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDevice = async (id: string) => {
    setIsLoading(true)
    try {
      await simulatedIoTHub.deleteDevice(id)
      setDevices(devices.filter((device) => device.id !== id))
    } catch (error) {
      console.error("Error deleting device:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">Devices</h1>

          <form onSubmit={handleAddDevice} className="mb-8 flex gap-4">
            <Input
              placeholder="Device Name"
              value={newDevice.name}
              onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
              required
            />
            <Input
              placeholder="Device Type"
              value={newDevice.type}
              onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
              required
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Device"}
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.id}</TableCell>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.type}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteDevice(device.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {devices.length === 0 && <p className="text-center text-muted-foreground mt-4">No devices added yet.</p>}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

