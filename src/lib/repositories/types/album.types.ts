/**
 * 相簿實體類型定義
 * Task 2.1: 實作 Oracle 相簿倉儲
 */

export interface Album {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  photoCount: number;
  coverPhotoId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy: string;
}

export interface CreateAlbumRequest {
  projectId: string;
  name: string;
  description?: string;
  createdBy: string;
}

export interface UpdateAlbumRequest {
  name?: string;
  description?: string;
}

export type AccessAction = 'read' | 'write' | 'delete' | 'manage';

export interface AlbumAccessPermission {
  albumId: string;
  userId: string;
  action: AccessAction;
  hasPermission: boolean;
}

export interface AlbumDeletionInfo {
  id: string;
  projectId: string;
  name: string;
  photoCount: number;
  createdAt: Date;
  createdBy: string;
  canDelete: boolean;
  warningMessage?: string;
}

export interface AlbumAuditLog {
  id: string;
  albumId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  reason?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface SafeDeleteOptions {
  force?: boolean;
  reason?: string;
  skipDirectoryCleanup?: boolean;
  skipAuditLog?: boolean;
}
