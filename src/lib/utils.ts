import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合併 CSS 類名，支援 Tailwind CSS 衝突解決
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期為台灣格式
 */
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = new Date(date)
  
  if (format === 'short') {
    return d.toLocaleDateString('zh-TW')
  }
  
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

/**
 * 格式化數字，加上千位分隔符
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-TW').format(num)
}

/**
 * 延遲函數
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}