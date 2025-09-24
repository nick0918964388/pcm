'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Users,
  Calendar,
  Edit,
  Star,
} from 'lucide-react';
import { Vendor, VendorStatus, VENDOR_TYPE_ICONS } from '@/types/vendor';
import { cn } from '@/lib/utils';

interface VendorInfoProps {
  vendor: Vendor;
  onEdit?: (vendor: Vendor) => void;
  className?: string;
}

export function VendorInfo({ vendor, onEdit, className }: VendorInfoProps) {
  const primaryContacts = vendor.contacts?.filter(c => c.isPrimary) || [];
  const totalContacts = vendor.contacts?.length || vendor.contactCount || 0;
  const activeContacts = vendor.contacts?.filter(c => c.isActive).length || 0;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-medium flex items-center gap-2'>
            <Building2 className='h-5 w-5' />
            廠商資訊
          </CardTitle>
          {onEdit && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => onEdit(vendor)}
              className='flex items-center gap-2'
            >
              <Edit className='h-4 w-4' />
              編輯廠商
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* 基本資訊區塊 */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* 左側：廠商基本資料 */}
          <div className='lg:col-span-2 space-y-4'>
            <div className='flex items-start gap-4'>
              <div className='flex-shrink-0'>
                <div className='w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-2xl'>
                  {vendor.type && VENDOR_TYPE_ICONS[vendor.type] ? (
                    VENDOR_TYPE_ICONS[vendor.type]
                  ) : (
                    <Building2 className='h-8 w-8 text-blue-600' />
                  )}
                </div>
              </div>
              <div className='flex-1 space-y-2'>
                <div className='flex items-center gap-3'>
                  <h3 className='text-xl font-bold text-gray-900'>
                    {vendor.name}
                  </h3>
                  <Badge
                    variant={
                      vendor.status === VendorStatus.ACTIVE
                        ? 'default'
                        : 'secondary'
                    }
                    className={cn(
                      vendor.status === VendorStatus.ACTIVE &&
                        'bg-green-100 text-green-800',
                      vendor.status === VendorStatus.INACTIVE &&
                        'bg-gray-100 text-gray-800',
                      vendor.status === VendorStatus.PENDING &&
                        'bg-yellow-100 text-yellow-800',
                      vendor.status === VendorStatus.SUSPENDED &&
                        'bg-red-100 text-red-800'
                    )}
                  >
                    {vendor.status}
                  </Badge>
                </div>

                {vendor.shortName && (
                  <div className='text-sm text-gray-600'>
                    簡稱：{vendor.shortName}
                  </div>
                )}

                <div className='flex items-center gap-4 text-sm text-gray-600'>
                  <div className='flex items-center gap-1'>
                    <span className='font-medium'>編號：</span>
                    <span className='font-mono'>{vendor.code}</span>
                  </div>
                  {vendor.type && (
                    <div className='flex items-center gap-1'>
                      <span className='font-medium'>類型：</span>
                      <Badge variant='outline' className='text-xs'>
                        {vendor.type}
                      </Badge>
                    </div>
                  )}
                </div>

                {vendor.description && (
                  <div className='text-sm text-gray-700 bg-gray-50 p-3 rounded-md'>
                    {vendor.description}
                  </div>
                )}
              </div>
            </div>

            {/* 聯絡資訊 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t'>
              {vendor.phone && (
                <div className='flex items-center gap-2'>
                  <Phone className='h-4 w-4 text-gray-400' />
                  <a
                    href={`tel:${vendor.phone}`}
                    className='text-blue-600 hover:text-blue-800 hover:underline'
                  >
                    {vendor.phone}
                  </a>
                </div>
              )}

              {vendor.email && (
                <div className='flex items-center gap-2'>
                  <Mail className='h-4 w-4 text-gray-400' />
                  <a
                    href={`mailto:${vendor.email}`}
                    className='text-blue-600 hover:text-blue-800 hover:underline truncate'
                  >
                    {vendor.email}
                  </a>
                </div>
              )}

              {vendor.address && (
                <div className='flex items-start gap-2 md:col-span-2'>
                  <MapPin className='h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0' />
                  <span className='text-sm text-gray-700'>
                    {vendor.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 右側：統計資訊 */}
          <div className='space-y-4'>
            <div className='grid grid-cols-2 lg:grid-cols-1 gap-3'>
              <Card className='p-3'>
                <div className='flex items-center gap-2'>
                  <Users className='h-5 w-5 text-blue-500' />
                  <div>
                    <div className='text-xl font-bold text-blue-600'>
                      {totalContacts}
                    </div>
                    <div className='text-xs text-gray-600'>總聯絡人數</div>
                  </div>
                </div>
              </Card>

              <Card className='p-3'>
                <div className='flex items-center gap-2'>
                  <div className='h-5 w-5 bg-green-100 rounded-full flex items-center justify-center'>
                    <div className='h-2 w-2 bg-green-500 rounded-full'></div>
                  </div>
                  <div>
                    <div className='text-xl font-bold text-green-600'>
                      {activeContacts}
                    </div>
                    <div className='text-xs text-gray-600'>啟用中</div>
                  </div>
                </div>
              </Card>

              <Card className='p-3'>
                <div className='flex items-center gap-2'>
                  <Star className='h-5 w-5 text-yellow-500' />
                  <div>
                    <div className='text-xl font-bold text-yellow-600'>
                      {primaryContacts.length}
                    </div>
                    <div className='text-xs text-gray-600'>主要聯絡人</div>
                  </div>
                </div>
              </Card>

              {vendor.lastContactDate && (
                <Card className='p-3'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-5 w-5 text-purple-500' />
                    <div>
                      <div className='text-sm font-medium text-purple-600'>
                        {formatDate(vendor.lastContactDate)}
                      </div>
                      <div className='text-xs text-gray-600'>最後聯繫</div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* 主要聯絡人快速預覽 */}
        {primaryContacts.length > 0 && (
          <div className='pt-4 border-t'>
            <h4 className='text-sm font-medium text-gray-900 mb-3 flex items-center gap-2'>
              <Star className='h-4 w-4 text-yellow-500' />
              主要聯絡人
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {primaryContacts.slice(0, 4).map(contact => (
                <Card key={contact.id} className='p-3 bg-yellow-50'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center text-sm font-medium'>
                      {contact.name?.substring(0, 2) || 'NA'}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-sm text-gray-900 truncate'>
                        {contact.name}
                      </div>
                      {contact.position && (
                        <div className='text-xs text-gray-600 truncate'>
                          {contact.position}
                        </div>
                      )}
                      <div className='flex items-center gap-3 mt-1'>
                        {contact.phone && (
                          <div className='flex items-center gap-1 text-xs text-gray-600'>
                            <Phone className='h-3 w-3' />
                            <span className='truncate'>{contact.phone}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className='flex items-center gap-1 text-xs text-gray-600'>
                            <Mail className='h-3 w-3' />
                            <span className='truncate max-w-[120px]'>
                              {contact.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {primaryContacts.length > 4 && (
                <div className='p-3 bg-gray-50 rounded-lg flex items-center justify-center text-sm text-gray-600'>
                  還有 {primaryContacts.length - 4} 位主要聯絡人...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 時間戳 */}
        <div className='pt-4 border-t text-xs text-gray-500 space-y-1'>
          <div>建立時間：{formatDate(vendor.createdAt)}</div>
          <div>更新時間：{formatDate(vendor.updatedAt)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
