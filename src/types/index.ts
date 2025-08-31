/**
 * PCM (Project Management System) Type Definitions
 * 
 * This module serves as the main entry point for all TypeScript type definitions
 * used throughout the PCM application.
 * 
 * @module Types
 * @version 1.0
 * @date 2025-08-29
 */

// Re-export all project-related types
export * from './project'

// Export type utilities for easier importing
export type {
  // Core interfaces
  Project,
  ProjectMember,
  ProjectPermission,
  
  // Enum types
  ProjectStatus,
  ProjectType,
  ViewMode,
  PermissionLevel,
  
  // Utility interfaces
  ProjectFilters,
  ProjectSort,
  ProjectPagination,
  ProjectStatistics,
  ProjectDashboard,
  
  // API response types
  ApiResponse,
  ProjectListResponse,
  ProjectResponse,
  
  // Component props
  ProjectCardProps,
  ProjectListProps,
  
  // Form types
  ProjectFormData,
  ProjectFormErrors,
  
} from './project'