/**
 * 權限快取服務
 *
 * 提供記憶體和 localStorage 的權限快取實作
 */

import { PermissionCacheItem } from '@/types/photo-permissions'

/**
 * 記憶體快取服務
 */
export class MemoryPermissionCacheService {
  private cache: Map<string, PermissionCacheItem> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // 每 5 分鐘清理過期的快取項目
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, 5 * 60 * 1000)
  }

  /**
   * 獲取快取項目
   */
  get(key: string): PermissionCacheItem | null {
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    // 檢查是否過期
    if (item.expiresAt < new Date()) {
      this.cache.delete(key)
      return null
    }

    return item
  }

  /**
   * 設定快取項目
   */
  set(key: string, value: PermissionCacheItem, ttl: number): void {
    this.cache.set(key, value)
  }

  /**
   * 刪除快取項目
   */
  delete(key: string): void {
    // 支援萬用字元模式
    if (key.includes('*')) {
      const pattern = key.replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)

      for (const cacheKey of this.cache.keys()) {
        if (regex.test(cacheKey)) {
          this.cache.delete(cacheKey)
        }
      }
    } else {
      this.cache.delete(key)
    }
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 清理過期項目
   */
  private cleanupExpired(): void {
    const now = new Date()

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt < now) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 銷毀服務
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

/**
 * LocalStorage 快取服務 (用於持久化快取)
 */
export class LocalStoragePermissionCacheService {
  private prefix = 'photo_perm_cache:'

  /**
   * 獲取快取項目
   */
  get(key: string): PermissionCacheItem | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const stored = localStorage.getItem(this.prefix + key)
      if (!stored) {
        return null
      }

      const item = JSON.parse(stored) as PermissionCacheItem

      // 還原日期物件
      item.createdAt = new Date(item.createdAt)
      item.expiresAt = new Date(item.expiresAt)

      // 檢查是否過期
      if (item.expiresAt < new Date()) {
        localStorage.removeItem(this.prefix + key)
        return null
      }

      return item

    } catch (error) {
      console.warn('Failed to parse cached permission:', error)
      return null
    }
  }

  /**
   * 設定快取項目
   */
  set(key: string, value: PermissionCacheItem, ttl: number): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to cache permission:', error)
    }
  }

  /**
   * 刪除快取項目
   */
  delete(key: string): void {
    if (typeof window === 'undefined') {
      return
    }

    // 支援萬用字元模式
    if (key.includes('*')) {
      const pattern = key.replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)

      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i)
        if (storageKey?.startsWith(this.prefix)) {
          const cacheKey = storageKey.substring(this.prefix.length)
          if (regex.test(cacheKey)) {
            localStorage.removeItem(storageKey)
            i-- // 調整索引，因為項目被移除了
          }
        }
      }
    } else {
      localStorage.removeItem(this.prefix + key)
    }
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    if (typeof window === 'undefined') {
      return
    }

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        localStorage.removeItem(key)
      }
    }
  }
}

/**
 * 混合快取服務 (記憶體 + LocalStorage)
 */
export class HybridPermissionCacheService {
  private memoryCache: MemoryPermissionCacheService
  private storageCache: LocalStoragePermissionCacheService

  constructor() {
    this.memoryCache = new MemoryPermissionCacheService()
    this.storageCache = new LocalStoragePermissionCacheService()
  }

  /**
   * 獲取快取項目 (優先從記憶體獲取)
   */
  get(key: string): PermissionCacheItem | null {
    // 先嘗試記憶體快取
    let item = this.memoryCache.get(key)

    if (!item) {
      // 嘗試 localStorage 快取
      item = this.storageCache.get(key)

      // 如果在 localStorage 找到，同步到記憶體
      if (item) {
        this.memoryCache.set(key, item, 0) // TTL 在這裡不重要，因為已經有過期時間
      }
    }

    return item
  }

  /**
   * 設定快取項目 (同時儲存到記憶體和 localStorage)
   */
  set(key: string, value: PermissionCacheItem, ttl: number): void {
    this.memoryCache.set(key, value, ttl)
    this.storageCache.set(key, value, ttl)
  }

  /**
   * 刪除快取項目
   */
  delete(key: string): void {
    this.memoryCache.delete(key)
    this.storageCache.delete(key)
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.memoryCache.clear()
    this.storageCache.clear()
  }

  /**
   * 銷毀服務
   */
  destroy(): void {
    this.memoryCache.destroy()
  }
}