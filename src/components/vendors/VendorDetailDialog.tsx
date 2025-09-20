'use client'

import { Fragment } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Hash,
  Calendar,
  FileText,
  Edit,
  X
} from 'lucide-react'
import { 
  Vendor, 
  VendorContact, 
  VendorStatus, 
  VendorType, 
  VENDOR_STATUS_COLORS,
  VENDOR_TYPE_ICONS
} from '@/types/vendor'
import { cn } from '@/lib/utils'

interface VendorDetailDialogProps {
  vendor: Vendor | null
  open: boolean
  onClose: () => void
  onEdit?: (vendor: Vendor) => void
}

export function VendorDetailDialog({
  vendor,
  open,
  onClose,
  onEdit
}: VendorDetailDialogProps) {
  
  if (!vendor) return null
  
  const primaryContact = vendor.contacts.find(c => c.isPrimary) || vendor.contacts[0]
  const otherContacts = vendor.contacts.filter(c => !c.isPrimary)
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            <span className="text-2xl">{VENDOR_TYPE_ICONS[vendor.type]}</span>
            <div>
              <div className="flex items-center gap-2">
                {vendor.name}
                <Badge 
                  variant={vendor.status === VendorStatus.ACTIVE ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs',
                    vendor.status === VendorStatus.ACTIVE && 'bg-green-100 text-green-800',
                    vendor.status === VendorStatus.INACTIVE && 'bg-gray-100 text-gray-800',
                    vendor.status === VendorStatus.PENDING && 'bg-yellow-100 text-yellow-800',
                    vendor.status === VendorStatus.SUSPENDED && 'bg-red-100 text-red-800'
                  )}
                >
                  {vendor.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-500 font-normal">
                {vendor.code} {vendor.alias && `• ${vendor.alias}`}
              </div>
            </div>
          </DialogTitle>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(vendor)}
              >
                <Edit className="h-4 w-4 mr-2" />
                編輯
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 基本資訊 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                廠商資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">廠商代碼</div>
                    <div className="font-mono font-medium">{vendor.code}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500">廠商名稱</div>
                    <div className="font-medium">{vendor.name}</div>
                    {vendor.alias && (
                      <div className="text-sm text-gray-600">別名: {vendor.alias}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">廠商類型</div>
                    <div className="flex items-center gap-2">
                      <span>{VENDOR_TYPE_ICONS[vendor.type]}</span>
                      <span>{vendor.type}</span>
                    </div>
                  </div>
                </div>
                
                {vendor.taxId && (
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">統一編號</div>
                      <div className="font-mono">{vendor.taxId}</div>
                    </div>
                  </div>
                )}
                
                {vendor.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">地址</div>
                      <div>{vendor.address}</div>
                    </div>
                  </div>
                )}
                
                {vendor.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">電話</div>
                      <div className="font-mono">{vendor.phone}</div>
                    </div>
                  </div>
                )}
                
                {vendor.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">網站</div>
                      <a 
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {vendor.website}
                      </a>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">建立日期</div>
                    <div>{formatDate(vendor.createdAt)}</div>
                  </div>
                </div>
                
                {vendor.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">備註</div>
                      <div className="text-sm">{vendor.notes}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* 聯絡人資訊 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5" />
                聯絡人資訊
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.contacts.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  沒有聯絡人資訊
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 主要聯絡人 */}
                  {primaryContact && (
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="text-xs bg-blue-600">
                          主要聯絡人
                        </Badge>
                      </div>
                      <ContactInfo contact={primaryContact} />
                    </div>
                  )}
                  
                  {/* 其他聯絡人 */}
                  {otherContacts.length > 0 && (
                    <div className="space-y-3">
                      {otherContacts.length > 0 && (
                        <Separator className="my-4" />
                      )}
                      {otherContacts.map((contact, index) => (
                        <div key={contact.id} className="p-3 bg-gray-50 rounded-lg">
                          <ContactInfo contact={contact} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 聯絡人資訊元件
function ContactInfo({ contact }: { contact: VendorContact }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">{contact.name}</div>
        <Badge variant="outline" className="text-xs">
          {contact.position}
        </Badge>
      </div>
      
      {contact.mobile && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-3 w-3 text-gray-400" />
          <span className="font-mono">{contact.mobile}</span>
          {contact.extension && (
            <span className="text-gray-500">(分機: {contact.extension})</span>
          )}
        </div>
      )}
      
      {contact.email && (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-3 w-3 text-gray-400" />
          <a 
            href={`mailto:${contact.email}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {contact.email}
          </a>
        </div>
      )}
      
      {contact.mvpn && (
        <div className="flex items-center gap-2 text-sm">
          <Hash className="h-3 w-3 text-gray-400" />
          <span>MVPN: <span className="font-mono">{contact.mvpn}</span></span>
        </div>
      )}
      
      {contact.supervisor && (
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3 w-3 text-gray-400" />
          <span>上線主管: {contact.supervisor}</span>
        </div>
      )}
      
      {contact.notes && (
        <div className="text-sm text-gray-600 mt-2">
          <FileText className="h-3 w-3 inline mr-1" />
          {contact.notes}
        </div>
      )}
    </div>
  )
}