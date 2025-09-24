/**
 * EXIF Extraction Service
 * Task 8.1: 建立 EXIF 資料提取和 Oracle 儲存功能
 *
 * Features:
 * - 自動提取照片 EXIF 資料
 * - GPS 位置資料解析和驗證
 * - 相機和鏡頭資訊提取
 * - 日期時間格式化
 * - 資料清理和驗證
 * - Oracle JSON 格式化
 */

import { PhotoMetadata } from '@/lib/repositories/types/photo.types';
import path from 'path';
import { promises as fs } from 'fs';

// 動態導入 exifr 避免在 Edge Runtime 中出現問題
let exifr: any = null;

interface RawExifData {
  Make?: string;
  Model?: string;
  LensModel?: string;
  LensMake?: string;
  DateTimeOriginal?: string;
  DateTime?: string;
  CreateDate?: string;
  ISO?: number;
  FNumber?: number;
  ExposureTime?: number;
  FocalLength?: number;
  Flash?: number;
  Orientation?: number;
  ColorSpace?: number;
  XResolution?: number;
  YResolution?: number;
  ResolutionUnit?: number;

  // GPS 相關
  GPSLatitude?: number[];
  GPSLatitudeRef?: string;
  GPSLongitude?: number[];
  GPSLongitudeRef?: string;
  GPSAltitude?: number;
  GPSAltitudeRef?: number;
  GPSTimeStamp?: number[];
  GPSDateStamp?: string;

  // 其他技術資訊
  WhiteBalance?: number;
  MeteringMode?: number;
  ExposureMode?: number;
  SceneCaptureType?: number;
  DigitalZoomRatio?: number;

  [key: string]: any;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

interface CameraInfo {
  camera?: string;
  lens?: string;
  settings?: {
    aperture?: string;
    shutterSpeed?: string;
    iso?: string;
    focalLength?: string;
    flash?: string;
    whiteBalance?: string;
    [key: string]: any;
  };
}

export class ExifExtractionService {
  private static readonly MAX_STRING_LENGTH = 255;
  private static readonly SUPPORTED_FORMATS = [
    '.jpg',
    '.jpeg',
    '.tiff',
    '.tif',
  ];
  private static readonly RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 100;

  /**
   * 初始化 exifr 庫
   */
  private static async initializeExifr(): Promise<void> {
    if (!exifr) {
      try {
        exifr = await import('exifr');
      } catch (error) {
        console.warn('Failed to import exifr library:', error);
        throw new Error('EXIF extraction library not available');
      }
    }
  }

  /**
   * 主要的 EXIF 資料提取函數
   * Requirements: 6.1, 6.2, 6.6
   */
  static async extractExifData(
    filePath: string
  ): Promise<PhotoMetadata | null> {
    try {
      await this.initializeExifr();

      // 檢查檔案是否支援 EXIF
      const ext = path.extname(filePath).toLowerCase();
      if (!this.SUPPORTED_FORMATS.includes(ext)) {
        console.log(`檔案格式 ${ext} 不支援 EXIF 提取`);
        return null;
      }

      // 建構完整檔案路徑
      const fullPath = path.resolve(process.cwd(), 'public', filePath);

      // 檢查檔案是否存在
      try {
        await fs.access(fullPath);
      } catch (error) {
        console.error(`EXIF 提取失敗，檔案不存在: ${fullPath}`);
        return null;
      }

      // 提取原始 EXIF 資料
      const rawExifData: RawExifData =
        await this.extractRawExifWithRetry(fullPath);

      if (!rawExifData || Object.keys(rawExifData).length === 0) {
        console.log('照片無 EXIF 資料');
        return {};
      }

      // 解析和格式化 EXIF 資料
      const photoMetadata: PhotoMetadata = {};

      // 提取相機和鏡頭資訊
      const cameraInfo = this.extractCameraInfo(rawExifData);
      if (cameraInfo && Object.keys(cameraInfo).length > 0) {
        photoMetadata.exif = cameraInfo;
      }

      // 提取日期時間
      const dateTime = this.formatDateTimeFromExif(rawExifData);
      if (dateTime && photoMetadata.exif) {
        photoMetadata.exif.dateTime = dateTime;
      }

      // 提取 GPS 座標
      const gpsCoordinates = this.parseGPSCoordinates(rawExifData);
      if (gpsCoordinates) {
        photoMetadata.gps = gpsCoordinates;
      }

      // 提取技術資訊
      const technicalInfo = this.extractTechnicalInfo(rawExifData);
      if (technicalInfo && Object.keys(technicalInfo).length > 0) {
        photoMetadata.technical = technicalInfo;
      }

      // 驗證和清理資料
      const cleanedMetadata = this.cleanExifData(photoMetadata);

      console.log(
        `✅ EXIF 資料提取成功: ${Object.keys(cleanedMetadata).length} 個主要欄位`
      );

      return cleanedMetadata;
    } catch (error) {
      console.error('EXIF 資料提取失敗:', error);
      throw new Error(
        `EXIF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 帶重試的原始 EXIF 資料提取
   */
  private static async extractRawExifWithRetry(
    filePath: string,
    attempt = 1
  ): Promise<RawExifData> {
    try {
      return await exifr.parse(filePath, {
        ifd0: true,
        exif: true,
        gps: true,
        interop: true,
        tiff: true,
        xmp: false, // 跳過 XMP 資料減少處理時間
        iptc: false, // 跳過 IPTC 資料
        jfif: false,
      });
    } catch (error) {
      if (attempt < this.RETRY_ATTEMPTS) {
        console.warn(`EXIF 提取重試 ${attempt}/${this.RETRY_ATTEMPTS}:`, error);
        await new Promise(resolve =>
          setTimeout(resolve, this.RETRY_DELAY * attempt)
        );
        return this.extractRawExifWithRetry(filePath, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 解析 GPS 座標
   * Requirements: 6.1, 6.2
   */
  static parseGPSCoordinates(rawData: RawExifData): GPSCoordinates | null {
    try {
      const {
        GPSLatitude,
        GPSLatitudeRef,
        GPSLongitude,
        GPSLongitudeRef,
        GPSAltitude,
        GPSAltitudeRef,
      } = rawData;

      if (!GPSLatitude || !GPSLongitude) {
        return null;
      }

      // 轉換度分秒到十進位度數
      const latitude = this.convertDMSToDecimal(GPSLatitude, GPSLatitudeRef);
      const longitude = this.convertDMSToDecimal(GPSLongitude, GPSLongitudeRef);

      if (latitude === null || longitude === null) {
        return null;
      }

      const coordinates: GPSCoordinates = {
        latitude: Math.round(latitude * 10000) / 10000, // 保留4位小數
        longitude: Math.round(longitude * 10000) / 10000,
      };

      // 處理高度
      if (typeof GPSAltitude === 'number') {
        let altitude = GPSAltitude;
        if (GPSAltitudeRef === 1) {
          altitude = -altitude; // 海平面以下
        }
        coordinates.altitude = Math.round(altitude * 10) / 10; // 保留1位小數
      }

      // 驗證座標範圍
      if (
        Math.abs(coordinates.latitude) > 90 ||
        Math.abs(coordinates.longitude) > 180
      ) {
        console.warn('GPS 座標超出有效範圍');
        return null;
      }

      return coordinates;
    } catch (error) {
      console.warn('GPS 座標解析失敗:', error);
      return null;
    }
  }

  /**
   * 轉換度分秒到十進位度數
   */
  private static convertDMSToDecimal(
    dms: number[],
    ref: string = 'N'
  ): number | null {
    if (!Array.isArray(dms) || dms.length < 2) {
      return null;
    }

    const [degrees, minutes, seconds = 0] = dms;
    if (typeof degrees !== 'number' || typeof minutes !== 'number') {
      return null;
    }

    let decimal = degrees + minutes / 60 + (seconds || 0) / 3600;

    // 根據參考方向調整正負號
    if (ref === 'S' || ref === 'W') {
      decimal = -decimal;
    }

    return decimal;
  }

  /**
   * 提取相機和鏡頭資訊
   * Requirements: 6.1, 6.2
   */
  static extractCameraInfo(rawData: RawExifData): CameraInfo {
    const cameraInfo: CameraInfo = {};

    // 相機品牌和型號
    if (rawData.Make && rawData.Model) {
      const make = this.sanitizeString(rawData.Make);
      const model = this.sanitizeString(rawData.Model);
      cameraInfo.camera = `${make} ${model}`.trim();
    }

    // 鏡頭資訊
    if (rawData.LensModel || rawData.LensMake) {
      const lensMake = rawData.LensMake
        ? this.sanitizeString(rawData.LensMake)
        : '';
      const lensModel = rawData.LensModel
        ? this.sanitizeString(rawData.LensModel)
        : '';
      cameraInfo.lens = `${lensMake} ${lensModel}`.trim();
    }

    // 拍攝設定
    const settings: Record<string, any> = {};

    if (typeof rawData.FNumber === 'number') {
      settings.aperture = `f/${rawData.FNumber.toFixed(1)}`;
    }

    if (typeof rawData.ExposureTime === 'number') {
      if (rawData.ExposureTime >= 1) {
        settings.shutterSpeed = `${rawData.ExposureTime}s`;
      } else {
        settings.shutterSpeed = `1/${Math.round(1 / rawData.ExposureTime)}`;
      }
    }

    if (typeof rawData.ISO === 'number') {
      settings.iso = rawData.ISO.toString();
    }

    if (typeof rawData.FocalLength === 'number') {
      settings.focalLength = `${rawData.FocalLength}mm`;
    }

    // 閃光燈狀態
    if (typeof rawData.Flash === 'number') {
      settings.flash = this.interpretFlashMode(rawData.Flash);
    }

    // 白平衡
    if (typeof rawData.WhiteBalance === 'number') {
      settings.whiteBalance = rawData.WhiteBalance === 0 ? 'Auto' : 'Manual';
    }

    if (Object.keys(settings).length > 0) {
      cameraInfo.settings = settings;
    }

    return cameraInfo;
  }

  /**
   * 解釋閃光燈模式
   */
  private static interpretFlashMode(flashValue: number): string {
    const flashModes: Record<number, string> = {
      0: 'No Flash',
      1: 'Flash',
      5: 'Flash, No Return',
      7: 'Flash, Return',
      9: 'Flash, Compulsory',
      13: 'Flash, Compulsory, No Return',
      15: 'Flash, Compulsory, Return',
      16: 'No Flash, Compulsory',
      24: 'No Flash, Auto',
      25: 'Flash, Auto',
      29: 'Flash, Auto, No Return',
      31: 'Flash, Auto, Return',
      32: 'No Flash Available',
    };

    return flashModes[flashValue] || `Flash Mode ${flashValue}`;
  }

  /**
   * 提取技術資訊
   */
  private static extractTechnicalInfo(
    rawData: RawExifData
  ): Record<string, any> {
    const technical: Record<string, any> = {};

    // 色彩空間
    if (typeof rawData.ColorSpace === 'number') {
      technical.colorSpace = rawData.ColorSpace === 1 ? 'sRGB' : 'Adobe RGB';
    }

    // 方向
    if (typeof rawData.Orientation === 'number') {
      technical.orientation = rawData.Orientation;
    }

    // 解析度
    if (rawData.XResolution && rawData.YResolution) {
      technical.resolution = {
        x: rawData.XResolution,
        y: rawData.YResolution,
        unit:
          rawData.ResolutionUnit === 2
            ? 'inches'
            : rawData.ResolutionUnit === 3
              ? 'cm'
              : 'unknown',
      };
    }

    return technical;
  }

  /**
   * 格式化日期時間
   * Requirements: 6.1, 6.2
   */
  static formatDateTimeFromExif(
    rawDataOrString: RawExifData | string
  ): string | null {
    try {
      let dateString: string | undefined;

      if (typeof rawDataOrString === 'string') {
        dateString = rawDataOrString;
      } else {
        // 優先順序: DateTimeOriginal > CreateDate > DateTime
        dateString =
          rawDataOrString.DateTimeOriginal ||
          rawDataOrString.CreateDate ||
          rawDataOrString.DateTime;
      }

      if (!dateString || typeof dateString !== 'string') {
        return null;
      }

      // 常見的 EXIF 日期格式: "YYYY:MM:DD HH:MM:SS"
      const exifDatePattern =
        /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
      const match = dateString.match(exifDatePattern);

      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;

        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
          return null;
        }

        return date.toISOString();
      }

      // 嘗試其他格式
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }

      return date.toISOString();
    } catch (error) {
      console.warn('日期時間格式化失敗:', error);
      return null;
    }
  }

  /**
   * 驗證 EXIF 資料
   * Requirements: 6.6
   */
  static validateExifData(metadata: PhotoMetadata): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 驗證 GPS 座標
    if (metadata.gps) {
      const { latitude, longitude, altitude } = metadata.gps;

      if (typeof latitude !== 'number' || Math.abs(latitude) > 90) {
        errors.push('Invalid GPS latitude');
      }

      if (typeof longitude !== 'number' || Math.abs(longitude) > 180) {
        errors.push('Invalid GPS longitude');
      }

      if (
        altitude !== undefined &&
        (typeof altitude !== 'number' || altitude < -11000 || altitude > 9000)
      ) {
        warnings.push('GPS altitude seems unusual');
      }
    }

    // 驗證日期時間
    if (metadata.exif?.dateTime) {
      const date = new Date(metadata.exif.dateTime);
      if (isNaN(date.getTime())) {
        errors.push('Invalid EXIF date time format');
      } else if (date.getTime() > Date.now()) {
        warnings.push('EXIF date time is in the future');
      }
    }

    // 驗證字串長度
    const checkStringLength = (obj: any, path = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (
          typeof value === 'string' &&
          value.length > this.MAX_STRING_LENGTH
        ) {
          warnings.push(`String too long at ${currentPath}`);
        } else if (typeof value === 'object' && value !== null) {
          checkStringLength(value, currentPath);
        }
      }
    };

    checkStringLength(metadata);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 清理和消毒 EXIF 資料
   * Requirements: 6.6
   */
  static cleanExifData(metadata: PhotoMetadata): PhotoMetadata {
    const cleaned = JSON.parse(JSON.stringify(metadata));

    const cleanObject = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return undefined;
      }

      if (Array.isArray(obj)) {
        return obj.map(cleanObject).filter(item => item !== undefined);
      }

      if (typeof obj === 'object') {
        const cleanedObj: any = {};

        for (const [key, value] of Object.entries(obj)) {
          const cleanedKey = this.sanitizeString(key);
          const cleanedValue = cleanObject(value);

          if (cleanedValue !== undefined && cleanedKey) {
            cleanedObj[cleanedKey] = cleanedValue;
          }
        }

        return Object.keys(cleanedObj).length > 0 ? cleanedObj : undefined;
      }

      if (typeof obj === 'string') {
        const sanitized = this.sanitizeString(obj);
        return sanitized.length > 0 ? sanitized : undefined;
      }

      if (typeof obj === 'number') {
        return isNaN(obj) || !isFinite(obj) ? undefined : obj;
      }

      if (typeof obj === 'boolean') {
        return obj;
      }

      return undefined;
    };

    return cleanObject(cleaned) || {};
  }

  /**
   * 清理和截斷字串
   */
  private static sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }

    return str
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除腳本標籤
      .substring(0, this.MAX_STRING_LENGTH);
  }

  /**
   * 取得支援的檔案格式
   */
  static getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }

  /**
   * 檢查檔案是否支援 EXIF 提取
   */
  static isFileSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.SUPPORTED_FORMATS.includes(ext);
  }
}
