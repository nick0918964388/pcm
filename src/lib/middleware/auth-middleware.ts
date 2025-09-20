import { NextRequest } from 'next/server';
import { AuthService } from '../services/auth-service';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

// JWT Token 驗證中間件
export async function authenticateToken(request: NextRequest): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // 從 Authorization header 獲取 token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: '缺少 Authorization header 或格式錯誤'
      };
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前綴
    if (!token) {
      return {
        success: false,
        error: 'Token 不能為空'
      };
    }

    // 驗證 token
    const authService = new AuthService();
    const user = await authService.verifyToken(token);

    return {
      success: true,
      user
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Token 驗證失敗'
    };
  }
}

// 權限檢查中間件
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  // 先進行身份驗證
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return authResult;
  }

  try {
    const authService = new AuthService();
    const hasPermission = await authService.hasPermission(authResult.user!.id, permission);

    if (!hasPermission) {
      return {
        success: false,
        error: '權限不足'
      };
    }

    return {
      success: true,
      user: authResult.user
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '權限檢查失敗'
    };
  }
}

// 角色檢查中間件
export async function requireRole(
  request: NextRequest,
  role: string
): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  // 先進行身份驗證
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return authResult;
  }

  try {
    const authService = new AuthService();
    const hasRole = await authService.hasRole(authResult.user!.id, role);

    if (!hasRole) {
      return {
        success: false,
        error: '角色權限不足'
      };
    }

    return {
      success: true,
      user: authResult.user
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '角色檢查失敗'
    };
  }
}

// 管理員權限檢查
export async function requireAdmin(request: NextRequest): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  return requireRole(request, 'admin');
}

// 多重權限檢查 (需要所有權限)
export async function requireAllPermissions(
  request: NextRequest,
  permissions: string[]
): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  // 先進行身份驗證
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return authResult;
  }

  try {
    const authService = new AuthService();
    
    for (const permission of permissions) {
      const hasPermission = await authService.hasPermission(authResult.user!.id, permission);
      if (!hasPermission) {
        return {
          success: false,
          error: `缺少權限: ${permission}`
        };
      }
    }

    return {
      success: true,
      user: authResult.user
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '權限檢查失敗'
    };
  }
}

// 多重權限檢查 (需要任一權限)
export async function requireAnyPermission(
  request: NextRequest,
  permissions: string[]
): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  // 先進行身份驗證
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return authResult;
  }

  try {
    const authService = new AuthService();
    
    for (const permission of permissions) {
      const hasPermission = await authService.hasPermission(authResult.user!.id, permission);
      if (hasPermission) {
        return {
          success: true,
          user: authResult.user
        };
      }
    }

    return {
      success: false,
      error: `需要以下任一權限: ${permissions.join(', ')}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '權限檢查失敗'
    };
  }
}

// 檢查用戶是否為專案成員或經理
export async function requireProjectAccess(
  request: NextRequest,
  projectId: string
): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  // 先進行身份驗證
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return authResult;
  }

  try {
    // 檢查是否為管理員 (管理員可以訪問所有專案)
    const authService = new AuthService();
    const isAdmin = await authService.hasRole(authResult.user!.id, 'admin');
    
    if (isAdmin) {
      return {
        success: true,
        user: authResult.user
      };
    }

    // 這裡需要實作專案成員檢查邏輯
    // 目前先簡單檢查是否有專案讀取權限
    const hasProjectAccess = await authService.hasPermission(authResult.user!.id, 'project:read');
    
    if (!hasProjectAccess) {
      return {
        success: false,
        error: '無權限訪問該專案'
      };
    }

    return {
      success: true,
      user: authResult.user
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '專案權限檢查失敗'
    };
  }
}

// 檢查資源擁有者權限
export async function requireOwnerOrAdmin(
  request: NextRequest,
  resourceOwnerId: string
): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  // 先進行身份驗證
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return authResult;
  }

  try {
    const user = authResult.user!;
    
    // 檢查是否為資源擁有者
    if (user.id === resourceOwnerId) {
      return {
        success: true,
        user
      };
    }

    // 檢查是否為管理員
    const authService = new AuthService();
    const isAdmin = await authService.hasRole(user.id, 'admin');
    
    if (!isAdmin) {
      return {
        success: false,
        error: '只有資源擁有者或管理員可以執行此操作'
      };
    }

    return {
      success: true,
      user
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '擁有者權限檢查失敗'
    };
  }
}

// IP 白名單檢查 (可選功能)
export function checkIPWhitelist(request: NextRequest, allowedIPs?: string[]): boolean {
  if (!allowedIPs || allowedIPs.length === 0) {
    return true; // 如果沒有設定白名單，則允許所有 IP
  }

  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  return allowedIPs.includes(clientIP);
}

// 速率限制檢查 (簡單實作，實際應用中建議使用 Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60 * 1000 // 1 分鐘
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // 創建新記錄或重置
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { 
    allowed: true, 
    remaining: maxRequests - record.count, 
    resetTime: record.resetTime 
  };
}

// 清理過期的速率限制記錄
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // 每 5 分鐘清理一次