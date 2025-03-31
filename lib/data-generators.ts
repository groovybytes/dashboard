export async function generateFootTrafficData() {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Generate hourly data for foot traffic and sales comparison
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const hourlyComparison = hours.map((hour) => {
    // Create a realistic pattern:
    // - Low traffic early morning
    // - Peak during lunch (11-13)
    // - Second peak after work (17-19)
    // - Decline in evening
    let footTraffic = 0
    if (hour < 6) {
      footTraffic = Math.floor(Math.random() * 5)
    } else if (hour < 9) {
      footTraffic = 5 + Math.floor(Math.random() * 15)
    } else if (hour < 11) {
      footTraffic = 15 + Math.floor(Math.random() * 15)
    } else if (hour < 14) {
      footTraffic = 30 + Math.floor(Math.random() * 20) // Lunch peak
    } else if (hour < 17) {
      footTraffic = 20 + Math.floor(Math.random() * 15)
    } else if (hour < 20) {
      footTraffic = 25 + Math.floor(Math.random() * 20) // After work peak
    } else {
      footTraffic = Math.max(0, 25 - (hour - 20) * 8 + Math.floor(Math.random() * 5))
    }

    // Sales generally follow foot traffic but with some variance
    const salesConversion = 0.2 + Math.random() * 0.1 // 20-30% conversion rate
    const sales = Math.floor(footTraffic * salesConversion)

    return {
      hour: `${hour}:00`,
      "Foot Traffic": footTraffic,
      Sales: sales,
    }
  })

  return {
    hourlyComparison,
  }
}

/**
 * Generates energy consumption data for different device types
 * - Simulates energy usage distribution across major store systems
 * - Provides data for donut chart visualization
 *
 * @returns {Promise<Object>} Object containing energy consumption by device type
 */
export async function generateEnergyConsumptionData() {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600))

  // Energy consumption by device type
  const byDevice = [
    { name: "HVAC", value: 45 },
    { name: "Lighting", value: 30 },
    { name: "Refrigeration", value: 15 },
    { name: "Other", value: 10 },
  ]

  return {
    byDevice,
  }
}

/**
 * Generates sales data by product category
 * - Creates realistic sales distribution across store departments
 * - Provides data for bar chart visualization
 *
 * @returns {Promise<Object>} Object containing sales by category
 */
export async function generateSalesData() {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 700))

  // Sales by category
  const byCategory = [
    { category: "Groceries", sales: 2500 },
    { category: "Electronics", sales: 1800 },
    { category: "Clothing", sales: 1200 },
    { category: "Home Goods", sales: 950 },
    { category: "Beauty", sales: 750 },
    { category: "Toys", sales: 500 },
  ]

  return {
    byCategory,
  }
}

/**
 * Generates inventory data by department
 * - Shows current inventory levels compared to optimal levels
 * - Highlights departments that need restocking
 * - Provides data for bar chart visualization
 *
 * @returns {Promise<Object>} Object containing inventory levels by department
 */
export async function generateInventoryData() {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Inventory levels by department
  const byDepartment = [
    { department: "Groceries", current: 85, optimal: 100 },
    { department: "Electronics", current: 45, optimal: 60 },
    { department: "Clothing", current: 70, optimal: 80 },
    { department: "Home Goods", current: 55, optimal: 70 },
    { department: "Beauty", current: 30, optimal: 50 },
    { department: "Toys", current: 40, optimal: 40 },
  ]

  return {
    byDepartment,
  }
}

/**
 * Generates pattern insights, anomalies, and optimization opportunities
 * - Identifies unusual patterns requiring attention
 * - Detects recurring patterns in store data
 * - Suggests cost optimization opportunities
 *
 * @returns {Promise<Object>} Object containing anomalies, patterns, and cost optimizations
 */
export async function generatePatternInsights() {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 900))

  // Anomalies
  const anomalies = [
    {
      title: "HVAC Energy Spike",
      description: "Unusual energy consumption detected from HVAC system between 2:00 AM and 4:00 AM.",
      severity: "high",
      detectedAt: "2 hours ago",
    },
    {
      title: "Inventory Discrepancy",
      description: "Smart shelf sensors report 15 units of SKU-1234, but POS system shows 23 units sold today.",
      severity: "medium",
      detectedAt: "4 hours ago",
    },
    {
      title: "Unusual Foot Traffic Pattern",
      description: "Foot traffic increased by 45% during typically slow hours (2-4 PM) on Tuesday.",
      severity: "medium",
      detectedAt: "1 day ago",
    },
  ]

  // Patterns
  const patterns = [
    {
      title: "Weekly Sales Cycle",
      description: "Sales consistently peak on Fridays and Saturdays, with 30% higher revenue than mid-week.",
      confidence: 92,
    },
    {
      title: "Inventory-Sales Correlation",
      description: "Products displayed at eye level show 24% higher sales conversion than those on bottom shelves.",
      confidence: 87,
    },
    {
      title: "Energy Usage Pattern",
      description: "HVAC system runs 15% longer than necessary after store closing hours.",
      confidence: 78,
    },
  ]

  // Cost optimization opportunities
  const costOptimizations = [
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
    {
      title: "Staffing Optimization",
      description: "Adjusting staff schedules based on foot traffic patterns could reduce labor costs.",
      potentialSavings: "$1,200/month",
      implementationEffort: "Medium",
    },
  ]

  return {
    anomalies,
    patterns,
    costOptimizations,
  }
}

/**
 * Generates relationship data between different data sources
 * - Identifies correlations between different metrics
 * - Provides customer behavior insights
 * - Shows inventory-sales relationship over time
 *
 * @returns {Promise<Object>} Object containing connections, customer behavior, and inventory-sales relationship
 */
export async function generateRelationshipData() {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Connections between data sources
  const connections = [
    {
      title: "Foot Traffic → Sales Conversion",
      description: "Strong correlation between foot traffic and sales with a 20-minute lag time.",
      source: "Foot Traffic Sensors",
      target: "POS System",
      correlationStrength: "Strong (0.87)",
    },
    {
      title: "Weather → Energy Usage",
      description: "External temperature directly impacts HVAC energy consumption.",
      source: "Weather API",
      target: "HVAC Sensors",
      correlationStrength: "Strong (0.92)",
    },
    {
      title: "Inventory Levels → Sales Performance",
      description: "Products with inventory below 30% show decreased sales performance.",
      source: "Smart Shelf Sensors",
      target: "POS System",
      correlationStrength: "Moderate (0.74)",
    },
    {
      title: "Digital Signage → Product Interest",
      description: "Products featured on digital signage see increased customer engagement.",
      source: "Digital Signage System",
      target: "Smart Shelf Sensors",
      correlationStrength: "Moderate (0.68)",
    },
  ]

  // Customer behavior insights
  const customerBehavior = [
    {
      title: "Promotion Effectiveness",
      description: "Customers who view digital signage promotions are 2.3x more likely to purchase featured items.",
      confidence: 85,
    },
    {
      title: "Traffic Flow Pattern",
      description:
        "76% of customers follow a counter-clockwise shopping pattern, spending more time in the back-right quadrant of the store.",
      confidence: 91,
    },
    {
      title: "Dwell Time Correlation",
      description:
        "Customers who spend >3 minutes in the electronics section have a 45% higher average transaction value.",
      confidence: 82,
    },
  ]

  // Inventory-sales relationship over time
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (30 - i))
    return date.toISOString().split("T")[0]
  })

  const inventorySalesRelationship = dates.map((date) => {
    // Create a pattern where inventory and sales are related
    // When inventory drops too low, sales performance drops
    // When inventory is too high, sales performance is stable but not optimal
    const dayNum = Number.parseInt(date.split("-")[2])

    // Inventory cycles - starts high, decreases, gets restocked
    let inventoryLevel = 100 - (dayNum % 10) * 10
    if (inventoryLevel < 20) inventoryLevel = 90 // Restock event

    // Sales performance is optimal when inventory is 40-70%
    let salesPerformance = 100
    if (inventoryLevel < 30) {
      salesPerformance = 70 + inventoryLevel // Performance drops with low inventory
    } else if (inventoryLevel > 80) {
      salesPerformance = 95 // Slightly suboptimal with excess inventory
    }

    // Add some noise
    inventoryLevel += Math.floor(Math.random() * 10) - 5
    salesPerformance += Math.floor(Math.random() * 10) - 5

    // Ensure values are within reasonable ranges
    inventoryLevel = Math.max(10, Math.min(100, inventoryLevel))
    salesPerformance = Math.max(50, Math.min(100, salesPerformance))

    return {
      date,
      inventoryLevel,
      salesPerformance,
    }
  })

  return {
    connections,
    customerBehavior,
    inventorySalesRelationship,
  }
}

