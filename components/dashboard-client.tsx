"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
} from "lucide-react"
// Data generators
import {
  generateFootTrafficData,
  generateEnergyConsumptionData,
  generateSalesData,
  generateInventoryData,
  generatePatternInsights,
  generateRelationshipData,
} from "@/lib/data-generators"
import Link from "next/link"

interface DashboardClientProps {
  profile: any | null
}

export function DashboardClient({ profile }: DashboardClientProps) {
  const [footTrafficData, setFootTrafficData] = useState<any>(null)
  const [energyData, setEnergyData] = useState<any>(null)
  const [salesData, setSalesData] = useState<any>(null)
  const [inventoryData, setInventoryData] = useState<any>(null)
  const [patternInsights, setPatternInsights] = useState<any>(null)
  const [relationshipData, setRelationshipData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate data loading
    const loadData = async () => {
      setIsLoading(true)

      // Generate all the data
      const footTraffic = await generateFootTrafficData()
      const energy = await generateEnergyConsumptionData()
      const sales = await generateSalesData()
      const inventory = await generateInventoryData()
      const patterns = await generatePatternInsights()
      const relationships = await generateRelationshipData()

      // Update state with generated data
      setFootTrafficData(footTraffic)
      setEnergyData(energy)
      setSalesData(sales)
      setInventoryData(inventory)
      setPatternInsights(patterns)
      setRelationshipData(relationships)

      setIsLoading(false)
    }

    loadData()
  }, [])

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-[600px]">
            <div>{JSON.stringify(profile)}</div>
            <div className="flex gap-1">
              <Link className="flex px-3 py-1.5 rounded-md hover:bg-slate-400/20" href="/login">
                Login
              </Link>
              <Link className="flex px-3 py-1.5 rounded-md hover:bg-slate-400/20" href="/logout">
                Logout
              </Link>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Loading Dashboard Data...</h2>
              <p className="text-muted-foreground">Analyzing retail store data and generating insights...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

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
                <Badge variant="outline" className="text-sm">
                  Last updated: Just now
                </Badge>
                <Button variant="outline" size="sm">
                  Refresh Data
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
                    value="$4,320"
                    change="+12.5%"
                    trend="up"
                    icon={<DollarSign className="h-4 w-4" />}
                    description="vs. previous day"
                  />
                  <KpiCard
                    title="Customer Traffic"
                    value="342"
                    change="+8.2%"
                    trend="up"
                    icon={<Users className="h-4 w-4" />}
                    description="vs. previous day"
                  />
                  <KpiCard
                    title="Conversion Rate"
                    value="24.3%"
                    change="-2.1%"
                    trend="down"
                    icon={<ShoppingCart className="h-4 w-4" />}
                    description="vs. previous day"
                  />
                  <KpiCard
                    title="Energy Usage"
                    value="142 kWh"
                    change="+5.3%"
                    trend="up"
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
                      <LineChart
                        data={footTrafficData.hourlyComparison}
                        categories={["Foot Traffic", "Sales"]}
                        index="hour"
                        colors={["blue", "green"]}
                        valueFormatter={(value) => `${value}`}
                        yAxisWidth={40}
                        className="h-[300px]"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Energy Consumption</CardTitle>
                      <CardDescription>By device type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DonutChart
                        data={energyData.byDevice}
                        category="value"
                        index="name"
                        valueFormatter={(value) => `${value} kWh`}
                        colors={["blue", "cyan", "indigo", "violet"]}
                        className="h-[300px]"
                      />
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
                      {patternInsights.anomalies.map((anomaly: any, index: number) => (
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
                              <span className="text-xs text-muted-foreground">Detected {anomaly.detectedAt}</span>
                            </div>
                          </div>
                        </div>
                      ))}
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
                      <BarChart
                        data={salesData.byCategory}
                        index="category"
                        categories={["sales"]}
                        colors={["blue"]}
                        valueFormatter={(value) => `$${value}`}
                        className="h-[300px]"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Inventory Levels</CardTitle>
                      <CardDescription>Current stock by department</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BarChart
                        data={inventoryData.byDepartment}
                        index="department"
                        categories={["current", "optimal"]}
                        colors={["blue", "gray"]}
                        valueFormatter={(value) => `${value} units`}
                        className="h-[300px]"
                      />
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
                      {patternInsights.patterns.map((pattern: any, index: number) => (
                        <div key={index} className="flex items-start gap-4 p-3 rounded-lg border">
                          <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <BarChart3 className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{pattern.title}</h4>
                            <p className="text-sm text-muted-foreground">{pattern.description}</p>
                            <div className="mt-2">
                              <Badge variant="outline" className="bg-primary/10">
                                {pattern.confidence}% confidence
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
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
                      {patternInsights.costOptimizations.map((opportunity: any, index: number) => (
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
                      {relationshipData.connections.map((relationship: any, index: number) => (
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
                              <Badge variant="outline">Correlation: {relationship.correlationStrength}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
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
                      {relationshipData.customerBehavior.map((insight: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border">
                          <h4 className="font-medium">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-primary/10">
                              {insight.confidence}% confidence
                            </Badge>
                          </div>
                        </div>
                      ))}
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
                    <LineChart
                      data={relationshipData.inventorySalesRelationship}
                      categories={["inventoryLevel", "salesPerformance"]}
                      index="date"
                      colors={["blue", "green"]}
                      valueFormatter={(value) => `${value}%`}
                      yAxisWidth={40}
                      className="h-[300px]"
                    />
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

