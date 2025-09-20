import * as React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  startDate?: string
  endDate?: string
  actualDays?: number
  planDays?: number
  value?: string | number
  unit?: string
  percentage?: string
  actual?: string
  plan?: string
  color: 'green' | 'blue' | 'yellow' | 'red'
  icon?: React.ReactNode
  subItems?: Array<{
    label: string
    value: string | number
    unit?: string
  }>
  className?: string
}

export function StatCard({
  title,
  startDate,
  endDate,
  actualDays,
  planDays,
  value,
  unit,
  percentage,
  actual,
  plan,
  color,
  icon,
  subItems,
  className
}: StatCardProps) {
  const colorClasses = {
    green: 'from-green-400 to-green-600',
    blue: 'from-blue-400 to-blue-600',
    yellow: 'from-yellow-400 to-yellow-600',
    red: 'from-red-400 to-red-600'
  }

  const iconBgClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg shadow-lg', className)}>
      {/* Gradient background */}
      <div className={cn('absolute inset-0 bg-gradient-to-br', colorClasses[color])} />
      
      {/* Content */}
      <div className="relative p-4 text-white">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-sm">{title}</h3>
          {icon && (
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center bg-white bg-opacity-20', iconBgClasses[color])}>
              {icon}
            </div>
          )}
        </div>

        {/* Date range */}
        {startDate && (
          <div className="text-xs mb-2 space-y-1">
            <div className="flex justify-between">
              <span className="opacity-90">開始起算</span>
              <span className="font-medium">{startDate}</span>
            </div>
            {endDate && (
              <div className="flex justify-between">
                <span className="opacity-90">計畫完成</span>
                <span className="font-medium">{endDate}</span>
              </div>
            )}
          </div>
        )}

        {/* Days tracking */}
        {(actualDays !== undefined || planDays !== undefined) && (
          <div className="text-xs mb-2 space-y-1">
            {actualDays !== undefined && (
              <div className="flex justify-between">
                <span className="opacity-90">專案天數</span>
                <span className="font-medium">{actualDays} d</span>
              </div>
            )}
            {planDays !== undefined && (
              <div className="flex justify-between">
                <span className="opacity-90">經過天數</span>
                <span className="font-medium">{planDays} d</span>
              </div>
            )}
          </div>
        )}

        {/* Main value */}
        {value !== undefined && (
          <div className="text-center my-3">
            <div className="text-3xl font-bold">
              {typeof value === 'number' ? value.toLocaleString('zh-TW') : value}
            </div>
            {unit && <div className="text-sm opacity-90">{unit}</div>}
          </div>
        )}

        {/* Percentage or status */}
        {percentage && (
          <div className="text-center text-2xl font-bold mb-2">
            {percentage}
          </div>
        )}

        {/* Actual vs Plan */}
        {(actual || plan) && (
          <div className="text-xs space-y-1">
            {actual && (
              <div className="flex justify-between">
                <span className="opacity-90">actual</span>
                <span className="font-medium">{actual}</span>
              </div>
            )}
            {plan && (
              <div className="flex justify-between">
                <span className="opacity-90">plan</span>
                <span className="font-medium">{plan}</span>
              </div>
            )}
          </div>
        )}

        {/* Sub items */}
        {subItems && subItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white border-opacity-30 space-y-1">
            {subItems.map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="opacity-90">{item.label}</span>
                <span className="font-medium">
                  {typeof item.value === 'number' ? item.value.toLocaleString('zh-TW') : item.value}
                  {item.unit && ` ${item.unit}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}