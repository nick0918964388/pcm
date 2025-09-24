import * as React from 'react';
import { cn } from '@/lib/utils';

interface DashboardWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function DashboardWidget({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
  loading = false,
  onClick,
}: DashboardWidgetProps) {
  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return (
          <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z'
              clipRule='evenodd'
            />
          </svg>
        );
      case 'down':
        return (
          <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        );
      default:
        return (
          <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
              clipRule='evenodd'
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={cn(
        'bg-white p-6 rounded-lg shadow transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <div className='flex items-center justify-between'>
        <div className='flex-1 min-w-0'>
          <h3 className='text-gray-600 text-sm font-medium mb-2 truncate'>
            {title}
          </h3>

          {loading ? (
            <div className='space-y-2'>
              <div className='h-8 bg-gray-200 rounded animate-pulse'></div>
              <div className='h-4 bg-gray-200 rounded w-2/3 animate-pulse'></div>
            </div>
          ) : (
            <>
              <p className='text-2xl font-bold text-gray-900 mb-1'>
                {typeof value === 'number'
                  ? new Intl.NumberFormat('zh-TW').format(value)
                  : value}
              </p>

              <div className='flex items-center justify-between'>
                {subtitle && (
                  <p className='text-gray-500 text-sm truncate'>{subtitle}</p>
                )}

                {trend && (
                  <div
                    className={cn(
                      'flex items-center space-x-1 text-sm font-medium',
                      getTrendColor(trend.direction)
                    )}
                  >
                    {getTrendIcon(trend.direction)}
                    <span>
                      {trend.value}% {trend.label}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {icon && (
          <div className='flex-shrink-0 ml-4'>
            <div className='w-12 h-12 bg-brand-primary bg-opacity-10 rounded-full flex items-center justify-center'>
              <div className='w-6 h-6 text-brand-primary'>{icon}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
