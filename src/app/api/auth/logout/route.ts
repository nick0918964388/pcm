import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { authenticateToken } from '@/lib/middleware/auth-middleware';
import {
  successResponse,
  handleKnownError,
  checkHttpMethod,
  handleOptionsRequest,
  logApiRequest,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

// POST /api/auth/logout - 用戶登出
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 檢查 HTTP 方法
    const methodError = checkHttpMethod(request, ['POST']);
    if (methodError) return methodError;

    // 驗證身份 (即使 token 無效也允許登出)
    const authResult = await authenticateToken(request);
    let user = null;
    let token = null;

    if (authResult.success) {
      user = authResult.user;
    }

    // 獲取 token (用於加入黑名單)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 執行登出
    const authService = new AuthService();
    if (token) {
      await authService.logout(token);
    }

    // 記錄請求日誌
    logApiRequest(request, null, user, startTime);

    return successResponse(null, '登出成功');
  } catch (error: any) {
    logApiRequest(request, null, null, startTime);
    return handleKnownError(error);
  }
}

// OPTIONS /api/auth/logout - 處理預檢請求
export async function OPTIONS() {
  return handleOptionsRequest();
}
