'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { VendorSearchFilters } from '@/components/vendors/VendorSearchFilters'
import { VendorTable } from '@/components/vendors/VendorTable'
import { VendorDetailDialog } from '@/components/vendors/VendorDetailDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Download, Upload, RefreshCw } from 'lucide-react'
import { 
  Vendor,
  VendorFilters,
  VendorSort,
  VendorPagination,
  VendorQueryResult,
  generateMockVendorQueryResult,
  VENDOR_CONSTANTS
} from '@/types/vendor'
import { toast } from 'sonner'

/**
 * 廠商通訊錄查詢頁面
 * 
 * 基於設計圖片 pcm4.png 實現的廠商通訊錄管理系統
 * 包含搜尋、篩選、列表顯示、詳細資料查看等功能
 */
export default function VendorDirectoryPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  // 狀態管理
  const [loading, setLoading] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  
  // 搜尋和篩選狀態
  const [filters, setFilters] = useState<VendorFilters>({})
  const [sort, setSort] = useState<VendorSort>({ field: 'code', direction: 'asc' })
  const [pagination, setPagination] = useState<VendorPagination>({
    page: 1,
    pageSize: VENDOR_CONSTANTS.DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0
  })
  
  // 查詢結果統計
  const [queryStats, setQueryStats] = useState<{
    totalByType: Record<string, number>
    totalByStatus: Record<string, number>
    totalContacts: number
  } | null>(null)
  
  // 模擬 API 請求
  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const result = generateMockVendorQueryResult(filters, pagination)
      
      setVendors(result.vendors)
      setPagination(result.pagination)
      setQueryStats(result.stats || null)
      
      toast.success(`已找到 ${result.pagination.total} 筆廠商資料`)
    } catch (error) {
      console.error('查詢廠商資料失敗:', error)
      toast.error('查詢失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.pageSize, sort])
  
  // 初始化載入
  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])
  
  // 事件處理函數
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchVendors()
  }
  
  const handleReset = () => {
    setFilters({})
    setPagination(prev => ({ ...prev, page: 1 }))
    toast.info('已清除所有搜尋條件')
  }
  
  const handleFiltersChange = (newFilters: VendorFilters) => {
    setFilters(newFilters)
  }
  
  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, page, pageSize }))
  }
  
  const handleSort = (newSort: VendorSort) => {
    setSort(newSort)
    setPagination(prev => ({ ...prev, page: 1 }))
  }
  
  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setShowDetailDialog(true)
  }
  
  const handleEditVendor = (vendor: Vendor) => {
    // TODO: 實現編輯功能
    toast.info(`編輯廠商: ${vendor.name} (功能開發中)`)
  }
  
  const handleCloseDetailDialog = () => {
    setShowDetailDialog(false)
    setSelectedVendor(null)
  }
  
  const handleRefresh = () => {
    fetchVendors()
    toast.info('已刷新資料')
  }
  
  const handleExport = () => {
    // TODO: 實現匯出功能
    toast.info('匯出功能開發中')
  }
  
  const handleImport = () => {
    // TODO: 實現匯入功能
    toast.info('匯入功能開發中')
  }
  
  const handleAddVendor = () => {
    // TODO: 實現新增功能
    toast.info('新增廠商功能開發中')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁面標題 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">廠商通訊錄</h1>
              <p className="mt-1 text-sm text-gray-600">
                查詢和管理專案相關的廠商聯絡資訊
                {queryStats && (
                  <span className="ml-2">
                    • 共 {pagination.total} 家廠商
                    • {queryStats.totalContacts} 位聯絡人
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                匯出
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
                disabled={loading}
              >
                <Upload className="h-4 w-4 mr-2" />
                匯入
              </Button>
              <Button
                size="sm"
                onClick={handleAddVendor}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                新增廠商
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full px-6 py-6 space-y-6">
        {/* 搜尋篩選器 */}
        <VendorSearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          onReset={handleReset}
          loading={loading}
        />
        
        {/* 結果統計 */}
        {queryStats && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.values(queryStats.totalByStatus).reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-sm text-gray-600">總廠商數</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="text-2xl font-bold text-green-600">
                    {queryStats.totalByStatus['啟用'] || 0}
                  </div>
                  <div className="text-sm text-gray-600">啟用中</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="text-2xl font-bold text-orange-600">
                    {queryStats.totalContacts}
                  </div>
                  <div className="text-sm text-gray-600">聯絡人數</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(queryStats.totalByType).length}
                  </div>
                  <div className="text-sm text-gray-600">廠商類型</div>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {/* 廠商列表 */}
        <VendorTable
          vendors={vendors}
          loading={loading}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          onSort={handleSort}
          onViewVendor={handleViewVendor}
          onEditVendor={handleEditVendor}
        />
        
        {/* 廠商詳情對話框 */}
        <VendorDetailDialog
          vendor={selectedVendor}
          open={showDetailDialog}
          onClose={handleCloseDetailDialog}
          onEdit={handleEditVendor}
        />
      </div>
    </div>
  )
}