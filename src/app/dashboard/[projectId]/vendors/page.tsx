'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { VendorSearchFilters } from '@/components/vendors/VendorSearchFilters'
import { VendorSelectionTable } from '@/components/vendors/VendorSelectionTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Plus, Download, Upload, RefreshCw, Building2, Users } from 'lucide-react'
import { 
  Vendor,
  VendorFilters,
  VendorSort,
  VendorPagination,
  VENDOR_CONSTANTS
} from '@/types/vendor'
import { useVendors, useVendorMutation } from '@/lib/hooks/useVendors'
import { toast } from 'sonner'

/**
 * 廠商選擇頁面 - 兩階段通訊錄的第一階段
 * 
 * 顯示廠商列表，讓用戶選擇要查看聯絡人的廠商
 * 點擊廠商後導向該廠商的聯絡人列表頁面
 */
export default function VendorSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  
  // 搜尋和篩選狀態
  const [filters, setFilters] = useState<VendorFilters>({})
  const [sort, setSort] = useState<VendorSort>({ field: 'code', direction: 'asc' })
  const [pagination, setPagination] = useState<VendorPagination>({
    page: 1,
    pageSize: VENDOR_CONSTANTS.DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0
  })
  
  // 使用 Hook 取得廠商資料
  const { 
    vendors, 
    pagination: vendorPagination, 
    stats: queryStats, 
    loading, 
    error, 
    refresh 
  } = useVendors({
    page: pagination.page,
    limit: pagination.pageSize,
    filters,
    sort
  })
  
  // 處理錯誤訊息
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])
  
  // 當資料載入完成時顯示成功訊息
  useEffect(() => {
    if (!loading && vendors.length > 0) {
      toast.success(`已找到 ${vendorPagination.total} 筆廠商資料`)
    }
  }, [loading, vendors.length, vendorPagination.total])
  
  // 事件處理函數
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    refresh()
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
  
  const handleSelectVendor = (vendor: Vendor) => {
    // 導向廠商聯絡人頁面
    router.push(`/dashboard/${projectId}/vendors/${vendor.id}/contacts`)
  }
  
  const handleRefresh = () => {
    refresh()
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                廠商選擇
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                選擇要查看聯絡人的廠商
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
          title="廠商選擇查詢"
          placeholder="請輸入廠商代碼或名稱進行搜尋"
        />
        
        {/* 結果統計 */}
        {queryStats && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-500 mr-3" />
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
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                </div>
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
                <Users className="h-8 w-8 text-orange-500 mr-3" />
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
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 text-xs font-bold">
                    {Object.keys(queryStats.totalByType).length}
                  </span>
                </div>
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
        
        {/* 廠商選擇列表 */}
        <VendorSelectionTable
          vendors={vendors}
          loading={loading}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          onSort={handleSort}
          onSelectVendor={handleSelectVendor}
        />
      </div>
    </div>
  )
}