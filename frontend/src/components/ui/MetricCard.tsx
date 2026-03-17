'use client'

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer } from 'recharts'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  gradient: string
  trend?: { value: number; label: string }
  onClick?: () => void
  sparkData?: number[]
  sparkType?: 'area' | 'bar'
  sparkColor?: string
  variant?: 'filled' | 'outline'
}

export default function MetricCard({
  title, value, subtitle, icon: Icon, gradient, trend, onClick,
  sparkData, sparkType = 'area', sparkColor, variant = 'filled'
}: MetricCardProps) {
  const isFilled = variant === 'filled'
  const chartData = sparkData?.map((v, i) => ({ v, i })) ?? []
  const effectiveSparkColor = sparkColor ?? (isFilled ? 'rgba(255,255,255,0.5)' : '#00d4ff')

  return (
    <div
      className={clsx(
        'rounded-2xl p-5 transition-all duration-200 relative overflow-hidden group',
        isFilled ? gradient : 'bg-white border border-[#e5e7eb]',
        isFilled
          ? 'text-white hover:shadow-lg'
          : 'text-[#0f172a] hover:border-[#cbd5e1]',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          isFilled ? 'bg-white/15' : gradient + '-icon'
        )}>
          <Icon className={clsx('w-[18px] h-[18px]', !isFilled && 'text-white')} strokeWidth={1.5} />
        </div>
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full',
            isFilled
              ? 'bg-white/10 text-white/80'
              : (trend.value >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')
          )}>
            {trend.value >= 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            }
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="z-10 flex-1">
          <div className={clsx(
            'text-[28px] font-bold mb-0.5 tabular-nums tracking-tight leading-none',
            !isFilled && 'text-[#0f172a]'
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className={clsx(
            'font-medium text-[13px] mt-1',
            isFilled ? 'text-white/80' : 'text-[#475569]'
          )}>
            {title}
          </div>
          {subtitle && (
            <div className={clsx(
              'text-[11px] mt-0.5 font-normal',
              isFilled ? 'text-white/40' : 'text-[#94a3b8]'
            )}>
              {subtitle}
            </div>
          )}
        </div>

        {chartData.length > 0 && (
          <div className="w-20 h-12 flex-shrink-0 opacity-60 group-hover:opacity-80 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              {sparkType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Bar dataKey="v" fill={effectiveSparkColor} radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`spark-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={effectiveSparkColor} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={effectiveSparkColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={effectiveSparkColor}
                    strokeWidth={1.5}
                    fill={`url(#spark-${title.replace(/\s/g, '')})`}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
