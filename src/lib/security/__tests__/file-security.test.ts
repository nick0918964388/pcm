/**
 * 檔案安全服務測試
 */

import { FileSecurityService, FileQuota } from '../file-security'

// Mock File API
class MockFile {
  name: string
  size: number
  type: string
  lastModified: number

  constructor(name: string, size: number, type: string) {
    this.name = name
    this.size = size
    this.type = type
    this.lastModified = Date.now()
  }

  slice(start: number, end: number): Blob {
    // 模擬不同檔案類型的標頭
    const headers: Record<string, number[]> = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      'image/gif': [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      'application/x-msdownload': [0x4D, 0x5A] // .exe 檔案標頭
    }

    const header = headers[this.type] || []
    const buffer = new ArrayBuffer(16)
    const view = new Uint8Array(buffer)

    header.forEach((byte, index) => {
      if (index < 16) view[index] = byte
    })

    return new Blob([buffer])
  }
}

// 模擬 FileReader
global.FileReader = class MockFileReader {
  onload: ((event: any) => void) | null = null
  onerror: (() => void) | null = null

  readAsArrayBuffer(blob: Blob) {
    setTimeout(() => {
      if (this.onload) {
        // 創建模擬的 ArrayBuffer
        const buffer = new ArrayBuffer(16)
        this.onload({ target: { result: buffer } })
      }
    }, 0)
  }
} as any

describe('FileSecurityService', () => {
  let fileSecurityService: FileSecurityService

  beforeEach(() => {
    fileSecurityService = new FileSecurityService()
  })

  describe('validateFilename', () => {
    test('應該拒絕空檔案名稱', () => {
      const result = fileSecurityService.validateFilename('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('檔案名稱不能為空')
    })

    test('應該拒絕包含危險字符的檔案名稱', () => {
      const dangerousNames = ['test<>.jpg', 'file|name.png', 'path/to/file.jpg']

      dangerousNames.forEach(name => {
        const result = fileSecurityService.validateFilename(name)
        expect(result.isValid).toBe(false)
      })
    })

    test('應該拒絕路徑遍歷攻擊', () => {
      const maliciousNames = ['../../../etc/passwd', './config.json', '..\\windows\\system32']

      maliciousNames.forEach(name => {
        const result = fileSecurityService.validateFilename(name)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('檔案名稱不能包含路徑遍歷字符')
      })
    })

    test('應該拒絕危險的副檔名', () => {
      const dangerousFiles = ['virus.exe', 'script.bat', 'malware.js']

      dangerousFiles.forEach(name => {
        const result = fileSecurityService.validateFilename(name)
        expect(result.isValid).toBe(false)
      })
    })

    test('應該接受安全的檔案名稱', () => {
      const safeNames = ['photo.jpg', 'image_001.png', 'vacation-photos.heic']

      safeNames.forEach(name => {
        const result = fileSecurityService.validateFilename(name)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })
  })

  describe('sanitizeFilename', () => {
    test('應該移除危險字符', () => {
      const input = 'my<file>name|test.jpg'
      const result = fileSecurityService.sanitizeFilename(input)

      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
      expect(result).not.toContain('|')
      expect(result).toContain('_')
    })

    test('應該加入時間戳確保唯一性', () => {
      const input = 'test.jpg'
      const result1 = fileSecurityService.sanitizeFilename(input)
      const result2 = fileSecurityService.sanitizeFilename(input)

      expect(result1).not.toBe(result2)
      expect(result1).toMatch(/test_\d+\.jpg/)
    })

    test('應該限制檔案名稱長度', () => {
      const longName = 'a'.repeat(300) + '.jpg'
      const result = fileSecurityService.sanitizeFilename(longName)

      expect(result.length).toBeLessThanOrEqual(210) // 留一些空間給時間戳
    })
  })

  describe('generateSecureFilePath', () => {
    test('應該生成安全的檔案路徑', () => {
      const path = fileSecurityService.generateSecureFilePath(
        'project123',
        'user456',
        'photo.jpg'
      )

      expect(path).toMatch(/^uploads\/[a-f0-9]{8}\/[a-f0-9]{8}\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9-]{36}\.jpg$/)
      expect(path).not.toContain('project123')
      expect(path).not.toContain('user456')
    })

    test('應該為相同輸入生成不同路徑', () => {
      const path1 = fileSecurityService.generateSecureFilePath('proj', 'user', 'test.jpg')
      const path2 = fileSecurityService.generateSecureFilePath('proj', 'user', 'test.jpg')

      expect(path1).not.toBe(path2)
    })
  })

  describe('validateFileSignature', () => {
    test('應該驗證真實的JPEG檔案', async () => {
      const mockFile = new MockFile('test.jpg', 1000, 'image/jpeg') as any
      const result = await fileSecurityService.validateFileSignature(mockFile)

      expect(result).toBe(true)
    })

    test('應該拒絕偽造的檔案類型', async () => {
      const mockFile = new MockFile('fake.jpg', 1000, 'application/x-msdownload') as any
      const result = await fileSecurityService.validateFileSignature(mockFile)

      expect(result).toBe(false)
    })
  })

  describe('checkUserQuota', () => {
    test('應該拒絕超過大小限制的檔案', async () => {
      const quota: FileQuota = {
        maxFileSize: 1024,
        maxTotalSize: 10240,
        maxFilesPerHour: 10,
        maxFilesPerDay: 100
      }

      const result = await fileSecurityService.checkUserQuota('user1', 2048, quota)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('檔案大小超過限制')
    })

    test('應該允許符合限制的檔案', async () => {
      const quota: FileQuota = {
        maxFileSize: 10240,
        maxTotalSize: 102400,
        maxFilesPerHour: 10,
        maxFilesPerDay: 100
      }

      const result = await fileSecurityService.checkUserQuota('user1', 1024, quota)

      expect(result.allowed).toBe(true)
    })
  })

  describe('checkUploadRateLimit', () => {
    test('應該允許在限制內的上傳', () => {
      const result = fileSecurityService.checkUploadRateLimit('user1', 10)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })

    test('應該拒絕超過頻率限制的上傳', () => {
      // 快速執行多次上傳
      for (let i = 0; i < 10; i++) {
        fileSecurityService.checkUploadRateLimit('user2', 10)
      }

      const result = fileSecurityService.checkUploadRateLimit('user2', 10)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe('validateFileSecurely', () => {
    test('應該完整驗證安全的檔案', async () => {
      const mockFile = new MockFile('photo.jpg', 1024, 'image/jpeg') as any

      const result = await fileSecurityService.validateFileSecurely(
        mockFile,
        'user1',
        'project1'
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedFilename).toBeDefined()
    })

    test('應該拒絕不安全的檔案', async () => {
      const mockFile = new MockFile('../../../etc/passwd.jpg', 50 * 1024 * 1024, 'application/x-msdownload') as any

      const result = await fileSecurityService.validateFileSecurely(
        mockFile,
        'user1',
        'project1'
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    test('應該提供警告給大檔案', async () => {
      const mockFile = new MockFile('large-photo.jpg', 8 * 1024 * 1024, 'image/jpeg') as any

      const result = await fileSecurityService.validateFileSecurely(
        mockFile,
        'user1',
        'project1'
      )

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings).toContain('大檔案上傳可能需要較長時間')
    })

    test('應該拒絕空檔案', async () => {
      const mockFile = new MockFile('empty.jpg', 0, 'image/jpeg') as any

      const result = await fileSecurityService.validateFileSecurely(
        mockFile,
        'user1',
        'project1'
      )

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('檔案大小為0')
    })
  })
})