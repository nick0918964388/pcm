/**
 * 照片搜尋與篩選整合測試
 * 測試搜尋和篩選功能的組合使用情境
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGallery } from '@/components/photo/PhotoGallery'
import { PhotoFilters } from '@/components/photo/PhotoFilters'
import { PhotoGrid } from '@/components/photo/PhotoGrid'
import { usePhotoStore } from '@/stores/photoStore'
import { PhotoService } from '@/services/photoService'

// Mock debounce for instant testing
vi.mock('lodash.debounce', () => ({
  default: (fn: any) => fn
}))

describe('Photo Search and Filter Integration Tests', () => {
  const mockPhotos = [
    {
      id: 'photo-1',
      projectId: 'project-1',
      albumId: 'album-1',
      fileName: 'foundation-excavation-day1.jpg',
      fileSize: 2 * 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/api/photos/photo-1/thumbnail',
      originalUrl: '/api/photos/photo-1/download',
      uploadedBy: 'contractor-alpha',
      uploadedAt: new Date('2024-01-15T09:30:00Z'),
      metadata: {
        tags: ['foundation', 'excavation', 'safety'],
        description: 'Foundation excavation work on day 1',
        location: { lat: 25.0330, lng: 121.5654 }
      }
    },
    {
      id: 'photo-2',
      projectId: 'project-1',
      albumId: 'album-1',
      fileName: 'steel-frame-installation.jpg',
      fileSize: 3 * 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 2048,
      height: 1536,
      thumbnailUrl: '/api/photos/photo-2/thumbnail',
      originalUrl: '/api/photos/photo-2/download',
      uploadedBy: 'engineer-beta',
      uploadedAt: new Date('2024-02-20T14:15:00Z'),
      metadata: {
        tags: ['steel', 'frame', 'installation', 'quality'],
        description: 'Steel frame installation progress',
        location: { lat: 25.0331, lng: 121.5655 }
      }
    },
    {
      id: 'photo-3',
      projectId: 'project-1',
      albumId: 'album-2',
      fileName: 'concrete-pour-section-a.jpg',
      fileSize: 4 * 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1440,
      thumbnailUrl: '/api/photos/photo-3/thumbnail',
      originalUrl: '/api/photos/photo-3/download',
      uploadedBy: 'contractor-alpha',
      uploadedAt: new Date('2024-03-10T11:00:00Z'),
      metadata: {
        tags: ['concrete', 'pour', 'section-a', 'quality'],
        description: 'Concrete pouring in section A',
        location: { lat: 25.0332, lng: 121.5656 }
      }
    },
    {
      id: 'photo-4',
      projectId: 'project-1',
      albumId: 'album-1',
      fileName: 'foundation-completed-inspection.jpg',
      fileSize: 1.5 * 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 1600,
      height: 1200,
      thumbnailUrl: '/api/photos/photo-4/thumbnail',
      originalUrl: '/api/photos/photo-4/download',
      uploadedBy: 'inspector-gamma',
      uploadedAt: new Date('2024-01-25T16:45:00Z'),
      metadata: {
        tags: ['foundation', 'completed', 'inspection', 'approved'],
        description: 'Foundation work completed and inspected',
        location: { lat: 25.0333, lng: 121.5657 }
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    usePhotoStore.getState().reset()
    usePhotoStore.getState().setPhotos(mockPhotos)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Text Search Integration', () => {
    it('should filter photos by filename search', async () => {
      // Arrange
      const user = userEvent.setup()

      const SearchablePhotoGallery = () => {
        const { photos, filters, setFilters } = usePhotoStore()

        return (
          <div>
            <input
              data-testid="search-input"
              type="text"
              placeholder="Search photos..."
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
            <PhotoGrid
              photos={photos.filter(photo => {
                if (!filters.searchQuery) return true
                return photo.fileName.toLowerCase().includes(filters.searchQuery.toLowerCase())
              })}
              loading={false}
              error={null}
            />
          </div>
        )
      }

      render(<SearchablePhotoGallery />)

      // Act: Search for "foundation"
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'foundation')

      // Assert: Only foundation-related photos are shown
      await waitFor(() => {
        const photoGrid = screen.getByTestId('photo-grid')
        const images = photoGrid.querySelectorAll('img')
        expect(images).toHaveLength(2) // photo-1 and photo-4
      })

      // Assert: Specific photos are visible
      expect(screen.getByAltText('foundation-excavation-day1.jpg')).toBeInTheDocument()
      expect(screen.getByAltText('foundation-completed-inspection.jpg')).toBeInTheDocument()
      expect(screen.queryByAltText('steel-frame-installation.jpg')).not.toBeInTheDocument()
    })

    it('should search by photo description content', async () => {
      // Arrange
      const user = userEvent.setup()

      const AdvancedSearchGallery = () => {
        const { photos, filters, setFilters } = usePhotoStore()

        return (
          <div>
            <input
              data-testid="description-search"
              type="text"
              placeholder="Search descriptions..."
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
            <PhotoGrid
              photos={photos.filter(photo => {
                if (!filters.searchQuery) return true
                const query = filters.searchQuery.toLowerCase()
                return (
                  photo.fileName.toLowerCase().includes(query) ||
                  photo.metadata.description?.toLowerCase().includes(query)
                )
              })}
              loading={false}
              error={null}
            />
          </div>
        )
      }

      render(<AdvancedSearchGallery />)

      // Act: Search by description content
      const searchInput = screen.getByTestId('description-search')
      await user.type(searchInput, 'progress')

      // Assert: Photos with "progress" in description are shown
      await waitFor(() => {
        expect(screen.getByAltText('steel-frame-installation.jpg')).toBeInTheDocument()
        expect(screen.queryByAltText('foundation-excavation-day1.jpg')).not.toBeInTheDocument()
      })
    })

    it('should handle empty search results gracefully', async () => {
      // Arrange
      const user = userEvent.setup()

      const SearchWithEmptyResults = () => {
        const { photos, filters, setFilters } = usePhotoStore()
        const filteredPhotos = photos.filter(photo => {
          if (!filters.searchQuery) return true
          return photo.fileName.toLowerCase().includes(filters.searchQuery.toLowerCase())
        })

        return (
          <div>
            <input
              data-testid="search-input"
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
            {filteredPhotos.length === 0 && filters.searchQuery ? (
              <div data-testid="no-results">No photos match your search</div>
            ) : (
              <PhotoGrid photos={filteredPhotos} loading={false} error={null} />
            )}
          </div>
        )
      }

      render(<SearchWithEmptyResults />)

      // Act: Search for non-existent term
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'nonexistent')

      // Assert: Empty state is shown
      await waitFor(() => {
        expect(screen.getByTestId('no-results')).toBeInTheDocument()
        expect(screen.getByText('No photos match your search')).toBeInTheDocument()
      })
    })
  })

  describe('Tag-based Filtering', () => {
    it('should filter photos by tag selection', async () => {
      // Arrange
      const user = userEvent.setup()

      const TagFilterGallery = () => {
        const { photos, filters, setFilters } = usePhotoStore()

        const handleTagSelect = (tag: string) => {
          const currentTags = filters.tags || []
          const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag]
          setFilters({ tags: newTags })
        }

        const filteredPhotos = photos.filter(photo => {
          if (!filters.tags || filters.tags.length === 0) return true
          return filters.tags.some(tag => photo.metadata.tags?.includes(tag))
        })

        return (
          <div>
            <div data-testid="tag-filters">
              {['foundation', 'steel', 'concrete', 'quality'].map(tag => (
                <button
                  key={tag}
                  data-testid={`tag-filter-${tag}`}
                  onClick={() => handleTagSelect(tag)}
                  className={filters.tags?.includes(tag) ? 'active' : ''}
                >
                  {tag}
                </button>
              ))}
            </div>
            <PhotoGrid photos={filteredPhotos} loading={false} error={null} />
          </div>
        )
      }

      render(<TagFilterGallery />)

      // Act: Select "quality" tag
      const qualityTagButton = screen.getByTestId('tag-filter-quality')
      await user.click(qualityTagButton)

      // Assert: Only photos with "quality" tag are shown
      await waitFor(() => {
        const photoGrid = screen.getByTestId('photo-grid')
        const images = photoGrid.querySelectorAll('img')
        expect(images).toHaveLength(2) // photo-2 and photo-3
      })

      expect(screen.getByAltText('steel-frame-installation.jpg')).toBeInTheDocument()
      expect(screen.getByAltText('concrete-pour-section-a.jpg')).toBeInTheDocument()
    })

    it('should support multiple tag selection (OR logic)', async () => {
      // Arrange
      const user = userEvent.setup()

      const MultiTagFilterGallery = () => {
        const { photos, filters, setFilters } = usePhotoStore()

        const handleTagToggle = (tag: string) => {
          const currentTags = filters.tags || []
          const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag]
          setFilters({ tags: newTags })
        }

        const filteredPhotos = photos.filter(photo => {
          if (!filters.tags || filters.tags.length === 0) return true
          return filters.tags.some(tag => photo.metadata.tags?.includes(tag))
        })

        return (
          <div>
            <div data-testid="multi-tag-filters">
              {['foundation', 'steel', 'concrete'].map(tag => (
                <button
                  key={tag}
                  data-testid={`multi-tag-${tag}`}
                  onClick={() => handleTagToggle(tag)}
                  className={filters.tags?.includes(tag) ? 'selected' : ''}
                >
                  {tag} {filters.tags?.includes(tag) && '✓'}
                </button>
              ))}
            </div>
            <div data-testid="selected-tags">
              Selected: {filters.tags?.join(', ') || 'None'}
            </div>
            <PhotoGrid photos={filteredPhotos} loading={false} error={null} />
          </div>
        )
      }

      render(<MultiTagFilterGallery />)

      // Act: Select multiple tags
      await user.click(screen.getByTestId('multi-tag-foundation'))
      await user.click(screen.getByTestId('multi-tag-steel'))

      // Assert: Photos with either tag are shown
      await waitFor(() => {
        const photoGrid = screen.getByTestId('photo-grid')
        const images = photoGrid.querySelectorAll('img')
        expect(images).toHaveLength(3) // photo-1, photo-2, photo-4
      })

      // Assert: Selected tags are displayed
      expect(screen.getByText('Selected: foundation, steel')).toBeInTheDocument()
    })
  })

  describe('Date Range Filtering', () => {
    it('should filter photos by date range', async () => {
      // Arrange
      const user = userEvent.setup()

      const DateFilterGallery = () => {
        const { photos, filters, setFilters } = usePhotoStore()

        const handleDateRangeChange = (start: string, end: string) => {
          setFilters({
            dateRange: {
              start: new Date(start),
              end: new Date(end)
            }
          })
        }

        const filteredPhotos = photos.filter(photo => {
          if (!filters.dateRange) return true
          const photoDate = new Date(photo.uploadedAt)
          return photoDate >= filters.dateRange.start && photoDate <= filters.dateRange.end
        })

        return (
          <div>
            <div data-testid="date-filters">
              <input
                data-testid="start-date"
                type="date"
                onChange={(e) => {
                  const endDate = (document.getElementById('end-date') as HTMLInputElement)?.value || '2024-12-31'
                  handleDateRangeChange(e.target.value, endDate)
                }}
              />
              <input
                id="end-date"
                data-testid="end-date"
                type="date"
                onChange={(e) => {
                  const startDate = (document.getElementById('start-date') as HTMLInputElement)?.value || '2024-01-01'
                  handleDateRangeChange(startDate, e.target.value)
                }}
              />
            </div>
            <PhotoGrid photos={filteredPhotos} loading={false} error={null} />
          </div>
        )
      }

      render(<DateFilterGallery />)

      // Act: Set date range for January 2024
      const startDateInput = screen.getByTestId('start-date')
      const endDateInput = screen.getByTestId('end-date')

      await user.type(startDateInput, '2024-01-01')
      await user.type(endDateInput, '2024-01-31')

      // Assert: Only January photos are shown
      await waitFor(() => {
        const photoGrid = screen.getByTestId('photo-grid')
        const images = photoGrid.querySelectorAll('img')
        expect(images).toHaveLength(2) // photo-1 and photo-4
      })
    })
  })

  describe('Uploader Filtering', () => {
    it('should filter photos by uploader', async () => {
      // Arrange
      const user = userEvent.setup()

      const UploaderFilterGallery = () => {
        const { photos, filters, setFilters } = usePhotoStore()

        const uniqueUploaders = [...new Set(photos.map(photo => photo.uploadedBy))]

        const filteredPhotos = photos.filter(photo => {
          if (!filters.uploadedBy) return true
          return photo.uploadedBy === filters.uploadedBy
        })

        return (
          <div>
            <select
              data-testid="uploader-select"
              onChange={(e) => setFilters({ uploadedBy: e.target.value || undefined })}
            >
              <option value="">All uploaders</option>
              {uniqueUploaders.map(uploader => (
                <option key={uploader} value={uploader}>
                  {uploader}
                </option>
              ))}
            </select>
            <PhotoGrid photos={filteredPhotos} loading={false} error={null} />
          </div>
        )
      }

      render(<UploaderFilterGallery />)

      // Act: Filter by specific uploader
      const uploaderSelect = screen.getByTestId('uploader-select')
      await user.selectOptions(uploaderSelect, 'contractor-alpha')

      // Assert: Only photos from contractor-alpha are shown
      await waitFor(() => {
        const photoGrid = screen.getByTestId('photo-grid')
        const images = photoGrid.querySelectorAll('img')
        expect(images).toHaveLength(2) // photo-1 and photo-3
      })
    })
  })

  describe('Combined Filter Integration', () => {
    it('should apply multiple filters simultaneously', async () => {
      // Arrange
      const user = userEvent.setup()

      const CombinedFilterGallery = () => {
        const { photos, filters, setFilters, getFilteredPhotos } = usePhotoStore()

        return (
          <div>
            <div data-testid="combined-filters">
              <input
                data-testid="search-query"
                placeholder="Search..."
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
              />
              <select
                data-testid="uploader-filter"
                onChange={(e) => setFilters({ uploadedBy: e.target.value || undefined })}
              >
                <option value="">All uploaders</option>
                <option value="contractor-alpha">contractor-alpha</option>
                <option value="engineer-beta">engineer-beta</option>
              </select>
              <button
                data-testid="quality-tag-filter"
                onClick={() => {
                  const currentTags = filters.tags || []
                  const hasQuality = currentTags.includes('quality')
                  setFilters({
                    tags: hasQuality
                      ? currentTags.filter(t => t !== 'quality')
                      : [...currentTags, 'quality']
                  })
                }}
                className={filters.tags?.includes('quality') ? 'active' : ''}
              >
                Quality Tag {filters.tags?.includes('quality') && '✓'}
              </button>
            </div>
            <PhotoGrid photos={getFilteredPhotos()} loading={false} error={null} />
            <div data-testid="filter-count">
              Showing {getFilteredPhotos().length} of {photos.length} photos
            </div>
          </div>
        )
      }

      render(<CombinedFilterGallery />)

      // Act: Apply search + uploader filter
      const searchInput = screen.getByTestId('search-query')
      const uploaderSelect = screen.getByTestId('uploader-filter')

      await user.type(searchInput, 'concrete')
      await user.selectOptions(uploaderSelect, 'contractor-alpha')

      // Assert: Only photos matching both filters are shown
      await waitFor(() => {
        const filterCount = screen.getByTestId('filter-count')
        expect(filterCount).toHaveTextContent('Showing 1 of 4 photos')
      })

      // Act: Add tag filter
      const qualityTagButton = screen.getByTestId('quality-tag-filter')
      await user.click(qualityTagButton)

      // Assert: Further refined results
      await waitFor(() => {
        const filterCount = screen.getByTestId('filter-count')
        expect(filterCount).toHaveTextContent('Showing 1 of 4 photos')
      })
    })

    it('should handle filter conflicts gracefully', async () => {
      // Arrange
      const user = userEvent.setup()

      const ConflictingFilterGallery = () => {
        const { photos, filters, setFilters } = usePhotoStore()

        const filteredPhotos = photos.filter(photo => {
          let matches = true

          if (filters.searchQuery) {
            matches = matches && photo.fileName.toLowerCase().includes(filters.searchQuery.toLowerCase())
          }

          if (filters.uploadedBy) {
            matches = matches && photo.uploadedBy === filters.uploadedBy
          }

          if (filters.tags && filters.tags.length > 0) {
            matches = matches && filters.tags.some(tag => photo.metadata.tags?.includes(tag))
          }

          return matches
        })

        return (
          <div>
            <input
              data-testid="conflicting-search"
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
            <select
              data-testid="conflicting-uploader"
              onChange={(e) => setFilters({ uploadedBy: e.target.value || undefined })}
            >
              <option value="">All</option>
              <option value="engineer-beta">engineer-beta</option>
            </select>
            <button
              data-testid="foundation-tag"
              onClick={() => setFilters({ tags: ['foundation'] })}
            >
              Foundation Tag
            </button>
            <PhotoGrid photos={filteredPhotos} loading={false} error={null} />
            {filteredPhotos.length === 0 && (
              <div data-testid="no-matches">
                No photos match all selected filters. Try adjusting your filters.
              </div>
            )}
          </div>
        )
      }

      render(<ConflictingFilterGallery />)

      // Act: Apply conflicting filters
      await user.type(screen.getByTestId('conflicting-search'), 'foundation')
      await user.selectOptions(screen.getByTestId('conflicting-uploader'), 'engineer-beta')
      await user.click(screen.getByTestId('foundation-tag'))

      // Assert: No matches message is shown
      await waitFor(() => {
        expect(screen.getByTestId('no-matches')).toBeInTheDocument()
        expect(screen.getByText(/no photos match all selected filters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Filter State Persistence', () => {
    it('should maintain filter state across component re-renders', async () => {
      // Arrange
      const user = userEvent.setup()

      const PersistentFilterGallery = () => {
        const { filters, setFilters, getFilteredPhotos } = usePhotoStore()

        return (
          <div>
            <input
              data-testid="persistent-search"
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
            <div data-testid="current-search">
              Current search: {filters.searchQuery || 'None'}
            </div>
            <PhotoGrid photos={getFilteredPhotos()} loading={false} error={null} />
          </div>
        )
      }

      const { rerender } = render(<PersistentFilterGallery />)

      // Act: Set search filter
      const searchInput = screen.getByTestId('persistent-search')
      await user.type(searchInput, 'steel')

      // Assert: Filter is applied
      await waitFor(() => {
        expect(screen.getByText('Current search: steel')).toBeInTheDocument()
      })

      // Act: Re-render component
      rerender(<PersistentFilterGallery />)

      // Assert: Filter state persists
      expect(screen.getByText('Current search: steel')).toBeInTheDocument()
      expect(screen.getByDisplayValue('steel')).toBeInTheDocument()
    })

    it('should clear all filters when reset', async () => {
      // Arrange
      const user = userEvent.setup()

      const ResettableFilterGallery = () => {
        const { filters, setFilters, clearFilters, getFilteredPhotos, photos } = usePhotoStore()

        return (
          <div>
            <input
              data-testid="reset-search"
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
            <select
              data-testid="reset-uploader"
              value={filters.uploadedBy || ''}
              onChange={(e) => setFilters({ uploadedBy: e.target.value || undefined })}
            >
              <option value="">All</option>
              <option value="contractor-alpha">contractor-alpha</option>
            </select>
            <button data-testid="clear-filters" onClick={clearFilters}>
              Clear All Filters
            </button>
            <div data-testid="filtered-count">
              Showing {getFilteredPhotos().length} of {photos.length}
            </div>
            <PhotoGrid photos={getFilteredPhotos()} loading={false} error={null} />
          </div>
        )
      }

      render(<ResettableFilterGallery />)

      // Act: Apply multiple filters
      await user.type(screen.getByTestId('reset-search'), 'foundation')
      await user.selectOptions(screen.getByTestId('reset-uploader'), 'contractor-alpha')

      // Assert: Filters are applied
      await waitFor(() => {
        expect(screen.getByText('Showing 2 of 4')).toBeInTheDocument()
      })

      // Act: Clear all filters
      const clearButton = screen.getByTestId('clear-filters')
      await user.click(clearButton)

      // Assert: All filters are cleared
      await waitFor(() => {
        expect(screen.getByText('Showing 4 of 4')).toBeInTheDocument()
        expect(screen.getByTestId('reset-search')).toHaveValue('')
        expect(screen.getByTestId('reset-uploader')).toHaveValue('')
      })
    })
  })
})