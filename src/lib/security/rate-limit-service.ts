/**
 * 速率限制服務
 * 提供多層級的速率限制防護機制
 */

export interface RateLimitConfig {
  maxRequests: number        // 最大請求數
  windowMs: number          // 時間窗口 (毫秒)
  blockDurationMs?: number  // 封鎖持續時間 (毫秒)
  skipSuccessfulRequests?: boolean // 是否跳過成功請求的計數
  skipFailedRequests?: boolean     // 是否跳過失敗請求的計數
  keyGenerator?: (identifier: string) => string // 自訂key生成器
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

export interface RateLimitRecord {
  count: number
  resetTime: number
  blocked?: boolean
  blockUntil?: number
  violations: number  // 違規次數
}

// 不同類型的速率限制配置
export const RATE_LIMIT_CONFIGS = {
  // 一般API請求
  api: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1小時
  },

  // 檔案上傳
  upload: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1小時
    blockDurationMs: 10 * 60 * 1000, // 違規後封鎖10分鐘
  },

  // 檔案下載
  download: {
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1小時
  },

  // 批次操作
  batch: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1小時
    blockDurationMs: 30 * 60 * 1000, // 違規後封鎖30分鐘
  },

  // 搜尋查詢
  search: {
    maxRequests: 100,
    windowMs: 10 * 60 * 1000, // 10分鐘
  },

  // 登入嘗試
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15分鐘
    blockDurationMs: 60 * 60 * 1000, // 違規後封鎖1小時
  }
} as const

export class RateLimitService {
  private stores = new Map<string, Map<string, RateLimitRecord>>()

  constructor() {
    // 定期清理過期記錄
    setInterval(() => this.cleanup(), 5 * 60 * 1000) // 每5分鐘清理一次
  }

  /**
   * 檢查速率限制
   */
  checkRateLimit(
    type: keyof typeof RATE_LIMIT_CONFIGS | string,
    identifier: string,
    customConfig?: Partial<RateLimitConfig>
  ): RateLimitResult {
    const config = this.getConfig(type, customConfig)
    const key = config.keyGenerator ? config.keyGenerator(identifier) : `${type}:${identifier}`

    if (!this.stores.has(type.toString())) {
      this.stores.set(type.toString(), new Map())
    }

    const store = this.stores.get(type.toString())!
    const now = Date.now()
    const record = store.get(key) || this.createNewRecord(now + config.windowMs)

    // 檢查是否在封鎖期間
    if (record.blocked && record.blockUntil && now < record.blockUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: record.blockUntil - now
      }
    }

    // 檢查時間窗口是否過期
    if (now > record.resetTime) {
      record.count = 0
      record.resetTime = now + config.windowMs
      record.blocked = false
      record.blockUntil = undefined
    }

    // 檢查是否超過限制
    if (record.count >= config.maxRequests) {
      // 記錄違規
      record.violations++

      // 如果設定了封鎖時間且違規次數達到閾值，進行封鎖
      if (config.blockDurationMs && record.violations >= 3) {
        record.blocked = true
        record.blockUntil = now + config.blockDurationMs
      }

      store.set(key, record)

      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: record.blockUntil ? record.blockUntil - now : undefined
      }
    }

    // 增加計數
    record.count++
    store.set(key, record)

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime
    }
  }

  /**
   * 記錄成功/失敗請求 (用於條件性計數)
   */
  recordRequest(
    type: keyof typeof RATE_LIMIT_CONFIGS | string,
    identifier: string,
    success: boolean,
    customConfig?: Partial<RateLimitConfig>
  ): void {
    const config = this.getConfig(type, customConfig)

    // 根據配置決定是否計數
    if ((success && config.skipSuccessfulRequests) ||
        (!success && config.skipFailedRequests)) {
      return
    }

    // 如果需要計數，檢查速率限制
    this.checkRateLimit(type, identifier, customConfig)
  }

  /**
   * 重置特定用戶的速率限制 (管理員功能)
   */
  resetRateLimit(type: string, identifier: string): boolean {
    const store = this.stores.get(type)
    if (!store) return false

    const key = `${type}:${identifier}`
    return store.delete(key)
  }

  /**
   * 手動封鎖用戶
   */
  blockUser(
    type: string,
    identifier: string,
    durationMs: number
  ): void {
    if (!this.stores.has(type)) {
      this.stores.set(type, new Map())
    }

    const store = this.stores.get(type)!
    const key = `${type}:${identifier}`
    const now = Date.now()

    const record = store.get(key) || this.createNewRecord(now + 60 * 60 * 1000)
    record.blocked = true
    record.blockUntil = now + durationMs
    record.violations++

    store.set(key, record)
  }

  /**
   * 解除用戶封鎖
   */
  unblockUser(type: string, identifier: string): boolean {
    const store = this.stores.get(type)
    if (!store) return false

    const key = `${type}:${identifier}`
    const record = store.get(key)

    if (record) {
      record.blocked = false
      record.blockUntil = undefined
      record.violations = 0
      return true
    }

    return false
  }

  /**
   * 取得用戶的速率限制狀態
   */
  getUserStatus(type: string, identifier: string): {
    count: number
    remaining: number
    resetTime: number
    blocked: boolean
    violations: number
  } | null {
    const store = this.stores.get(type)
    if (!store) return null

    const key = `${type}:${identifier}`
    const record = store.get(key)

    if (!record) return null

    const config = this.getConfig(type)

    return {
      count: record.count,
      remaining: Math.max(0, config.maxRequests - record.count),
      resetTime: record.resetTime,
      blocked: record.blocked || false,
      violations: record.violations
    }
  }

  /**
   * 取得所有被封鎖的用戶
   */
  getBlockedUsers(): Array<{
    type: string
    identifier: string
    blockUntil: number
    violations: number
  }> {
    const blocked: Array<{
      type: string
      identifier: string
      blockUntil: number
      violations: number
    }> = []

    for (const [type, store] of this.stores.entries()) {
      for (const [key, record] of store.entries()) {
        if (record.blocked && record.blockUntil) {
          const identifier = key.replace(`${type}:`, '')
          blocked.push({
            type,
            identifier,
            blockUntil: record.blockUntil,
            violations: record.violations
          })
        }
      }
    }

    return blocked
  }

  /**
   * IP級別的速率限制
   */
  checkIPRateLimit(
    ip: string,
    maxRequests: number = 1000,
    windowMs: number = 60 * 60 * 1000 // 1小時
  ): RateLimitResult {
    return this.checkRateLimit('ip', ip, { maxRequests, windowMs })
  }

  /**
   * 用戶級別的速率限制
   */
  checkUserRateLimit(
    userId: string,
    type: keyof typeof RATE_LIMIT_CONFIGS = 'api'
  ): RateLimitResult {
    return this.checkRateLimit(type, userId)
  }

  /**
   * 取得配置
   */
  private getConfig(
    type: keyof typeof RATE_LIMIT_CONFIGS | string,
    customConfig?: Partial<RateLimitConfig>
  ): RateLimitConfig {
    const baseConfig = RATE_LIMIT_CONFIGS[type as keyof typeof RATE_LIMIT_CONFIGS] || {
      maxRequests: 100,
      windowMs: 60 * 60 * 1000
    }

    return {
      ...baseConfig,
      ...customConfig
    }
  }

  /**
   * 建立新記錄
   */
  private createNewRecord(resetTime: number): RateLimitRecord {
    return {
      count: 0,
      resetTime,
      violations: 0
    }
  }

  /**
   * 清理過期記錄
   */
  private cleanup(): void {
    const now = Date.now()

    for (const [type, store] of this.stores.entries()) {
      for (const [key, record] of store.entries()) {
        // 清理已過期且未被封鎖的記錄
        if (now > record.resetTime && !record.blocked) {
          store.delete(key)
        }
        // 清理過期的封鎖記錄
        else if (record.blocked && record.blockUntil && now > record.blockUntil) {
          record.blocked = false
          record.blockUntil = undefined
          record.violations = 0
        }
      }
    }
  }

  /**
   * 取得統計資訊
   */
  getStats(): {
    totalUsers: number
    blockedUsers: number
    activeTypes: string[]
    totalRequests: number
  } {
    let totalUsers = 0
    let blockedUsers = 0
    let totalRequests = 0
    const activeTypes = Array.from(this.stores.keys())

    for (const [, store] of this.stores.entries()) {
      totalUsers += store.size

      for (const [, record] of store.entries()) {
        totalRequests += record.count
        if (record.blocked) {
          blockedUsers++
        }
      }
    }

    return {
      totalUsers,
      blockedUsers,
      activeTypes,
      totalRequests
    }
  }
}

// 單例模式
export const rateLimitService = new RateLimitService()

// Express中間件函數
export function createRateLimitMiddleware(
  type: keyof typeof RATE_LIMIT_CONFIGS,
  identifierFn: (req: any) => string = (req) => req.ip
) {
  return (req: any, res: any, next: any) => {
    const identifier = identifierFn(req)
    const result = rateLimitService.checkRateLimit(type, identifier)

    // 設定回應標頭
    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_CONFIGS[type].maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    })

    if (!result.allowed) {
      if (result.retryAfter) {
        res.set('Retry-After', Math.ceil(result.retryAfter / 1000))
      }

      return res.status(429).json({
        error: 'Too Many Requests',
        message: '請求頻率過高，請稍後再試',
        retryAfter: result.retryAfter
      })
    }

    next()
  }
}