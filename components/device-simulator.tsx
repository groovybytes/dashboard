"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, RefreshCw, Zap, Thermometer, Users, ShoppingCart } from "lucide-react"

// Define types for device data
interface DeviceData {
  deviceId: string
  timestamp: string
  [key: string]: any
}

interface Device {
  deviceId: string
  deviceName: string
  sensorType: string[]
  location: string
  status: "active" | "inactive" | "error"
  lastReading: DeviceData | null
}

/**
 * DeviceSimulator Component
 *
 * Simulates IoT devices sending data to the GroovyBytes platform.
 * Allows users to start/stop simulation and view device details.
 */
export function DeviceSimulator() {
  // Sample devices for simulation
  const [devices, setDevices] = useState<Device[]>([
    {
      deviceId: "foot_traffic_counter_001",
      deviceName: "Foot Traffic Counter",
      sensorType: ["Infrared", "Camera"],
      location: "Main Entrance",
      status: "active",
      lastReading: null,
    },
    {
      deviceId: "hvac_control_unit_001",
      deviceName: "HVAC Control Unit",
      sensorType: ["Temperature", "Humidity", "Power consumption"],
      location: "Back-office",
      status: "active",
      lastReading: null,
    },
    {
      deviceId: "pos_system_001",
      deviceName: "POS System",
      sensorType: ["Transaction logs"],
      location: "Checkout Counter #1",
      status: "active",
      lastReading: null,
    },
  ])

  const [isSimulating, setIsSimulating] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)

  // Start/stop simulation
  const toggleSimulation = () => {
    setIsSimulating(!isSimulating)
  }

  // Generate random data for devices
  useEffect(() => {
    if (!isSimulating) return

    const interval = setInterval(() => {
      setDevices((prevDevices) => {
        return prevDevices.map((device) => {
          // Generate device-specific data
          const newReading: DeviceData = {
            deviceId: device.deviceId,
            timestamp: new Date().toISOString(),
          }

          // Add device-specific fields
          if (device.deviceId === "foot_traffic_counter_001") {
            newReading.footCount = Math.floor(Math.random() * 20)
          } else if (device.deviceId === "hvac_control_unit_001") {
            newReading.temperature = 68 + Math.floor(Math.random() * 10)
            newReading.humidity = 30 + Math.floor(Math.random() * 20)
            newReading.powerUsage = 0.8 + Math.random() * 1.2
            newReading.mode = Math.random() > 0.7 ? "Heating" : "Cooling"
          } else if (device.deviceId === "pos_system_001") {
            newReading.transactionId = `TXN-${Math.floor(Math.random() * 10000)}`
            newReading.items = ["Product A", "Product B"]
            newReading.quantities = [1, Math.floor(Math.random() * 3) + 1]
            newReading.price = (9.99 + Math.random() * 20).toFixed(2)
            newReading.paymentMethod = Math.random() > 0.6 ? "Credit" : "Cash"
          }

          return {
            ...device,
            lastReading: newReading,
          }
        })
      })
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [isSimulating])

  // Get the selected device details
  const deviceDetails = selectedDevice ? devices.find((d) => d.deviceId === selectedDevice) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Device Simulator
        </CardTitle>
        <CardDescription>Simulate IoT device data for testing the GroovyBytes platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Simulation Status</h4>
              <p className="text-sm text-muted-foreground">
                {isSimulating ? "Actively generating device data" : "Simulation paused"}
              </p>
            </div>
            <Button variant={isSimulating ? "destructive" : "default"} onClick={toggleSimulation}>
              {isSimulating ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isSimulating ? "Stop Simulation" : "Start Simulation"}
            </Button>
          </div>

          <div className="border rounded-md p-4">
            <h4 className="text-sm font-medium mb-2">Connected Devices</h4>
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.deviceId}
                  className={`p-3 rounded-md border cursor-pointer ${selectedDevice === device.deviceId ? "bg-muted" : ""}`}
                  onClick={() => setSelectedDevice(device.deviceId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {device.deviceId.includes("foot") && <Users className="h-4 w-4" />}
                      {device.deviceId.includes("hvac") && <Thermometer className="h-4 w-4" />}
                      {device.deviceId.includes("pos") && <ShoppingCart className="h-4 w-4" />}
                      <span className="font-medium">{device.deviceName}</span>
                    </div>
                    <Badge variant={device.status === "active" ? "default" : "destructive"}>{device.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {device.location} • {device.sensorType.join(", ")}
                  </div>
                  {device.lastReading && (
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">Last reading: </span>
                      {new Date(device.lastReading.timestamp).toLocaleTimeString()}
                      {device.deviceId === "foot_traffic_counter_001" && (
                        <span className="ml-2">Foot count: {device.lastReading.footCount}</span>
                      )}
                      {device.deviceId === "hvac_control_unit_001" && (
                        <span className="ml-2">
                          Temp: {device.lastReading.temperature}°F, Power: {device.lastReading.powerUsage.toFixed(1)}{" "}
                          kWh
                        </span>
                      )}
                      {device.deviceId === "pos_system_001" && (
                        <span className="ml-2">Transaction: ${device.lastReading.price}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {deviceDetails && (
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-2">Device Configuration</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="device-name">Device Name</Label>
                    <Input id="device-name" value={deviceDetails.deviceName} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device-location">Location</Label>
                    <Input id="device-location" value={deviceDetails.location} readOnly />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-status">Status</Label>
                  <Select defaultValue={deviceDetails.status}>
                    <SelectTrigger id="device-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="anomaly-toggle">Generate Anomalies</Label>
                    <Switch id="anomaly-toggle" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the simulator will occasionally generate anomalous data
                  </p>
                </div>

                {deviceDetails.deviceId === "hvac_control_unit_001" && (
                  <div className="space-y-2">
                    <Label>Temperature Range (°F)</Label>
                    <Slider defaultValue={[68, 78]} min={50} max={90} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>50°F</span>
                      <span>90°F</span>
                    </div>
                  </div>
                )}

                {deviceDetails.deviceId === "foot_traffic_counter_001" && (
                  <div className="space-y-2">
                    <Label>Traffic Intensity</Label>
                    <Slider defaultValue={[50]} min={0} max={100} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                )}

                <Button variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Device
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

