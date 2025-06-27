"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { VitalSign } from "@/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { HeartPulse, Activity, Wind, Thermometer } from "lucide-react"

const chartConfig = {
  heartRate: {
    label: "Frec. Cardíaca (lpm)",
    color: "hsl(var(--chart-1))",
    icon: HeartPulse,
  },
  systolicPressure: {
    label: "P. Sistólica (mmHg)",
    color: "hsl(var(--chart-2))",
    icon: Activity,
  },
  oxygenSaturation: {
    label: "Sat. O₂ (%)",
    color: "hsl(var(--chart-3))",
    icon: Wind,
  },
  temperature: {
    label: "Temp. (°C)",
    color: "hsl(var(--chart-4))",
    icon: Thermometer,
  },
} satisfies ChartConfig

interface VitalsChartProps {
  data: VitalSign[]
}

export function VitalsChart({ data }: VitalsChartProps) {
  const chartData = data
    .map(item => ({
      ...item,
      date: format(new Date(item.timestamp), 'dd MMM HH:mm', { locale: es }),
    }))
    .reverse(); // reverse to show oldest to newest

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial Gráfico de Signos Vitales</CardTitle>
        <CardDescription>
          Visualización de las últimas lecturas de signos vitales a lo largo del tiempo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 20,
                left: -10,
                bottom: 5,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
               <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                domain={[30, 45]}
                hide={true} // Hide axis, just use for temp scale
              />
              <ChartTooltip
                cursor={true}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelClassName="text-sm"
                    className="bg-background"
                  />
                }
              />
               <ChartLegend content={<ChartLegendContent />} />
              <Line
                yAxisId="left"
                dataKey="heartRate"
                type="monotone"
                stroke={chartConfig.heartRate.color}
                strokeWidth={2}
                dot={false}
                name="Frec. Cardíaca"
              />
              <Line
                yAxisId="left"
                dataKey="systolicPressure"
                type="monotone"
                stroke={chartConfig.systolicPressure.color}
                strokeWidth={2}
                dot={false}
                name="P. Sistólica"
              />
              <Line
                yAxisId="left"
                dataKey="oxygenSaturation"
                type="monotone"
                stroke={chartConfig.oxygenSaturation.color}
                strokeWidth={2}
                dot={false}
                name="Sat. O₂"
              />
              <Line
                yAxisId="right" // Use a separate axis for temp due to different scale
                dataKey="temperature"
                type="monotone"
                stroke={chartConfig.temperature.color}
                strokeWidth={2}
                dot={false}
                name="Temp."
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
