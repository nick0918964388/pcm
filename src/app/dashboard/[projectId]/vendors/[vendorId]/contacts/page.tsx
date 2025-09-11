'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContactSearchFilters } from '@/components/vendors/ContactSearchFilters'
import { ContactTable } from '@/components/vendors/ContactTable'
import { ContactDetailDialog } from '@/components/vendors/ContactDetailDialog'
import { VendorInfo } from '@/components/vendors/VendorInfo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Plus, Download, Upload, RefreshCw, Users, User } from 'lucide-react'
import { 
  Vendor,
  VendorContact,
  ContactFilters,
  ContactSort,
  ContactPagination,
  CONTACT_CONSTANTS
} from '@/types/vendor'
import { useVendor } from '@/lib/hooks/useVendors'
import { useContacts, useContactMutation } from '@/lib/hooks/useContacts'
import { toast } from 'sonner'

/**
 * 廠商聯絡人列表頁面 - 兩階段通訊錄的第二階段
 * 
 * 顯示特定廠商的所有聯絡人，包含搜尋、篩選和詳細資料查看功能
 */
export default function VendorContactsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const vendorId = params.vendorId as string
  
  // 狀態管理
  const [selectedContact, setSelectedContact] = useState<VendorContact | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  
  // 搜尋和篩選狀態
  const [filters, setFilters] = useState<ContactFilters>({ vendorId })
  const [sort, setSort] = useState<ContactSort>({ field: 'name', direction: 'asc' })
  const [pagination, setPagination] = useState<ContactPagination>({
    page: 1,
    pageSize: CONTACT_CONSTANTS.DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0
  })
  
  // 使用 Hook 取得廠商資料
  const { vendor, loading: vendorLoading, error: vendorError } = useVendor(vendorId)
  
  // 使用 Hook 取得聯絡人資料
  const { 
    contacts, 
    pagination: contactPagination, 
    loading: contactsLoading, 
    error: contactsError, 
    refresh: refreshContacts 
  } = useContacts({
    vendorId,
    page: pagination.page,
    limit: pagination.pageSize,
    filters,
    sort
  })
  
  // 聯絡人操作 Hook
  const { createContact, updateContact, deleteContact } = useContactMutation()
  
  // 處理錯誤訊息
  useEffect(() => {
    if (vendorError) {
      toast.error(`載入廠商資料失敗: ${vendorError}`)
    }
    if (contactsError) {
      toast.error(`載入聯絡人資料失敗: ${contactsError}`)
    }
  }, [vendorError, contactsError])
  
  // 當資料載入完成時顯示成功訊息
  useEffect(() => {
    if (!contactsLoading && contacts.length > 0 && vendor?.name) {
      toast.success(`找到 ${vendor.name} 的 ${contactPagination.total} 筆聯絡人資料`)
    }
  }, [contactsLoading, contacts.length, contactPagination.total, vendor?.name])
  
  // 事件處理函數
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    refreshContacts()
  }
  
  const handleReset = () => {
    setFilters({ vendorId })
    setPagination(prev => ({ ...prev, page: 1 }))
    toast.info('已清除所有搜尋條件')
  }
  
  const handleFiltersChange = (newFilters: ContactFilters) => {
    setFilters({ ...newFilters, vendorId })
  }
  
  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, page, pageSize }))
  }
  
  const handleSort = (newSort: ContactSort) => {
    setSort(newSort)
    setPagination(prev => ({ ...prev, page: 1 }))
  }
  
  const handleViewContact = (contact: VendorContact) => {
    setSelectedContact(contact)
    setShowDetailDialog(true)
  }
  
  const handleEditContact = (contact: VendorContact) => {
    // TODO: 實現編輯功能
    toast.info(`編輯聯絡人: ${contact.name} (功能開發中)`)
  }
  
  const handleCloseDetailDialog = () => {
    setShowDetailDialog(false)
    setSelectedContact(null)
  }
  
  const handleRefresh = () => {
    refreshContacts()
    toast.info('已刷新聯絡人資料')
  }
  
  const handleExport = () => {
    // TODO: 實現匯出功能
    toast.info('匯出功能開發中')
  }
  
  const handleImport = () => {
    // TODO: 實現匯入功能
    toast.info('匯入功能開發中')
  }
  
  const handleAddContact = () => {
    // TODO: 實現新增功能
    toast.info('新增聯絡人功能開發中')
  }
  
  const handleBackToVendors = () => {
    router.push(`/dashboard/${projectId}/vendors`)
  }
  
  const loading = vendorLoading || contactsLoading
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁面標題 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToVendors}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                返回廠商選擇
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  聯絡人列表
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {vendor?.name 
                    ? `${vendor.name} 的聯絡人資料` 
                    : vendorLoading 
                      ? '載入廠商資料中...' 
                      : vendorError 
                        ? '廠商資料載入失敗'
                        : '聯絡人資料'
                  }
                  {contactPagination && (
                    <span className="ml-2">
                      • 共 {contactPagination.total} 位聯絡人
                    </span>
                  )}
                </p>
              </div>
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
                onClick={handleAddContact}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                新增聯絡人
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full px-6 py-6 space-y-6">
        {/* 廠商資訊卡片 */}
        {vendor && !vendorLoading && (
          <VendorInfo vendor={vendor} />
        )}
        
        {/* 搜尋篩選器 */}
        <ContactSearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          onReset={handleReset}
          loading={loading}
          vendorName={vendor?.name}
        />
        
        {/* 結果統計 */}
        {contactPagination && !contactsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500 mr-3" />
                <div className="flex-1">
                  <div className="text-2xl font-bold text-blue-600">
                    {contactPagination.total}
                  </div>
                  <div className="text-sm text-gray-600">總聯絡人數</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <User className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-green-600">
                    {contacts.filter(c => c.isPrimary).length}
                  </div>
                  <div className="text-sm text-gray-600">主要聯絡人</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-blue-600">
                    {contacts.filter(c => c.isActive).length}
                  </div>
                  <div className="text-sm text-gray-600">啟用中</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 text-xs font-bold">
                    {new Set(contacts.map(c => c.department).filter(Boolean)).size}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(contacts.map(c => c.department).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-gray-600">部門數</div>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {/* 聯絡人列表 */}
        <ContactTable
          contacts={contacts}
          loading={contactsLoading}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          onSort={handleSort}
          onViewContact={handleViewContact}
          onEditContact={handleEditContact}
          vendor={vendor}
        />
        
        {/* 聯絡人詳情對話框 */}
        <ContactDetailDialog
          contact={selectedContact}
          vendor={vendor}
          open={showDetailDialog}
          onClose={handleCloseDetailDialog}
          onEdit={handleEditContact}
        />
      </div>
    </div>
  )
}