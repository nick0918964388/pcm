'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts'

interface ChartData {
  [key: string]: any
}

interface ChartComponentProps {
  type: 'bar' | 'line' | 'pie'
  data: ChartData[]
  title?: string
  height?: number
  className?: string
  loading?: boolean
  colors?: string[]
  xAxisKey?: string
  yAxisKey?: string
  barKey?: string
  lineKey?: string
  pieNameKey?: string
  pieValueKey?: string
}

const DEFAULT_COLORS = [
  '#00645A', // brand-primary
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // yellow-500
  '#EF4444', // red-500
  '#8B5CF6', // purple-500
  '#F97316', // orange-500
  '#06B6D4'  // cyan-500
]

export function ChartComponent({
  type,
  data,
  title,
  height = 300,
  className,
  loading = false,
  colors = DEFAULT_COLORS,
  xAxisKey = 'name',
  yAxisKey,
  barKey = 'value',
  lineKey = 'value',
  pieNameKey = 'name',
  pieValueKey = 'value'
}: ChartComponentProps) {
  if (loading) {
    return (
      <div className={cn('bg-white p-6 rounded-lg shadow', className)}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        )}
        <div 
          className="flex items-center justify-center bg-gray-50 rounded"
          style={{ height }}
        >
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 text-brand-primary mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-gray-500">載入圖表中...</span>
          </div>
        </div>
      </div>
    )
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={barKey} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={lineKey} 
                stroke={colors[0]} 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={pieValueKey}
                nameKey={pieNameKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  if (data.length === 0) {
    return (
      <div className={cn('bg-white p-6 rounded-lg shadow', className)}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        )}
        <div 
          className="flex items-center justify-center bg-gray-50 rounded"
          style={{ height }}
        >
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>暫無圖表資料</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-white p-6 rounded-lg shadow', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="w-full">
        {renderChart()}
      </div>
    </div>
  )
}