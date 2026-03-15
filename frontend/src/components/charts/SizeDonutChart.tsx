'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SizeDonutChartProps {
  data: Array<{ size: string; count: number }>
}

const COLORS = { small: '#60a5fa', medium: '#818cf8', large: '#a78bfa' }
const LABELS = { small: 'Small', medium: 'Medium', large: 'Large' }

export default function SizeDonutChart({ data }: SizeDonutChartProps) {
  const chartData = data.map(d => ({
    name: LABELS[d.size as keyof typeof LABELS] || d.size,
    value: d.count,
    color: COLORS[d.size as keyof typeof COLORS] || '#94a3b8',
  }))

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 mb-4 text-base">Companies by Size</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), 'Companies']}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
          />
          <Legend
            formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
