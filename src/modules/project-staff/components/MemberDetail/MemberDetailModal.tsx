/**
 * @fileoverview MemberDetailModal 組件實現
 * @version 1.0
 * @date 2025-08-31
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Mail,
  Phone,
  Building,
  Clock,
  Shield,
  Edit,
  MessageCircle,
  X,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { ProjectMemberExtended, WorkStatus } from '@/types/project';

export interface MemberDetailModalProps {
  open: boolean;
  member?: ProjectMemberExtended;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onEdit?: (member: ProjectMemberExtended) => void;
  onSendMessage?: (member: ProjectMemberExtended) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  open,
  member,
  loading = false,
  error,
  onClose,
  onEdit,
  onSendMessage,
}) => {
  const getStatusText = (status: WorkStatus) => {
    switch (status) {
      case WorkStatus.AVAILABLE:
        return 'Available';
      case WorkStatus.BUSY:
        return 'Busy';
      case WorkStatus.UNAVAILABLE:
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: WorkStatus) => {
    switch (status) {
      case WorkStatus.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case WorkStatus.BUSY:
        return 'bg-yellow-100 text-yellow-800';
      case WorkStatus.UNAVAILABLE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className='max-w-4xl responsive-modal'>
          <div data-testid='detail-loading' className='space-y-6'>
            <div className='flex items-center space-x-4'>
              <Skeleton className='h-16 w-16 rounded-full' />
              <div className='space-y-2'>
                <Skeleton className='h-6 w-48' />
                <Skeleton className='h-4 w-64' />
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Skeleton className='h-64' />
              <Skeleton className='h-64' />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>載入錯誤</DialogTitle>
          </DialogHeader>
          <div className='py-6 text-center text-red-600'>{error}</div>
          <div className='flex justify-end'>
            <Button onClick={onClose}>關閉</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl responsive-modal max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>人員詳情</DialogTitle>
          <DialogClose asChild>
            <Button
              variant='ghost'
              size='sm'
              className='absolute right-4 top-4'
              aria-label='關閉'
            >
              <X className='h-4 w-4' />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* 基本資訊卡片 */}
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-start space-x-4'>
                <div
                  className='h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center'
                  data-testid='member-avatar'
                >
                  <User className='h-8 w-8 text-gray-500' />
                </div>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center space-x-3 mb-2'>
                    <h3 className='text-xl font-semibold'>{member.userName}</h3>
                    <Badge
                      className={getStatusColor(member.workStatus)}
                      data-testid='member-status'
                    >
                      {getStatusText(member.workStatus)}
                    </Badge>
                    {member.isActive && (
                      <div className='w-2 h-2 bg-green-500 rounded-full' />
                    )}
                  </div>

                  <p className='text-gray-600 mb-3'>{member.role}</p>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                    <div className='flex items-center space-x-2'>
                      <Mail className='h-4 w-4 text-gray-400' />
                      <span>{member.email}</span>
                    </div>

                    {(member as any).phone && (
                      <div className='flex items-center space-x-2'>
                        <Phone className='h-4 w-4 text-gray-400' />
                        <span>{(member as any).phone}</span>
                      </div>
                    )}

                    {(member as any).department && (
                      <div className='flex items-center space-x-2'>
                        <Building className='h-4 w-4 text-gray-400' />
                        <span>{(member as any).department}</span>
                      </div>
                    )}

                    <div className='flex items-center space-x-2'>
                      <Clock className='h-4 w-4 text-gray-400' />
                      <span>
                        最後活躍:{' '}
                        {formatDate(member.lastActiveAt || member.joinedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='flex space-x-2'>
                  {onEdit && (
                    <Button onClick={() => onEdit(member)} size='sm'>
                      <Edit className='h-4 w-4 mr-1' />
                      編輯
                    </Button>
                  )}
                  {onSendMessage && (
                    <Button
                      onClick={() => onSendMessage(member)}
                      variant='outline'
                      size='sm'
                    >
                      <MessageCircle className='h-4 w-4 mr-1' />
                      發送訊息
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 技能與經驗 */}
            <Card>
              <CardHeader>
                <CardTitle>技能與經驗</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {member.skills?.map((skill, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-between'
                    >
                      <div>
                        <Badge variant='outline' className='mb-1'>
                          {skill.name}
                        </Badge>
                        <p className='text-sm text-gray-500'>
                          {skill.years} 年經驗
                        </p>
                      </div>
                      <div className='text-right'>
                        <span className='text-sm font-medium'>
                          Level {skill.level}
                        </span>
                        <Progress
                          value={skill.level * 20}
                          className='w-16 h-2 mt-1'
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 權限資訊 */}
            <Card>
              <CardHeader>
                <CardTitle>權限與角色</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <div>
                    <label className='text-sm font-medium text-gray-700 mb-2 block'>
                      權限
                    </label>
                    <div className='flex flex-wrap gap-2'>
                      {member.permissions?.map((permission, index) => (
                        <Badge key={index} variant='secondary'>
                          <Shield className='h-3 w-3 mr-1' />
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className='text-sm font-medium text-gray-700 mb-2 block'>
                      加入時間
                    </label>
                    <span className='text-sm'>
                      {formatDate(member.joinedAt, 'long')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 工作負荷 */}
          <Card>
            <CardHeader>
              <CardTitle>工作負荷</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>目前工作負荷</span>
                  <span className='text-lg font-bold'>{member.workload}%</span>
                </div>
                <Progress value={member.workload} className='h-3' />

                {/* 工作負荷圖表占位符 */}
                <div
                  className='h-32 bg-gray-50 rounded-lg flex items-center justify-center'
                  data-testid='workload-chart'
                >
                  <span className='text-gray-500'>工作負荷圖表</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 專案歷史 */}
            <Card>
              <CardHeader>
                <CardTitle>專案歷史</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3' data-testid='project-history'>
                  <div className='text-center text-gray-500 py-8'>
                    <p>專案參與歷史載入中...</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 負荷時間線 */}
            <Card>
              <CardHeader>
                <CardTitle>負荷時間線</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className='h-32 bg-gray-50 rounded-lg flex items-center justify-center'
                  data-testid='workload-timeline'
                >
                  <span className='text-gray-500'>時間線圖表</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
