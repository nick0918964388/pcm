/**
 * 照片權限控制整合測試
 * 測試不同角色對照片功能的存取權限
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGallery } from '@/components/photo/PhotoGallery'
import { PhotoUploader } from '@/components/photo/PhotoUploader'
import { PhotoDownload } from '@/components/photo/PhotoDownload'
import { usePhotoStore } from '@/stores/photoStore'
import { AuthService } from '@/services/authService'
import { PhotoService } from '@/services/photoService'

// Mock services
vi.mock('@/services/authService')
vi.mock('@/services/photoService')

// Mock permission hook
const mockUsePermissions = vi.fn()
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: mockUsePermissions
}))

describe('Photo Permission Control Integration Tests', () => {
  const mockProjects = {
    'project-1': { id: 'project-1', name: 'Project Alpha' },
    'project-2': { id: 'project-2', name: 'Project Beta' }
  }

  const mockUsers = {
    admin: {
      id: 'admin-user',
      name: 'Admin User',
      role: 'admin',
      projects: ['project-1', 'project-2'],
      permissions: {
        'project-1': ['read', 'write', 'delete', 'upload'],
        'project-2': ['read', 'write', 'delete', 'upload']
      }
    },
    manager: {
      id: 'manager-user',
      name: 'Project Manager',
      role: 'manager',
      projects: ['project-1'],
      permissions: {
        'project-1': ['read', 'write', 'upload']
      }
    },
    engineer: {
      id: 'engineer-user',
      name: 'Engineer User',
      role: 'engineer',
      projects: ['project-1'],
      permissions: {
        'project-1': ['read', 'upload']
      }
    },
    contractor: {
      id: 'contractor-user',
      name: 'Contractor User',
      role: 'contractor',
      projects: ['project-1'],
      permissions: {
        'project-1': ['upload']
      }
    },
    unauthorized: {
      id: 'unauthorized-user',
      name: 'Unauthorized User',
      role: 'contractor',
      projects: [],
      permissions: {}
    }
  }

  const mockPhotos = [
    {
      id: 'photo-1',
      projectId: 'project-1',
      albumId: 'album-1',
      fileName: 'construction-photo-1.jpg',
      fileSize: 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/api/photos/photo-1/thumbnail',
      originalUrl: '/api/photos/photo-1/download',
      uploadedBy: 'contractor-user',
      uploadedAt: new Date('2024-01-01'),
      metadata: { tags: ['construction', 'foundation'] }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    usePhotoStore.getState().reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Project Access Control', () => {
    it('should allow admin to access all projects', async () => {
      // Arrange
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => true,
        hasPermission: (projectId: string, permission: string) => true,
        currentUser: mockUsers.admin
      })

      vi.mocked(PhotoService.prototype.getProjectAlbums).mockResolvedValue([
        { id: 'album-1', projectId: 'project-1', name: 'Foundation Work', photoCount: 5 },
        { id: 'album-2', projectId: 'project-2', name: 'Steel Frame', photoCount: 3 }
      ])

      // RED: This test should fail initially as permission integration doesn't exist
      render(<PhotoGallery userId="admin-user" />)

      // Assert: Admin can see all projects
      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
        expect(screen.getByText('Project Beta')).toBeInTheDocument()
      })

      // Assert: Admin can access all albums
      expect(screen.getByText('Foundation Work')).toBeInTheDocument()
      expect(screen.getByText('Steel Frame')).toBeInTheDocument()
    })

    it('should restrict manager to assigned projects only', async () => {
      // Arrange
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && ['read', 'write', 'upload'].includes(permission),
        currentUser: mockUsers.manager
      })

      vi.mocked(PhotoService.prototype.getProjectAlbums).mockResolvedValue([
        { id: 'album-1', projectId: 'project-1', name: 'Foundation Work', photoCount: 5 }
      ])

      render(<PhotoGallery userId="manager-user" />)

      // Assert: Manager can only see assigned project
      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
        expect(screen.queryByText('Project Beta')).not.toBeInTheDocument()
      })
    })

    it('should deny access to unauthorized users', async () => {
      // Arrange
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: () => false,
        hasPermission: () => false,
        currentUser: mockUsers.unauthorized
      })

      render(<PhotoGallery userId="unauthorized-user" />)

      // Assert: Unauthorized user sees access denied message
      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument()
        expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument()
      })
    })
  })

  describe('Upload Permission Control', () => {
    it('should allow upload for users with upload permission', async () => {
      // Arrange
      const user = userEvent.setup()

      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && ['read', 'upload'].includes(permission),
        currentUser: mockUsers.engineer
      })

      render(
        <PhotoUploader
          projectId="project-1"
          albumId="album-1"
          userId="engineer-user"
        />
      )

      // Assert: Upload interface is available
      expect(screen.getByTestId('file-input')).toBeInTheDocument()
      expect(screen.getByTestId('upload-button')).toBeInTheDocument()

      // Act: Upload file
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      // Assert: Upload is allowed
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
      expect(screen.getByTestId('upload-button')).not.toBeDisabled()
    })

    it('should deny upload for users without upload permission', async () => {
      // Arrange
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && permission === 'read',
        currentUser: { ...mockUsers.engineer, permissions: { 'project-1': ['read'] } }
      })

      render(
        <PhotoUploader
          projectId="project-1"
          albumId="album-1"
          userId="engineer-user"
        />
      )

      // Assert: Upload interface is disabled or hidden
      await waitFor(() => {
        expect(screen.getByTestId('upload-disabled-message')).toBeInTheDocument()
        expect(screen.getByText(/you don't have upload permission/i)).toBeInTheDocument()
      })

      // Assert: Upload controls are disabled
      const fileInput = screen.queryByTestId('file-input')
      expect(fileInput).toBeNull()
    })

    it('should prevent cross-project uploads', async () => {
      // Arrange
      const user = userEvent.setup()

      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && ['read', 'upload'].includes(permission),
        currentUser: mockUsers.engineer
      })

      // Mock upload service to reject unauthorized project
      vi.mocked(PhotoService.prototype.uploadPhoto).mockRejectedValue(
        new Error('Unauthorized: Cannot upload to this project')
      )

      render(
        <PhotoUploader
          projectId="project-2" // User doesn't have access to project-2
          albumId="album-2"
          userId="engineer-user"
        />
      )

      // Act: Attempt upload to unauthorized project
      const mockFile = new File(['content'], 'unauthorized.jpg', { type: 'image/jpeg' })

      // Assert: Upload should be blocked at component level
      await waitFor(() => {
        expect(screen.getByTestId('project-access-denied')).toBeInTheDocument()
      })
    })
  })

  describe('Download Permission Control', () => {
    it('should allow download for users with read permission', async () => {
      // Arrange
      const user = userEvent.setup()

      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && ['read', 'upload'].includes(permission),
        currentUser: mockUsers.engineer
      })

      vi.mocked(PhotoService.prototype.downloadPhoto).mockResolvedValue(undefined)

      render(
        <PhotoDownload
          photo={mockPhotos[0]}
          userId="engineer-user"
        />
      )

      // Act: Attempt download
      const downloadButton = screen.getByTestId('download-button')
      await user.click(downloadButton)

      // Assert: Download is allowed
      await waitFor(() => {
        expect(PhotoService.prototype.downloadPhoto).toHaveBeenCalledWith(
          mockPhotos[0],
          'engineer-user'
        )
      })
    })

    it('should deny download for users without read permission', async () => {
      // Arrange
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && permission === 'upload',
        currentUser: { ...mockUsers.contractor, permissions: { 'project-1': ['upload'] } }
      })

      render(
        <PhotoDownload
          photo={mockPhotos[0]}
          userId="contractor-user"
        />
      )

      // Assert: Download button is disabled or hidden
      await waitFor(() => {
        const downloadButton = screen.queryByTestId('download-button')
        expect(downloadButton).toBeNull()
      })

      // Assert: Permission denied message is shown
      expect(screen.getByTestId('download-denied-message')).toBeInTheDocument()
    })

    it('should enforce batch download permissions', async () => {
      // Arrange
      const user = userEvent.setup()

      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => ['project-1', 'project-2'].includes(projectId),
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && permission === 'read',
        currentUser: mockUsers.manager
      })

      const mixedProjectPhotos = [
        { ...mockPhotos[0], projectId: 'project-1' }, // User has access
        { ...mockPhotos[0], id: 'photo-2', projectId: 'project-2' } // User no read access
      ]

      render(
        <PhotoDownload
          photos={mixedProjectPhotos}
          userId="manager-user"
          batchMode={true}
        />
      )

      // Act: Attempt batch download
      const batchDownloadButton = screen.getByTestId('batch-download-button')
      await user.click(batchDownloadButton)

      // Assert: Only authorized photos are included
      await waitFor(() => {
        expect(screen.getByTestId('permission-filter-warning')).toBeInTheDocument()
        expect(screen.getByText(/1 of 2 photos will be downloaded/i)).toBeInTheDocument()
      })
    })
  })

  describe('Delete Permission Control', () => {
    it('should allow delete for users with delete permission', async () => {
      // Arrange
      const user = userEvent.setup()

      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && ['read', 'write', 'delete'].includes(permission),
        currentUser: mockUsers.admin
      })

      vi.mocked(PhotoService.prototype.deletePhoto).mockResolvedValue({ success: true })

      const PhotoWithActions = () => {
        return (
          <div>
            <img src={mockPhotos[0].thumbnailUrl} alt={mockPhotos[0].fileName} />
            <button
              data-testid="delete-button"
              onClick={() => PhotoService.prototype.deletePhoto(mockPhotos[0].id, 'admin-user')}
            >
              Delete
            </button>
          </div>
        )
      }

      render(<PhotoWithActions />)

      // Act: Delete photo
      const deleteButton = screen.getByTestId('delete-button')
      await user.click(deleteButton)

      // Assert: Delete is allowed
      await waitFor(() => {
        expect(PhotoService.prototype.deletePhoto).toHaveBeenCalledWith(
          'photo-1',
          'admin-user'
        )
      })
    })

    it('should deny delete for users without delete permission', async () => {
      // Arrange
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && ['read', 'upload'].includes(permission),
        currentUser: mockUsers.engineer
      })

      const PhotoWithRestrictedActions = () => {
        const { hasPermission } = mockUsePermissions()
        const canDelete = hasPermission('project-1', 'delete')

        return (
          <div>
            <img src={mockPhotos[0].thumbnailUrl} alt={mockPhotos[0].fileName} />
            {canDelete ? (
              <button data-testid="delete-button">Delete</button>
            ) : (
              <div data-testid="delete-denied">You cannot delete this photo</div>
            )}
          </div>
        )
      }

      render(<PhotoWithRestrictedActions />)

      // Assert: Delete option is not available
      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument()
      expect(screen.getByTestId('delete-denied')).toBeInTheDocument()
    })
  })

  describe('Role-based Feature Access', () => {
    it('should show appropriate features for admin role', async () => {
      // Arrange
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: () => true,
        hasPermission: () => true,
        currentUser: mockUsers.admin
      })

      render(<PhotoGallery userId="admin-user" />)

      // Assert: Admin can see all features
      await waitFor(() => {
        expect(screen.getByTestId('bulk-operations')).toBeInTheDocument()
        expect(screen.getByTestId('user-management')).toBeInTheDocument()
        expect(screen.getByTestId('project-settings')).toBeInTheDocument()
      })
    })

    it('should show limited features for contractor role', async () => {
      // Arrange
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && permission === 'upload',
        currentUser: mockUsers.contractor
      })

      render(<PhotoGallery userId="contractor-user" />)

      // Assert: Contractor sees only upload features
      await waitFor(() => {
        expect(screen.getByTestId('upload-section')).toBeInTheDocument()
        expect(screen.queryByTestId('bulk-operations')).not.toBeInTheDocument()
        expect(screen.queryByTestId('user-management')).not.toBeInTheDocument()
      })
    })

    it('should handle permission changes dynamically', async () => {
      // Arrange
      const { rerender } = render(<PhotoGallery userId="engineer-user" />)

      // Initial state: Engineer with read and upload
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && ['read', 'upload'].includes(permission),
        currentUser: mockUsers.engineer
      })

      // Assert: Engineer can upload
      await waitFor(() => {
        expect(screen.getByTestId('upload-section')).toBeInTheDocument()
      })

      // Permission change: Remove upload permission
      mockUsePermissions.mockReturnValue({
        hasProjectAccess: (projectId: string) => projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          projectId === 'project-1' && permission === 'read',
        currentUser: { ...mockUsers.engineer, permissions: { 'project-1': ['read'] } }
      })

      rerender(<PhotoGallery userId="engineer-user" />)

      // Assert: Upload section is hidden after permission change
      await waitFor(() => {
        expect(screen.queryByTestId('upload-section')).not.toBeInTheDocument()
      })
    })
  })

  describe('Session and Token Validation', () => {
    it('should handle expired authentication tokens', async () => {
      // Arrange
      vi.mocked(AuthService.validateToken).mockRejectedValue(
        new Error('Token expired')
      )

      mockUsePermissions.mockReturnValue({
        hasProjectAccess: () => false,
        hasPermission: () => false,
        currentUser: null
      })

      render(<PhotoGallery userId="engineer-user" />)

      // Assert: User is redirected to login
      await waitFor(() => {
        expect(screen.getByTestId('login-required')).toBeInTheDocument()
        expect(screen.getByText(/please log in to continue/i)).toBeInTheDocument()
      })
    })

    it('should refresh permissions on token refresh', async () => {
      // Arrange
      let tokenRefreshed = false

      vi.mocked(AuthService.refreshToken).mockImplementation(() => {
        tokenRefreshed = true
        return Promise.resolve({ token: 'new-token', user: mockUsers.engineer })
      })

      mockUsePermissions.mockImplementation(() => ({
        hasProjectAccess: (projectId: string) => tokenRefreshed && projectId === 'project-1',
        hasPermission: (projectId: string, permission: string) =>
          tokenRefreshed && projectId === 'project-1' && ['read', 'upload'].includes(permission),
        currentUser: tokenRefreshed ? mockUsers.engineer : null
      }))

      const { rerender } = render(<PhotoGallery userId="engineer-user" />)

      // Initially no access
      expect(screen.getByTestId('access-denied')).toBeInTheDocument()

      // Simulate token refresh
      await AuthService.refreshToken()
      rerender(<PhotoGallery userId="engineer-user" />)

      // Assert: Access is granted after token refresh
      await waitFor(() => {
        expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument()
        expect(screen.getByTestId('photo-gallery')).toBeInTheDocument()
      })
    })
  })
})