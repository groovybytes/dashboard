"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Edit, Plus } from "lucide-react"
import { DeviceModal, type DeviceFormData } from "@/components/device-modal"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
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

interface Device {
  id: string
  deviceID: string
  deviceName: string
  sensorType: string
  location: string
  purpose: string
  connectionString?: string
}

const API_BASE_URL = "https://groovybytes-platform-management.azurewebsites.net"

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<DeviceFormData | null>(null)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/devices/fetch`)
      const data = await res.json()
      setDevices(data)
    } catch (error) {
      console.error("Error fetching devices:", error)
      toast({ title: "Error", description: "Failed to fetch devices.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddOrUpdateDevice = async (deviceData: DeviceFormData) => {
    setIsLoading(true)
    try {
      const newDevice = {
        ...deviceData,
      }

      const method = editingDevice ? "PUT" : "POST"
      const url = editingDevice
        ? `${API_BASE_URL}/api/devices/update/${deviceData.deviceID}`
        : `${API_BASE_URL}/api/devices/register`

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDevice),
      })

      await fetchDevices()
      setIsModalOpen(false)
      setEditingDevice(null)
      toast({ title: "Success", description: `Device ${editingDevice ? "updated" : "added"} successfully.` })
    } catch (error) {
      console.error("Error saving device:", error)
      toast({
        title: "Error",
        description: `Failed to ${editingDevice ? "update" : "add"} device.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDeleteDevice = (device: Device) => {
    setDeviceToDelete(device)
  }

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return

    setIsDeleting(true)
    try {
      console.log("Deleting device:", deviceToDelete.deviceID)

      const res = await fetch(`${API_BASE_URL}/api/device/delete/${deviceToDelete.deviceID}`, {
        method: "DELETE",
      })

      const data = await res.json()
      console.log("Delete response:", data)

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete device")
      }

      fetchDevices() // Refresh the device list
      toast({ title: "Success", description: "Device deleted successfully." })
    } catch (error) {
      console.error("Error deleting device:", error)
      toast({ title: "Error", description: "Failed to delete device.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setDeviceToDelete(null)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">IoT Devices</h1>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Device
            </Button>
          </div>

          {isLoading && devices.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Loading devices...
            </p>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <h3 className="font-medium text-lg mb-2">No devices found</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first IoT device.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Sensor Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.deviceID}>
                    <TableCell className="font-medium">
                      {device.deviceName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {device.deviceID}
                      </Badge>
                    </TableCell>
                    <TableCell>{device.sensorType}</TableCell>
                    <TableCell>{device.location}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {device.purpose}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingDevice(device);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => confirmDeleteDevice(device)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DeviceModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingDevice(null);
            }}
            onSubmit={handleAddOrUpdateDevice}
            initialData={editingDevice || undefined}
            isEditing={!!editingDevice}
          />

          <AlertDialog
            open={!!deviceToDelete}
            onOpenChange={(open) => !open && setDeviceToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Device</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;
                  {deviceToDelete?.deviceName}&quot;? This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteDevice}
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
  );
}

