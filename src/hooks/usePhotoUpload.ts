/**
 * Photo Upload Hook
 *
 * Manages photo upload functionality including drag-and-drop,
 * batch processing, progress tracking, and upload status management.
 *
 * @version 1.0
 * @date 2025-09-24
 */

import { useState, useCallback } from 'react';

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  thumbnail?: string;
  error?: string;
}

export interface UploadError {
  fileName: string;
  message: string;
}

interface UsePhotoUploadResult {
  uploading: boolean;
  progress: number;
  uploadedFiles: UploadFile[];
  errors: UploadError[];
  uploadPhotos: (files: File[], albumId: string) => Promise<void>;
  cancelUpload: () => void;
  clearUploads: () => void;
}

export function usePhotoUpload(): UsePhotoUploadResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [errors, setErrors] = useState<UploadError[]>([]);

  const uploadPhotos = useCallback(async (files: File[], albumId: string) => {
    try {
      setUploading(true);
      setProgress(0);
      setErrors([]);

      const uploadFiles: UploadFile[] = files.map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: 'pending' as const,
      }));

      setUploadedFiles(uploadFiles);

      // Simulate file uploads with progress
      for (let i = 0; i < uploadFiles.length; i++) {
        const currentFile = uploadFiles[i];

        // Update file status to uploading
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === currentFile.id ? { ...f, status: 'uploading' as const } : f
          )
        );

        // Simulate upload progress
        for (let p = 0; p <= 100; p += 10) {
          await new Promise(resolve => setTimeout(resolve, 50));
          setProgress((i * 100 + p) / files.length);

          setUploadedFiles(prev =>
            prev.map(f => (f.id === currentFile.id ? { ...f, progress: p } : f))
          );
        }

        // Mark as success or error (simulate some failures)
        const success = Math.random() > 0.1; // 90% success rate
        if (success) {
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === currentFile.id
                ? { ...f, status: 'success' as const, progress: 100 }
                : f
            )
          );
        } else {
          const error = { fileName: currentFile.name, message: '上傳失敗' };
          setErrors(prev => [...prev, error]);
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === currentFile.id
                ? { ...f, status: 'error' as const, error: error.message }
                : f
            )
          );
        }
      }

      setProgress(100);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }, []);

  const cancelUpload = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setUploadedFiles([]);
    setErrors([]);
  }, []);

  const clearUploads = useCallback(() => {
    setUploadedFiles([]);
    setErrors([]);
    setProgress(0);
  }, []);

  return {
    uploading,
    progress,
    uploadedFiles,
    errors,
    uploadPhotos,
    cancelUpload,
    clearUploads,
  };
}
