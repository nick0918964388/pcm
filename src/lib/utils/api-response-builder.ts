/**
 * API回應建構器
 *
 * REFACTOR階段：標準化API回應格式
 */

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
    performance?: {
      executionTime: number;
      queryCount: number;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  isRetryable?: boolean;
  suggestedAction?: string;
  timestamp: string;
  details?: any;
}

export class ApiResponseBuilder {
  /**
   * 建立成功回應
   */
  static success<T>(
    data: T,
    message?: string,
    meta?: ApiSuccessResponse<T>['meta']
  ): NextResponse {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    if (message) {
      response.message = message;
    }

    if (meta) {
      response.meta = meta;
    }

    return NextResponse.json(response);
  }

  /**
   * 建立錯誤回應
   */
  static error(
    error: string,
    statusCode: number = 500,
    errorCode?: string,
    isRetryable?: boolean,
    suggestedAction?: string,
    details?: any
  ): NextResponse {
    const response: ApiErrorResponse = {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    };

    if (errorCode) {
      response.errorCode = errorCode;
    }

    if (isRetryable !== undefined) {
      response.isRetryable = isRetryable;
    }

    if (suggestedAction) {
      response.suggestedAction = suggestedAction;
    }

    if (details) {
      response.details = details;
    }

    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * 建立資源未找到回應
   */
  static notFound(resource: string = '資源'): NextResponse {
    return this.error(
      `${resource}不存在`,
      404,
      'RESOURCE_NOT_FOUND',
      false,
      '檢查請求的資源識別碼是否正確'
    );
  }

  /**
   * 建立驗證失敗回應
   */
  static validationError(
    message: string = '資料驗證失敗',
    details?: any
  ): NextResponse {
    return this.error(
      message,
      400,
      'VALIDATION_ERROR',
      false,
      '檢查輸入資料格式和必填欄位',
      details
    );
  }

  /**
   * 建立未授權回應
   */
  static unauthorized(message: string = '未授權存取'): NextResponse {
    return this.error(
      message,
      401,
      'UNAUTHORIZED',
      false,
      '請提供有效的認證資訊'
    );
  }

  /**
   * 建立禁止存取回應
   */
  static forbidden(message: string = '禁止存取'): NextResponse {
    return this.error(message, 403, 'FORBIDDEN', false, '檢查使用者權限設定');
  }

  /**
   * 建立衝突回應
   */
  static conflict(message: string = '資源衝突'): NextResponse {
    return this.error(
      message,
      409,
      'CONFLICT',
      false,
      '檢查資源是否已存在或有衝突'
    );
  }

  /**
   * 建立服務不可用回應
   */
  static serviceUnavailable(message: string = '服務暫時不可用'): NextResponse {
    return this.error(
      message,
      503,
      'SERVICE_UNAVAILABLE',
      true,
      '請稍後再試或聯繫系統管理員'
    );
  }

  /**
   * 建立分頁回應
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): NextResponse {
    const totalPages = Math.ceil(total / limit);

    return this.success(data, message, {
      pagination: {
        page,
        limit,
        total,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    });
  }

  /**
   * 建立帶效能資訊的回應
   */
  static withPerformance<T>(
    data: T,
    executionTime: number,
    queryCount: number = 1,
    message?: string
  ): NextResponse {
    return this.success(data, message, {
      performance: {
        executionTime,
        queryCount,
      },
    });
  }

  /**
   * 建立操作成功回應
   */
  static operationSuccess(message: string, data?: any): NextResponse {
    return this.success(data || { result: 'success' }, message);
  }

  /**
   * 建立創建成功回應
   */
  static created<T>(data: T, message: string = '創建成功'): NextResponse {
    const response = this.success(data, message);
    // 設定HTTP狀態碼為201
    return new NextResponse(response.body, {
      status: 201,
      headers: response.headers,
    });
  }

  /**
   * 建立更新成功回應
   */
  static updated<T>(data: T, message: string = '更新成功'): NextResponse {
    return this.success(data, message);
  }

  /**
   * 建立刪除成功回應
   */
  static deleted(message: string = '刪除成功'): NextResponse {
    return this.success({ result: 'deleted' }, message);
  }
}
