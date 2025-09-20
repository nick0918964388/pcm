'use client'

import { useMemo } from 'react'
import { DataTable, Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, Edit, Mail, Phone, Building2, User } from 'lucide-react'
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

interface VendorTableProps {
  vendors: Vendor[]
  loading?: boolean
  pagination?: VendorPagination
  onPaginationChange?: (page: number, pageSize: number) => void
  onSort?: (sort: VendorSort) => void
  onViewVendor?: (vendor: Vendor) => void
  onEditVendor?: (vendor: Vendor) => void
  className?: string
}

export function VendorTable({
  vendors,
  loading = false,
  pagination,
  onPaginationChange,
  onSort,
  onViewVendor,
  onEditVendor,
  className
}: VendorTableProps) {
  
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
      title: '廠商',
      width: '180px',
      sortable: true,
      render: (value: string, record: Vendor) => (
        <div>
          <div className="font-medium text-sm">{value}</div>
          {record.shortName && (
            <div className="text-xs text-gray-500">{record.shortName}</div>
          )}
        </div>
      )
    },
    {
      key: 'contacts',
      title: '姓名',
      width: '120px',
      render: (contacts: VendorContact[]) => {
        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        const primaryContact = contacts.find(c => c.isPrimary) || contacts[0]
        if (!primaryContact) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return <div className="font-medium text-sm">{primaryContact.name}</div>
      }
    },
    {
      key: 'phone',
      title: '手機',
      width: '130px',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact?.phone) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-gray-400" />
            <span className="font-mono text-sm">{primaryContact.phone}</span>
          </div>
        )
      }
    },
    {
      key: 'extension',
      title: '分機',
      width: '80px',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact?.extension) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return <span className="font-mono text-sm">{primaryContact.extension}</span>
      }
    },
    {
      key: 'mvpn',
      title: 'MVPN',
      width: '120px',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact?.mvpn) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return <span className="font-mono text-sm">{primaryContact.mvpn}</span>
      }
    },
    {
      key: 'email',
      title: 'Email',
      width: '200px',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact?.email) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-gray-400" />
            <a 
              href={`mailto:${primaryContact.email}`}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
              onClick={(e) => e.stopPropagation()}
            >
              {primaryContact.email}
            </a>
          </div>
        )
      }
    },
    {
      key: 'supervisor',
      title: '主管',
      width: '100px',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact?.supervisor) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return <span className="text-sm">{primaryContact.supervisor}</span>
      }
    },
    {
      key: 'workSupervisor',
      title: '上班主管',
      width: '100px',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact?.workSupervisor) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return <span className="text-sm">{primaryContact.workSupervisor}</span>
      }
    },
    {
      key: 'position',
      title: '職稱',
      width: '100px',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact?.position) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return <span className="text-sm">{primaryContact.position}</span>
      }
    },
    {
      key: 'status',
      title: '狀態',
      width: '80px',
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
      key: 'photo',
      title: '相片',
      width: '80px',
      align: 'center',
      render: (_, record: Vendor) => {
        const primaryContact = record.contacts?.find(c => c.isPrimary) || record.contacts?.[0]
        if (!primaryContact?.photoUrl) {
          return (
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
              <User className="h-4 w-4 text-gray-400" />
            </div>
          )
        }
        return (
          <div className="flex items-center justify-center">
            <img 
              src={primaryContact.photoUrl} 
              alt={primaryContact.name}
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
          </div>
        )
      }
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      align: 'center',
      render: (_, record: Vendor) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onViewVendor?.(record)
            }}
            className="h-8 w-8 p-0"
            title="查看詳情"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEditVendor?.(record)
            }}
            className="h-8 w-8 p-0"
            title="編輯"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ], [pagination, onViewVendor, onEditVendor])

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
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <DataTable
          columns={columns}
          data={vendors}
          loading={loading}
          onSort={handleSort}
          pagination={pagination && {
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: handlePagination
          }}
          emptyText="沒有找到符合條件的廠商資料"
          className="rounded-none"
        />
      </CardContent>
    </Card>
  )
}