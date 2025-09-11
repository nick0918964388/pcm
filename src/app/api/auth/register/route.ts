import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { registerSchema } from '@/lib/validations/auth-schemas';
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

// POST /api/auth/register - 用戶註冊
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 檢查 HTTP 方法
    const methodError = checkHttpMethod(request, ['POST']);
    if (methodError) return methodError;

    // 速率限制檢查 (每小時最多 3 次註冊嘗試)
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimit = checkRateLimit(`register:${clientIP}`, 3, 60 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return rateLimitResponse('註冊次數過多，請稍後再試');
    }

    // 驗證請求體
    const validation = await validateRequestBody(request, registerSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { username, email, password, firstName, lastName } = validation.data;

    // 執行註冊
    const authService = new AuthService();
    const user = await authService.register({
      username,
      email,
      password,
      firstName,
      lastName
    });

    // 記錄請求日誌
    logApiRequest(request, { username, email }, { id: user.id }, startTime);

    return successResponse(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isVerified: user.is_verified
        }
      },
      '註冊成功',
      null,
      201
    );

  } catch (error: any) {
    logApiRequest(request, null, null, startTime);
    return handleKnownError(error);
  }
}

// OPTIONS /api/auth/register - 處理預檢請求
export async function OPTIONS() {
  return handleOptionsRequest();
}