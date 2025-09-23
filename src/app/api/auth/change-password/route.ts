import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { authenticateToken } from '@/lib/middleware/auth-middleware';
import { changePasswordSchema } from '@/lib/validations/auth-schemas';
import {
  successResponse,
  handleKnownError,
  validateRequestBody,
  checkHttpMethod,
  handleOptionsRequest,
  logApiRequest,
  unauthorizedResponse,
  checkRateLimit,
  rateLimitErrorResponse
} from '@/lib/utils/api-response';

// POST /api/auth/change-password - 修改密碼
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 檢查 HTTP 方法
    const methodError = checkHttpMethod(request, ['POST']);
    if (methodError) return methodError;

    // 驗證身份
    const authResult = await authenticateToken(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const user = authResult.user!;

    // 速率限制檢查 (每小時最多 5 次修改密碼嘗試)
    const rateLimit = checkRateLimit(`change-password:${user.id}`, 5, 60 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return rateLimitErrorResponse('修改密碼次數過多，請稍後再試');
    }

    // 驗證請求體
    const validation = await validateRequestBody(request, changePasswordSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { oldPassword, newPassword } = validation.data;

    // 執行修改密碼
    const authService = new AuthService();
    await authService.changePassword(user.id, oldPassword, newPassword);

    // 記錄請求日誌 (不記錄密碼)
    logApiRequest(request, { userId: user.id }, user, startTime);

    return successResponse(
      null,
      '密碼修改成功'
    );

  } catch (error: any) {
    logApiRequest(request, null, null, startTime);
    return handleKnownError(error);
  }
}

// OPTIONS /api/auth/change-password - 處理預檢請求
export async function OPTIONS() {
  return handleOptionsRequest();
}