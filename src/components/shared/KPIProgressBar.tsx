import * as React from 'react';
import { cn } from '@/lib/utils';

interface KPIProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color?: 'green' | 'blue' | 'yellow' | 'red';
  showPercentage?: boolean;
  className?: string;
}

export function KPIProgressBar({
  label,
  value,
  maxValue,
  color = 'green',
  showPercentage = true,
  className,
}: KPIProgressBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-gray-600'>{label}</span>
        {showPercentage && (
          <span className='font-medium text-gray-900'>
            {value.toLocaleString('zh-TW')} / {maxValue.toLocaleString('zh-TW')}
          </span>
        )}
      </div>
      <div className='w-full bg-gray-200 rounded-full h-2 overflow-hidden'>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
