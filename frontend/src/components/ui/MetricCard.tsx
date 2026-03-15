'use client'

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  gradient: string
  trend?: { value: number; label: string }
  onClick?: () => void
}

export default function MetricCard({
  title, value, subtitle, icon: Icon, gradient, trend, onClick
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl p-5 text-white cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl',
        gradient,
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
            trend.value >= 0 ? 'bg-green-500/25 text-green-100' : 'bg-red-500/25 text-red-100'
          )}>
            {trend.value >= 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            }
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl font-bold mb-1 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-white/90 font-medium text-sm">{title}</div>
        {subtitle && (
          <div className="text-white/60 text-xs mt-1">{subtitle}</div>
        )}
        {trend && (
          <div className="text-white/60 text-xs mt-1">{trend.label}</div>
        )}
      </div>
    </div>
  )
}
