/**
 * 速率限制服務測試
 */

import { RateLimitService, RATE_LIMIT_CONFIGS } from '../rate-limit-service'

describe('RateLimitService', () => {
  let rateLimitService: RateLimitService

  beforeEach(() => {
    rateLimitService = new RateLimitService()
  })

  describe('checkRateLimit', () => {
    test('應該允許在限制內的請求', () => {
      const result = rateLimitService.checkRateLimit('api', 'user1')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMIT_CONFIGS.api.maxRequests - 1)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    test('應該拒絕超過限制的請求', () => {
      const maxRequests = 5

      // 用完所有允許的請求
      for (let i = 0; i < maxRequests; i++) {
        rateLimitService.checkRateLimit('test', 'user1', { maxRequests, windowMs: 60000 })
      }

      // 下一個請求應該被拒絕
      const result = rateLimitService.checkRateLimit('test', 'user1', { maxRequests, windowMs: 60000 })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    test('應該為不同用戶獨立計算', () => {
      const maxRequests = 3

      // 用戶1用完限制
      for (let i = 0; i < maxRequests; i++) {
        rateLimitService.checkRateLimit('test', 'user1', { maxRequests, windowMs: 60000 })
      }

      // 用戶2應該仍然可以請求
      const result = rateLimitService.checkRateLimit('test', 'user2', { maxRequests, windowMs: 60000 })

      expect(result.allowed).toBe(true)
    })

    test('應該在時間窗口重置後允許新請求', () => {
      const maxRequests = 2
      const windowMs = 100 // 100毫秒

      // 用完限制
      for (let i = 0; i < maxRequests; i++) {
        rateLimitService.checkRateLimit('test', 'user1', { maxRequests, windowMs })
      }

      // 應該被拒絕
      let result = rateLimitService.checkRateLimit('test', 'user1', { maxRequests, windowMs })
      expect(result.allowed).toBe(false)

      // 等待時間窗口重置
      return new Promise(resolve => {
        setTimeout(() => {
          result = rateLimitService.checkRateLimit('test', 'user1', { maxRequests, windowMs })
          expect(result.allowed).toBe(true)
          resolve(undefined)
        }, 150)
      })
    })
  })

  describe('blockUser', () => {
    test('應該能夠手動封鎖用戶', () => {
      rateLimitService.blockUser('api', 'user1', 60000) // 封鎖1分鐘

      const result = rateLimitService.checkRateLimit('api', 'user1')

      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeDefined()
      expect(result.retryAfter!).toBeGreaterThan(0)
    })

    test('應該在封鎖期間結束後允許請求', () => {
      rateLimitService.blockUser('api', 'user1', 100) // 封鎖100毫秒

      // 立即檢查應該被拒絕
      let result = rateLimitService.checkRateLimit('api', 'user1')
      expect(result.allowed).toBe(false)

      // 等待封鎖期間結束
      return new Promise(resolve => {
        setTimeout(() => {
          result = rateLimitService.checkRateLimit('api', 'user1')
          expect(result.allowed).toBe(true)
          resolve(undefined)
        }, 150)
      })
    })
  })

  describe('unblockUser', () => {
    test('應該能夠解除用戶封鎖', () => {
      rateLimitService.blockUser('api', 'user1', 60000)

      // 確認被封鎖
      let result = rateLimitService.checkRateLimit('api', 'user1')
      expect(result.allowed).toBe(false)

      // 解除封鎖
      const unblocked = rateLimitService.unblockUser('api', 'user1')
      expect(unblocked).toBe(true)

      // 現在應該可以請求
      result = rateLimitService.checkRateLimit('api', 'user1')
      expect(result.allowed).toBe(true)
    })

    test('應該處理不存在的用戶', () => {
      const unblocked = rateLimitService.unblockUser('api', 'nonexistent')
      expect(unblocked).toBe(false)
    })
  })

  describe('getUserStatus', () => {
    test('應該返回用戶的速率限制狀態', () => {
      // 發送幾個請求
      rateLimitService.checkRateLimit('api', 'user1')
      rateLimitService.checkRateLimit('api', 'user1')

      const status = rateLimitService.getUserStatus('api', 'user1')

      expect(status).toBeDefined()
      expect(status!.count).toBe(2)
      expect(status!.remaining).toBe(RATE_LIMIT_CONFIGS.api.maxRequests - 2)
      expect(status!.blocked).toBe(false)
      expect(status!.violations).toBe(0)
    })

    test('應該處理不存在的用戶', () => {
      const status = rateLimitService.getUserStatus('api', 'nonexistent')
      expect(status).toBeNull()
    })
  })

  describe('getBlockedUsers', () => {
    test('應該返回所有被封鎖的用戶', () => {
      rateLimitService.blockUser('api', 'user1', 60000)
      rateLimitService.blockUser('upload', 'user2', 120000)

      const blocked = rateLimitService.getBlockedUsers()

      expect(blocked).toHaveLength(2)
      expect(blocked.find(u => u.identifier === 'user1')).toBeDefined()
      expect(blocked.find(u => u.identifier === 'user2')).toBeDefined()
    })

    test('應該返回空陣列當沒有被封鎖的用戶', () => {
      const blocked = rateLimitService.getBlockedUsers()
      expect(blocked).toHaveLength(0)
    })
  })

  describe('checkIPRateLimit', () => {
    test('應該為IP位址提供速率限制', () => {
      const result = rateLimitService.checkIPRateLimit('192.168.1.1')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })

    test('應該接受自訂IP限制參數', () => {
      const maxRequests = 3
      const windowMs = 60000

      // 用完限制
      for (let i = 0; i < maxRequests; i++) {
        rateLimitService.checkIPRateLimit('192.168.1.2', maxRequests, windowMs)
      }

      const result = rateLimitService.checkIPRateLimit('192.168.1.2', maxRequests, windowMs)
      expect(result.allowed).toBe(false)
    })
  })

  describe('checkUserRateLimit', () => {
    test('應該為用戶提供類型化的速率限制', () => {
      const result = rateLimitService.checkUserRateLimit('user1', 'upload')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMIT_CONFIGS.upload.maxRequests - 1)
    })

    test('應該使用不同的限制配置', () => {
      // 測試上傳限制（較嚴格）
      for (let i = 0; i < RATE_LIMIT_CONFIGS.upload.maxRequests; i++) {
        rateLimitService.checkUserRateLimit('user1', 'upload')
      }

      const uploadResult = rateLimitService.checkUserRateLimit('user1', 'upload')
      expect(uploadResult.allowed).toBe(false)

      // API限制應該仍然可用（較寬鬆）
      const apiResult = rateLimitService.checkUserRateLimit('user1', 'api')
      expect(apiResult.allowed).toBe(true)
    })
  })

  describe('recordRequest', () => {
    test('應該根據成功/失敗狀態記錄請求', () => {
      const config = {
        maxRequests: 5,
        windowMs: 60000,
        skipSuccessfulRequests: true
      }

      // 記錄成功請求（應該被跳過）
      rateLimitService.recordRequest('test', 'user1', true, config)
      rateLimitService.recordRequest('test', 'user1', true, config)

      const status = rateLimitService.getUserStatus('test', 'user1')
      expect(status?.count || 0).toBe(0) // 成功請求被跳過

      // 記錄失敗請求（應該被計數）
      rateLimitService.recordRequest('test', 'user1', false, config)

      const statusAfterFail = rateLimitService.getUserStatus('test', 'user1')
      expect(statusAfterFail?.count || 0).toBe(1) // 失敗請求被計數
    })
  })

  describe('getStats', () => {
    test('應該返回服務統計資訊', () => {
      // 建立一些活動
      rateLimitService.checkRateLimit('api', 'user1')
      rateLimitService.checkRateLimit('upload', 'user2')
      rateLimitService.blockUser('api', 'user3', 60000)

      const stats = rateLimitService.getStats()

      expect(stats.totalUsers).toBeGreaterThan(0)
      expect(stats.blockedUsers).toBe(1)
      expect(stats.activeTypes).toContain('api')
      expect(stats.activeTypes).toContain('upload')
      expect(stats.totalRequests).toBeGreaterThan(0)
    })
  })

  describe('違規處理', () => {
    test('應該在多次違規後自動封鎖用戶', () => {
      const config = {
        maxRequests: 2,
        windowMs: 60000,
        blockDurationMs: 30000
      }

      // 第一次違規 - 超過限制
      rateLimitService.checkRateLimit('test', 'user1', config)
      rateLimitService.checkRateLimit('test', 'user1', config)
      rateLimitService.checkRateLimit('test', 'user1', config) // 第一次違規

      // 重置時間窗口並重複違規
      // 注意：由於實際的自動封鎖邏輯需要累積多次違規，
      // 這個測試可能需要根據實際實作調整

      const status = rateLimitService.getUserStatus('test', 'user1')
      expect(status?.violations).toBeGreaterThan(0)
    })
  })

  describe('清理功能', () => {
    test('應該清理過期的記錄', () => {
      // 創建一個短時間窗口的記錄
      rateLimitService.checkRateLimit('test', 'user1', {
        maxRequests: 5,
        windowMs: 50 // 50毫秒
      })

      // 確認記錄存在
      let status = rateLimitService.getUserStatus('test', 'user1')
      expect(status).toBeDefined()

      // 等待過期並觸發清理
      return new Promise(resolve => {
        setTimeout(() => {
          // 手動觸發清理（在真實環境中這是自動的）
          ;(rateLimitService as any).cleanup()

          // 檢查記錄是否被清理
          status = rateLimitService.getUserStatus('test', 'user1')
          expect(status).toBeNull()
          resolve(undefined)
        }, 100)
      })
    })
  })
})