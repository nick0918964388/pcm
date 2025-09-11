'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase,
  Calendar,
  Edit,
  Star,
  UserCheck,
  Users
} from 'lucide-react'
import { Vendor, VendorContact, ContactStatus } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface ContactDetailDialogProps {
  contact: VendorContact | null
  vendor?: Vendor | null
  open: boolean
  onClose: () => void
  onEdit?: (contact: VendorContact) => void
}

export function ContactDetailDialog({
  contact,
  vendor,
  open,
  onClose,
  onEdit
}: ContactDetailDialogProps) {
  if (!contact) return null

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5" />
              聯絡人詳細資料
            </DialogTitle>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(contact)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                編輯
              </Button>
            )}
          </div>
          
          {/* 廠商資訊 */}
          {vendor && (
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">{vendor.name}</div>
                    <div className="text-sm text-blue-700">
                      {vendor.code} • {vendor.type}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 基本資訊 */}
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <Avatar className="h-20 w-20">
                <AvatarImage src={contact.photoUrl} alt={contact.name} />
                <AvatarFallback className="text-lg font-medium">
                  {contact.name?.substring(0, 2) || 'NA'}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{contact.name}</h3>
                  {contact.isPrimary && (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      主要聯絡人
                    </Badge>
                  )}
                  <Badge 
                    variant={contact.status === ContactStatus.ACTIVE ? 'default' : 'secondary'}
                    className={cn(
                      contact.status === ContactStatus.ACTIVE && 'bg-green-100 text-green-800',
                      contact.status === ContactStatus.INACTIVE && 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {contact.status}
                  </Badge>
                  {!contact.isActive && (
                    <Badge variant="destructive">
                      已停用
                    </Badge>
                  )}
                </div>
                
                {contact.position && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{contact.position}</span>
                  </div>
                )}
                
                {contact.department && (
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Users className="h-4 w-4" />
                    <span>{contact.department}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* 聯絡資訊 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              聯絡資訊
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contact.phone && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-sm text-gray-600">手機號碼</div>
                      <a 
                        href={`tel:${contact.phone}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                </Card>
              )}
              
              {contact.extension && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-sm text-gray-600">分機號碼</div>
                      <div className="font-medium font-mono">{contact.extension}</div>
                    </div>
                  </div>
                </Card>
              )}
              
              {contact.mvpn && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-purple-500" />
                    <div>
                      <div className="text-sm text-gray-600">MVPN</div>
                      <div className="font-medium font-mono">{contact.mvpn}</div>
                    </div>
                  </div>
                </Card>
              )}
              
              {contact.email && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-600">電子信箱</div>
                      <a 
                        href={`mailto:${contact.email}`}
                        className="font-medium text-red-600 hover:text-red-800 hover:underline truncate block"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* 組織架構 */}
          {(contact.supervisor || contact.workSupervisor) && (
            <>
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  組織架構
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contact.supervisor && (
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-5 w-5 text-orange-500" />
                        <div>
                          <div className="text-sm text-gray-600">直屬主管</div>
                          <div className="font-medium">{contact.supervisor}</div>
                        </div>
                      </div>
                    </Card>
                  )}
                  
                  {contact.workSupervisor && (
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-5 w-5 text-indigo-500" />
                        <div>
                          <div className="text-sm text-gray-600">上班主管</div>
                          <div className="font-medium">{contact.workSupervisor}</div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
              
              <Separator />
            </>
          )}
          
          {/* 備註 */}
          {contact.notes && (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">備註</h4>
                <Card className="p-4 bg-gray-50">
                  <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
                </Card>
              </div>
              
              <Separator />
            </>
          )}
          
          {/* 系統資訊 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              系統資訊
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">聯絡人ID：</span>
                  <span className="font-mono text-gray-900">{contact.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">顯示順序：</span>
                  <span className="font-mono text-gray-900">{contact.displayOrder || '-'}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">建立時間：</span>
                  <span className="text-gray-900">{formatDate(contact.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">更新時間：</span>
                  <span className="text-gray-900">{formatDate(contact.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}