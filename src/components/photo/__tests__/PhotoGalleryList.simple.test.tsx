/**
 * PhotoGalleryList 簡化測試
 * 基本功能驗證
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PhotoGalleryList } from '../PhotoGalleryList';
import { Album } from '@/types/photo.types';

const mockAlbums: Album[] = [
  {
    id: 'album-1',
    projectId: 'proj001',
    name: '施工進度照片',
    description: '記錄施工各階段進度',
    photoCount: 25,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
];

describe('PhotoGalleryList 基本測試', () => {
  it('應該渲染基本元件', () => {
    const mockProps = {
      albums: mockAlbums,
      projectId: 'proj001',
      selectedAlbum: null,
      onAlbumSelect: vi.fn(),
    };

    render(<PhotoGalleryList {...mockProps} />);

    expect(screen.getByText('專案相簿')).toBeInTheDocument();
    expect(screen.getByText('所有照片')).toBeInTheDocument();
    expect(screen.getByText('施工進度照片')).toBeInTheDocument();
  });
});
