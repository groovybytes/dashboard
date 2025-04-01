"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
// Layout components
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
// UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
// Chart components
import { LineChart, BarChart, DonutChart } from "@/components/ui/chart"
// Icons
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  ShoppingCart,
  Zap,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Network,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

// Change the API_URL from a relative URL to the absolute URL of your backend server
const API_URL = "http://localhost:3050/api/dashboard"

interface DashboardClientProps {
  profile: any | null
}

export function DashboardClient({ profile }: DashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  // Function to generate fallback data when API is unavailable
  const generateFallbackData = () => {
    return {
      businessMetrics: {
        dailyRevenue: { value: 8500, trend: "up", changePercentage: 12 },
        customerTraffic: { value: 750, trend: "up", changePercentage: 8 },
        conversionRate: { value: 25, trend: "down", changePercentage: 3 },
        energyUsage: { value: 320, trend: "up", changePercentage: 5 },
        byCategory: [
          { category: "Electronics", sales: 1200 },
          { category: "Clothing", sales: 950 },
          { category: "Groceries", sales: 1500 },
          { category: "Home & Garden", sales: 800 },
          { category: "Toys", sales: 600 },
          { category: "Books", sales: 450 },
        ],
        byDepartment: [
          { department: "Front", current: 75, optimal: 90 },
          { department: "Back", current: 60, optimal: 80 },
          { department: "Warehouse", current: 85, optimal: 95 },
          { department: "Checkout", current: 50, optimal: 70 },
          { department: "Customer Service", current: 65, optimal: 75 },
        ],
      },
      deviceData: {
        hourlyComparison: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}:00`,
          footTraffic: Math.floor(Math.random() * 150) + 50,
          sales: Math.floor(Math.random() * 900) + 100,
        })),
        energyConsumption: [
          { name: "Camera", value: 85 },
          { name: "Sensor", value: 60 },
          { name: "Display", value: 110 },
          { name: "Scanner", value: 70 },
          { name: "POS Terminal", value: 95 },
        ],
      },
      insights: {
        anomalies: [
          {
            title: "HVAC Energy Spike",
            description: "Unusual energy consumption detected from HVAC system between 2:00 AM and 4:00 AM.",
            severity: "high",
            detectedAt: new Date().toISOString(),
          },
          {
            title: "Inventory Discrepancy",
            description: "Smart shelf sensors report 15 units of SKU-1234, but POS system shows 23 units sold today.",
            severity: "medium",
            detectedAt: new Date().toISOString(),
          },
        ],
        patterns: [
          {
            title: "Weekly Sales Cycle",
            description: "Sales consistently peak on Fridays and Saturdays, with 30% higher revenue than mid-week.",
            confidence: 0.92,
          },
          {
            title: "Inventory-Sales Correlation",
            description:
              "Products displayed at eye level show 24% higher sales conversion than those on bottom shelves.",
            confidence: 0.87,
          },
        ],
        costOptimizations: [
          {
            title: "HVAC Scheduling Optimization",
            description: "Adjusting HVAC schedules to align with store hours could reduce energy costs.",
            potentialSavings: "$320/month",
            implementationEffort: "Low",
          },
          {
            title: "Lighting Sensor Installation",
            description: "Installing motion sensors in low-traffic areas could reduce lighting costs.",
            potentialSavings: "$150/month",
            implementationEffort: "Medium",
          },
        ],
      },
      relationships: {
        connections: [
          {
            title: "Foot Traffic → Sales Conversion",
            description: "Strong correlation between foot traffic and sales with a 20-minute lag time.",
            source: "Foot Traffic Sensors",
            target: "POS System",
            correlationStrength: 0.87,
          },
          {
            title: "Weather → Energy Usage",
            description: "External temperature directly impacts HVAC energy consumption.",
            source: "Weather API",
            target: "HVAC Sensors",
            correlationStrength: 0.92,
          },
        ],
        customerBehavior: [
          {
            title: "Promotion Effectiveness",
            description:
              "Customers who view digital signage promotions are 2.3x more likely to purchase featured items.",
            confidence: 0.85,
          },
          {
            title: "Traffic Flow Pattern",
            description:
              "76% of customers follow a counter-clockwise shopping pattern, spending more time in the back-right quadrant of the store.",
            confidence: 0.91,
          },
        ],
        inventorySalesRelationship: Array.from({ length: 5 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          return {
            date: date.toISOString().split("T")[0],
            inventoryLevel: Math.floor(Math.random() * 800) + 200,
            salesPerformance: Math.floor(Math.random() * 800) + 100,
          }
        }),
      },
    }
  }

  // Update the fetchDashboardData function to better handle non-JSON responses
  const fetchDashboardData = useCallback(async () => {
    try {
      // Try to fetch from the API with the absolute URL
      console.log("Fetching data from:", API_URL)
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      // Check if the response is JSON by looking at the content-type header
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        // If not JSON, log the text response for debugging
        const textResponse = await response.text()
        console.error("Non-JSON response received:", textResponse.substring(0, 100) + "...")
        throw new Error("API returned non-JSON response")
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("API data received:", data)
      setDashboardData(data)
      setLastUpdated(new Date())
      setError(null)
      return data
    } catch (err) {
      console.error("Error fetching dashboard data:", err)

      // Use fallback data if API is unavailable
      const fallbackData = generateFallbackData()
      setDashboardData(fallbackData)
      setLastUpdated(new Date())
      if (err instanceof Error) {
        setError(`Using fallback data. API connection failed: ${err.message}`)
      } else {
        setError('Using fallback data. API connection failed.')
      }

      return fallbackData
    }
  }, [])

  // Function to handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchDashboardData()
    setIsRefreshing(false)
  }

  // Also update the WebSocket connection to use the absolute URL
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await fetchDashboardData()
      setIsLoading(false)
    }

    loadData()

    // Set up WebSocket for real-time updates
    let ws: WebSocket | null = null

    try {
      // Use absolute WebSocket URL
      const wsUrl = "ws://localhost:3050/api/dashboard/realtime"

      console.log("Connecting to WebSocket:", wsUrl)
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log("WebSocket connected")
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const wsData = JSON.parse(event.data)
          console.log("WebSocket data received:", wsData)
          if (wsData.data) {
            setDashboardData(wsData.data)
            setLastUpdated(new Date())
          }
        } catch (err) {
          console.error("Error parsing WebSocket data:", err)
        }
      }

      ws.onerror = (err) => {
        console.error("WebSocket error:", err)
        setWsConnected(false)
      }

      ws.onclose = () => {
        console.log("WebSocket disconnected")
        setWsConnected(false)
      }
    } catch (err) {
      console.error("WebSocket setup error:", err)
    }

    // Cleanup WebSocket on component unmount
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [fetchDashboardData])

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Loading Dashboard Data...</h2>
              <p className="text-muted-foreground">Connecting to backend and fetching data...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Extract data for visualization
  const {
    businessMetrics = {},
    deviceData = {},
    insights = {},
    relationships = {},
    systemStatus = {},
  } = dashboardData || {}

  // Format hourly data for the line chart
  const hourlyData =
    deviceData.hourlyComparison?.map((item: any) => ({
      hour: item.hour,
      "Foot Traffic": item.footTraffic,
      Sales: item.sales,
    })) || []

  // Format energy consumption data for the donut chart
  const energyData = deviceData.energyConsumption || []

  // Format sales by category data for the bar chart
  const salesData = businessMetrics.byCategory || []

  // Format inventory data for the bar chart
  const inventoryData = businessMetrics.byDepartment || []

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="flex flex-col gap-6">
            <div>{JSON.stringify(profile)}</div>
            <div className="flex gap-1">
              <Link className="flex px-3 py-1.5 rounded-md hover:bg-slate-400/20" href="/login">
                Login
              </Link>
              <Link className="flex px-3 py-1.5 rounded-md hover:bg-slate-400/20" href="/logout">
                Logout
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <div className="flex items-center gap-2">
                {error && (
                  <Badge variant="destructive" className="text-sm">
                    {error}
                  </Badge>
                )}
                {wsConnected && (
                  <Badge variant="outline" className="bg-green-100 text-green-600 text-sm">
                    Live Data
                  </Badge>
                )}
                <Badge variant="outline" className="text-sm">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="relationships">Relationships</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                    title="Daily Revenue"
                    value={`$${businessMetrics.dailyRevenue?.value?.toLocaleString() || "0"}`}
                    change={`${businessMetrics.dailyRevenue?.changePercentage || 0}%`}
                    trend={businessMetrics.dailyRevenue?.trend || "up"}
                    icon={<DollarSign className="h-4 w-4" />}
                    description="vs. previous day"
                  />
                  <KpiCard
                    title="Customer Traffic"
                    value={businessMetrics.customerTraffic?.value?.toString() || "0"}
                    change={`${businessMetrics.customerTraffic?.changePercentage || 0}%`}
                    trend={businessMetrics.customerTraffic?.trend || "up"}
                    icon={<Users className="h-4 w-4" />}
                    description="vs. previous day"
                  />
                  <KpiCard
                    title="Conversion Rate"
                    value={`${businessMetrics.conversionRate?.value || 0}%`}
                    change={`${businessMetrics.conversionRate?.changePercentage || 0}%`}
                    trend={businessMetrics.conversionRate?.trend || "up"}
                    icon={<ShoppingCart className="h-4 w-4" />}
                    description="vs. previous day"
                  />
                  <KpiCard
                    title="Energy Usage"
                    value={`${businessMetrics.energyUsage?.value || 0} kWh`}
                    change={`${businessMetrics.energyUsage?.changePercentage || 0}%`}
                    trend={businessMetrics.energyUsage?.trend || "up"}
                    icon={<Zap className="h-4 w-4" />}
                    description="vs. previous day"
                  />
                </div>

                {/* Charts */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Foot Traffic vs. Sales</CardTitle>
                      <CardDescription>Hourly comparison for today</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {hourlyData.length > 0 ? (
                        <LineChart
                          data={hourlyData}
                          categories={["Foot Traffic", "Sales"]}
                          index="hour"
                          colors={["blue", "green"]}
                          valueFormatter={(value) => `${value}`}
                          yAxisWidth={40}
                          className="h-[300px]"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[300px]">
                          <p className="text-muted-foreground">No data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Energy Consumption</CardTitle>
                      <CardDescription>By device type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {energyData.length > 0 ? (
                        <DonutChart
                          data={energyData}
                          categories={["value"]}
                          index="name"
                          valueFormatter={(value) => `${value} kWh`}
                          colors={["blue", "cyan", "indigo", "violet"]}
                          className="h-[300px]"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[300px]">
                          <p className="text-muted-foreground">No data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Anomalies and Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Detected Anomalies
                    </CardTitle>
                    <CardDescription>Unusual patterns requiring attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.anomalies?.map((anomaly: any, index: number) => (
                        <div key={index} className="flex items-start gap-4 p-3 rounded-lg border">
                          <div
                            className={`p-2 rounded-full ${anomaly.severity === "high" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}
                          >
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{anomaly.title}</h4>
                            <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant={anomaly.severity === "high" ? "destructive" : "outline"}>
                                {anomaly.severity === "high" ? "High Priority" : "Medium Priority"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Detected {new Date(anomaly.detectedAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!insights.anomalies?.length && (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No anomalies detected</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales by Category</CardTitle>
                      <CardDescription>Last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {salesData.length > 0 ? (
                        <BarChart
                          data={salesData}
                          index="category"
                          categories={["sales"]}
                          colors={["blue"]}
                          valueFormatter={(value) => `$${value}`}
                          className="h-[300px]"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[300px]">
                          <p className="text-muted-foreground">No data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Inventory Levels</CardTitle>
                      <CardDescription>Current stock by department</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {inventoryData.length > 0 ? (
                        <BarChart
                          data={inventoryData}
                          index="department"
                          categories={["current", "optimal"]}
                          colors={["blue", "gray"]}
                          valueFormatter={(value) => `${value} units`}
                          className="h-[300px]"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[300px]">
                          <p className="text-muted-foreground">No data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Pattern Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Pattern Insights
                    </CardTitle>
                    <CardDescription>Automatically detected patterns in your data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.patterns?.map((pattern: any, index: number) => (
                        <div key={index} className="flex items-start gap-4 p-3 rounded-lg border">
                          <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <BarChart3 className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{pattern.title}</h4>
                            <p className="text-sm text-muted-foreground">{pattern.description}</p>
                            <div className="mt-2">
                              <Badge variant="outline" className="bg-primary/10">
                                {Math.round(pattern.confidence * 100)}% confidence
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!insights.patterns?.length && (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No patterns detected</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Optimization Opportunities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Cost Optimization Opportunities
                    </CardTitle>
                    <CardDescription>Potential savings identified by GroovyBytes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.costOptimizations?.map((opportunity: any, index: number) => (
                        <div key={index} className="flex items-start gap-4 p-3 rounded-lg border">
                          <div className="p-2 rounded-full bg-green-100 text-green-600">
                            <DollarSign className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{opportunity.title}</h4>
                            <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-100 text-green-600">
                                Potential savings: {opportunity.potentialSavings}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Implementation: {opportunity.implementationEffort}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!insights.costOptimizations?.length && (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No optimization opportunities found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Relationships Tab */}
              <TabsContent value="relationships" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="h-5 w-5 text-primary" />
                      Data Relationships
                    </CardTitle>
                    <CardDescription>Connections between different data sources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {relationships.connections?.map((relationship: any, index: number) => (
                        <div key={index} className="flex items-start gap-4 p-3 rounded-lg border">
                          <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <Network className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{relationship.title}</h4>
                            <p className="text-sm text-muted-foreground">{relationship.description}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="bg-blue-100 text-blue-600">
                                {relationship.source}
                              </Badge>
                              <span className="text-xs">→</span>
                              <Badge variant="outline" className="bg-purple-100 text-purple-600">
                                {relationship.target}
                              </Badge>
                              <Badge variant="outline">
                                Correlation: {Math.round(relationship.correlationStrength * 100)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!relationships.connections?.length && (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No relationships found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Behavior Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Behavior Insights</CardTitle>
                    <CardDescription>Relationships between traffic, purchases, and promotions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {relationships.customerBehavior?.map((insight: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border">
                          <h4 className="font-medium">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-primary/10">
                              {Math.round(insight.confidence * 100)}% confidence
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {!relationships.customerBehavior?.length && (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No customer behavior insights available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Inventory-Sales Relationship */}
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory-Sales Relationship</CardTitle>
                    <CardDescription>How inventory levels affect sales performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {relationships.inventorySalesRelationship?.length > 0 ? (
                      <LineChart
                        data={relationships.inventorySalesRelationship}
                        categories={["inventoryLevel", "salesPerformance"]}
                        index="date"
                        colors={["blue", "green"]}
                        valueFormatter={(value) => `${value}`}
                        yAxisWidth={40}
                        className="h-[300px]"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[300px]">
                        <p className="text-muted-foreground">No data available</p>
                      </div>
                    )}
                    <div className="mt-4 p-3 rounded-lg border">
                      <h4 className="font-medium">Key Insight</h4>
                      <p className="text-sm text-muted-foreground">
                        When inventory levels drop below 30% of optimal, sales performance decreases by an average of
                        15%. Maintaining inventory between 40-70% of optimal levels maximizes sales while minimizing
                        carrying costs.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

interface KpiCardProps {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  icon: React.ReactNode
  description: string
}

function KpiCard({ title, value, change, trend, icon, description }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs">
          <span className={trend === "up" ? "text-emerald-500" : "text-rose-500"}>
            {trend === "up" ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
            {change}
          </span>
          <span className="ml-1 text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  )
}

