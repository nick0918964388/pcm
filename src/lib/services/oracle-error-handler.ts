/**
 * Oracle錯誤處理服務
 *
 * REFACTOR階段：統一Oracle錯誤處理邏輯
 */

import { NextResponse } from 'next/server';

// Oracle錯誤碼映射
interface OracleErrorMapping {
  status: number;
  message: string;
  isRetryable: boolean;
  suggestedAction: string;
}

const ORACLE_ERROR_MAPPINGS: Record<string, OracleErrorMapping> = {
  'ORA-00001': {
    status: 409,
    message: '資料已存在，請檢查重複項目',
    isRetryable: false,
    suggestedAction: '檢查唯一約束條件',
  },
  'ORA-01400': {
    status: 400,
    message: '資料驗證失敗：必填欄位不能為空',
    isRetryable: false,
    suggestedAction: '確認所有必填欄位已填寫',
  },
  'ORA-01017': {
    status: 500,
    message: '資料庫連線認證失敗',
    isRetryable: true,
    suggestedAction: '檢查資料庫認證配置',
  },
  'ORA-12514': {
    status: 503,
    message: '資料庫服務暫時不可用',
    isRetryable: true,
    suggestedAction: '檢查Oracle容器狀態',
  },
  'ORA-12541': {
    status: 503,
    message: 'Oracle監聽器無回應',
    isRetryable: true,
    suggestedAction: '檢查Oracle監聽器是否運行',
  },
  'ORA-28001': {
    status: 500,
    message: '資料庫密碼已過期',
    isRetryable: false,
    suggestedAction: '聯繫系統管理員重設密碼',
  },
  'ORA-00904': {
    status: 500,
    message: '資料庫結構錯誤',
    isRetryable: false,
    suggestedAction: '檢查SQL語法和欄位名稱',
  },
  'ORA-01406': {
    status: 400,
    message: '資料長度超過限制',
    isRetryable: false,
    suggestedAction: '減少輸入資料長度',
  },
};

export interface OracleErrorInfo {
  errorCode: string;
  isRetryable: boolean;
  suggestedAction: string;
  originalError: Error;
}

export class OracleErrorHandler {
  /**
   * 解析Oracle錯誤並返回錯誤資訊
   */
  static parseError(error: any): OracleErrorInfo | null {
    const errorMessage = error?.message || String(error);

    // 提取Oracle錯誤碼
    const oracleErrorMatch = errorMessage.match(/ORA-(\d+)/);
    if (!oracleErrorMatch) {
      return null;
    }

    const errorCode = `ORA-${oracleErrorMatch[1]}`;
    const mapping = ORACLE_ERROR_MAPPINGS[errorCode];

    return {
      errorCode,
      isRetryable: mapping?.isRetryable ?? false,
      suggestedAction: mapping?.suggestedAction ?? '查閱Oracle錯誤文檔',
      originalError: error instanceof Error ? error : new Error(String(error)),
    };
  }

  /**
   * 處理Oracle錯誤並返回適當的HTTP回應
   */
  static handleError(error: any): NextResponse {
    const errorMessage = error?.message || String(error);
    console.error('Oracle錯誤:', errorMessage);

    const oracleErrorInfo = this.parseError(error);

    if (oracleErrorInfo) {
      const mapping = ORACLE_ERROR_MAPPINGS[oracleErrorInfo.errorCode];

      if (mapping) {
        return NextResponse.json(
          {
            success: false,
            error: mapping.message,
            errorCode: oracleErrorInfo.errorCode,
            isRetryable: mapping.isRetryable,
            suggestedAction: mapping.suggestedAction,
            timestamp: new Date().toISOString(),
          },
          { status: mapping.status }
        );
      }
    }

    // 處理非Oracle特定錯誤
    if (errorMessage.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: '資料庫查詢超時',
          isRetryable: true,
          suggestedAction: '請稍後再試',
          timestamp: new Date().toISOString(),
        },
        { status: 408 }
      );
    }

    if (errorMessage.includes('connection')) {
      return NextResponse.json(
        {
          success: false,
          error: '資料庫連線失敗',
          isRetryable: true,
          suggestedAction: '檢查網路連線',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // 通用錯誤處理
    return NextResponse.json(
      {
        success: false,
        error: '資料庫操作失敗',
        isRetryable: false,
        suggestedAction: '聯繫系統管理員',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  /**
   * 判斷錯誤是否可重試
   */
  static isRetryableError(error: any): boolean {
    const oracleErrorInfo = this.parseError(error);
    return oracleErrorInfo?.isRetryable ?? false;
  }

  /**
   * 獲取錯誤的建議解決方案
   */
  static getSuggestedAction(error: any): string {
    const oracleErrorInfo = this.parseError(error);
    return oracleErrorInfo?.suggestedAction ?? '查閱錯誤日誌以獲取更多資訊';
  }

  /**
   * 記錄詳細的Oracle錯誤資訊（用於監控）
   */
  static logDetailedError(error: any, context?: string): void {
    const oracleErrorInfo = this.parseError(error);

    const logData = {
      timestamp: new Date().toISOString(),
      context: context || 'unknown',
      errorType: 'Oracle',
      errorCode: oracleErrorInfo?.errorCode || 'UNKNOWN',
      errorMessage: error?.message || String(error),
      isRetryable: oracleErrorInfo?.isRetryable || false,
      suggestedAction: oracleErrorInfo?.suggestedAction || 'Unknown',
      stackTrace: error?.stack,
    };

    // 根據錯誤嚴重程度使用不同的日誌級別
    if (
      oracleErrorInfo?.errorCode?.startsWith('ORA-125') ||
      oracleErrorInfo?.errorCode?.startsWith('ORA-010')
    ) {
      console.error('CRITICAL Oracle Error:', logData);
    } else if (oracleErrorInfo?.isRetryable) {
      console.warn('Retryable Oracle Error:', logData);
    } else {
      console.error('Oracle Error:', logData);
    }
  }

  /**
   * 建立標準化的錯誤回應格式
   */
  static createErrorResponse(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    isRetryable: boolean = false,
    suggestedAction?: string
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message,
        errorCode,
        isRetryable,
        suggestedAction,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
