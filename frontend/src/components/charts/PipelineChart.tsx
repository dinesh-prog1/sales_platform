'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface PipelineChartProps {
  data: Array<{ stage: string; count: number; color: string }>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3">
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        <p className="text-blue-600 font-bold text-lg">{payload[0].value.toLocaleString()}</p>
        <p className="text-gray-500 text-xs">companies</p>
      </div>
    )
  }
  return null
}

export default function PipelineChart({ data }: PipelineChartProps) {
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 mb-4 text-base">Sales Pipeline Funnel</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: '#64748b' }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
