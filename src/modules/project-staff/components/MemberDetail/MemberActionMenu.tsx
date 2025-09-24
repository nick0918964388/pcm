/**
 * @fileoverview MemberActionMenu 組件實現
 * @version 1.0
 * @date 2025-08-31
 */

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Eye,
  Edit,
  MessageCircle,
  Trash2,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { ProjectMemberExtended } from '@/types/project';

export interface MemberPermissions {
  canEdit?: boolean;
  canDelete?: boolean;
  canMessage?: boolean;
  canManageStatus?: boolean;
}

export interface MemberActionMenuProps {
  member: ProjectMemberExtended;
  onViewDetails?: (member: ProjectMemberExtended) => void;
  onEdit?: (member: ProjectMemberExtended) => void;
  onSendMessage?: (member: ProjectMemberExtended) => void;
  onDelete?: (member: ProjectMemberExtended) => void;
  onChangeStatus?: (member: ProjectMemberExtended) => void;
  permissions?: MemberPermissions;
  disabled?: boolean;
  loading?: boolean;
  trigger?: React.ReactNode;
}

export const MemberActionMenu: React.FC<MemberActionMenuProps> = ({
  member,
  onViewDetails,
  onEdit,
  onSendMessage,
  onDelete,
  onChangeStatus,
  permissions = {
    canEdit: true,
    canDelete: false,
    canMessage: true,
    canManageStatus: false,
  },
  disabled = false,
  loading = false,
  trigger,
}) => {
  const handleViewDetails = () => {
    onViewDetails?.(member);
  };

  const handleEdit = () => {
    onEdit?.(member);
  };

  const handleSendMessage = () => {
    onSendMessage?.(member);
  };

  const handleDelete = () => {
    onDelete?.(member);
  };

  const handleChangeStatus = () => {
    onChangeStatus?.(member);
  };

  if (loading) {
    return (
      <div
        data-testid='menu-loading'
        className='flex items-center justify-center'
      >
        <Loader2 className='h-4 w-4 animate-spin' />
      </div>
    );
  }

  const defaultTrigger = (
    <Button
      variant='ghost'
      size='sm'
      disabled={disabled}
      aria-label='更多操作'
      className='h-8 w-8 p-0'
    >
      <MoreVertical className='h-4 w-4' />
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-48'>
        {/* 基本檢視操作 */}
        <DropdownMenuItem onClick={handleViewDetails}>
          <Eye className='h-4 w-4 mr-2' />
          檢視詳情
        </DropdownMenuItem>

        {/* 編輯相關操作 */}
        {permissions.canEdit && (
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className='h-4 w-4 mr-2' />
            編輯資訊
          </DropdownMenuItem>
        )}

        {/* 狀態管理 */}
        {permissions.canManageStatus && (
          <DropdownMenuItem onClick={handleChangeStatus}>
            <UserCheck className='h-4 w-4 mr-2' />
            變更狀態
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* 通訊操作 */}
        {permissions.canMessage && onSendMessage && (
          <DropdownMenuItem onClick={handleSendMessage}>
            <MessageCircle className='h-4 w-4 mr-2' />
            發送訊息
          </DropdownMenuItem>
        )}

        {/* 危險操作 */}
        {permissions.canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className='text-red-600 focus:text-red-600'
            >
              <Trash2 className='h-4 w-4 mr-2' />
              刪除成員
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
