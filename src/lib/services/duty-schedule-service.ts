import { DutyScheduleRepository } from '../repositories/duty-schedule-repository';
import { VendorRepository } from '../repositories/vendor-repository';
import { ProjectRepository } from '../repositories/project-repository';
import {
  DutySchedule,
  ShiftType,
  DutyStatus,
  UrgencyLevel,
} from '../types/database';

export interface CreateScheduleData {
  projectId: string;
  personId: string;
  dutyDate: Date;
  shiftType: ShiftType;
  workArea?: string;
  urgencyLevel: UrgencyLevel;
  notes?: string;
}

export interface UpdateScheduleData {
  dutyDate?: Date;
  shiftType?: ShiftType;
  workArea?: string;
  status?: DutyStatus;
  urgencyLevel?: UrgencyLevel;
  notes?: string;
}

export interface ScheduleConflict {
  conflictType: 'same_person' | 'same_shift' | 'overlapping_time';
  conflictingSchedule: DutySchedule;
  severity: 'warning' | 'error';
  message: string;
}

export class DutyScheduleService {
  private scheduleRepository: DutyScheduleRepository;
  private vendorRepository: VendorRepository;
  private projectRepository: ProjectRepository;

  constructor() {
    this.scheduleRepository = new DutyScheduleRepository();
    this.vendorRepository = new VendorRepository();
    this.projectRepository = new ProjectRepository();
  }

  // 創建排班
  async createSchedule(
    scheduleData: CreateScheduleData,
    createdBy: string
  ): Promise<DutySchedule> {
    // 驗證專案存在
    const project = await this.projectRepository.findById(
      scheduleData.projectId
    );
    if (!project) {
      throw new Error('指定的專案不存在');
    }

    // 驗證人員存在 (這裡需要實作 DutyPersonRepository)
    // const person = await this.personRepository.findById(scheduleData.personId);
    // if (!person) {
    //   throw new Error('指定的值班人員不存在');
    // }

    // 檢查排班衝突
    await this.validateScheduleConflicts(scheduleData);

    // 驗證日期不能是過去
    if (scheduleData.dutyDate < new Date()) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (scheduleData.dutyDate < today) {
        throw new Error('不能為過去的日期排班');
      }
    }

    // 創建排班記錄
    const schedule = await this.scheduleRepository.create({
      project_id: scheduleData.projectId,
      person_id: scheduleData.personId,
      duty_date: scheduleData.dutyDate,
      shift_type: scheduleData.shiftType,
      work_area: scheduleData.workArea,
      status: '已排班',
      urgency_level: scheduleData.urgencyLevel,
      notes: scheduleData.notes,
      created_by: createdBy,
    });

    return schedule;
  }

  // 更新排班
  async updateSchedule(
    scheduleId: string,
    updateData: UpdateScheduleData,
    updatedBy: string
  ): Promise<DutySchedule | null> {
    // 檢查排班存在
    const existingSchedule = await this.scheduleRepository.findById(scheduleId);
    if (!existingSchedule) {
      throw new Error('排班記錄不存在');
    }

    // 檢查是否可以修改
    if (existingSchedule.status === '已完成') {
      throw new Error('已完成的排班無法修改');
    }

    // 如果修改日期或班別，需要重新檢查衝突
    if (updateData.dutyDate || updateData.shiftType) {
      const conflictData: CreateScheduleData = {
        projectId: existingSchedule.project_id,
        personId: existingSchedule.person_id,
        dutyDate: updateData.dutyDate || existingSchedule.duty_date,
        shiftType: updateData.shiftType || existingSchedule.shift_type,
        workArea: updateData.workArea || existingSchedule.work_area,
        urgencyLevel: updateData.urgencyLevel || existingSchedule.urgency_level,
      };

      await this.validateScheduleConflicts(conflictData, scheduleId);
    }

    // 更新排班記錄
    const updatedSchedule = await this.scheduleRepository.update(
      scheduleId,
      updateData
    );

    return updatedSchedule;
  }

  // 刪除排班
  async deleteSchedule(scheduleId: string, deletedBy: string): Promise<void> {
    // 檢查排班存在
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error('排班記錄不存在');
    }

    // 檢查是否可以刪除
    if (schedule.status === '值班中') {
      throw new Error('正在值班的記錄無法刪除');
    }

    if (schedule.status === '已完成') {
      throw new Error('已完成的排班無法刪除');
    }

    // 軟刪除排班記錄
    await this.scheduleRepository.delete(scheduleId);
  }

  // 簽到
  async checkIn(scheduleId: string, checkInTime?: Date): Promise<void> {
    // 檢查排班存在
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error('排班記錄不存在');
    }

    // 檢查排班狀態
    if (schedule.status !== '已排班') {
      throw new Error('只有已排班的記錄可以簽到');
    }

    // 檢查日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dutyDate = new Date(schedule.duty_date);
    dutyDate.setHours(0, 0, 0, 0);

    if (dutyDate.getTime() !== today.getTime()) {
      throw new Error('只能在值班日期當天簽到');
    }

    // 執行簽到
    await this.scheduleRepository.checkIn(scheduleId, checkInTime);
  }

  // 簽退
  async checkOut(scheduleId: string, checkOutTime?: Date): Promise<void> {
    // 檢查排班存在
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error('排班記錄不存在');
    }

    // 檢查排班狀態
    if (schedule.status !== '值班中') {
      throw new Error('只有正在值班的記錄可以簽退');
    }

    // 檢查是否已簽到
    if (!schedule.check_in_time) {
      throw new Error('尚未簽到，無法簽退');
    }

    // 執行簽退
    await this.scheduleRepository.checkOut(scheduleId, checkOutTime);
  }

  // 請假
  async requestLeave(
    scheduleId: string,
    reason: string,
    requestedBy: string
  ): Promise<void> {
    // 檢查排班存在
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error('排班記錄不存在');
    }

    // 檢查排班狀態
    if (schedule.status === '已完成') {
      throw new Error('已完成的排班無法請假');
    }

    if (schedule.status === '值班中') {
      throw new Error('正在值班無法請假');
    }

    // 更新狀態為請假
    await this.scheduleRepository.updateStatus(scheduleId, '請假', requestedBy);

    // 更新備註
    const updatedNotes = schedule.notes
      ? `${schedule.notes}\n請假原因: ${reason}`
      : `請假原因: ${reason}`;

    await this.scheduleRepository.update(scheduleId, {
      notes: updatedNotes,
    });
  }

  // 設定代班人員
  async setReplacement(
    scheduleId: string,
    replacementPersonId: string,
    reason: string,
    updatedBy: string
  ): Promise<void> {
    // 檢查排班存在
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error('排班記錄不存在');
    }

    // 檢查代班人員不能是原值班人員
    if (replacementPersonId === schedule.person_id) {
      throw new Error('代班人員不能是原值班人員');
    }

    // 檢查代班人員在同一時段是否有其他排班
    const conflicts = await this.scheduleRepository.checkScheduleConflict(
      replacementPersonId,
      schedule.duty_date,
      schedule.shift_type
    );

    if (conflicts.length > 0) {
      throw new Error('代班人員在該時段已有其他值班安排');
    }

    // 設定代班
    await this.scheduleRepository.setReplacement(
      scheduleId,
      replacementPersonId,
      reason,
      updatedBy
    );
  }

  // 批准排班
  async approveSchedule(scheduleId: string, approvedBy: string): Promise<void> {
    // 檢查排班存在
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error('排班記錄不存在');
    }

    // 檢查是否已經批准
    if (schedule.approved_by) {
      throw new Error('排班已經被批准');
    }

    // 批准排班
    await this.scheduleRepository.approveSchedule(scheduleId, approvedBy);
  }

  // 取消排班
  async cancelSchedule(
    scheduleId: string,
    reason: string,
    cancelledBy: string
  ): Promise<void> {
    // 檢查排班存在
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error('排班記錄不存在');
    }

    // 檢查排班狀態
    if (schedule.status === '已完成') {
      throw new Error('已完成的排班無法取消');
    }

    if (schedule.status === '值班中') {
      throw new Error('正在值班的記錄無法取消');
    }

    // 更新狀態為取消
    await this.scheduleRepository.updateStatus(scheduleId, '取消', cancelledBy);

    // 更新備註
    const updatedNotes = schedule.notes
      ? `${schedule.notes}\n取消原因: ${reason}`
      : `取消原因: ${reason}`;

    await this.scheduleRepository.update(scheduleId, {
      notes: updatedNotes,
    });
  }

  // 獲取當前值班人員
  async getCurrentDutyPersonnel(projectId?: string): Promise<DutySchedule[]> {
    return this.scheduleRepository.findCurrentDuty(projectId);
  }

  // 獲取需要代班的記錄
  async getReplacementNeeded(projectId?: string): Promise<DutySchedule[]> {
    return this.scheduleRepository.findReplacementNeeded(projectId);
  }

  // 獲取緊急排班
  async getUrgentSchedules(projectId?: string): Promise<DutySchedule[]> {
    return this.scheduleRepository.findUrgentSchedules(projectId);
  }

  // 獲取排班統計
  async getScheduleStatistics(
    projectId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    return this.scheduleRepository.getScheduleStats(
      projectId,
      dateFrom,
      dateTo
    );
  }

  // 批量創建排班 (排班模板)
  async createBatchSchedules(
    scheduleTemplate: CreateScheduleData[],
    createdBy: string
  ): Promise<DutySchedule[]> {
    const results: DutySchedule[] = [];
    const errors: string[] = [];

    for (let i = 0; i < scheduleTemplate.length; i++) {
      try {
        const schedule = await this.createSchedule(
          scheduleTemplate[i],
          createdBy
        );
        results.push(schedule);
      } catch (error) {
        errors.push(`排班 ${i + 1}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`部分排班創建失敗:\n${errors.join('\n')}`);
    }

    return results;
  }

  // 私有方法：驗證排班衝突
  private async validateScheduleConflicts(
    scheduleData: CreateScheduleData,
    excludeScheduleId?: string
  ): Promise<void> {
    // 檢查同一人員同一時段的衝突
    const conflicts = await this.scheduleRepository.checkScheduleConflict(
      scheduleData.personId,
      scheduleData.dutyDate,
      scheduleData.shiftType,
      excludeScheduleId
    );

    if (conflicts.length > 0) {
      throw new Error('該人員在指定時段已有其他值班安排');
    }

    // 可以添加更多衝突檢查邏輯
    // 例如：檢查同一工作區域是否已有足夠人員
    // 檢查人員技能是否符合要求等
  }

  // 生成排班報表
  async generateScheduleReport(
    projectId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    summary: any;
    schedules: DutySchedule[];
    analysis: {
      mostActiveShift: ShiftType;
      mostCommonStatus: DutyStatus;
      averageWorkHours: number;
      replacementRate: number;
    };
  }> {
    // 獲取統計數據
    const summary = await this.getScheduleStatistics(
      projectId,
      dateFrom,
      dateTo
    );

    // 獲取詳細排班記錄
    const schedules = await this.scheduleRepository.findByDateRange(
      dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo || new Date(),
      projectId
    );

    // 分析數據
    const analysis = this.analyzeScheduleData(schedules, summary);

    return {
      summary,
      schedules,
      analysis,
    };
  }

  // 私有方法：分析排班數據
  private analyzeScheduleData(schedules: DutySchedule[], summary: any): any {
    // 找出最活躍的班別
    const shiftCounts = Object.entries(
      summary.schedulesByShift as Record<ShiftType, number>
    );
    const mostActiveShift = shiftCounts.reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0] as ShiftType;

    // 找出最常見的狀態
    const statusCounts = Object.entries(
      summary.schedulesByStatus as Record<DutyStatus, number>
    );
    const mostCommonStatus = statusCounts.reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0] as DutyStatus;

    // 計算代班率
    const totalSchedules = summary.totalSchedules;
    const replacementSchedules = schedules.filter(
      s => s.replacement_person_id
    ).length;
    const replacementRate =
      totalSchedules > 0 ? (replacementSchedules / totalSchedules) * 100 : 0;

    return {
      mostActiveShift,
      mostCommonStatus,
      averageWorkHours: summary.averageWorkHours,
      replacementRate: parseFloat(replacementRate.toFixed(2)),
    };
  }
}
