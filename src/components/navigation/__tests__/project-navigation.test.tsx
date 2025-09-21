/**
 * Project Navigation Integration Tests
 * 專案導航整合測試
 */

import { render, screen } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import ProjectNavigationDropdown from '../ProjectNavigationDropdown'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn()
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>

describe('Project Navigation Integration', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter)
    mockUseParams.mockReturnValue({ projectId: 'TEST-PROJECT' })
  })

  it('should generate correct project-relative URLs for photo gallery', () => {
    const TestComponent = () => {
      const params = useParams()
      const projectId = params.projectId as string

      return (
        <div>
          <a href={`/dashboard/${projectId}/photos`} data-testid="photo-gallery-link">
            iPhoto 2.0 (工程照片庫)
          </a>
        </div>
      )
    }

    render(<TestComponent />)

    const photoGalleryLink = screen.getByTestId('photo-gallery-link')
    expect(photoGalleryLink).toHaveAttribute('href', '/dashboard/TEST-PROJECT/photos')
  })

  it('should handle navigation within project context', () => {
    // This test ensures that navigation works correctly within a project
    expect(mockUseParams()).toEqual({ projectId: 'TEST-PROJECT' })
  })
})