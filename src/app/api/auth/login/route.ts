import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { loginSchema } from '@/lib/validations/auth-schemas';
import {
  successResponse,
  handleKnownError,
  validateRequestBody,
  checkHttpMethod,
  handleOptionsRequest,
  logApiRequest,
  checkRateLimit,
  rateLimitResponse
} from '@/lib/utils/api-response';

// POST /api/auth/login - 用戶登入
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 檢查 HTTP 方法
    const methodError = checkHttpMethod(request, ['POST']);
    if (methodError) return methodError;

    // 速率限制檢查 (每分鐘最多 5 次登入嘗試)
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimit = checkRateLimit(`login:${clientIP}`, 5, 60 * 1000);
    
    if (!rateLimit.allowed) {
      return rateLimitResponse('登入嘗試次數過多，請稍後再試');
    }

    // 驗證請求體
    const validation = await validateRequestBody(request, loginSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { usernameOrEmail, password } = validation.data;

    // 執行登入
    const authService = new AuthService();
    const result = await authService.login({ usernameOrEmail, password });

    // 記錄請求日誌
    logApiRequest(request, { usernameOrEmail }, result.user, startTime);

    return successResponse(
      {
        user: result.user,
        tokens: result.tokens
      },
      '登入成功'
    );

  } catch (error: any) {
    logApiRequest(request, null, null, startTime);
    return handleKnownError(error);
  }
}

// OPTIONS /api/auth/login - 處理預檢請求
export async function OPTIONS() {
  return handleOptionsRequest();
}