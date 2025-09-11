import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// 標準 API 回應格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  timestamp: string;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters?: Record<string, any>;
  };
}

// 分頁信息介面
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 成功回應
export function successResponse<T>(
  data?: T,
  message?: string,
  meta?: any,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    meta
  };

  return NextResponse.json(response, { status });
}

// 錯誤回應
export function errorResponse(
  message: string,
  errorCode?: string,
  status: number = 400,
  details?: any
): NextResponse {
  const response: ApiResponse = {
    success: false,
    message,
    errorCode,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  };

  return NextResponse.json(response, { status });
}

// 分頁回應
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  message?: string,
  filters?: Record<string, any>
): NextResponse {
  return successResponse(data, message, {
    pagination,
    filters
  });
}

// 驗證錯誤回應 (處理 Zod 驗證錯誤)
export function validationErrorResponse(error: ZodError): NextResponse {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));

  return errorResponse(
    '資料驗證失敗',
    'VALIDATION_ERROR',
    400,
    { errors: details }
  );
}

// 未授權錯誤回應
export function unauthorizedResponse(message: string = '未授權訪問'): NextResponse {
  return errorResponse(message, 'UNAUTHORIZED', 401);
}

// 禁止訪問錯誤回應
export function forbiddenResponse(message: string = '權限不足'): NextResponse {
  return errorResponse(message, 'FORBIDDEN', 403);
}

// 資源不存在錯誤回應
export function notFoundResponse(message: string = '資源不存在'): NextResponse {
  return errorResponse(message, 'NOT_FOUND', 404);
}

// 衝突錯誤回應
export function conflictResponse(message: string = '資源衝突'): NextResponse {
  return errorResponse(message, 'CONFLICT', 409);
}

// 內部服務器錯誤回應
export function internalErrorResponse(message: string = '內部服務器錯誤'): NextResponse {
  return errorResponse(message, 'INTERNAL_ERROR', 500);
}

// 速率限制錯誤回應
export function rateLimitResponse(
  message: string = '請求頻率過高',
  resetTime?: number
): NextResponse {
  const response = errorResponse(message, 'RATE_LIMIT', 429);
  
  if (resetTime) {
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
  }
  
  return response;
}

// 處理已知錯誤
export function handleKnownError(error: any): NextResponse {
  console.error('API Error:', error);

  // Zod 驗證錯誤
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  // 資料庫錯誤
  if (error.code === '23505') { // PostgreSQL unique violation
    return conflictResponse('資料重複');
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return errorResponse('參考的資料不存在', 'FOREIGN_KEY_ERROR', 400);
  }

  if (error.code === '23502') { // PostgreSQL not null violation
    return errorResponse('必填欄位不能為空', 'NOT_NULL_ERROR', 400);
  }

  // JWT 相關錯誤
  if (error.name === 'JsonWebTokenError') {
    return unauthorizedResponse('無效的 Token');
  }

  if (error.name === 'TokenExpiredError') {
    return unauthorizedResponse('Token 已過期');
  }

  // 自訂業務邏輯錯誤
  if (error.message && typeof error.message === 'string') {
    // 根據錯誤訊息判斷錯誤類型
    if (error.message.includes('不存在') || error.message.includes('not found')) {
      return notFoundResponse(error.message);
    }

    if (error.message.includes('權限') || error.message.includes('permission')) {
      return forbiddenResponse(error.message);
    }

    if (error.message.includes('衝突') || error.message.includes('已存在')) {
      return conflictResponse(error.message);
    }

    if (error.message.includes('驗證') || error.message.includes('格式')) {
      return errorResponse(error.message, 'VALIDATION_ERROR', 400);
    }
  }

  // 預設錯誤回應
  return internalErrorResponse();
}

// API 路由錯誤處理包裝器
export function withErrorHandling(
  handler: (request: Request, params?: any) => Promise<NextResponse>
) {
  return async (request: Request, params?: any): Promise<NextResponse> => {
    try {
      return await handler(request, params);
    } catch (error) {
      return handleKnownError(error);
    }
  };
}

// 驗證請求體
export async function validateRequestBody<T>(
  request: Request,
  schema: any
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, response: validationErrorResponse(error) };
    }
    return { 
      success: false, 
      response: errorResponse('請求體格式錯誤', 'INVALID_JSON', 400) 
    };
  }
}

// 驗證查詢參數
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: any
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const validatedData = schema.parse(params);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, response: validationErrorResponse(error) };
    }
    return { 
      success: false, 
      response: errorResponse('查詢參數格式錯誤', 'INVALID_PARAMS', 400) 
    };
  }
}

// HTTP 方法檢查
export function checkHttpMethod(
  request: Request, 
  allowedMethods: string[]
): NextResponse | null {
  if (!allowedMethods.includes(request.method)) {
    return errorResponse(
      `不支援的 HTTP 方法: ${request.method}`,
      'METHOD_NOT_ALLOWED',
      405
    );
  }
  return null;
}

// CORS 標頭設置
export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// 處理 OPTIONS 請求 (預檢請求)
export function handleOptionsRequest(): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}

// 記錄 API 請求
export function logApiRequest(
  request: Request,
  params?: any,
  user?: any,
  startTime?: number
): void {
  const duration = startTime ? Date.now() - startTime : 0;
  const logData = {
    method: request.method,
    url: request.url,
    params,
    userId: user?.id,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  };

  console.log('API Request:', JSON.stringify(logData));

  // 慢查詢警告
  if (duration > 2000) {
    console.warn('Slow API Request detected:', JSON.stringify(logData));
  }
}

// 安全標頭設置
export function setSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}