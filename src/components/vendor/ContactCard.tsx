'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Contact } from '@/types/vendor';
import { User, Phone, Mail, Building, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onCall?: (phone: string) => void;
  onEmail?: (email: string) => void;
}

export function ContactCard({
  contact,
  onEdit,
  onCall,
  onEmail,
}: ContactCardProps) {
  return (
    <Card className='border-[#F0F0F0] hover:shadow-md transition-shadow duration-200'>
      <CardContent className='p-4'>
        <div className='flex items-start justify-between mb-3'>
          <div className='flex items-start gap-3 flex-1 min-w-0'>
            <div className='h-12 w-12 bg-[#00645A]/10 rounded-full flex items-center justify-center flex-shrink-0'>
              <User className='h-6 w-6 text-[#00645A]' />
            </div>

            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 mb-1'>
                <h3 className='text-lg font-semibold text-[#1A1A1A] truncate'>
                  {contact.name}
                </h3>
                {contact.isPrimary && (
                  <Star className='h-4 w-4 text-yellow-500 fill-current' />
                )}
              </div>

              <p className='text-sm font-medium text-[#00645A] mb-1'>
                {contact.title}
              </p>

              {contact.department && (
                <div className='flex items-center gap-1'>
                  <Building className='h-3 w-3 text-[#8C8C8C]' />
                  <p className='text-xs text-[#8C8C8C]'>{contact.department}</p>
                </div>
              )}
            </div>
          </div>

          <div className='flex items-center gap-1'>
            <Badge
              variant={contact.isActive ? 'default' : 'secondary'}
              className='text-xs'
            >
              {contact.isActive ? '活躍' : '非活躍'}
            </Badge>
            {contact.isPrimary && (
              <Badge
                variant='outline'
                className='text-xs border-yellow-200 text-yellow-700'
              >
                主要聯絡人
              </Badge>
            )}
          </div>
        </div>

        <div className='space-y-2'>
          {/* 電話 */}
          <div className='flex items-center gap-2'>
            <Phone className='h-4 w-4 text-[#8C8C8C]' />
            <span className='text-sm text-[#1A1A1A] flex-1'>
              {contact.phone}
            </span>
            {onCall && (
              <Button
                size='sm'
                variant='ghost'
                className='h-7 px-2 text-[#00645A] hover:bg-[#00645A]/5'
                onClick={() => onCall(contact.phone)}
              >
                撥號
              </Button>
            )}
          </div>

          {/* 手機 */}
          {contact.mobile && (
            <div className='flex items-center gap-2'>
              <Phone className='h-4 w-4 text-[#8C8C8C]' />
              <span className='text-sm text-[#1A1A1A] flex-1'>
                {contact.mobile}
              </span>
              {onCall && (
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-7 px-2 text-[#00645A] hover:bg-[#00645A]/5'
                  onClick={() => onCall(contact.mobile!)}
                >
                  撥號
                </Button>
              )}
            </div>
          )}

          {/* 電子郵件 */}
          <div className='flex items-center gap-2'>
            <Mail className='h-4 w-4 text-[#8C8C8C]' />
            <span className='text-sm text-[#1A1A1A] flex-1 truncate'>
              {contact.email}
            </span>
            {onEmail && (
              <Button
                size='sm'
                variant='ghost'
                className='h-7 px-2 text-[#00645A] hover:bg-[#00645A]/5'
                onClick={() => onEmail(contact.email)}
              >
                郵件
              </Button>
            )}
          </div>

          {/* 分機 */}
          {contact.extension && (
            <div className='flex items-center gap-2'>
              <Phone className='h-4 w-4 text-[#8C8C8C]' />
              <span className='text-xs text-[#8C8C8C]'>分機</span>
              <span className='text-sm text-[#1A1A1A]'>
                {contact.extension}
              </span>
            </div>
          )}
        </div>

        {/* 備註 */}
        {contact.notes && (
          <div className='mt-3 pt-3 border-t border-[#F0F0F0]'>
            <p
              className='text-sm text-[#595959] overflow-hidden'
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {contact.notes}
            </p>
          </div>
        )}

        {/* 操作按鈕 */}
        {onEdit && (
          <div className='mt-4 pt-3 border-t border-[#F0F0F0]'>
            <Button
              size='sm'
              variant='outline'
              className='w-full text-[#00645A] border-[#00645A]/20 hover:bg-[#00645A]/5'
              onClick={() => onEdit(contact)}
            >
              編輯聯絡人
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
