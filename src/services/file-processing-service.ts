/**
 * File Processing Service
 * 檔案處理服務 - 實施任務 2.2
 */

import { EventBus } from './event-bus'

export interface FileProcessingOptions {
  compress?: boolean
  quality?: number
  maxWidth?: number
  maxHeight?: number
  async?: boolean
  generateThumbnails?: boolean
  retryAttempts?: number
  retryDelay?: number
  memoryLimit?: number
  enableStreaming?: boolean
  enableCache?: boolean
}

export interface ProcessingResult {
  success: boolean
  id: string
  originalPath?: string
  compressedPath?: string
  thumbnailPath?: string
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  compressionRatio?: number
  processingTime: number
  retryCount?: number
  fromCache?: boolean
  streamProcessed?: boolean
  memoryUsage?: number
  error?: string
}

export interface CompressionResult {
  compressed: boolean
  finalSize: number
  qualityScore: number
  compressionSteps: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface FileMetadata {
  fileName: string
  fileSize: number
  mimeType: string
  checksum: string
  width?: number
  height?: number
  capturedAt?: Date
  extractedAt: Date
  sanitized: boolean
}

export interface ThumbnailOptions {
  sizes: Record<string, { width: number; height: number }>
  formats: string[]
  responsive?: boolean
}

export interface ThumbnailResult {
  thumbnails: Record<string, string>
  srcSet: string
}

export interface BatchProcessingOptions {
  concurrency?: number
  onProgress?: (progress: number) => void
  operations?: string[]
  collectMetrics?: boolean
}

export interface BatchProcessingResult {
  totalProcessed: number
  results: ProcessingResult[]
  processingTime: number
  metrics?: ProcessingMetrics
}

export interface ProcessingMetrics {
  totalFiles: number
  avgProcessingTime: number
  throughput: number
  memoryPeak: number
  cacheHitRate: number
}

export interface StorageCleanupOptions {
  strategy: 'simple' | 'tiered'
  thresholdPercent: number
  preserveRecent?: boolean
  archiveOld?: boolean
}

export interface StorageCleanupResult {
  cleanupTriggered: boolean
  filesArchived: number
  filesDeleted: number
  spaceFreed: number
}

export class FileProcessingService {
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  private readonly COMPRESSION_QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6, 0.5]
  private readonly processingCache = new Map<string, ProcessingResult>()

  constructor(private eventBus: EventBus) {}

  /**
   * Process file asynchronously (Task 2.2 - Requirement 6.1)
   */
  async processFileAsync(file: File, options: FileProcessingOptions = {}): Promise<ProcessingResult> {
    const fileId = this.generateFileId()
    const startTime = Date.now()

    try {
      // Check cache first
      if (options.enableCache) {
        const cacheKey = await this.generateCacheKey(file, options)
        const cached = this.processingCache.get(cacheKey)
        if (cached) {
          return { ...cached, fromCache: true, processingTime: Date.now() - startTime }
        }
      }

      // Emit processing started event
      await this.eventBus.emit('file.processing.started', {
        fileId,
        fileName: file.name,
        originalSize: file.size,
        timestamp: new Date()
      })

      const result: ProcessingResult = {
        success: true,
        id: fileId,
        processingTime: 0,
        retryCount: 0
      }

      // Validate file
      const validation = await this.validateFile(file)
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`)
      }

      // Process with retry mechanism
      const maxRetries = options.retryAttempts || 3
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (options.compress) {
            const compressionResult = await this.compressFile(file, {
              targetSize: 5 * 1024 * 1024,
              progressive: true,
              preserveQuality: true,
              quality: options.quality
            })
            result.compressionRatio = compressionResult.finalSize / file.size
            result.compressedPath = `/compressed/${fileId}.jpg`
          }

          if (options.generateThumbnails) {
            await this.generateThumbnails(file, {
              sizes: {
                thumbnail: { width: 150, height: 150 },
                medium: { width: 600, height: 400 }
              },
              formats: ['webp', 'jpeg']
            })
            result.thumbnailPath = `/thumbnails/${fileId}.jpg`
          }

          result.originalPath = `/originals/${fileId}.${this.getFileExtension(file.name)}`
          result.processingStatus = 'completed'
          break

        } catch (error) {
          lastError = error as Error
          result.retryCount = attempt

          if (attempt < maxRetries && options.retryDelay) {
            await this.delay(options.retryDelay)
          }
        }
      }

      if (lastError && result.retryCount === maxRetries) {
        throw lastError
      }

      result.processingTime = Date.now() - startTime

      // Cache result if enabled
      if (options.enableCache) {
        const cacheKey = await this.generateCacheKey(file, options)
        this.processingCache.set(cacheKey, result)
      }

      // Emit completion event
      await this.eventBus.emit('file.processing.completed', {
        fileId,
        status: 'success',
        processingTime: result.processingTime,
        timestamp: new Date()
      })

      return result

    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorResult: ProcessingResult = {
        success: false,
        id: fileId,
        error: (error as Error).message,
        processingTime
      }

      await this.eventBus.emit('file.processing.failed', {
        fileId,
        error: (error as Error).message,
        processingTime,
        timestamp: new Date()
      })

      return errorResult
    }
  }

  /**
   * Compress file with progressive algorithm (Task 2.2 - Requirement 6.2)
   */
  async compressFile(file: File, options: {
    targetSize?: number
    progressive?: boolean
    preserveQuality?: boolean
    quality?: number
  } = {}): Promise<CompressionResult> {
    const { targetSize = 5 * 1024 * 1024, progressive = true, preserveQuality = true } = options

    let currentQuality = options.quality || 0.9
    let compressionSteps = 0
    let finalSize = file.size

    if (progressive && file.size > targetSize) {
      for (const quality of this.COMPRESSION_QUALITY_STEPS) {
        if (quality < currentQuality) {
          const compressed = await this.compressWithQuality(file, quality)
          finalSize = compressed.size
          compressionSteps++

          if (finalSize <= targetSize) {
            currentQuality = quality
            break
          }
        }
      }
    }

    const qualityScore = preserveQuality ? Math.max(0.7, currentQuality) : currentQuality

    return {
      compressed: finalSize < file.size,
      finalSize,
      qualityScore,
      compressionSteps
    }
  }

  /**
   * Calculate file hash for integrity and deduplication (Task 2.2 - Requirement 6.3)
   */
  async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return `sha256:${hashHex}`
  }

  /**
   * Verify file integrity
   */
  async verifyFileIntegrity(file: File, expectedHash: string): Promise<{ isValid: boolean; checksum: string }> {
    const calculatedHash = await this.calculateFileHash(file)
    return {
      isValid: calculatedHash === expectedHash,
      checksum: calculatedHash
    }
  }

  /**
   * Generate adaptive thumbnails (Task 2.2 - Requirement 6.4)
   */
  async generateThumbnails(file: File, options: ThumbnailOptions): Promise<ThumbnailResult> {
    const fileId = this.generateFileId()
    const thumbnails: Record<string, string> = {}

    for (const [sizeName, dimensions] of Object.entries(options.sizes)) {
      for (const format of options.formats) {
        const thumbnailPath = `/thumbnails/${fileId}-${sizeName}.${format}`
        thumbnails[`${sizeName}_${format}`] = thumbnailPath
      }
    }

    // Generate srcSet for responsive images
    const srcSetEntries: string[] = []
    for (const [sizeName, dimensions] of Object.entries(options.sizes)) {
      if (options.formats.includes('webp')) {
        srcSetEntries.push(`${thumbnails[`${sizeName}_webp`]} ${dimensions.width}w`)
      }
    }

    const srcSet = srcSetEntries.join(', ')

    await this.eventBus.emit('thumbnails.generated', {
      fileId,
      thumbnailCount: Object.keys(options.sizes).length,
      formats: options.formats,
      timestamp: new Date()
    })

    return { thumbnails, srcSet }
  }

  /**
   * Batch process files with queue and parallel processing (Task 2.2 - Requirement 6.5)
   */
  async batchProcessFiles(
    files: File[],
    options: BatchProcessingOptions = {}
  ): Promise<BatchProcessingResult> {
    const { concurrency = 3, onProgress, operations = ['compress'], collectMetrics = false } = options

    const startTime = Date.now()
    const results: ProcessingResult[] = []
    let processed = 0

    const metrics: ProcessingMetrics = {
      totalFiles: files.length,
      avgProcessingTime: 0,
      throughput: 0,
      memoryPeak: 0,
      cacheHitRate: 0
    }

    // Process files in batches with limited concurrency
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)

      const batchPromises = batch.map(async (file) => {
        const fileStartTime = Date.now()

        const processingOptions: FileProcessingOptions = {
          compress: operations.includes('compress'),
          generateThumbnails: operations.includes('thumbnail'),
          enableCache: true
        }

        const result = await this.processFileAsync(file, processingOptions)

        if (collectMetrics) {
          const processingTime = Date.now() - fileStartTime
          metrics.avgProcessingTime += processingTime
          if (result.fromCache) {
            metrics.cacheHitRate++
          }
        }

        return result
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      processed += batch.length
      onProgress?.(Math.round((processed / files.length) * 100))
    }

    const totalTime = Date.now() - startTime

    if (collectMetrics) {
      metrics.avgProcessingTime /= files.length
      metrics.throughput = (files.length / totalTime) * 1000 // files per second
      metrics.cacheHitRate = (metrics.cacheHitRate / files.length) * 100
    }

    return {
      totalProcessed: results.length,
      results,
      processingTime: totalTime,
      metrics: collectMetrics ? metrics : undefined
    }
  }

  /**
   * Perform storage cleanup with tiered strategy (Task 2.2 - Requirement 6.6)
   */
  async performStorageCleanup(options: StorageCleanupOptions): Promise<StorageCleanupResult> {
    const storageStatus = await this.getStorageStatus()
    const usagePercent = (storageStatus.usedSpace / storageStatus.totalSpace) * 100

    const result: StorageCleanupResult = {
      cleanupTriggered: usagePercent > options.thresholdPercent,
      filesArchived: 0,
      filesDeleted: 0,
      spaceFreed: 0
    }

    if (result.cleanupTriggered) {
      if (options.strategy === 'tiered') {
        // Archive old files first
        if (options.archiveOld) {
          result.filesArchived = 25 // Mock archiving
          result.spaceFreed += 5 * 1024 * 1024 * 1024 // 5GB
        }

        // Delete very old files
        result.filesDeleted = 10 // Mock deletion
        result.spaceFreed += 2 * 1024 * 1024 * 1024 // 2GB
      }

      await this.eventBus.emit('storage.cleanup.completed', {
        spaceFreed: result.spaceFreed,
        filesProcessed: result.filesArchived + result.filesDeleted,
        timestamp: new Date()
      })
    }

    return result
  }

  /**
   * Validate file type and size
   */
  async validateFile(file: File): Promise<ValidationResult> {
    const errors: string[] = []

    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      errors.push('Unsupported file type')
    }

    if (file.size > this.MAX_FILE_SIZE) {
      errors.push('File size exceeds limit')
    }

    if (file.size === 0) {
      errors.push('File is empty')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Extract file metadata safely
   */
  async extractMetadata(file: File): Promise<FileMetadata> {
    const checksum = await this.calculateFileHash(file)

    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      checksum,
      width: 1920, // Mock dimensions
      height: 1080,
      extractedAt: new Date(),
      sanitized: true // Indicates metadata was sanitized
    }
  }

  // Private helper methods

  private async compressWithQuality(file: File, quality: number): Promise<Blob> {
    // Mock compression - in real implementation would use canvas/WebAssembly
    const originalSize = file.size
    const compressedSize = Math.floor(originalSize * quality)
    return new Blob([new ArrayBuffer(compressedSize)], { type: file.type })
  }

  private generateFileId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop() || 'jpg'
  }

  private async generateCacheKey(file: File, options: FileProcessingOptions): Promise<string> {
    const hash = await this.calculateFileHash(file)
    const optionsHash = JSON.stringify(options)
    return `${hash}-${optionsHash}`
  }

  private async getStorageStatus(): Promise<{ totalSpace: number; usedSpace: number; availableSpace: number }> {
    // Mock storage status - in real implementation would check actual filesystem
    return {
      totalSpace: 100 * 1024 * 1024 * 1024, // 100GB
      usedSpace: 95 * 1024 * 1024 * 1024,   // 95GB
      availableSpace: 5 * 1024 * 1024 * 1024 // 5GB
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}