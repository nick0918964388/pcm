import { ProjectRepository } from '../repositories/project-repository';
import { WBSRepository } from '../repositories/wbs-repository';
import { UserRepository } from '../repositories/user-repository';
import { Project, WBSItem, ProjectStatus, WBSStatus } from '../types/database';

export interface CreateProjectData {
  name: string;
  description?: string;
  type: string;
  priority: number;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  managerId: string;
  clientInfo?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: number;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  managerId?: string;
  clientInfo?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CreateWBSData {
  projectId: string;
  parentId?: string;
  wbsCode: string;
  name: string;
  description?: string;
  priority: string;
  assignedTo?: string;
  estimatedHours?: number;
  startDate?: Date;
  endDate?: Date;
  dependencies?: string[];
}

export interface ProjectMemberData {
  userId: string;
  role: string;
  permissions: string[];
}

export class ProjectService {
  private projectRepository: ProjectRepository;
  private wbsRepository: WBSRepository;
  private userRepository: UserRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.wbsRepository = new WBSRepository();
    this.userRepository = new UserRepository();
  }

  // 創建專案
  async createProject(projectData: CreateProjectData, createdBy: string): Promise<Project> {
    // 驗證專案經理存在
    const manager = await this.userRepository.findById(projectData.managerId);
    if (!manager) {
      throw new Error('指定的專案經理不存在');
    }

    // 驗證日期邏輯
    if (projectData.startDate && projectData.endDate && 
        projectData.startDate > projectData.endDate) {
      throw new Error('開始日期不能晚於結束日期');
    }

    // 生成專案 ID (格式: PROJ-YYYYMM-XXX)
    const projectId = await this.generateProjectId();

    // 創建專案
    const project = await this.projectRepository.create({
      id: projectId,
      name: projectData.name,
      description: projectData.description,
      type: projectData.type as any,
      priority: projectData.priority,
      start_date: projectData.startDate,
      end_date: projectData.endDate,
      budget: projectData.budget || 0,
      progress: 0,
      manager_id: projectData.managerId,
      client_info: projectData.clientInfo,
      metadata: projectData.metadata,
      status: 'planning'
    });

    // 自動創建根節點 WBS
    await this.createRootWBS(project.id, project.name);

    return project;
  }

  // 更新專案
  async updateProject(projectId: string, updateData: UpdateProjectData, updatedBy: string): Promise<Project | null> {
    // 檢查專案存在
    const existingProject = await this.projectRepository.findById(projectId);
    if (!existingProject) {
      throw new Error('專案不存在');
    }

    // 驗證專案經理存在
    if (updateData.managerId) {
      const manager = await this.userRepository.findById(updateData.managerId);
      if (!manager) {
        throw new Error('指定的專案經理不存在');
      }
    }

    // 驗證日期邏輯
    const startDate = updateData.startDate || existingProject.start_date;
    const endDate = updateData.endDate || existingProject.end_date;
    if (startDate && endDate && startDate > endDate) {
      throw new Error('開始日期不能晚於結束日期');
    }

    // 更新專案
    const updatedProject = await this.projectRepository.update(projectId, {
      name: updateData.name,
      description: updateData.description,
      status: updateData.status,
      priority: updateData.priority,
      start_date: updateData.startDate,
      end_date: updateData.endDate,
      budget: updateData.budget,
      manager_id: updateData.managerId,
      client_info: updateData.clientInfo,
      metadata: updateData.metadata
    });

    // 如果狀態變更為完成，自動更新進度為 100%
    if (updateData.status === 'completed') {
      await this.projectRepository.updateProgress(projectId, 100);
    }

    return updatedProject;
  }

  // 刪除專案
  async deleteProject(projectId: string, deletedBy: string): Promise<void> {
    // 檢查專案存在
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('專案不存在');
    }

    // 檢查專案狀態是否允許刪除
    if (project.status === 'active') {
      throw new Error('進行中的專案無法刪除');
    }

    // 軟刪除專案 (同時會刪除相關的 WBS 項目)
    await this.projectRepository.delete(projectId);

    // 記錄刪除操作
    console.log(`Project ${projectId} deleted by ${deletedBy}`);
  }

  // 獲取專案詳情
  async getProjectById(projectId: string): Promise<Project | null> {
    return this.projectRepository.findById(projectId);
  }

  // 獲取用戶的專案列表
  async getUserProjects(userId: string, options: any = {}): Promise<Project[]> {
    return this.projectRepository.findUserProjects(userId, options);
  }

  // 更新專案進度
  async updateProjectProgress(projectId: string): Promise<void> {
    // 從 WBS 計算專案進度
    const progress = await this.wbsRepository.calculateProjectProgress(projectId);
    await this.projectRepository.updateProgress(projectId, progress);
  }

  // 複製專案
  async duplicateProject(
    sourceProjectId: string, 
    newProjectData: Partial<CreateProjectData>,
    createdBy: string
  ): Promise<Project> {
    // 檢查來源專案存在
    const sourceProject = await this.projectRepository.findById(sourceProjectId);
    if (!sourceProject) {
      throw new Error('來源專案不存在');
    }

    // 生成新專案 ID
    const newProjectId = await this.generateProjectId();

    // 複製專案
    const newProject = await this.projectRepository.duplicateProject(sourceProjectId, {
      ...newProjectData,
      id: newProjectId
    });

    // 複製 WBS 結構
    await this.duplicateWBSStructure(sourceProjectId, newProject.id);

    return newProject;
  }

  // 創建 WBS 項目
  async createWBSItem(wbsData: CreateWBSData, createdBy: string): Promise<WBSItem> {
    // 檢查專案存在
    const project = await this.projectRepository.findById(wbsData.projectId);
    if (!project) {
      throw new Error('專案不存在');
    }

    // 檢查 WBS 代碼是否重複
    if (await this.wbsRepository.isWBSCodeExists(wbsData.projectId, wbsData.wbsCode)) {
      throw new Error('WBS 代碼已存在');
    }

    // 檢查父節點存在
    let level = 1;
    if (wbsData.parentId) {
      const parent = await this.wbsRepository.findById(wbsData.parentId);
      if (!parent) {
        throw new Error('父節點不存在');
      }
      level = parent.level + 1;
    }

    // 檢查指派人員存在
    if (wbsData.assignedTo) {
      const assignee = await this.userRepository.findById(wbsData.assignedTo);
      if (!assignee) {
        throw new Error('指派的人員不存在');
      }
    }

    // 創建 WBS 項目
    const wbsItem = await this.wbsRepository.create({
      project_id: wbsData.projectId,
      parent_id: wbsData.parentId,
      wbs_code: wbsData.wbsCode,
      name: wbsData.name,
      description: wbsData.description,
      level,
      status: 'not_started',
      priority: wbsData.priority as any,
      assigned_to: wbsData.assignedTo,
      estimated_hours: wbsData.estimatedHours || 0,
      actual_hours: 0,
      start_date: wbsData.startDate,
      end_date: wbsData.endDate,
      completion_percentage: 0,
      dependencies: wbsData.dependencies || [],
    });

    return wbsItem;
  }

  // 更新 WBS 項目
  async updateWBSItem(wbsId: string, updateData: Partial<WBSItem>, updatedBy: string): Promise<WBSItem | null> {
    // 檢查 WBS 項目存在
    const existingWBS = await this.wbsRepository.findById(wbsId);
    if (!existingWBS) {
      throw new Error('WBS 項目不存在');
    }

    // 檢查 WBS 代碼重複 (如果有修改)
    if (updateData.wbs_code && updateData.wbs_code !== existingWBS.wbs_code) {
      if (await this.wbsRepository.isWBSCodeExists(existingWBS.project_id, updateData.wbs_code, wbsId)) {
        throw new Error('WBS 代碼已存在');
      }
    }

    // 檢查指派人員存在
    if (updateData.assigned_to) {
      const assignee = await this.userRepository.findById(updateData.assigned_to);
      if (!assignee) {
        throw new Error('指派的人員不存在');
      }
    }

    // 更新 WBS 項目
    const updatedWBS = await this.wbsRepository.update(wbsId, updateData);

    // 如果完成度變更，重新計算專案進度
    if (updateData.completion_percentage !== undefined) {
      await this.updateProjectProgress(existingWBS.project_id);
    }

    // 如果狀態變更為完成，自動設置完成度為 100%
    if (updateData.status === 'completed') {
      await this.wbsRepository.updateCompletion(wbsId, 100);
      await this.updateProjectProgress(existingWBS.project_id);
    }

    return updatedWBS;
  }

  // 刪除 WBS 項目
  async deleteWBSItem(wbsId: string, deletedBy: string): Promise<void> {
    // 檢查 WBS 項目存在
    const wbsItem = await this.wbsRepository.findById(wbsId);
    if (!wbsItem) {
      throw new Error('WBS 項目不存在');
    }

    // 檢查是否有子項目
    const children = await this.wbsRepository.findByParentId(wbsId);
    if (children.length > 0) {
      throw new Error('有子項目的 WBS 項目無法刪除，請先刪除所有子項目');
    }

    // 刪除 WBS 項目
    await this.wbsRepository.delete(wbsId);

    // 重新計算專案進度
    await this.updateProjectProgress(wbsItem.project_id);
  }

  // 獲取專案的 WBS 樹狀結構
  async getProjectWBSTree(projectId: string): Promise<WBSItem[]> {
    return this.wbsRepository.getWBSTree(projectId);
  }

  // 移動 WBS 項目
  async moveWBSItem(wbsId: string, newParentId?: string, movedBy?: string): Promise<void> {
    // 檢查 WBS 項目存在
    const wbsItem = await this.wbsRepository.findById(wbsId);
    if (!wbsItem) {
      throw new Error('WBS 項目不存在');
    }

    // 檢查新父節點存在 (如果有指定)
    if (newParentId) {
      const newParent = await this.wbsRepository.findById(newParentId);
      if (!newParent) {
        throw new Error('新父節點不存在');
      }

      // 檢查新父節點與目標項目是否在同一專案
      if (newParent.project_id !== wbsItem.project_id) {
        throw new Error('無法移動到不同專案的節點下');
      }

      // 檢查是否會形成循環引用
      if (await this.wouldCreateCircularReference(wbsId, newParentId)) {
        throw new Error('無法移動，會形成循環引用');
      }
    }

    // 執行移動
    await this.wbsRepository.moveItem(wbsId, newParentId);
  }

  // 獲取專案統計
  async getProjectStatistics(projectId: string): Promise<{
    wbsStats: any;
    overallProgress: number;
    completedTasks: number;
    totalTasks: number;
    overdueItems: number;
  }> {
    const wbsStats = await this.wbsRepository.getWBSStats(projectId);
    const overallProgress = await this.wbsRepository.calculateProjectProgress(projectId);
    const overdueItems = await this.wbsRepository.findOverdueTasks(projectId);

    return {
      wbsStats,
      overallProgress,
      completedTasks: wbsStats.completedItems,
      totalTasks: wbsStats.totalItems,
      overdueItems: overdueItems.length
    };
  }

  // 私有方法：生成專案 ID
  private async generateProjectId(): Promise<string> {
    const now = new Date();
    const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
    
    // 查找當月最新的專案編號
    const pattern = `PROJ-${yearMonth}-%`;
    const query = `
      SELECT id FROM projects 
      WHERE id LIKE $1 
      ORDER BY id DESC 
      LIMIT 1
    `;
    
    const result = await this.projectRepository.customQueryOne(query, [pattern]);
    
    let nextNumber = 1;
    if (result) {
      const lastNumber = parseInt(result.id.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `PROJ-${yearMonth}-${nextNumber.toString().padStart(3, '0')}`;
  }

  // 私有方法：創建根節點 WBS
  private async createRootWBS(projectId: string, projectName: string): Promise<void> {
    await this.wbsRepository.create({
      project_id: projectId,
      parent_id: undefined,
      wbs_code: '1',
      name: projectName,
      description: `${projectName} 主項目`,
      level: 1,
      status: 'not_started',
      priority: 'medium',
      estimated_hours: 0,
      actual_hours: 0,
      completion_percentage: 0,
      dependencies: [],
    });
  }

  // 私有方法：複製 WBS 結構
  private async duplicateWBSStructure(sourceProjectId: string, targetProjectId: string): Promise<void> {
    const sourceWBSItems = await this.wbsRepository.findByProjectId(sourceProjectId);
    const wbsMapping = new Map<string, string>(); // 舊 ID -> 新 ID 映射

    // 按層級排序，確保父節點先被創建
    sourceWBSItems.sort((a, b) => a.level - b.level);

    for (const sourceWBS of sourceWBSItems) {
      // 跳過根節點 (已在 createProject 中創建)
      if (sourceWBS.level === 1) {
        const rootWBS = await this.wbsRepository.findRootItems(targetProjectId);
        if (rootWBS.length > 0) {
          wbsMapping.set(sourceWBS.id, rootWBS[0].id);
        }
        continue;
      }

      // 找到新的父節點 ID
      const newParentId = sourceWBS.parent_id ? wbsMapping.get(sourceWBS.parent_id) : undefined;

      // 創建新的 WBS 項目
      const { id, project_id, parent_id, created_at, updated_at, ...wbsData } = sourceWBS;
      const newWBS = await this.wbsRepository.create({
        ...wbsData,
        project_id: targetProjectId,
        parent_id: newParentId,
        status: 'not_started',
        completion_percentage: 0,
        actual_hours: 0,
      });

      wbsMapping.set(sourceWBS.id, newWBS.id);
    }
  }

  // 私有方法：檢查是否會形成循環引用
  private async wouldCreateCircularReference(itemId: string, newParentId: string): Promise<boolean> {
    let currentParent = newParentId;
    
    while (currentParent) {
      if (currentParent === itemId) {
        return true; // 發現循環
      }
      
      const parent = await this.wbsRepository.findById(currentParent);
      currentParent = parent?.parent_id;
    }
    
    return false;
  }
}