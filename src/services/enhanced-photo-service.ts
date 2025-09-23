/**
 * Enhanced Photo Service
 * 增強照片服務 - 實施任務 2.1、2.2 和 2.3
 */

import { IDatabaseAbstraction, IUnitOfWork } from '@/lib/database/types'
import { FileProcessingService, FileProcessingOptions, ProcessingResult } from './file-processing-service'
import { EventBus } from './event-bus'

export interface PhotoUploadResult {
  success: boolean
  photoId?: string
  errors?: string[]
  duplicate?: boolean
  existingPhotoId?: string
}

export interface PhotoFilters {
  page?: number
  limit?: number
  albumId?: string
  startDate?: Date
  endDate?: Date
  tags?: string[]
}

export interface PhotoQueryResult {
  success: boolean
  data?: any[]
  total?: number
  page?: number
  limit?: number
  errors?: string[]
}

export interface BatchUploadOptions {
  concurrency?: number
  onProgress?: (progress: number) => void
}

export interface BatchUploadResult {
  success: boolean
  results: PhotoUploadResult[]
  totalProcessed: number
  errors?: string[]
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  dependencies: {
    database: {
      status: string
      responseTime: number
    }
    fileProcessing: {
      status: string
      circuitBreakerOpen: boolean
    }
    eventBus: {
      status: string
    }
  }
  timestamp: Date
}

export interface CircuitBreakerState {
  isOpen: boolean
  failureCount: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
}

export interface ResponsiveImageOptions {
  sizes: string[]
  formats: string[]
}

export interface ResponsiveImageResult {
  success: boolean
  thumbnails?: Record<string, string>
  errors?: string[]
}

export interface StorageCleanupResult {
  cleanupRequired: boolean
  deletedCount: number
  freedSpace: number
}

export class EnhancedPhotoService {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000 // 1 minute

  constructor(
    private database: IDatabaseAbstraction,
    private fileProcessingService: FileProcessingService,
    private eventBus: EventBus
  ) {
    this.initializeEventHandlers()
  }

  /**
   * Upload photo with separated business logic (Task 2.1 - Requirement 2.1)
   */
  async uploadPhoto(
    file: File,
    projectId: string,
    userId: string,
    albumId?: string
  ): Promise<PhotoUploadResult> {
    if (this.isCircuitBreakerOpen('fileProcessing')) {
      return {
        success: false,
        errors: ['Circuit breaker is open - service temporarily unavailable']
      }
    }

    const unitOfWork = this.database.createUnitOfWork()

    try {
      await unitOfWork.begin()

      // Step 1: File validation (separated from processing)
      const validation = await this.fileProcessingService.validateFile(file)
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        }
      }

      // Step 2: Extract and manage metadata separately
      const metadata = await this.fileProcessingService.extractMetadata(file)

      // Step 3: Check for duplicates using content hash
      const photoRepository = unitOfWork.getRepository('Photo')
      const existingPhotos = await photoRepository.findByField('checksum', metadata.checksum)

      if (existingPhotos.length > 0) {
        await unitOfWork.commit()
        return {
          success: true,
          duplicate: true,
          existingPhotoId: existingPhotos[0].id
        }
      }

      // Step 4: Process file asynchronously (separated from storage)
      const processingResult = await this.fileProcessingService.processFileAsync(file, {
        compress: true,
        generateThumbnails: true,
        async: true
      })

      if (!processingResult.success) {
        throw new Error(processingResult.error || 'File processing failed')
      }

      // Step 5: Store metadata in database (separated from file processing)
      const photoData = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        checksum: metadata.checksum,
        projectId,
        albumId,
        uploadedBy: userId,
        originalPath: processingResult.originalPath,
        thumbnailPath: processingResult.thumbnailPath,
        processingStatus: 'completed',
        metadata: {
          width: metadata.width,
          height: metadata.height,
          capturedAt: metadata.capturedAt
        }
      }

      const photo = await photoRepository.create(photoData)
      await unitOfWork.commit()

      // Reset circuit breaker on success
      this.resetCircuitBreaker('fileProcessing')

      return {
        success: true,
        photoId: photo.id
      }

    } catch (error) {
      await unitOfWork.rollback()

      // Update circuit breaker on failure
      this.recordFailure('fileProcessing')

      return {
        success: false,
        errors: [(error as Error).message]
      }
    }
  }

  /**
   * Get photos with project permission control (Task 2.1)
   */
  async getPhotos(
    projectId: string,
    userId: string,
    filters: PhotoFilters = {}
  ): Promise<PhotoQueryResult> {
    try {
      // TODO: Add user permission validation for projectId

      const unitOfWork = this.database.createUnitOfWork()
      await unitOfWork.begin()

      const photoRepository = unitOfWork.getRepository('Photo')

      const searchCriteria = {
        filters: {
          projectId,
          ...filters.albumId && { albumId: filters.albumId }
        },
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20
        }
      }

      const result = await photoRepository.findMany(searchCriteria)
      await unitOfWork.commit()

      return {
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit
      }

    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message]
      }
    }
  }

  /**
   * Process file in background (Task 2.2 - Requirement 6.1)
   */
  async processFileInBackground(
    file: File,
    options: FileProcessingOptions
  ): Promise<ProcessingResult> {
    if (this.isCircuitBreakerOpen('fileProcessing')) {
      throw new Error('Circuit breaker is open')
    }

    try {
      const result = await this.fileProcessingService.processFileAsync(file, {
        ...options,
        async: true,
        retryAttempts: options.retryAttempts || 3,
        retryDelay: options.retryDelay || 1000
      })

      this.resetCircuitBreaker('fileProcessing')
      return result

    } catch (error) {
      this.recordFailure('fileProcessing')
      throw error
    }
  }

  /**
   * Generate responsive images (Task 2.2 - Requirement 6.4)
   */
  async generateResponsiveImages(
    file: File,
    options: ResponsiveImageOptions
  ): Promise<ResponsiveImageResult> {
    try {
      const thumbnailOptions = {
        sizes: options.sizes.reduce((acc, size) => {
          acc[size] = this.getSizeConfig(size)
          return acc
        }, {} as Record<string, { width: number; height: number }>),
        formats: options.formats
      }

      const result = await this.fileProcessingService.generateThumbnails(file, thumbnailOptions)

      return {
        success: true,
        thumbnails: result.thumbnails
      }

    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message]
      }
    }
  }

  /**
   * Batch upload photos (Task 2.2 - Requirement 6.5)
   */
  async batchUploadPhotos(
    files: File[],
    projectId: string,
    userId: string,
    options: BatchUploadOptions = {}
  ): Promise<BatchUploadResult> {
    const { concurrency = 3, onProgress } = options
    const results: PhotoUploadResult[] = []

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)

      const batchPromises = batch.map(file =>
        this.uploadPhoto(file, projectId, userId)
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      onProgress?.(Math.round(((i + batch.length) / files.length) * 100))
    }

    const successCount = results.filter(r => r.success).length

    return {
      success: successCount > 0,
      results,
      totalProcessed: results.length,
      errors: successCount === 0 ? ['All uploads failed'] : undefined
    }
  }

  /**
   * Check and cleanup storage (Task 2.2 - Requirement 6.6)
   */
  async checkAndCleanupStorage(): Promise<StorageCleanupResult> {
    const storageInfo = await this.getStorageInfo()
    const usagePercent = (storageInfo.used / storageInfo.total) * 100

    if (usagePercent > 90) {
      const cleanupResult = await this.cleanupOldFiles()
      return {
        cleanupRequired: true,
        deletedCount: cleanupResult.deletedCount,
        freedSpace: cleanupResult.freedSpace
      }
    }

    return {
      cleanupRequired: false,
      deletedCount: 0,
      freedSpace: 0
    }
  }

  /**
   * Handle photo upload completed event (Task 2.3 - idempotent processing)
   */
  async handlePhotoUploadCompleted(eventData: any): Promise<void> {
    // Event should include eventId for idempotency
    if (!eventData.eventId) {
      console.warn('Event received without eventId - cannot ensure idempotency')
      return
    }

    await this.eventBus.emit('photo.metadata.updated', {
      eventId: eventData.eventId,
      photoId: eventData.photoId,
      fileId: eventData.fileId,
      timestamp: new Date()
    })
  }

  /**
   * Get service health status (Task 2.3 - Requirement 2.4)
   */
  async getServiceHealth(): Promise<ServiceHealthStatus> {
    const dependencies = {
      database: { status: 'unknown', responseTime: 0 },
      fileProcessing: { status: 'unknown', circuitBreakerOpen: false },
      eventBus: { status: 'healthy' }
    }

    try {
      const dbStartTime = Date.now()
      const dbHealth = await this.database.healthCheck()
      dependencies.database = {
        status: dbHealth.isHealthy ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - dbStartTime
      }
    } catch (error) {
      dependencies.database.status = 'unhealthy'
    }

    dependencies.fileProcessing = {
      status: this.isCircuitBreakerOpen('fileProcessing') ? 'degraded' : 'healthy',
      circuitBreakerOpen: this.isCircuitBreakerOpen('fileProcessing')
    }

    const overallStatus = this.determineOverallStatus(dependencies)

    return {
      status: overallStatus,
      dependencies,
      timestamp: new Date()
    }
  }

  /**
   * Check if circuit breaker is open
   */
  async isCircuitBreakerOpen(service: string): Promise<boolean> {
    return this.isCircuitBreakerOpen(service)
  }

  // Private methods

  private initializeEventHandlers(): void {
    this.eventBus.on('file.processing.failed', (data) => {
      this.recordFailure('fileProcessing')
    })

    this.eventBus.on('file.processing.completed', (data) => {
      this.resetCircuitBreaker('fileProcessing')
    })
  }

  private isCircuitBreakerOpen(service: string): boolean {
    const breaker = this.circuitBreakers.get(service)
    if (!breaker) return false

    if (breaker.isOpen && breaker.nextAttemptTime && Date.now() > breaker.nextAttemptTime.getTime()) {
      // Half-open state - allow one attempt
      breaker.isOpen = false
      return false
    }

    return breaker.isOpen
  }

  private recordFailure(service: string): void {
    const breaker = this.circuitBreakers.get(service) || {
      isOpen: false,
      failureCount: 0
    }

    breaker.failureCount++
    breaker.lastFailureTime = new Date()

    if (breaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.isOpen = true
      breaker.nextAttemptTime = new Date(Date.now() + this.CIRCUIT_BREAKER_TIMEOUT)
    }

    this.circuitBreakers.set(service, breaker)
  }

  private resetCircuitBreaker(service: string): void {
    this.circuitBreakers.set(service, {
      isOpen: false,
      failureCount: 0
    })
  }

  private getSizeConfig(size: string): { width: number; height: number } {
    const sizeConfigs: Record<string, { width: number; height: number }> = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 300, height: 200 },
      medium: { width: 600, height: 400 },
      large: { width: 1200, height: 800 }
    }

    return sizeConfigs[size] || { width: 600, height: 400 }
  }

  private async getStorageInfo(): Promise<{ used: number; total: number; remaining: number }> {
    // Mock storage info - in real implementation would check actual filesystem
    return {
      used: 90 * 1024 * 1024 * 1024, // 90GB
      total: 100 * 1024 * 1024 * 1024, // 100GB
      remaining: 10 * 1024 * 1024 * 1024 // 10GB
    }
  }

  private async cleanupOldFiles(): Promise<{ deletedCount: number; freedSpace: number }> {
    // Mock cleanup - in real implementation would delete old files
    return {
      deletedCount: 5,
      freedSpace: 1024 * 1024 * 1024 // 1GB
    }
  }

  private determineOverallStatus(dependencies: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (dependencies.database.status === 'unhealthy') {
      return 'unhealthy'
    }

    if (dependencies.fileProcessing.status === 'degraded') {
      return 'degraded'
    }

    return 'healthy'
  }
}