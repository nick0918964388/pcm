'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import MainNavigation from '@/components/navigation/MainNavigation'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'
import { VendorCard } from './VendorCard'
import { VendorFilter } from './VendorFilter'
import { Vendor, VendorFilter as VendorFilterType, VendorStatus, VendorType } from '@/types/vendor'
import { Building2, Plus, Grid3X3, List } from 'lucide-react'

interface VendorSelectionPageProps {
  vendors: Vendor[]
  onVendorSelect: (vendor: Vendor) => void
  onAddVendor?: () => void
  loading?: boolean
}

export function VendorSelectionPage({ 
  vendors, 
  onVendorSelect, 
  onAddVendor,
  loading = false 
}: VendorSelectionPageProps) {
  const [filter, setFilter] = useState<VendorFilterType>({})
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // 篩選和排序邏輯
  const filteredAndSortedVendors = useMemo(() => {
    let result = [...vendors]

    // 搜尋篩選
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      result = result.filter(vendor => 
        vendor.name.toLowerCase().includes(searchLower) ||
        vendor.description?.toLowerCase().includes(searchLower) ||
        vendor.phone?.includes(searchLower) ||
        vendor.email?.toLowerCase().includes(searchLower)
      )
    }

    // 類型篩選
    if (filter.type) {
      result = result.filter(vendor => vendor.type === filter.type)
    }

    // 狀態篩選
    if (filter.status) {
      result = result.filter(vendor => vendor.status === filter.status)
    }

    // 排序
    const sortBy = filter.sortBy || 'name'
    const sortOrder = filter.sortOrder || 'asc'
    
    result.sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]

      if (sortBy === 'lastContact') {
        aValue = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0
        bValue = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [vendors, filter])

  // 統計資料
  const stats = useMemo(() => {
    const active = vendors.filter(v => v.status === 'active').length
    const totalContacts = vendors.reduce((sum, v) => sum + v.contactCount, 0)
    
    const typeStats = vendors.reduce((acc, vendor) => {
      acc[vendor.type] = (acc[vendor.type] || 0) + 1
      return acc
    }, {} as Record<VendorType, number>)

    return { active, totalContacts, typeStats }
  }, [vendors])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <MainNavigation />
        <Breadcrumbs />
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00645A] mx-auto"></div>
            <p className="mt-4 text-[#8C8C8C]">載入中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <MainNavigation />
      <Breadcrumbs />
      
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 p-4 bg-white min-h-screen">
          {/* 頁面標題 */}
          <div className="bg-[#FFFFFF] border border-[#F0F0F0] p-4 rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#00645A]/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-[#00645A]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#1A1A1A]">廠商通訊錄</h1>
                  <p className="text-sm text-[#595959]">管理所有廠商及其聯絡人資訊</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* 檢視模式切換 */}
                <div className="flex border border-[#F0F0F0] rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* 新增廠商按鈕 */}
                {onAddVendor && (
                  <Button 
                    onClick={onAddVendor}
                    className="bg-[#00645A] hover:bg-[#00645A]/90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新增廠商
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8C8C8C]">總廠商數</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{vendors.length}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-[#00645A]" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8C8C8C]">活躍廠商</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{stats.active}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-green-500 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8C8C8C]">總聯絡人</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{stats.totalContacts}</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-blue-500 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8C8C8C]">主要承攬商</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">
                      {stats.typeStats['主要承攬商'] || 0}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-purple-500 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 篩選區域 */}
          <Card>
            <CardContent className="p-4">
              <VendorFilter
                filter={filter}
                onFilterChange={setFilter}
                totalCount={vendors.length}
                filteredCount={filteredAndSortedVendors.length}
              />
            </CardContent>
          </Card>

          {/* 廠商列表 */}
          <div className="min-h-[400px]">
            {filteredAndSortedVendors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-[#8C8C8C] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">
                    {vendors.length === 0 ? '尚無廠商資料' : '找不到符合條件的廠商'}
                  </h3>
                  <p className="text-[#8C8C8C] mb-4">
                    {vendors.length === 0 
                      ? '開始新增您的第一個廠商吧！' 
                      : '請嘗試調整搜尋條件或篩選設定'
                    }
                  </p>
                  {vendors.length === 0 && onAddVendor && (
                    <Button 
                      onClick={onAddVendor}
                      className="bg-[#00645A] hover:bg-[#00645A]/90 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新增廠商
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-4'
              }>
                {filteredAndSortedVendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    onClick={onVendorSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}