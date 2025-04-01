// Types for the dashboard data
export interface DashboardData {
  systemStatus: {
    totalDevices: number
    activeDevices: number
    totalDocuments: number
    processedDocuments: number
    lastUpdateTimestamp: string
  }
  deviceData: {
    hourlyComparison: {
      hour: string
      footTraffic: number
      sales: number
    }[]
    energyConsumption: {
      name: string
      value: number
    }[]
    deviceHealth: {
      deviceId: string
      status: string
      lastPing: string
      batteryLevel: number
      errorCount: number
    }[]
  }
  businessMetrics: {
    dailyRevenue: {
      value: number
      trend: 'up' | 'down'
      changePercentage: number
    }
    customerTraffic: {
      value: number
      trend: 'up' | 'down'
      changePercentage: number
    }
    conversionRate: {
      value: number
      trend: 'up' | 'down'
      changePercentage: number
    }
    energyUsage: {
      value: number
      trend: 'up' | 'down'
      changePercentage: number
    }
    byCategory: {
      category: string
      sales: number
    }[]
    byDepartment: {
      department: string
      current: number
      optimal: number
    }[]
  }
  insights: {
    anomalies: {
      title: string
      description: string
      severity: string
      detectedAt: string
      sourceType: string
      affectedAssets: string[]
    }[]
    patterns: {
      title: string
      description: string
      confidence: number
      dataPoints: {
        timestamp: string
        value: number
      }[]
      sourceType: string
    }[]
    costOptimizations: {
      title: string
      description: string
      potentialSavings: string
      implementationEffort: string
      roi: number
      paybackPeriod: string
    }[]
  }
  relationships: {
    connections: {
      title: string
      description: string
      source: string
      target: string
      correlationStrength: number
      relationshipType: string
    }[]
    customerBehavior: {
      title: string
      description: string
      confidence: number
      impactScore: number
      relatedMetrics: string[]
    }[]
    inventorySalesRelationship: {
      date: string
      inventoryLevel: number
      salesPerformance: number
    }[]
  }
  documentInsights: {
    documentMetrics: {
      totalProcessed: number
      pendingAnalysis: number
      failedProcessing: number
    }
    contentAnalysis: {
      documentId: string
      type: string
      extractedData: Record<string, any>
      confidence: number
      relatedDevices: string[]
      anomalies: string[]
    }[]
    crossReferenceResults: {
      documentId: string
      deviceId: string
      correlationType: string
      confidence: number
      insights: string[]
    }[]
  }
  systemMetrics: {
    processingLatency: {
      deviceData: number
      documentProcessing: number
      analysisEngine: number
    }
    resourceUtilization: {
      cpu: number
      memory: number
      storage: number
    }
    errorRates: {
      deviceErrors: number
      processingErrors: number
      systemErrors: number
    }
    healthScore: number
  }
  lastUpdated: string
}

// API client functions
export async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('http://localhost:3050/api/dashboard')
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data')
  }
  return response.json()
}

export function connectToWebSocket(onUpdate: (data: Partial<DashboardData>) => void) {
  const ws = new WebSocket('ws://localhost:3050/api/dashboard/realtime')

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data)
    onUpdate(update.data)
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  return () => ws.close()
} 