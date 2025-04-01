"use client"

import type * as React from "react"
import type { TickFormatter, } from "@visx/axis"
import type { NumberLike } from "@visx/scale"

import { AxisBottom, AxisLeft } from "@visx/axis"
import { Grid } from "@visx/grid"
import { Group } from "@visx/group"
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale"
import { Bar } from "@visx/shape"
import { Text } from "@visx/text"
import { Pie } from "@visx/shape"
import { GradientTealBlue } from "@visx/gradient"
import { curveCardinal } from "@visx/curve"
import { LinePath } from "@visx/shape"
import { ParentSize } from "@visx/responsive"
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip"
import { localPoint } from "@visx/event"
import { LegendOrdinal } from "@visx/legend"

// Define chart props
interface ChartProps {
  data: any[]
  index: string
  categories: string[]
  colors?: string[]
  valueFormatter?: TickFormatter<NumberLike>
  yAxisWidth?: number
  className?: string
}

// Define tooltip styles
const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  color: "white",
  border: "1px solid white",
  borderRadius: "4px",
  fontSize: "12px",
  padding: "8px",
}

// Color map for charts
const defaultColors = ["#2563eb", "#16a34a", "#9333ea", "#f59e0b", "#ef4444"]

// Helper function to get color from name
const getColorFromName = (name: string) => {
  switch (name.toLowerCase()) {
    case "blue":
      return "#2563eb"
    case "green":
      return "#16a34a"
    case "purple":
      return "#9333ea"
    case "orange":
      return "#f59e0b"
    case "red":
      return "#ef4444"
    case "cyan":
      return "#06b6d4"
    case "indigo":
      return "#4f46e5"
    case "violet":
      return "#8b5cf6"
    case "gray":
      return "#6b7280"
    default:
      return "#2563eb"
  }
}

// Line Chart Component
export function LineChart({
  data,
  index,
  categories,
  colors = defaultColors,
  valueFormatter = (value) => `${value}`,
  yAxisWidth = 50,
  className,
}: ChartProps) {
  const colorMap = colors.map((color, i) => getColorFromName(color))

  // Tooltip setup - Moved to the top level
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip()

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  })

  return (
    <div className={className}>
      <ParentSize>
        {({ width, height }) => {
          // Chart dimensions
          const margin = { top: 20, right: 20, bottom: 40, left: yAxisWidth }
          const innerWidth = width - margin.left - margin.right
          const innerHeight = height - margin.top - margin.bottom

          // Scales
          const xScale = scaleBand({
            domain: data.map((d) => d[index]),
            range: [0, innerWidth],
            padding: 0.3,
          })

          const allValues = categories.flatMap((category) => data.map((d) => Number(d[category] || 0)))

          const yScale = scaleLinear({
            domain: [0, Math.max(...allValues) * 1.1],
            range: [innerHeight, 0],
            nice: true,
          })

          const colorScale = scaleOrdinal({
            domain: categories,
            range: colorMap,
          })

          const handleMouseOver = (event: React.MouseEvent, datum: any, category: string) => {
            const coords = localPoint(event)
            showTooltip({
              tooltipData: { datum, category },
              tooltipLeft: coords?.x,
              tooltipTop: coords?.y,
            })
          }

          return (
            <div ref={containerRef} style={{ position: "relative" }}>
              <svg width={width} height={height}>
                <GradientTealBlue id="line-gradient" />

                <Group left={margin.left} top={margin.top}>
                  <Grid
                    width={innerWidth}
                    height={innerHeight}
                    xScale={xScale}
                    yScale={yScale}
                    stroke="#e0e0e0"
                    strokeOpacity={0.2}
                    columnTickValues={data.map((d) => d[index])}
                  />

                  <AxisLeft
                    scale={yScale}
                    tickFormat={valueFormatter}
                    stroke="#888888"
                    tickStroke="#888888"
                    tickLabelProps={() => ({
                      fill: "#888888",
                      fontSize: 10,
                      textAnchor: "end",
                      dy: "0.33em",
                    })}
                  />

                  <AxisBottom
                    top={innerHeight}
                    scale={xScale}
                    stroke="#888888"
                    tickStroke="#888888"
                    tickLabelProps={() => ({
                      fill: "#888888",
                      fontSize: 10,
                      textAnchor: "middle",
                      dy: "0.33em",
                    })}
                  />

                  {categories.map((category, i) => (
                    <LinePath
                      key={`line-${category}`}
                      data={data}
                      x={(d) => (xScale(d[index]) || 0) + xScale.bandwidth() / 2}
                      y={(d) => yScale(d[category] || 0)}
                      stroke={colorScale(category)}
                      strokeWidth={2}
                      curve={curveCardinal}
                      onMouseMove={(event) => handleMouseOver(event, data, category)}
                      onMouseLeave={hideTooltip}
                    />
                  ))}
                </Group>
              </svg>

              {/* Legend */}
              <div style={{ position: "absolute", top: 0, right: 0 }}>
                <LegendOrdinal scale={colorScale} direction="row" labelMargin="0 15px 0 0" shape="line" />
              </div>

              {tooltipOpen && tooltipData && (
                <TooltipInPortal key={Math.random()} top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
                  <div>
                    {/* @ts-ignore Category */}
                    <strong>{tooltipData.category}</strong>
                    {/* @ts-ignore Category */}
                    <div>{valueFormatter(tooltipData.datum[tooltipData.category])}</div>
                  </div>
                </TooltipInPortal>
              )}
            </div>
          )
        }}
      </ParentSize>
    </div>
  )
}

// Bar Chart Component
export function BarChart({
  data,
  index,
  categories,
  colors = defaultColors,
  valueFormatter = (value) => `${value}`,
  yAxisWidth = 50,
  className,
}: ChartProps) {
  const colorMap = colors.map((color, i) => getColorFromName(color))

  // Tooltip setup - Moved to the top level
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip()

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  })

  return (
    <div className={className}>
      <ParentSize>
        {({ width, height }) => {
          // Chart dimensions
          const margin = { top: 20, right: 20, bottom: 40, left: yAxisWidth }
          const innerWidth = width - margin.left - margin.right
          const innerHeight = height - margin.top - margin.bottom

          // Scales
          const xScale = scaleBand({
            domain: data.map((d) => d[index]),
            range: [0, innerWidth],
            padding: 0.3,
          })

          const allValues = categories.flatMap((category) => data.map((d) => Number(d[category] || 0)))

          const yScale = scaleLinear({
            domain: [0, Math.max(...allValues) * 1.1],
            range: [innerHeight, 0],
            nice: true,
          })

          const colorScale = scaleOrdinal({
            domain: categories,
            range: colorMap,
          })

          const handleMouseOver = (event: React.MouseEvent, datum: any, category: string) => {
            const coords = localPoint(event)
            showTooltip({
              tooltipData: { datum, category },
              tooltipLeft: coords?.x,
              tooltipTop: coords?.y,
            })
          }

          return (
            <div ref={containerRef} style={{ position: "relative" }}>
              <svg width={width} height={height}>
                <Group left={margin.left} top={margin.top}>
                  <Grid
                    width={innerWidth}
                    height={innerHeight}
                    xScale={xScale}
                    yScale={yScale}
                    stroke="#e0e0e0"
                    strokeOpacity={0.2}
                  />

                  <AxisLeft
                    scale={yScale}
                    tickFormat={valueFormatter}
                    stroke="#888888"
                    tickStroke="#888888"
                    tickLabelProps={() => ({
                      fill: "#888888",
                      fontSize: 10,
                      textAnchor: "end",
                      dy: "0.33em",
                    })}
                  />

                  <AxisBottom
                    top={innerHeight}
                    scale={xScale}
                    stroke="#888888"
                    tickStroke="#888888"
                    tickLabelProps={() => ({
                      fill: "#888888",
                      fontSize: 10,
                      textAnchor: "middle",
                      dy: "0.33em",
                    })}
                  />

                  {data.map((d, i) => {
                    const category = categories[0]
                    const barWidth = xScale.bandwidth() / categories.length

                    return categories.map((category, j) => {
                      const barHeight = innerHeight - yScale(d[category] || 0)
                      const barX = (xScale(d[index]) || 0) + j * barWidth
                      const barY = innerHeight - barHeight

                      return (
                        <Bar
                          key={`bar-${i}-${j}`}
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={barHeight}
                          fill={colorScale(category)}
                          onMouseMove={(event) => handleMouseOver(event, d, category)}
                          onMouseLeave={hideTooltip}
                        />
                      )
                    })
                  })}
                </Group>
              </svg>

              {/* Legend */}
              <div style={{ position: "absolute", top: 0, right: 0 }}>
                <LegendOrdinal scale={colorScale} direction="row" labelMargin="0 15px 0 0" />
              </div>

              {tooltipOpen && tooltipData && (
                <TooltipInPortal key={Math.random()} top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
                  <div>
                    {/* @ts-ignore Category */}
                    <strong>{tooltipData.datum[index]}</strong>
                    <div>
                      {/* @ts-ignore Category */}
                      {tooltipData.category}: {valueFormatter(tooltipData.datum[tooltipData.category])}
                    </div>
                  </div>
                </TooltipInPortal>
              )}
            </div>
          )
        }}
      </ParentSize>
    </div>
  )
}

// Pie Chart Component
export function PieChart({
  data,
  categories,
  index,
  colors = defaultColors,
  valueFormatter = (value) => `${value}`,
  className,
}: ChartProps) {
  const colorMap = colors.map((color, i) => getColorFromName(color))

  // Tooltip setup - Moved to the top level
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip()

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  })

  return (
    <div className={className}>
      <ParentSize>
        {({ width, height }) => {
          // Chart dimensions
          const margin = { top: 20, right: 20, bottom: 20, left: 20 }
          const innerWidth = width - margin.left - margin.right
          const innerHeight = height - margin.top - margin.bottom
          const radius = Math.min(innerWidth, innerHeight) / 2

          // Scales
          const colorScale = scaleOrdinal({
            domain: data.map((d) => d[index]),
            range: colorMap,
          })

          const handleMouseOver = (event: React.MouseEvent, datum: any) => {
            const coords = localPoint(event)
            showTooltip({
              tooltipData: datum,
              tooltipLeft: coords?.x,
              tooltipTop: coords?.y,
            })
          }

          // Calculate total for percentage
          const category = categories[0];
          const total = data.reduce((acc, d) => acc + d[category], 0)

          return (
            <div ref={containerRef} style={{ position: "relative" }}>
              <svg width={width} height={height}>
                <Group top={height / 2} left={width / 2}>
                  <Pie data={data} pieValue={(d) => d[category]} outerRadius={radius} innerRadius={0} padAngle={0.01}>
                    {(pie) => {
                      return pie.arcs.map((arc, i) => {
                        const [centroidX, centroidY] = pie.path.centroid(arc)
                        const datum = arc.data
                        const percentage = (datum[category] / total) * 100

                        return (
                          <g key={`arc-${i}`}>
                            <path
                              d={pie.path(arc) || ""}
                              fill={colorScale(datum[index])}
                              onMouseMove={(event) => handleMouseOver(event, datum)}
                              onMouseLeave={hideTooltip}
                            />
                            {percentage > 5 && (
                              <Text
                                x={centroidX}
                                y={centroidY}
                                textAnchor="middle"
                                verticalAnchor="middle"
                                fill="white"
                                fontSize={12}
                              >
                                {`${percentage.toFixed(0)}%`}
                              </Text>
                            )}
                          </g>
                        )
                      })
                    }}
                  </Pie>
                </Group>
              </svg>

              {/* Legend */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <LegendOrdinal scale={colorScale} direction="row" labelMargin="0 15px 0 0" />
              </div>

              {tooltipOpen && tooltipData && (
                <TooltipInPortal key={Math.random()} top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
                  <div>
                    {/* @ts-ignore Category */}
                    <strong>{tooltipData[index]}</strong>
                    <div>
                      {/* @ts-ignore Category */}
                      {valueFormatter(tooltipData[category])} ({((tooltipData[category] / total) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </TooltipInPortal>
              )}
            </div>
          )
        }}
      </ParentSize>
    </div>
  )
}

// Donut Chart Component
export function DonutChart({
  data,
  categories,
  index,
  colors = defaultColors,
  valueFormatter = (value) => `${value}`,
  className,
}: ChartProps) {
  const colorMap = colors.map((color, i) => getColorFromName(color))

  // Tooltip setup - Moved to the top level
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip()

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  })

  return (
    <div className={className}>
      <ParentSize>
        {({ width, height }) => {
          // Chart dimensions
          const margin = { top: 20, right: 20, bottom: 20, left: 20 }
          const innerWidth = width - margin.left - margin.right
          const innerHeight = height - margin.top - margin.bottom
          const radius = Math.min(innerWidth, innerHeight) / 2
          const innerRadius = radius * 0.6

          // Scales
          const colorScale = scaleOrdinal({
            domain: data.map((d) => d[index]),
            range: colorMap,
          })

          const handleMouseOver = (event: React.MouseEvent, datum: any) => {
            const coords = localPoint(event)
            showTooltip({
              tooltipData: datum,
              tooltipLeft: coords?.x,
              tooltipTop: coords?.y,
            })
          }

          // Calculate total for percentage
          const category = categories[0]
          const total = data.reduce((acc, d) => acc + d[category], 0)

          return (
            <div ref={containerRef} style={{ position: "relative" }}>
              <svg width={width} height={height}>
                <Group top={height / 2} left={width / 2}>
                  <Pie
                    data={data}
                    pieValue={(d) => d[category]}
                    outerRadius={radius}
                    innerRadius={innerRadius}
                    padAngle={0.02}
                  >
                    {(pie) => {
                      return pie.arcs.map((arc, i) => {
                        const [centroidX, centroidY] = pie.path.centroid(arc)
                        const datum = arc.data
                        const percentage = (datum[category] / total) * 100

                        return (
                          <g key={`arc-${i}`}>
                            <path
                              d={pie.path(arc) || ""}
                              fill={colorScale(datum[index])}
                              onMouseMove={(event) => handleMouseOver(event, datum)}
                              onMouseLeave={hideTooltip}
                            />
                            {percentage > 5 && (
                              <Text
                                x={centroidX}
                                y={centroidY}
                                textAnchor="middle"
                                verticalAnchor="middle"
                                fill="white"
                                fontSize={12}
                              >
                                {`${percentage.toFixed(0)}%`}
                              </Text>
                            )}
                          </g>
                        )
                      })
                    }}
                  </Pie>

                  {/* Center text with total */}
                  <Text textAnchor="middle" verticalAnchor="middle" fontSize={16} fontWeight="bold">
                    {/* @ts-ignore Category */}
                    {valueFormatter(total)}
                  </Text>
                </Group>
              </svg>

              {/* Legend */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <LegendOrdinal scale={colorScale} direction="row" labelMargin="0 15px 0 0" />
              </div>

              {tooltipOpen && tooltipData && (
                <TooltipInPortal key={Math.random()} top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
                  <div>
                    {/* @ts-ignore Category */}
                    <strong>{tooltipData[index]}</strong>
                    <div>
                      {/* @ts-ignore Category */}
                      {valueFormatter(tooltipData[category])} ({((tooltipData[category] / total) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </TooltipInPortal>
              )}
            </div>
          )
        }}
      </ParentSize>
    </div>
  )
}

