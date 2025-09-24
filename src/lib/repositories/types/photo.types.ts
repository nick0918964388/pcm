/**
 * 照片實體類型定義
 * Task 3.1: 建立 Oracle 照片倉儲
 */

export interface Photo {
  id: string;
  albumId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  uploadedBy: string;
  uploadedAt: Date;
  uploadStatus: UploadStatus;
  metadata: PhotoMetadata;
  deletedAt?: Date;
}

export interface PhotoVersion {
  id: string;
  photoId: string;
  versionType: VersionType;
  filePath: string;
  width: number;
  height: number;
  fileSize: number;
  createdAt: Date;
}

export interface PhotoMetadata {
  exif?: {
    camera?: string;
    lens?: string;
    settings?: {
      aperture?: string;
      shutterSpeed?: string;
      iso?: string;
      [key: string]: any;
    };
    dateTime?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
    };
  };
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  technical?: {
    colorSpace?: string;
    orientation?: number;
    resolution?: {
      x: number;
      y: number;
      unit: string;
    };
  };
  tags?: string[];
  description?: string;
  customFields?: Record<string, any>;
}

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VersionType =
  | 'thumbnail'
  | 'small'
  | 'medium'
  | 'large'
  | 'original';

export interface CreatePhotoRequest {
  albumId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadedBy: string;
  metadata?: PhotoMetadata;
}

export interface UpdatePhotoRequest {
  fileName?: string;
  metadata?: Partial<PhotoMetadata>;
  uploadStatus?: UploadStatus;
}

export interface PhotoSearchCriteria {
  albumId?: string;
  uploadedBy?: string;
  mimeTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  hasGPS?: boolean;
}

export interface PhotoBatchUploadResult {
  successful: Photo[];
  failed: Array<{
    fileName: string;
    error: string;
    originalIndex: number;
  }>;
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
}

export interface PhotoDeletionResult {
  success: boolean;
  deletedPhoto: boolean;
  deletedVersions: number;
  filePath: string;
}

export interface PhotoTagOperation {
  photoId: string;
  operation: 'add' | 'remove' | 'replace';
  tags: string[];
}

export interface BatchTagUpdateResult {
  totalProcessed: number;
  successful: number;
  failed: Array<{
    photoId: string;
    error: string;
  }>;
}
