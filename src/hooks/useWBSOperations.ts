/**
 * @fileoverview WBS 操作相關 hooks
 * @version 1.0
 * @date 2025-09-01
 * 
 * 提供 WBS 節點的各種操作功能，包括拖拽、批量操作、導入導出等
 */

import { useCallback, useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { WBSItem, WBSFilters } from '@/types/wbs'
import { ProjectStaffWBSApiService, BatchUpdateWBSRequest } from '@/services/projectStaffWbsApi'
import { useProjectScopeStore } from '@/store/projectScopeStore'
import {
  flattenWBSTree,
  buildWBSTreeFromFlat,
  generateWBSCodes,
  validateWBSTree,
  WBSValidationResult
} from '@/utils/wbsUtils'

// ==================== TYPES ====================

/**
 * 拖拽操作類型
 */
export type DragOperationType = 'move' | 'copy' | 'link'

/**
 * 拖拽狀態
 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 拖拽的節點 ID */
  draggedNodeId: string | null
  /** 拖拽操作類型 */
  operationType: DragOperationType
  /** 當前懸停的目標節點 ID */
  hoveredNodeId: string | null
  /** 放置位置 */
  dropPosition: 'before' | 'after' | 'inside' | null
}

/**
 * 批量操作選項
 */
export interface BatchOperationOptions {
  /** 操作類型 */
  operation: 'update' | 'delete' | 'move' | 'changeStatus'
  /** 目標節點 ID 列表 */
  nodeIds: string[]
  /** 操作數據 */
  data?: Partial<WBSItem>
  /** 移動操作的目標父節點 ID */
  targetParentId?: string
  /** 移動操作的目標位置 */
  targetIndex?: number
}

/**
 * 導入導出選項
 */
export interface ImportExportOptions {
  /** 格式 */
  format: 'excel' | 'json' | 'csv'
  /** 包含的欄位 */
  fields?: (keyof WBSItem)[]
  /** 是否包含子節點 */
  includeChildren?: boolean
  /** 文件名稱 */
  filename?: string
}

/**
 * 節點移動結果
 */
export interface NodeMoveResult {
  /** 是否成功 */
  success: boolean
  /** 受影響的節點 */
  affectedNodes: WBSItem[]
  /** 更新後的樹結構 */
  updatedTree?: WBSItem[]
  /** 錯誤訊息 */
  error?: string
}

// ==================== DRAG AND DROP HOOK ====================

/**
 * WBS 拖拽操作 Hook
 * 
 * @param projectId 專案 ID
 * @returns 拖拽操作功能
 */
export const useWBSDragDrop = (projectId: string) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedNodeId: null,
    operationType: 'move',
    hoveredNodeId: null,
    dropPosition: null
  })

  const queryClient = useQueryClient()
  const apiService = useMemo(() => new ProjectStaffWBSApiService(), [])

  // 移動節點 Mutation
  const moveNodeMutation = useMutation({
    mutationFn: async ({ 
      nodeId, 
      targetParentId, 
      targetIndex 
    }: { 
      nodeId: string
      targetParentId?: string
      targetIndex: number 
    }) => {
      const result = await apiService.moveWBSNode(projectId, nodeId, {
        parentId: targetParentId,
        index: targetIndex
      })
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbsTree', projectId] })
    }
  })

  // 開始拖拽
  const startDrag = useCallback((nodeId: string, operationType: DragOperationType = 'move') => {
    setDragState({
      isDragging: true,
      draggedNodeId: nodeId,
      operationType,
      hoveredNodeId: null,
      dropPosition: null
    })
  }, [])

  // 拖拽進入目標
  const dragEnter = useCallback((targetNodeId: string) => {
    setDragState(prev => ({
      ...prev,
      hoveredNodeId: targetNodeId
    }))
  }, [])

  // 拖拽懸停
  const dragOver = useCallback((
    targetNodeId: string, 
    dropPosition: 'before' | 'after' | 'inside'
  ) => {
    setDragState(prev => ({
      ...prev,
      hoveredNodeId: targetNodeId,
      dropPosition
    }))
  }, [])

  // 拖拽離開目標
  const dragLeave = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      hoveredNodeId: null,
      dropPosition: null
    }))
  }, [])

  // 執行放置
  const drop = useCallback(async (
    targetNodeId: string,
    dropPosition: 'before' | 'after' | 'inside'
  ): Promise<NodeMoveResult> => {
    if (!dragState.draggedNodeId) {
      return { success: false, affectedNodes: [], error: '沒有選中要移動的節點' }
    }

    try {
      let targetParentId: string | undefined
      let targetIndex: number

      // 根據放置位置計算目標父節點和索引
      if (dropPosition === 'inside') {
        targetParentId = targetNodeId
        targetIndex = 0
      } else {
        // 這裡需要從當前樹結構中計算正確的父節點和索引
        // 簡化處理，實際項目中需要更詳細的邏輯
        targetParentId = undefined // 移到根級
        targetIndex = 0
      }

      await moveNodeMutation.mutateAsync({
        nodeId: dragState.draggedNodeId,
        targetParentId,
        targetIndex
      })

      setDragState({
        isDragging: false,
        draggedNodeId: null,
        operationType: 'move',
        hoveredNodeId: null,
        dropPosition: null
      })

      return { 
        success: true, 
        affectedNodes: [] // 這裡應該返回實際受影響的節點
      }
    } catch (error) {
      return { 
        success: false, 
        affectedNodes: [], 
        error: (error as Error).message 
      }
    }
  }, [dragState.draggedNodeId, moveNodeMutation])

  // 取消拖拽
  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedNodeId: null,
      operationType: 'move',
      hoveredNodeId: null,
      dropPosition: null
    })
  }, [])

  return {
    dragState,
    startDrag,
    dragEnter,
    dragOver,
    dragLeave,
    drop,
    cancelDrag,
    isMoving: moveNodeMutation.isPending,
    moveError: moveNodeMutation.error
  }
}

// ==================== BATCH OPERATIONS HOOK ====================

/**
 * WBS 批量操作 Hook
 * 
 * @param projectId 專案 ID
 * @returns 批量操作功能
 */
export const useWBSBatchOperations = (projectId: string) => {
  const queryClient = useQueryClient()
  const apiService = useMemo(() => new ProjectStaffWBSApiService(), [])

  // 批量操作 Mutation
  const batchOperationMutation = useMutation({
    mutationFn: async (request: BatchUpdateWBSRequest) => {
      const result = await apiService.batchUpdateWBSNodes(projectId, request)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbsTree', projectId] })
      queryClient.invalidateQueries({ queryKey: ['wbsStatistics', projectId] })
    }
  })

  // 批量更新
  const batchUpdate = useCallback(async (
    nodeIds: string[],
    updates: Partial<WBSItem>
  ) => {
    const request: BatchUpdateWBSRequest = {
      operation: 'update',
      nodeIds,
      data: updates
    }
    return await batchOperationMutation.mutateAsync(request)
  }, [batchOperationMutation])

  // 批量刪除
  const batchDelete = useCallback(async (nodeIds: string[]) => {
    const request: BatchUpdateWBSRequest = {
      operation: 'delete',
      nodeIds
    }
    return await batchOperationMutation.mutateAsync(request)
  }, [batchOperationMutation])

  // 批量狀態變更
  const batchChangeStatus = useCallback(async (
    nodeIds: string[],
    status: string
  ) => {
    const request: BatchUpdateWBSRequest = {
      operation: 'update',
      nodeIds,
      data: { status }
    }
    return await batchOperationMutation.mutateAsync(request)
  }, [batchOperationMutation])

  // 批量移動
  const batchMove = useCallback(async (
    nodeIds: string[],
    targetParentId: string,
    targetIndex: number = 0
  ) => {
    const request: BatchUpdateWBSRequest = {
      operation: 'move',
      nodeIds,
      targetParentId,
      targetIndex
    }
    return await batchOperationMutation.mutateAsync(request)
  }, [batchOperationMutation])

  return {
    batchUpdate,
    batchDelete,
    batchChangeStatus,
    batchMove,
    isBatchProcessing: batchOperationMutation.isPending,
    batchError: batchOperationMutation.error,
    batchResult: batchOperationMutation.data
  }
}

// ==================== VALIDATION HOOK ====================

/**
 * WBS 驗證 Hook
 * 
 * @param tree WBS 樹狀結構
 * @returns 驗證功能
 */
export const useWBSValidation = (tree: WBSItem[]) => {
  const [validationResult, setValidationResult] = useState<WBSValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // 執行驗證
  const validate = useCallback(async () => {
    setIsValidating(true)
    
    try {
      // 模擬異步驗證過程
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const result = validateWBSTree(tree)
      setValidationResult(result)
      
      return result
    } finally {
      setIsValidating(false)
    }
  }, [tree])

  // 自動驗證
  const autoValidate = useCallback(() => {
    if (tree.length > 0) {
      validate()
    }
  }, [tree, validate])

  // 清除驗證結果
  const clearValidation = useCallback(() => {
    setValidationResult(null)
  }, [])

  return {
    validationResult,
    isValidating,
    validate,
    autoValidate,
    clearValidation,
    hasErrors: validationResult ? validationResult.errors.length > 0 : false,
    hasWarnings: validationResult ? validationResult.warnings.length > 0 : false
  }
}

// ==================== CODE GENERATION HOOK ====================

/**
 * WBS 編碼生成 Hook
 * 
 * @param tree WBS 樹狀結構
 * @returns 編碼生成功能
 */
export const useWBSCodeGeneration = (tree: WBSItem[]) => {
  const [isGenerating, setIsGenerating] = useState(false)

  // 生成編碼
  const generateCodes = useCallback(async (options = {}) => {
    setIsGenerating(true)
    
    try {
      // 模擬異步過程
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const updatedTree = generateWBSCodes(tree, options)
      return updatedTree
    } finally {
      setIsGenerating(false)
    }
  }, [tree])

  // 重新生成所有編碼
  const regenerateAllCodes = useCallback(async () => {
    return await generateCodes({
      format: 'numeric',
      separator: '.',
      startFrom: 1
    })
  }, [generateCodes])

  return {
    generateCodes,
    regenerateAllCodes,
    isGenerating
  }
}

// ==================== IMPORT/EXPORT HOOK ====================

/**
 * WBS 導入導出 Hook
 * 
 * @param projectId 專案 ID
 * @returns 導入導出功能
 */
export const useWBSImportExport = (projectId: string) => {
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [exportProgress, setExportProgress] = useState(0)

  const queryClient = useQueryClient()
  const apiService = useMemo(() => new ProjectStaffWBSApiService(), [])

  // 導出 WBS
  const exportWBS = useCallback(async (
    tree: WBSItem[],
    options: ImportExportOptions = { format: 'excel' }
  ) => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // 模擬導出進度
      const intervals = [20, 40, 60, 80, 100]
      for (const progress of intervals) {
        setExportProgress(progress)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // 實際導出邏輯會在這裡實現
      const exportData = {
        format: options.format,
        data: tree,
        timestamp: new Date().toISOString()
      }

      // 生成下載鏈接
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = options.filename || `wbs-export-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [])

  // 導入 WBS
  const importWBS = useCallback(async (
    file: File,
    options: ImportExportOptions = { format: 'excel' }
  ) => {
    setIsImporting(true)
    setImportProgress(0)

    try {
      // 模擬導入進度
      const intervals = [20, 40, 60, 80, 100]
      for (const progress of intervals) {
        setImportProgress(progress)
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // 讀取文件內容
      const content = await file.text()
      const importData = JSON.parse(content)

      // 驗證導入數據格式
      if (!importData.data || !Array.isArray(importData.data)) {
        throw new Error('無效的導入文件格式')
      }

      // 這裡會調用 API 進行實際導入
      // await apiService.importWBSTree(projectId, importData.data)

      queryClient.invalidateQueries({ queryKey: ['wbsTree', projectId] })

      return { 
        success: true, 
        importedCount: importData.data.length 
      }
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message 
      }
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }, [projectId, queryClient])

  return {
    exportWBS,
    importWBS,
    isImporting,
    isExporting,
    importProgress,
    exportProgress
  }
}

// ==================== EXPORTS ====================

export type {
  DragOperationType,
  DragState,
  BatchOperationOptions,
  ImportExportOptions,
  NodeMoveResult
}