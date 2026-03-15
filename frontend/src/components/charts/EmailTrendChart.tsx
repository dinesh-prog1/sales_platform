'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface EmailTrendChartProps {
  data: Array<{ date: string; count: number }>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3">
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-blue-600 font-bold text-lg">{payload[0].value}</p>
        <p className="text-gray-400 text-xs">emails sent</p>
      </div>
    )
  }
  return null
}

export default function EmailTrendChart({ data }: EmailTrendChartProps) {
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 mb-4 text-base">Email Activity (30 Days)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="emailGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#emailGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
