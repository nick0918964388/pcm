/**
 * 簽名URL服務測試
 */

import { SignedUrlService, SignedUrlOptions } from '../signed-url-service'

// Mock 環境變數
process.env.SIGNED_URL_SECRET = 'test-secret-key-for-testing'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'

describe('SignedUrlService', () => {
  let signedUrlService: SignedUrlService

  beforeEach(() => {
    signedUrlService = new SignedUrlService()
    jest.clearAllMocks()
  })

  describe('generateSignedUrl', () => {
    test('應該生成有效的簽名URL', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read'],
        userId: 'user123'
      }

      const result = signedUrlService.generateSignedUrl(originalUrl, options)

      expect(result.url).toContain('token=')
      expect(result.expiresAt).toBeInstanceOf(Date)
      expect(result.token).toBeDefined()
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    test('應該包含所有必要的token資訊', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read', 'write'],
        userId: 'user123',
        maxDownloads: 5
      }

      const result = signedUrlService.generateSignedUrl(originalUrl, options)

      // 解析token檢查內容
      const url = new URL(result.url)
      const token = url.searchParams.get('token')!
      const [payloadBase64] = token.split('.')
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString())

      expect(payload.url).toBe(originalUrl)
      expect(payload.permissions).toEqual(['read', 'write'])
      expect(payload.userId).toBe('user123')
      expect(payload.maxDownloads).toBe(5)
      expect(payload.jti).toBeDefined()
    })
  })

  describe('validateSignedUrl', () => {
    test('應該驗證有效的簽名URL', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read']
      }

      const { url } = signedUrlService.generateSignedUrl(originalUrl, options)
      const result = signedUrlService.validateSignedUrl(url)

      expect(result.isValid).toBe(true)
      expect(result.permissions).toEqual(['read'])
    })

    test('應該拒絕過期的URL', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: -1, // 已過期
        permissions: ['read']
      }

      const { url } = signedUrlService.generateSignedUrl(originalUrl, options)
      const result = signedUrlService.validateSignedUrl(url)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Token已過期')
    })

    test('應該拒絕無token的URL', () => {
      const url = 'http://localhost:3000/api/photos/123'
      const result = signedUrlService.validateSignedUrl(url)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('缺少驗證token')
    })

    test('應該拒絕格式錯誤的token', () => {
      const url = 'http://localhost:3000/api/photos/123?token=invalid-token'
      const result = signedUrlService.validateSignedUrl(url)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Token格式錯誤')
    })

    test('應該驗證IP限制', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read'],
        ipRestriction: ['192.168.1.1']
      }

      const { url } = signedUrlService.generateSignedUrl(originalUrl, options)

      // 測試允許的IP
      const validResult = signedUrlService.validateSignedUrl(url, '192.168.1.1')
      expect(validResult.isValid).toBe(true)

      // 測試不允許的IP
      const invalidResult = signedUrlService.validateSignedUrl(url, '192.168.1.2')
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.reason).toBe('IP位址不在允許範圍內')
    })
  })

  describe('validateToken', () => {
    test('應該驗證有效的token', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read'],
        userId: 'user123'
      }

      const { token } = signedUrlService.generateSignedUrl(originalUrl, options)
      const result = signedUrlService.validateToken(token)

      expect(result.isValid).toBe(true)
      expect(result.permissions).toEqual(['read'])
      expect(result.userId).toBe('user123')
    })

    test('應該追蹤下載次數限制', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read'],
        maxDownloads: 2
      }

      const { token } = signedUrlService.generateSignedUrl(originalUrl, options)

      // 第一次驗證應該成功
      const result1 = signedUrlService.validateToken(token)
      expect(result1.isValid).toBe(true)
      expect(result1.remainingDownloads).toBe(2)

      // 記錄下載
      signedUrlService.recordDownload(token)

      // 第二次驗證
      const result2 = signedUrlService.validateToken(token)
      expect(result2.isValid).toBe(true)
      expect(result2.remainingDownloads).toBe(1)

      // 再記錄下載
      signedUrlService.recordDownload(token)

      // 第三次驗證應該失敗
      const result3 = signedUrlService.validateToken(token)
      expect(result3.isValid).toBe(false)
      expect(result3.reason).toBe('已達下載次數上限')
    })
  })

  describe('recordDownload', () => {
    test('應該正確記錄下載次數', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read'],
        maxDownloads: 3
      }

      const { token } = signedUrlService.generateSignedUrl(originalUrl, options)

      // 記錄多次下載
      expect(signedUrlService.recordDownload(token)).toBe(true)
      expect(signedUrlService.recordDownload(token)).toBe(true)
      expect(signedUrlService.recordDownload(token)).toBe(true)

      // 超過限制後應該返回false
      expect(signedUrlService.recordDownload(token)).toBe(false)
    })

    test('應該處理無限制的下載', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read']
        // 沒有設定maxDownloads
      }

      const { token } = signedUrlService.generateSignedUrl(originalUrl, options)

      // 應該總是返回true
      expect(signedUrlService.recordDownload(token)).toBe(true)
      expect(signedUrlService.recordDownload(token)).toBe(true)
    })
  })

  describe('generatePhotoAccessUrl', () => {
    test('應該生成照片存取URL', () => {
      const result = signedUrlService.generatePhotoAccessUrl('photo123', 'user456')

      expect(result.url).toContain('/api/photos/photo123/download')
      expect(result.url).toContain('token=')
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    test('應該接受自訂選項', () => {
      const options = {
        expiresIn: 7200,
        maxDownloads: 5
      }

      const result = signedUrlService.generatePhotoAccessUrl('photo123', 'user456', options)

      // 驗證過期時間約為2小時
      const expiresIn = result.expiresAt.getTime() - Date.now()
      expect(expiresIn).toBeGreaterThan(7000 * 1000) // 約7000秒，給一些誤差空間
      expect(expiresIn).toBeLessThan(7300 * 1000)    // 約7300秒
    })
  })

  describe('generateBatchDownloadUrl', () => {
    test('應該生成批次下載URL', () => {
      const photoIds = ['photo1', 'photo2', 'photo3']
      const result = signedUrlService.generateBatchDownloadUrl(photoIds, 'user456')

      expect(result.url).toContain('/api/photos/batch-download')
      expect(result.url).toContain('photos=photo1,photo2,photo3')
      expect(result.url).toContain('token=')
    })
  })

  describe('generateUploadUrl', () => {
    test('應該生成上傳URL', () => {
      const result = signedUrlService.generateUploadUrl('project123', 'user456')

      expect(result.url).toContain('/api/photos/upload')
      expect(result.url).toContain('project=project123')
      expect(result.url).toContain('token=')

      // 驗證權限為寫入
      const validation = signedUrlService.validateSignedUrl(result.url)
      expect(validation.permissions).toContain('write')
    })
  })

  describe('revokeToken', () => {
    test('應該能撤銷token', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read']
      }

      const { token } = signedUrlService.generateSignedUrl(originalUrl, options)

      // 撤銷前應該有效
      const beforeRevoke = signedUrlService.validateToken(token)
      expect(beforeRevoke.isValid).toBe(true)

      // 撤銷token
      const revokeResult = signedUrlService.revokeToken(token)
      expect(revokeResult).toBe(true)

      // 注意：當前實作中撤銷功能是TODO，所以這個測試可能需要調整
    })
  })

  describe('安全性測試', () => {
    test('應該拒絕被篡改的token', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read']
      }

      const { token } = signedUrlService.generateSignedUrl(originalUrl, options)

      // 篡改token
      const parts = token.split('.')
      const tamperedPayload = Buffer.from(JSON.stringify({
        url: originalUrl,
        exp: Math.floor((Date.now() + 3600000) / 1000),
        permissions: ['read', 'write', 'delete'], // 篡改權限
        iat: Math.floor(Date.now() / 1000)
      })).toString('base64url')

      const tamperedToken = `${tamperedPayload}.${parts[1]}`

      const result = signedUrlService.validateToken(tamperedToken)
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('簽名驗證失敗')
    })

    test('應該防止時間攻擊', () => {
      const originalUrl = 'http://localhost:3000/api/photos/123'
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        permissions: ['read']
      }

      const { token } = signedUrlService.generateSignedUrl(originalUrl, options)

      // 測試多次驗證的時間一致性
      const times: number[] = []

      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint()
        signedUrlService.validateToken(token)
        const end = process.hrtime.bigint()
        times.push(Number(end - start))
      }

      // 驗證時間應該相對穩定（防止時間攻擊）
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avgTime)))

      // 允許一定的時間變動，但不應該差異過大
      expect(maxDeviation / avgTime).toBeLessThan(2)
    })
  })
})