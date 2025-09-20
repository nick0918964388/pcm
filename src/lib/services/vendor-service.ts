import { VendorRepository } from '../repositories/vendor-repository';
import { Vendor, VendorType, VendorStatus } from '../types/database';
import {
  CreateVendorInput,
  UpdateVendorInput,
  QueryVendorInput,
  UpdateRatingInput,
  UpdateStatusInput,
  RenewContractInput
} from '../validations/vendor-schemas';

export class VendorService {
  private vendorRepo: VendorRepository;

  constructor() {
    this.vendorRepo = new VendorRepository();
  }

  /**
   * 建立新廠商
   */
  async createVendor(data: CreateVendorInput): Promise<Vendor> {
    // 檢查廠商名稱是否重複
    const nameExists = await this.vendorRepo.isNameExists(data.name);
    if (nameExists) {
      throw new Error('廠商名稱已存在');
    }

    // 檢查電子郵件是否重複
    const emailExists = await this.vendorRepo.isEmailExists(data.email);
    if (emailExists) {
      throw new Error('電子郵件已被使用');
    }

    // 建立廠商
    return await this.vendorRepo.create(data);
  }

  /**
   * 取得廠商列表
   */
  async getVendors(query: QueryVendorInput) {
    const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'desc', ...filters } = query;

    const options = {
      limit,
      offset: (page - 1) * limit,
      sort: [{ field: sortBy, order: sortOrder }],
      filters,
      search: search ? {
        fields: ['v.code', 'v.name', 'v.short_name', 'v.phone', 'v.email', 'vc.name', 'vc.phone', 'vc.email', 'vc.mvpn'],
        query: search
      } : undefined
    };

    const result = await this.vendorRepo.findAll(options);

    return {
      data: result.data,
      pagination: {
        page,
        pageSize: limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * 取得單一廠商詳情
   */
  async getVendorById(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepo.findById(id);
    if (!vendor) {
      throw new Error('找不到指定的廠商');
    }
    return vendor;
  }

  /**
   * 更新廠商資料
   */
  async updateVendor(id: string, data: UpdateVendorInput): Promise<Vendor> {
    // 檢查廠商是否存在
    const vendor = await this.vendorRepo.findById(id);
    if (!vendor) {
      throw new Error('找不到指定的廠商');
    }

    // 如果更新名稱，檢查是否重複
    if (data.name && data.name !== vendor.name) {
      const nameExists = await this.vendorRepo.isNameExists(data.name, id);
      if (nameExists) {
        throw new Error('廠商名稱已存在');
      }
    }

    // 如果更新電子郵件，檢查是否重複
    if (data.email && data.email !== vendor.email) {
      const emailExists = await this.vendorRepo.isEmailExists(data.email, id);
      if (emailExists) {
        throw new Error('電子郵件已被使用');
      }
    }

    // 更新廠商
    return await this.vendorRepo.update(id, data);
  }

  /**
   * 刪除廠商（軟刪除）
   */
  async deleteVendor(id: string): Promise<void> {
    // 檢查廠商是否存在
    const vendor = await this.vendorRepo.findById(id);
    if (!vendor) {
      throw new Error('找不到指定的廠商');
    }

    // 檢查是否有關聯的排班
    const scheduleStats = await this.vendorRepo.getVendorScheduleStats(id);
    if (scheduleStats.ongoingSchedules > 0) {
      throw new Error('無法刪除：廠商有進行中的排班');
    }

    // 執行軟刪除
    await this.vendorRepo.softDelete(id);
  }

  /**
   * 更新廠商評分
   */
  async updateVendorRating(id: string, data: UpdateRatingInput): Promise<void> {
    // 檢查廠商是否存在
    const vendor = await this.vendorRepo.findById(id);
    if (!vendor) {
      throw new Error('找不到指定的廠商');
    }

    await this.vendorRepo.updateRating(id, data.rating);
  }

  /**
   * 更新廠商狀態
   */
  async updateVendorStatus(id: string, data: UpdateStatusInput): Promise<void> {
    // 檢查廠商是否存在
    const vendor = await this.vendorRepo.findById(id);
    if (!vendor) {
      throw new Error('找不到指定的廠商');
    }

    // 如果要暫停或加入黑名單，檢查是否有進行中的排班
    if (data.status === 'suspended' || data.status === 'blacklisted') {
      const scheduleStats = await this.vendorRepo.getVendorScheduleStats(id);
      if (scheduleStats.ongoingSchedules > 0) {
        throw new Error(`無法變更狀態為 ${data.status}：廠商有進行中的排班`);
      }
    }

    await this.vendorRepo.updateStatus(id, data.status);
  }

  /**
   * 續約
   */
  async renewVendorContract(id: string, data: RenewContractInput): Promise<void> {
    // 檢查廠商是否存在
    const vendor = await this.vendorRepo.findById(id);
    if (!vendor) {
      throw new Error('找不到指定的廠商');
    }

    // 檢查新的結束日期是否合理
    const newEndDate = new Date(data.contract_end);
    const currentDate = new Date();
    
    if (newEndDate <= currentDate) {
      throw new Error('新的合約結束日期必須晚於今天');
    }

    await this.vendorRepo.renewContract(id, newEndDate);
  }

  /**
   * 取得廠商統計資料
   */
  async getVendorStats() {
    return await this.vendorRepo.getVendorStats();
  }

  /**
   * 取得特定類型的廠商
   */
  async getVendorsByType(type: VendorType) {
    return await this.vendorRepo.findByType(type);
  }

  /**
   * 取得特定狀態的廠商
   */
  async getVendorsByStatus(status: VendorStatus) {
    return await this.vendorRepo.findByStatus(status);
  }

  /**
   * 取得活躍廠商
   */
  async getActiveVendors() {
    return await this.vendorRepo.findActiveVendors();
  }

  /**
   * 取得即將到期的合約
   */
  async getExpiringContracts(days = 30) {
    return await this.vendorRepo.findExpiringContracts(days);
  }

  /**
   * 取得已過期的合約
   */
  async getExpiredContracts() {
    return await this.vendorRepo.findExpiredContracts();
  }

  /**
   * 取得評分範圍內的廠商
   */
  async getVendorsByRatingRange(minRating: number, maxRating: number) {
    if (minRating < 1 || minRating > 5 || maxRating < 1 || maxRating > 5) {
      throw new Error('評分必須在 1-5 之間');
    }
    
    if (minRating > maxRating) {
      throw new Error('最小評分不能大於最大評分');
    }

    return await this.vendorRepo.findByRatingRange(minRating, maxRating);
  }

  /**
   * 取得廠商的人員數量
   */
  async getVendorPersonCount(id: string): Promise<number> {
    // 檢查廠商是否存在
    const vendor = await this.vendorRepo.findById(id);
    if (!vendor) {
      throw new Error('找不到指定的廠商');
    }

    return await this.vendorRepo.getVendorPersonCount(id);
  }

  /**
   * 取得廠商的排班統計
   */
  async getVendorScheduleStats(id: string, dateFrom?: Date, dateTo?: Date) {
    // 檢查廠商是否存在
    const vendor = await this.vendorRepo.findById(id);
    if (!vendor) {
      throw new Error('找不到指定的廠商');
    }

    return await this.vendorRepo.getVendorScheduleStats(id, dateFrom, dateTo);
  }

  /**
   * 批次更新廠商狀態
   */
  async batchUpdateStatus(vendorIds: string[], status: VendorStatus): Promise<void> {
    for (const id of vendorIds) {
      await this.updateVendorStatus(id, { status });
    }
  }

  /**
   * 匯出廠商資料
   */
  async exportVendors(format: 'json' | 'csv' = 'json') {
    const vendors = await this.vendorRepo.findAll({ limit: 10000 });
    
    if (format === 'json') {
      return vendors.data;
    }
    
    // CSV 格式
    const headers = ['ID', '名稱', '類型', '狀態', '聯絡人', '電話', '電子郵件', '地址', '合約開始', '合約結束', '評分'];
    const rows = vendors.data.map(v => [
      v.id,
      v.name,
      v.type,
      v.status,
      v.contact_person,
      v.phone,
      v.email,
      v.address || '',
      v.contract_start?.toString() || '',
      v.contract_end?.toString() || '',
      v.rating?.toString() || ''
    ]);
    
    return [headers, ...rows];
  }
}

// 建立單例實例
export const vendorService = new VendorService();