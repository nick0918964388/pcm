'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import MainNavigation from '@/components/navigation/MainNavigation'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'
import { ContactCard } from './ContactCard'
import { ContactFilter } from './ContactFilter'
import { Vendor, Contact, ContactFilter as ContactFilterType } from '@/types/vendor'
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Star,
  Grid3X3,
  List,
  ExternalLink
} from 'lucide-react'

interface VendorContactsPageProps {
  vendor: Vendor
  contacts: Contact[]
  onBack: () => void
  onVendorSwitch?: () => void
  onAddContact?: () => void
  onEditContact?: (contact: Contact) => void
  onCallContact?: (phone: string) => void
  onEmailContact?: (email: string) => void
  loading?: boolean
}

export function VendorContactsPage({ 
  vendor,
  contacts,
  onBack,
  onVendorSwitch,
  onAddContact,
  onEditContact,
  onCallContact,
  onEmailContact,
  loading = false 
}: VendorContactsPageProps) {
  const [filter, setFilter] = useState<ContactFilterType>({})
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // 取得部門列表
  const departments = useMemo(() => {
    const deps = contacts
      .map(contact => contact.department)
      .filter((dep): dep is string => Boolean(dep))
    return [...new Set(deps)].sort()
  }, [contacts])

  // 篩選和排序邏輯
  const filteredAndSortedContacts = useMemo(() => {
    let result = [...contacts]

    // 搜尋篩選
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      result = result.filter(contact => 
        contact.name.toLowerCase().includes(searchLower) ||
        contact.title.toLowerCase().includes(searchLower) ||
        contact.department?.toLowerCase().includes(searchLower) ||
        contact.phone.includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower) ||
        contact.mobile?.includes(searchLower)
      )
    }

    // 部門篩選
    if (filter.department) {
      result = result.filter(contact => contact.department === filter.department)
    }

    // 主要聯絡人篩選
    if (filter.isPrimary) {
      result = result.filter(contact => contact.isPrimary)
    }

    // 活躍狀態篩選
    if (filter.isActive !== undefined) {
      result = result.filter(contact => contact.isActive === filter.isActive)
    }

    // 排序
    const sortBy = filter.sortBy || 'name'
    const sortOrder = filter.sortOrder || 'asc'
    
    result.sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      // 主要聯絡人優先
      if (a.isPrimary && !b.isPrimary) return -1
      if (!a.isPrimary && b.isPrimary) return 1

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [contacts, filter])

  // 統計資料
  const stats = useMemo(() => {
    const active = contacts.filter(c => c.isActive).length
    const primary = contacts.filter(c => c.isPrimary).length
    const withMobile = contacts.filter(c => c.mobile).length
    
    return { active, primary, withMobile }
  }, [contacts])

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
          {/* 返回按鈕 */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-[#00645A] hover:bg-[#00645A]/5"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回廠商列表
            </Button>
            
            {onVendorSwitch && (
              <Button
                variant="outline"
                onClick={onVendorSwitch}
                className="text-[#00645A] border-[#00645A]/20"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                切換廠商
              </Button>
            )}
          </div>

          {/* 廠商資訊卡片 */}
          <Card className="bg-gradient-to-r from-[#00645A]/5 to-[#00645A]/10 border-[#00645A]/20">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-[#00645A] rounded-xl">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h1 className="text-2xl font-bold text-[#1A1A1A]">{vendor.name}</h1>
                      <Badge variant="outline" className="text-[#00645A] border-[#00645A]">
                        {vendor.type}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#595959]">
                      {vendor.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{vendor.address}</span>
                        </div>
                      )}
                    </div>
                    {vendor.description && (
                      <p className="text-sm text-[#595959] max-w-2xl">
                        {vendor.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex border border-[#F0F0F0] rounded-lg p-1 bg-white">
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

                  {onAddContact && (
                    <Button 
                      onClick={onAddContact}
                      className="bg-[#00645A] hover:bg-[#00645A]/90 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新增聯絡人
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 統計卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8C8C8C]">總聯絡人</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{contacts.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-[#00645A]" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8C8C8C]">活躍聯絡人</p>
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
                    <p className="text-sm text-[#8C8C8C]">主要聯絡人</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{stats.primary}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500 fill-current" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8C8C8C]">有手機號碼</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{stats.withMobile}</p>
                  </div>
                  <Phone className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 篩選區域 */}
          <Card>
            <CardContent className="p-4">
              <ContactFilter
                filter={filter}
                onFilterChange={setFilter}
                totalCount={contacts.length}
                filteredCount={filteredAndSortedContacts.length}
                departments={departments}
              />
            </CardContent>
          </Card>

          {/* 聯絡人列表 */}
          <div className="min-h-[400px]">
            {filteredAndSortedContacts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-[#8C8C8C] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">
                    {contacts.length === 0 ? '尚無聯絡人資料' : '找不到符合條件的聯絡人'}
                  </h3>
                  <p className="text-[#8C8C8C] mb-4">
                    {contacts.length === 0 
                      ? `為 ${vendor.name} 新增第一個聯絡人吧！` 
                      : '請嘗試調整搜尋條件或篩選設定'
                    }
                  </p>
                  {contacts.length === 0 && onAddContact && (
                    <Button 
                      onClick={onAddContact}
                      className="bg-[#00645A] hover:bg-[#00645A]/90 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新增聯絡人
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
                {filteredAndSortedContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onEdit={onEditContact}
                    onCall={onCallContact}
                    onEmail={onEmailContact}
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