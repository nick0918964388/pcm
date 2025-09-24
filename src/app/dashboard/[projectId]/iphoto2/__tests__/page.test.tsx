/**
 * iPhoto 2.0 Main Page Component Tests
 *
 * Tests for the main iPhoto 2.0 page component according to task 6.1 requirements:
 * - Modern shadcn/ui interface layout
 * - Responsive design for desktop and mobile
 * - Navigation and breadcrumb functionality
 * - Communication module integration
 *
 * @version 1.0
 * @date 2025-09-24
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import IPhoto2Page from '../page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock authentication hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      username: 'testuser',
      role: 'engineer',
      projects: ['TEST001'],
    },
    isAuthenticated: true,
  }),
}));

describe('IPhoto2Page Component', () => {
  const mockPush = vi.fn();
  const mockPathname = '/communication/iphoto2';

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (usePathname as any).mockReturnValue(mockPathname);
  });

  describe('Page Structure and Layout', () => {
    it('should render the main page with proper heading', () => {
      render(<IPhoto2Page />);

      expect(
        screen.getByRole('heading', { level: 1, name: /iphoto 2\.0/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/照片管理系統/)).toBeInTheDocument();
    });

    it('should display breadcrumb navigation', () => {
      render(<IPhoto2Page />);

      expect(
        screen.getByRole('navigation', { name: /breadcrumb/i })
      ).toBeInTheDocument();
      expect(screen.getByText('溝通管理')).toBeInTheDocument();

      // Use specific role to find breadcrumb iPhoto 2.0 text
      expect(
        screen.getByRole('link', { name: 'iPhoto 2.0' })
      ).toBeInTheDocument();
    });

    it('should have responsive layout structure', () => {
      render(<IPhoto2Page />);

      const mainContainer = screen.getByTestId('iphoto2-main-container');
      expect(mainContainer).toHaveClass('container', 'mx-auto', 'px-4');
    });
  });

  describe('Navigation and Menu', () => {
    it('should render main navigation menu', () => {
      render(<IPhoto2Page />);

      expect(screen.getAllByRole('button', { name: /相簿管理/i })).toHaveLength(
        2
      ); // Desktop + Mobile
      expect(screen.getAllByRole('button', { name: /照片上傳/i })).toHaveLength(
        2
      ); // Desktop + Mobile
      expect(screen.getAllByRole('button', { name: /照片瀏覽/i })).toHaveLength(
        2
      ); // Desktop + Mobile
    });

    it('should navigate to album management when clicked', () => {
      render(<IPhoto2Page />);

      const albumButtons = screen.getAllByRole('button', { name: /相簿管理/i });
      fireEvent.click(albumButtons[0]); // Click first button (desktop)

      expect(mockPush).toHaveBeenCalledWith('/communication/iphoto2/albums');
    });

    it('should navigate to photo upload when clicked', () => {
      render(<IPhoto2Page />);

      const uploadButtons = screen.getAllByRole('button', {
        name: /照片上傳/i,
      });
      fireEvent.click(uploadButtons[0]); // Click first button (desktop)

      expect(mockPush).toHaveBeenCalledWith('/communication/iphoto2/upload');
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile navigation element', () => {
      render(<IPhoto2Page />);

      const mobileNav = screen.getByTestId('mobile-navigation');
      expect(mobileNav).toBeInTheDocument();
    });

    it('should show desktop navigation element', () => {
      render(<IPhoto2Page />);

      const desktopNav = screen.getByTestId('desktop-navigation');
      expect(desktopNav).toBeInTheDocument();
    });
  });

  describe('Modern UI Components', () => {
    it('should use shadcn/ui Card components', () => {
      render(<IPhoto2Page />);

      const cards = screen.getAllByTestId('feature-card');
      expect(cards).toHaveLength(6); // 3 desktop cards + 3 mobile cards
    });

    it('should have proper shadcn/ui button styling', () => {
      render(<IPhoto2Page />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass(
          'inline-flex',
          'items-center',
          'justify-center'
        );
      });
    });
  });

  describe('Page Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<IPhoto2Page />);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2s).toHaveLength(6); // 3 desktop headings + 3 mobile headings
    });

    it('should have proper ARIA labels', () => {
      render(<IPhoto2Page />);

      expect(screen.getByRole('main')).toHaveAttribute(
        'aria-label',
        'iPhoto 2.0 主頁面'
      );
      expect(screen.getByLabelText('breadcrumb')).toBeInTheDocument();
    });
  });
});
