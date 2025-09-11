/**
 * Mock Service Worker (MSW) Server Configuration
 * 
 * This module provides comprehensive MSW server setup that supports both browser and Node.js
 * environments for development and testing. Includes real-time update simulation for US6
 * requirements and comprehensive error handling.
 * 
 * Features:
 * - Cross-environment support (Node.js for testing, Browser for development)
 * - Real-time update simulation via polling mechanism (US6 AC6.1, AC6.2)
 * - Comprehensive error handling and logging
 * - Development vs production mode detection
 * - Network delay simulation for realistic testing
 * - Hot-reloading support in development
 * 
 * @module MSWServer
 * @version 2.0
 * @date 2025-08-31
 * @author Claude Code
 */

import { SetupServer, setupServer } from 'msw/node'
import { SetupWorker, setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// ==================== TYPE DEFINITIONS ====================

/**
 * Server configuration options
 */
interface ServerConfig {
  /** Enable detailed logging */
  enableLogging?: boolean
  /** Add network delay simulation */
  networkDelay?: boolean
  /** Real-time update interval in milliseconds */
  realtimeUpdateInterval?: number
  /** Enable error simulation */
  enableErrorSimulation?: boolean
  /** Development mode settings */
  development?: {
    /** Enable hot reloading */
    hotReload?: boolean
    /** Enable debug mode */
    debug?: boolean
  }
}

/**
 * Real-time update subscription
 */
interface RealtimeSubscription {
  projectIds: string[]
  callback: (updates: any[]) => void
  interval: number
  timerId?: NodeJS.Timeout
}

// ==================== ENVIRONMENT DETECTION ====================

/**
 * Detect if we're running in a browser environment
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined'
}

/**
 * Detect if we're running in a Node.js environment
 */
const isNode = (): boolean => {
  return typeof process !== 'undefined' && process.versions && process.versions.node !== undefined
}

/**
 * Detect if we're in development mode
 */
const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
}

/**
 * Detect if we're in testing environment
 */
const isTesting = (): boolean => {
  return process.env.NODE_ENV === 'test' || 
         process.env.VITEST === 'true' || 
         process.env.JEST_WORKER_ID !== undefined
}

// ==================== CONFIGURATION ====================

/**
 * Default server configuration
 */
const defaultConfig: ServerConfig = {
  enableLogging: isDevelopment(),
  networkDelay: isDevelopment(),
  realtimeUpdateInterval: 5000, // 5 seconds for US6 real-time updates
  enableErrorSimulation: false,
  development: {
    hotReload: true,
    debug: isDevelopment(),
  },
}

/**
 * Global server configuration
 */
let serverConfig: ServerConfig = { ...defaultConfig }

// ==================== REAL-TIME UPDATE SYSTEM ====================

/**
 * Active real-time subscriptions for US6 support
 * Simulates WebSocket-like behavior for real-time project updates
 */
const realtimeSubscriptions = new Map<string, RealtimeSubscription>()

/**
 * Simulate real-time project updates (US6 AC6.1, AC6.2)
 * This would typically use WebSocket or Server-Sent Events in production
 */
function simulateRealtimeUpdates(subscription: RealtimeSubscription): void {
  const { projectIds, callback, interval } = subscription
  
  const generateUpdates = () => {
    try {
      // Simulate project progress updates
      const updates = projectIds.map(projectId => ({
        type: 'progress_update',
        projectId,
        timestamp: new Date().toISOString(),
        data: {
          progress: Math.floor(Math.random() * 100),
          status: ['IN_PROGRESS', 'COMPLETED', 'PAUSED'][Math.floor(Math.random() * 3)],
          lastUpdated: new Date().toISOString(),
          updatedBy: 'System',
        },
      }))

      // Randomly add status change events (US6 AC6.2)
      if (Math.random() < 0.3) { // 30% chance of status change
        const statusChangeUpdate: any = {
          type: 'status_change',
          projectId: projectIds[Math.floor(Math.random() * projectIds.length)],
          timestamp: new Date().toISOString(),
          data: {
            progress: Math.floor(Math.random() * 100),
            status: 'COMPLETED',
            lastUpdated: new Date().toISOString(),
            updatedBy: '專案經理',
          },
          metadata: {
            previousStatus: 'IN_PROGRESS',
            newStatus: 'COMPLETED',
            reason: '專案里程碑達成',
          },
        }
        updates.push(statusChangeUpdate)
      }

      if (serverConfig.enableLogging) {
        console.log(`[MSW Server] 模擬即時更新: ${updates.length} 個更新`, updates)
      }

      callback(updates)
    } catch (error) {
      if (serverConfig.enableLogging) {
        console.error('[MSW Server] 即時更新模擬錯誤:', error)
      }
    }
  }

  // Start the update simulation
  const timerId = setInterval(generateUpdates, interval)
  subscription.timerId = timerId

  if (serverConfig.enableLogging) {
    console.log(`[MSW Server] 啟動即時更新模擬，間隔: ${interval}ms，專案: ${projectIds.join(', ')}`)
  }
}

/**
 * Subscribe to real-time project updates (US6 support)
 */
function subscribeToRealtimeUpdates(
  subscriptionId: string,
  projectIds: string[],
  callback: (updates: any[]) => void,
  interval: number = serverConfig.realtimeUpdateInterval || 5000
): void {
  // Clean up existing subscription
  unsubscribeFromRealtimeUpdates(subscriptionId)

  const subscription: RealtimeSubscription = {
    projectIds,
    callback,
    interval,
  }

  realtimeSubscriptions.set(subscriptionId, subscription)
  simulateRealtimeUpdates(subscription)
}

/**
 * Unsubscribe from real-time updates
 */
function unsubscribeFromRealtimeUpdates(subscriptionId: string): void {
  const subscription = realtimeSubscriptions.get(subscriptionId)
  if (subscription && subscription.timerId) {
    clearInterval(subscription.timerId)
    realtimeSubscriptions.delete(subscriptionId)
    
    if (serverConfig.enableLogging) {
      console.log(`[MSW Server] 取消即時更新訂閱: ${subscriptionId}`)
    }
  }
}

/**
 * Clean up all real-time subscriptions
 */
function cleanupRealtimeUpdates(): void {
  realtimeSubscriptions.forEach((subscription, subscriptionId) => {
    unsubscribeFromRealtimeUpdates(subscriptionId)
  })
  
  if (serverConfig.enableLogging) {
    console.log('[MSW Server] 清理所有即時更新訂閱')
  }
}

// ==================== SERVER SETUP ====================

/**
 * Node.js server instance for testing environment
 */
let nodeServer: SetupServer | null = null

/**
 * Browser worker instance for development environment
 */
let browserWorker: SetupWorker | null = null

/**
 * Setup MSW server for Node.js environment (testing)
 */
function setupNodeServer(config: ServerConfig = {}): SetupServer {
  const mergedConfig = { ...serverConfig, ...config }
  
  if (nodeServer) {
    if (mergedConfig.enableLogging) {
      console.log('[MSW Server] 重用現有的 Node.js 服務器實例')
    }
    return nodeServer
  }

  try {
    nodeServer = setupServer(...handlers)
    
    // Configure server event listeners
    nodeServer.events.on('request:start', ({ request }) => {
      if (mergedConfig.enableLogging) {
        console.log(`[MSW Server] ${request.method} ${request.url}`)
      }
    })

    nodeServer.events.on('request:match', ({ request }) => {
      if (mergedConfig.development?.debug) {
        console.log(`[MSW Server] 匹配處理器: ${request.method} ${request.url}`)
      }
    })

    nodeServer.events.on('request:unhandled', ({ request }) => {
      if (mergedConfig.enableLogging) {
        console.warn(`[MSW Server] 未處理的請求: ${request.method} ${request.url}`)
      }
    })

    if (mergedConfig.enableLogging) {
      console.log('[MSW Server] Node.js 服務器設定完成')
    }

    return nodeServer
  } catch (error) {
    console.error('[MSW Server] Node.js 服務器設定失敗:', error)
    throw error
  }
}

/**
 * Setup MSW worker for browser environment (development)
 */
function setupBrowserWorker(config: ServerConfig = {}): SetupWorker {
  const mergedConfig = { ...serverConfig, ...config }
  
  if (browserWorker) {
    if (mergedConfig.enableLogging) {
      console.log('[MSW Server] 重用現有的瀏覽器 Worker 實例')
    }
    return browserWorker
  }

  try {
    browserWorker = setupWorker(...handlers)
    
    if (mergedConfig.enableLogging) {
      console.log('[MSW Server] 瀏覽器 Worker 設定完成')
    }

    return browserWorker
  } catch (error) {
    console.error('[MSW Server] 瀏覽器 Worker 設定失敗:', error)
    throw error
  }
}

/**
 * Initialize MSW server based on environment
 */
async function initializeMSW(config: ServerConfig = {}): Promise<SetupServer | SetupWorker> {
  serverConfig = { ...serverConfig, ...config }
  
  try {
    if (isNode()) {
      const server = setupNodeServer(config)
      
      if (isTesting()) {
        // In testing environment, start server automatically
        server.listen({
          onUnhandledRequest: serverConfig.enableLogging ? 'warn' : 'bypass',
        })
        
        if (serverConfig.enableLogging) {
          console.log('[MSW Server] 測試環境服務器已啟動')
        }
      }
      
      return server
    } else if (isBrowser()) {
      const worker = setupBrowserWorker(config)
      
      // In browser environment, start worker
      await worker.start({
        onUnhandledRequest: serverConfig.enableLogging ? 'warn' : 'bypass',
        quiet: !serverConfig.enableLogging,
      })
      
      if (serverConfig.enableLogging) {
        console.log('[MSW Server] 瀏覽器環境 Worker 已啟動')
      }
      
      return worker
    } else {
      throw new Error('無法檢測到支援的環境 (Node.js 或瀏覽器)')
    }
  } catch (error) {
    console.error('[MSW Server] 初始化失敗:', error)
    throw error
  }
}

/**
 * Start MSW server
 */
async function startServer(config: ServerConfig = {}): Promise<void> {
  try {
    await initializeMSW(config)
    
    if (serverConfig.enableLogging) {
      console.log('[MSW Server] 服務器啟動成功')
      console.log('[MSW Server] 配置:', {
        環境: isNode() ? 'Node.js' : '瀏覽器',
        測試模式: isTesting(),
        開發模式: isDevelopment(),
        即時更新: serverConfig.realtimeUpdateInterval + 'ms',
        網路延遲模擬: serverConfig.networkDelay ? '啟用' : '停用',
      })
    }
  } catch (error) {
    console.error('[MSW Server] 啟動失敗:', error)
    throw error
  }
}

/**
 * Stop MSW server and clean up resources
 */
function stopServer(): void {
  try {
    // Clean up real-time subscriptions
    cleanupRealtimeUpdates()
    
    // Stop Node.js server
    if (nodeServer) {
      nodeServer.close()
      nodeServer = null
    }
    
    // Stop browser worker
    if (browserWorker) {
      browserWorker.stop()
      browserWorker = null
    }
    
    if (serverConfig.enableLogging) {
      console.log('[MSW Server] 服務器已停止')
    }
  } catch (error) {
    console.error('[MSW Server] 停止服務器時發生錯誤:', error)
  }
}

/**
 * Reset MSW server handlers
 */
function resetHandlers(): void {
  try {
    if (nodeServer) {
      nodeServer.resetHandlers(...handlers)
    }
    
    if (browserWorker) {
      browserWorker.resetHandlers(...handlers)
    }
    
    if (serverConfig.enableLogging) {
      console.log('[MSW Server] 處理器已重設')
    }
  } catch (error) {
    console.error('[MSW Server] 重設處理器時發生錯誤:', error)
  }
}

// ==================== HOT RELOADING SUPPORT ====================

/**
 * Enable hot reloading in development mode
 */
if (isDevelopment() && serverConfig.development?.hotReload && typeof module !== 'undefined') {
  // TypeScript definition for module.hot is not available
  const moduleWithHot = module as any
  if (moduleWithHot.hot) {
    moduleWithHot.hot.accept('./handlers', () => {
      if (serverConfig.enableLogging) {
        console.log('[MSW Server] 熱重載: 處理器已更新')
      }
      resetHandlers()
    })
  }
}

// ==================== CLEANUP ON PROCESS EXIT ====================

/**
 * Graceful shutdown on process exit
 */
if (isNode()) {
  const gracefulShutdown = () => {
    if (serverConfig.enableLogging) {
      console.log('[MSW Server] 正在執行優雅關閉...')
    }
    stopServer()
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
  process.on('uncaughtException', (error) => {
    console.error('[MSW Server] 未捕獲的異常:', error)
    gracefulShutdown()
    process.exit(1)
  })
}

// ==================== EXPORTS ====================

/**
 * Main server instance (lazily configured based on environment)
 */
export const server = isNode() ? setupNodeServer() : null
export const worker = null // Browser worker is set up on demand

/**
 * Configuration and control functions
 */
export {
  initializeMSW,
  startServer,
  stopServer,
  resetHandlers,
  subscribeToRealtimeUpdates,
  unsubscribeFromRealtimeUpdates,
  cleanupRealtimeUpdates,
  setupNodeServer,
  setupBrowserWorker,
}

/**
 * Environment detection utilities
 */
export {
  isBrowser,
  isNode,
  isDevelopment,
  isTesting,
}

/**
 * Configuration management
 */
export {
  serverConfig,
  defaultConfig,
}

/**
 * Type definitions
 */
export type {
  ServerConfig,
  RealtimeSubscription,
}

// Default export based on environment
export default isNode() ? server : worker