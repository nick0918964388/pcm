import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { refreshTokenSchema } from '@/lib/validations/auth-schemas';
import {
  successResponse,
  handleKnownError,
  validateRequestBody,
  checkHttpMethod,
  handleOptionsRequest,
  logApiRequest,
  checkRateLimit,
  rateLimitErrorResponse,
} from '@/lib/utils/api-response';

// POST /api/auth/refresh - 刷新 Token
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 檢查 HTTP 方法
    const methodError = checkHttpMethod(request, ['POST']);
    if (methodError) return methodError;

    // 速率限制檢查 (每分鐘最多 10 次刷新嘗試)
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimit = checkRateLimit(`refresh:${clientIP}`, 10, 60 * 1000);

    if (!rateLimit.allowed) {
      return rateLimitErrorResponse('Token 刷新次數過多，請稍後再試');
    }

    // 驗證請求體
    const validation = await validateRequestBody(request, refreshTokenSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { refreshToken } = validation.data;

    // 執行 Token 刷新
    const authService = new AuthService();
    const tokens = await authService.refreshToken(refreshToken);

    // 記錄請求日誌
    logApiRequest(request, null, null, startTime);

    return successResponse({ tokens }, 'Token 刷新成功');
  } catch (error: any) {
    logApiRequest(request, null, null, startTime);
    return handleKnownError(error);
  }
}

// OPTIONS /api/auth/refresh - 處理預檢請求
export async function OPTIONS() {
  return handleOptionsRequest();
}
