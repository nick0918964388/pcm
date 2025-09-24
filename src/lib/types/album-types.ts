/**
 * 相簿相關類型定義
 * 支援 Oracle 資料庫的相簿管理功能
 */

export interface Album {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  photo_count?: number;
  cover_photo_url?: string;
  tags?: string[];
  nfs_path?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  deleted_at?: Date;
  deleted_by?: string;
}

export interface CreateAlbumRequest {
  projectId: string;
  name: string;
  description?: string;
  tags?: string[];
  nfsPath?: string;
  createdBy: string;
}

export interface UpdateAlbumRequest {
  name?: string;
  description?: string;
  tags?: string[];
  updatedBy: string;
}

export interface DeleteAlbumRequest {
  force?: boolean;
  deletedBy: string;
}

export interface AlbumQueryOptions {
  page?: number;
  limit?: number;
  includePhotoCount?: boolean;
  includeCoverPhoto?: boolean;
  tags?: string[];
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'photo_count';
  sortOrder?: 'ASC' | 'DESC';
}

export interface AlbumDeleteResult {
  id: string;
  deleted_at: Date;
  photo_count?: number;
}

// API 回應格式
export interface AlbumListResponse {
  success: boolean;
  data: Album[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AlbumResponse {
  success: boolean;
  data: Album;
  message?: string;
}

export interface AlbumDeleteResponse {
  success: boolean;
  data: AlbumDeleteResult;
  message: string;
}

// 錯誤類型
export class AlbumNotFoundError extends Error {
  constructor(albumId: string) {
    super(`相簿不存在: ${albumId}`);
    this.name = 'AlbumNotFoundError';
  }
}

export class AlbumNameDuplicateError extends Error {
  constructor(projectId: string, name: string) {
    super(`相簿名稱已存在於專案 ${projectId}: ${name}`);
    this.name = 'AlbumNameDuplicateError';
  }
}

export class AlbumContainsPhotosError extends Error {
  constructor(albumId: string, photoCount: number) {
    super(`相簿包含 ${photoCount} 張照片，無法刪除: ${albumId}`);
    this.name = 'AlbumContainsPhotosError';
  }
}

export class AlbumPermissionError extends Error {
  constructor(albumId: string, action: string) {
    super(`無權限對相簿執行 ${action} 操作: ${albumId}`);
    this.name = 'AlbumPermissionError';
  }
}
