export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  permissions: string[];
  lastLogin?: Date;
  avatar?: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: AuthToken;
  error?: string;
  message?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionTimeout: number; // in minutes
  lastActivity: Date | null;
}

export interface SessionConfig {
  timeoutDuration: number; // in minutes
  warningDuration: number; // minutes before timeout to show warning
  checkInterval: number; // in seconds
}
