'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import { Vendor, VendorStatus, VendorType } from '@/types/vendor';
import { Building2, Users, Phone, Calendar, ChevronRight } from 'lucide-react';

interface VendorCardProps {
  vendor: Vendor;
  onClick: (vendor: Vendor) => void;
}

const statusConfig: Record<
  VendorStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  active: { label: '活躍', variant: 'default' },
  inactive: { label: '非活躍', variant: 'secondary' },
  pending: { label: '待審核', variant: 'outline' },
  suspended: { label: '暫停', variant: 'destructive' },
};

const typeConfig: Record<VendorType, { color: string }> = {
  主要承攬商: { color: 'text-blue-600' },
  次要承攬商: { color: 'text-green-600' },
  設備供應商: { color: 'text-purple-600' },
  材料供應商: { color: 'text-orange-600' },
  顧問公司: { color: 'text-cyan-600' },
  檢測機構: { color: 'text-pink-600' },
  其他: { color: 'text-gray-600' },
};

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const statusInfo = statusConfig[vendor.status];
  const typeColor = typeConfig[vendor.type].color;

  return (
    <Card
      className='cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-[rgba(0,100,90,0.08)] border-[#F0F0F0] hover:border-[#00645A]/20'
      onClick={() => onClick(vendor)}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-2'>
              <Building2 className='h-5 w-5 text-[#00645A]' />
              <h3 className='text-lg font-semibold text-[#1A1A1A] truncate'>
                {vendor.name}
              </h3>
            </div>
            <div className='flex items-center gap-2'>
              <span className={cn('text-sm font-medium', typeColor)}>
                {vendor.type}
              </span>
              <Badge variant={statusInfo.variant} className='text-xs'>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          <ChevronRight className='h-5 w-5 text-[#8C8C8C] flex-shrink-0' />
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='flex items-center gap-2'>
            <Users className='h-4 w-4 text-[#8C8C8C]' />
            <div>
              <p className='text-xs text-[#8C8C8C]'>聯絡人數</p>
              <p className='text-sm font-medium text-[#1A1A1A]'>
                {vendor.contactCount} 人
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Calendar className='h-4 w-4 text-[#8C8C8C]' />
            <div>
              <p className='text-xs text-[#8C8C8C]'>最後聯絡</p>
              <p className='text-sm font-medium text-[#1A1A1A]'>
                {vendor.lastContactDate
                  ? formatDate(vendor.lastContactDate)
                  : '尚無紀錄'}
              </p>
            </div>
          </div>
        </div>

        {vendor.phone && (
          <div className='flex items-center gap-2 mt-3 pt-3 border-t border-[#F0F0F0]'>
            <Phone className='h-4 w-4 text-[#8C8C8C]' />
            <p className='text-sm text-[#595959]'>{vendor.phone}</p>
          </div>
        )}

        {vendor.description && (
          <div className='mt-3'>
            <p
              className='text-sm text-[#595959] overflow-hidden'
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {vendor.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
