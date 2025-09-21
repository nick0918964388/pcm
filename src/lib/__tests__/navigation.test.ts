/**
 * Navigation Configuration Tests
 * 導航配置測試
 */

import { navigationConfig } from '../navigation'

describe('Navigation Configuration', () => {
  describe('Photo Gallery Integration', () => {
    it('should include photo gallery in communication management section', () => {
      const communicationSection = navigationConfig.find(
        section => section.id === 'communication-management'
      )

      expect(communicationSection).toBeDefined()
      expect(communicationSection?.children).toBeDefined()

      const photoGalleryItem = communicationSection?.children?.find(
        item => item.id === 'photo-gallery'
      )

      expect(photoGalleryItem).toBeDefined()
      expect(photoGalleryItem?.label).toBe('iPhoto 2.0 (工程照片庫)')
    })

    it('should have correct route structure for project-based access', () => {
      const communicationSection = navigationConfig.find(
        section => section.id === 'communication-management'
      )

      const photoGalleryItem = communicationSection?.children?.find(
        item => item.id === 'photo-gallery'
      )

      // Route should be relative to allow project-based routing
      expect(photoGalleryItem?.href).toBe('photos')
    })

    it('should be positioned correctly within communication management', () => {
      const communicationSection = navigationConfig.find(
        section => section.id === 'communication-management'
      )

      const children = communicationSection?.children || []
      const photoGalleryIndex = children.findIndex(item => item.id === 'photo-gallery')

      // Should be the last item in communication management section
      expect(photoGalleryIndex).toBe(children.length - 1)
    })
  })

  describe('Navigation Structure Validation', () => {
    it('should have all required main sections', () => {
      const expectedSections = [
        'project-scope',
        'human-resources',
        'schedule-management',
        'cost-management',
        'quality-management',
        'communication-management',
        'risk-safety-environmental',
        'realtime-video'
      ]

      expectedSections.forEach(sectionId => {
        const section = navigationConfig.find(s => s.id === sectionId)
        expect(section).toBeDefined()
      })
    })

    it('should have consistent structure for all navigation items', () => {
      navigationConfig.forEach(section => {
        expect(section.id).toBeDefined()
        expect(section.label).toBeDefined()

        if (section.children) {
          section.children.forEach(child => {
            expect(child.id).toBeDefined()
            expect(child.label).toBeDefined()
            // href is optional but should be string if present
            if (child.href) {
              expect(typeof child.href).toBe('string')
            }
          })
        }
      })
    })
  })
})