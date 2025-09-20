'use client'

import { useMemo } from 'react'
import { DataTable, Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, ArrowRight, Phone, Mail } from 'lucide-react'
import { 
  Vendor, 
  VendorContact,
  VendorStatus, 
  VendorType, 
  VendorPagination,
  VendorSort,
  VENDOR_STATUS_COLORS,
  VENDOR_TYPE_ICONS
} from '@/types/vendor'
import { cn } from '@/lib/utils'

interface VendorSelectionTableProps {
  vendors: Vendor[]
  loading?: boolean
  pagination?: VendorPagination
  onPaginationChange?: (page: number, pageSize: number) => void
  onSort?: (sort: VendorSort) => void
  onSelectVendor?: (vendor: Vendor) => void
  className?: string
}

export function VendorSelectionTable({
  vendors,
  loading = false,
  pagination,
  onPaginationChange,
  onSort,
  onSelectVendor,
  className
}: VendorSelectionTableProps) {
  
  const columns: Column<Vendor>[] = useMemo(() => [
    {
      key: 'id',
      title: 'No',
      width: '80px',
      align: 'center',
      render: (_, __, index) => {
        const baseIndex = pagination ? (pagination.page - 1) * pagination.pageSize : 0
        return <span className="font-mono text-sm">{baseIndex + index + 1}</span>
      }
    },
    {
      key: 'code',
      title: '編號',
      width: '120px',
      sortable: true,
      render: (value: string) => (
        <span className="font-mono text-sm font-medium">{value}</span>
      )
    },
    {
      key: 'name',
      title: '廠商名稱',
      width: '200px',
      sortable: true,
      render: (value: string, record: Vendor) => (
        <div className="flex items-center">
          <div className="flex-1">
            <div className="font-medium text-sm">{value}</div>
            {record.shortName && (
              <div className="text-xs text-gray-500">{record.shortName}</div>
            )}
          </div>
          {record.type && (
            <div className="ml-2 text-lg">
              {VENDOR_TYPE_ICONS[record.type] || '🏢'}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      title: '類型',
      width: '120px',
      sortable: true,
      render: (value: VendorType) => (
        <Badge variant="outline" className="text-xs">
          {value}
        </Badge>
      )
    },
    {
      key: 'status',
      title: '狀態',
      width: '100px',
      sortable: true,
      render: (value: VendorStatus) => (
        <Badge 
          variant={value === VendorStatus.ACTIVE ? 'default' : 'secondary'}
          className={cn(
            'text-xs',
            value === VendorStatus.ACTIVE && 'bg-green-100 text-green-800',
            value === VendorStatus.INACTIVE && 'bg-gray-100 text-gray-800',
            value === VendorStatus.PENDING && 'bg-yellow-100 text-yellow-800',
            value === VendorStatus.SUSPENDED && 'bg-red-100 text-red-800'
          )}
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'contactCount',
      title: '聯絡人數',
      width: '100px',
      align: 'center',
      render: (value: number, record: Vendor) => {
        const contactCount = record.contacts?.length || value || 0
        return (
          <div className="flex items-center justify-center gap-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-sm">{contactCount}</span>
          </div>
        )
      }
    },
    {
      key: 'primaryContact',
      title: '主要聯絡人',
      width: '180px',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact) {
          return <span className="text-gray-400 text-sm">無聯絡人資料</span>
        }
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">{primaryContact.name}</div>
            {primaryContact.position && (
              <div className="text-xs text-gray-500">{primaryContact.position}</div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {primaryContact.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{primaryContact.phone}</span>
                </div>
              )}
              {primaryContact.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{primaryContact.email}</span>
                </div>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'lastContactDate',
      title: '最後聯繫',
      width: '120px',
      sortable: true,
      render: (value: string) => {
        if (!value) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        const date = new Date(value)
        return (
          <span className="text-sm">
            {date.toLocaleDateString('zh-TW', { 
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}
          </span>
        )
      }
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      align: 'center',
      render: (_, record: Vendor) => (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onSelectVendor?.(record)
          }}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          查看聯絡人
          <ArrowRight className="h-3 w-3" />
        </Button>
      )
    }
  ], [pagination, onSelectVendor])

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    if (onSort) {
      onSort({
        field: key as any,
        direction
      })
    }
  }

  const handlePagination = (page: number, pageSize: number) => {
    onPaginationChange?.(page, pageSize)
  }

  const handleRowClick = (vendor: Vendor) => {
    onSelectVendor?.(vendor)
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            廠商列表
            {pagination && (
              <span className="text-sm font-normal text-gray-500">
                (共 {pagination.total} 筆資料)
              </span>
            )}
          </CardTitle>
          <div className="text-sm text-gray-500">
            點擊廠商或「查看聯絡人」按鈕來查看該廠商的聯絡人
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <DataTable
          columns={columns}
          data={vendors}
          loading={loading}
          onSort={handleSort}
          onRowClick={handleRowClick}
          pagination={pagination && {
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: handlePagination
          }}
          emptyText="沒有找到符合條件的廠商資料"
          className="rounded-none"
          rowClassName="hover:bg-blue-50 cursor-pointer transition-colors"
        />
      </CardContent>
    </Card>
  )
}