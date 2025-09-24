/**
 * Authentication Hook
 *
 * Provides authentication state and user information.
 * This is a simplified implementation for the iPhoto 2.0 module.
 *
 * @version 1.0
 * @date 2025-09-24
 */

import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'engineer' | 'contractor';
  projects: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Simulate authentication check
    // In a real implementation, this would check JWT tokens, cookies, etc.
    const simulateAuth = async () => {
      // Mock authentication for development
      const mockUser: User = {
        id: 'user-001',
        username: 'testuser',
        role: 'engineer',
        projects: ['TEST001', 'PROJ002'],
      };

      setAuthState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });
    };

    const timer = setTimeout(simulateAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  return authState;
}
