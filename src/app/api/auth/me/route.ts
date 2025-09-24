import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { authenticateToken } from '@/lib/middleware/auth-middleware';
import { updateUserSchema } from '@/lib/validations/auth-schemas';
import {
  successResponse,
  handleKnownError,
  validateRequestBody,
  checkHttpMethod,
  handleOptionsRequest,
  logApiRequest,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

// GET /api/auth/me - 取得當前用戶資訊
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 檢查 HTTP 方法
    const methodError = checkHttpMethod(request, ['GET']);
    if (methodError) return methodError;

    // 驗證身份
    const authResult = await authenticateToken(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const user = authResult.user!;

    // 獲取完整用戶資訊
    const authService = new AuthService();
    const userProfile = await authService.getUserProfile(user.id);

    // 記錄請求日誌
    logApiRequest(request, null, user, startTime);

    return successResponse({ user: userProfile }, '取得用戶資訊成功');
  } catch (error: any) {
    logApiRequest(request, null, null, startTime);
    return handleKnownError(error);
  }
}

// PUT /api/auth/me - 更新當前用戶資訊
export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 檢查 HTTP 方法
    const methodError = checkHttpMethod(request, ['PUT']);
    if (methodError) return methodError;

    // 驗證身份
    const authResult = await authenticateToken(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const user = authResult.user!;

    // 驗證請求體
    const validation = await validateRequestBody(request, updateUserSchema);
    if (!validation.success) {
      return validation.response;
    }

    // 更新用戶資訊
    const authService = new AuthService();
    // 這裡需要實作 updateUserProfile 方法
    // await authService.updateUserProfile(user.id, validation.data);

    // 獲取更新後的用戶資訊
    const updatedUser = await authService.getUserProfile(user.id);

    // 記錄請求日誌
    logApiRequest(request, validation.data, user, startTime);

    return successResponse({ user: updatedUser }, '用戶資訊更新成功');
  } catch (error: any) {
    logApiRequest(request, null, null, startTime);
    return handleKnownError(error);
  }
}

// OPTIONS /api/auth/me - 處理預檢請求
export async function OPTIONS() {
  return handleOptionsRequest();
}
