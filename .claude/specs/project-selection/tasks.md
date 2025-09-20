# Implementation Plan

## Task Overview
專案選擇功能的實作將建立一個統一的專案導航入口，重用現有的 StatCard、DataTable、DashboardLayout 等元件，採用 Zustand 進行狀態管理，提供響應式的專案瀏覽和選擇體驗。實作將按照類型定義、API服務、狀態管理、元件開發、頁面整合的順序進行，確保每個任務都是可獨立完成和測試的原子化單元。

## Steering Document Compliance
遵循 Next.js App Router 檔案結構，將頁面置於 `/src/app/projects/` 目錄下。元件按功能分類放置於 `/src/components/` 對應目錄中，重用現有的 shadcn/ui 基礎元件和 shared 目錄下的 StatCard、DataTable 元件。狀態管理使用 Zustand，API 服務統一管理，確保程式碼組織符合專案架構標準。

## Atomic Task Requirements
**Each task must meet these criteria for optimal agent execution:**
- **File Scope**: Touches 1-3 related files maximum
- **Time Boxing**: Completable in 15-30 minutes
- **Single Purpose**: One testable outcome per task
- **Specific Files**: Must specify exact files to create/modify
- **Agent-Friendly**: Clear input/output with minimal context switching

## Task Format Guidelines
- Use checkbox format: `- [ ] Task number. Task description`
- **Specify files**: Always include exact file paths to create/modify
- **Include implementation details** as bullet points
- Reference requirements using: `_Requirements: X.Y, Z.A_`
- Reference existing code to leverage using: `_Leverage: path/to/file.ts, path/to/component.tsx_`
- Focus only on coding tasks (no deployment, user testing, etc.)
- **Avoid broad terms**: No "system", "integration", "complete" in task titles

## Tasks

### 基礎設定和類型定義

- [x] 1. Create project types in src/types/project.ts
  - File: src/types/project.ts
  - Define Project interface with id, code, name, status, type, progress fields
  - Define ProjectStatus, ProjectType, ProjectFilters, ViewMode enums
  - Define ProjectPermission and ProjectMember interfaces
  - Purpose: Establish type safety for all project-related data structures
  - _Requirements: US1 (AC1.1, AC1.2), US3 (AC3.1, AC3.2, AC3.3)_

- [x] 2. Create project API service in src/services/projectApi.ts
  - File: src/services/projectApi.ts
  - Implement getProjects, getProjectById functions with proper typing
  - Add error handling and response transformation
  - Include pagination and filtering parameter handling
  - Purpose: Centralized API communication layer for project data
  - _Leverage: src/lib/utils.ts_
  - _Requirements: US1 (AC1.1), US2 (AC2.1, AC2.2, AC2.3)_

### Mock API 和資料服務

- [x] 3. Create mock project data in src/mocks/projects.ts
  - File: src/mocks/projects.ts
  - Define mockProjects array with 8-10 realistic project records
  - Include varied statuses (規劃中, 進行中, 已完成) and types
  - Add realistic progress percentages and date ranges
  - Purpose: Provide consistent test data for development and testing
  - _Leverage: src/types/project.ts_
  - _Requirements: US1 (AC1.2), US3 (AC3.1, AC3.2)_

- [x] 4. Create MSW handlers in src/mocks/handlers.ts
  - File: src/mocks/handlers.ts
  - Implement GET /api/projects handler with search and filter logic
  - Add GET /api/projects/:id handler for individual project data
  - Include pagination, sorting, and error simulation
  - Purpose: Mock API responses for consistent frontend development
  - _Leverage: src/mocks/projects.ts, src/types/project.ts_
  - _Requirements: US2 (AC2.1, AC2.2), US6 (AC6.1)_

### 狀態管理和 Hooks

- [ ] 5. Create project store in src/store/projectStore.ts
  - File: src/store/projectStore.ts
  - Implement Zustand store with projects, filters, viewMode, pagination, recentAccess state
  - Add fetchProjects, setFilters, setViewMode, setPagination, recordAccess actions
  - Include loading and error state management with localStorage integration
  - Purpose: Centralized state management for project selection and access tracking
  - _Leverage: src/types/project.ts, src/services/projectApi.ts_
  - _Requirements: US1 (AC1.1), US2 (AC2.1, AC2.2, AC2.3), US4 (AC4.1), US6 (AC6.2) - 存取記錄_

- [ ] 6. Create useProjects hook in src/hooks/useProjects.ts
  - File: src/hooks/useProjects.ts
  - Export custom hook with loadProjects, searchProjects, applyFilters functions
  - Include toggleViewMode, changePage, resetFilters utilities
  - Add proper TypeScript typing and error handling
  - Purpose: Simplified interface for components to interact with project store
  - _Leverage: src/store/projectStore.ts_
  - _Requirements: US2 (AC2.1, AC2.2), US4 (AC4.1, AC4.2)_

### 核心元件開發

- [ ] 7. Create SearchFilter component in src/app/projects/components/SearchFilter.tsx
  - File: src/app/projects/components/SearchFilter.tsx
  - Build search input with debounced onChange handling
  - Add status and type dropdown filters using shadcn/ui Select
  - Include clear filters functionality and responsive design
  - Purpose: Provide intuitive filtering interface for project list
  - _Leverage: src/components/ui/Input.tsx, src/components/ui/Select.tsx_
  - _Requirements: US2 (AC2.1, AC2.2, AC2.3)_

- [x] 8. Create ViewModeToggle component in src/app/projects/components/ViewModeToggle.tsx
  - File: src/app/projects/components/ViewModeToggle.tsx
  - Implement grid/table view toggle with icons
  - Add keyboard accessibility and proper ARIA labels
  - Use shadcn/ui Button component with toggle functionality
  - Purpose: Allow users to switch between card grid and table views
  - _Leverage: src/components/ui/button.tsx_
  - _Requirements: US1 (AC1.3), US4 (AC4.1, AC4.2)_

- [x] 9. Create ProjectCard component in src/app/projects/components/ProjectCard.tsx
  - File: src/app/projects/components/ProjectCard.tsx
  - Display project code, name, status badge, and progress bar
  - Include manager info, timeline, and milestone statistics
  - Add click handler for project navigation with hover effects
  - Record project access history on click using localStorage/sessionStorage
  - Purpose: Visual card representation of project information with access tracking
  - _Leverage: src/components/ui/card.tsx, src/components/ui/badge.tsx, src/components/ui/progress.tsx, src/components/shared/StatCard.tsx_
  - _Requirements: US1 (AC1.2), US3 (AC3.1, AC3.2, AC3.3), US5 (AC5.1), US6 (AC6.2) - 存取記錄_

- [x] 10. Create ProjectGrid component in src/app/projects/components/ProjectGrid.tsx
  - File: src/app/projects/components/ProjectGrid.tsx
  - Implement responsive grid layout (1-4 columns based on screen size)
  - Handle empty state and loading skeleton display
  - Include proper spacing and hover animations
  - Purpose: Grid container for displaying multiple ProjectCard components
  - _Leverage: src/app/projects/components/ProjectCard.tsx_
  - _Requirements: US1 (AC1.3), US4 (AC4.1, AC4.2)_

- [x] 11. Create ProjectTable component in src/app/projects/components/ProjectTable.tsx
  - File: src/app/projects/components/ProjectTable.tsx
  - Configure DataTable with project-specific columns definition
  - Add status badge rendering and progress percentage display
  - Include sortable columns and action buttons with access tracking
  - Record project access history on row click
  - Purpose: Tabular view of projects with enhanced data density and access tracking
  - _Leverage: src/components/shared/DataTable.tsx, src/components/ui/badge.tsx_
  - _Requirements: US1 (AC1.2, AC1.3), US3 (AC3.1, AC3.2), US5 (AC5.1), US6 (AC6.2) - 存取記錄_

### 頁面整合和佈局

- [x] 12. Create projects page in src/app/projects/page.tsx
  - File: src/app/projects/page.tsx
  - Integrate all components (SearchFilter, ViewModeToggle, ProjectGrid, ProjectTable)
  - Add useProjects hook integration and state management
  - Include proper loading states and error boundary
  - Purpose: Main project selection page with complete functionality
  - _Leverage: src/hooks/useProjects.ts, src/app/projects/components/*_
  - _Requirements: US1 (AC1.1, AC1.2, AC1.3), US4 (AC4.1, AC4.2)_

- [x] 13. Create loading page in src/app/projects/loading.tsx
  - File: src/app/projects/loading.tsx
  - Implement skeleton loaders for both grid and table views
  - Match the layout structure of actual components
  - Include proper animation and accessibility features
  - Purpose: Consistent loading experience during data fetching
  - _Leverage: src/components/ui/skeleton.tsx_
  - _Requirements: US6 (AC6.1, AC6.2)_

- [x] 14. Create error page in src/app/projects/error.tsx
  - File: src/app/projects/error.tsx
  - Build error boundary with retry functionality
  - Display user-friendly error messages and recovery options
  - Include proper error logging and reporting
  - Purpose: Graceful error handling for project selection failures
  - _Leverage: src/components/ui/button.tsx, src/lib/utils.ts_
  - _Requirements: US1 (AC1.1), US6 (AC6.1)_

### 測試和優化

- [x] 15. Add project store unit tests in src/store/__tests__/projectStore.test.ts
  - File: src/store/__tests__/projectStore.test.ts
  - Test store actions (fetchProjects, setFilters, setViewMode)
  - Verify state updates and error handling scenarios
  - Include async operation testing with mock API
  - Purpose: Ensure store reliability and prevent regression bugs
  - _Leverage: src/store/projectStore.ts, src/mocks/handlers.ts_
  - _Requirements: US2 (AC2.1, AC2.2), US6 (AC6.1)_

- [x] 16. Add ProjectCard component tests in src/app/projects/components/__tests__/ProjectCard.test.tsx
  - File: src/app/projects/components/__tests__/ProjectCard.test.tsx
  - Test project data display and status badge rendering
  - Verify click handlers and navigation functionality
  - Include accessibility and responsive behavior tests
  - Purpose: Validate component behavior and user interactions
  - _Leverage: src/app/projects/components/ProjectCard.tsx, src/mocks/projects.ts_
  - _Requirements: US1 (AC1.2), US5 (AC5.1)_

- [x] 17. Add projects page integration tests in src/app/projects/__tests__/page.test.tsx
  - File: src/app/projects/__tests__/page.test.tsx
  - Test complete page functionality with search and filtering
  - Verify view mode switching and pagination behavior
  - Include loading states and error handling validation
  - Purpose: Ensure full feature integration works correctly
  - _Leverage: src/app/projects/page.tsx, src/mocks/handlers.ts_
  - _Requirements: All user stories and acceptance criteria_

- [x] 18. Add MSW server setup in src/mocks/server.ts
  - File: src/mocks/server.ts
  - Configure MSW server with project handlers for testing
  - Add browser and Node.js environment setup
  - Include proper cleanup and error handling
  - Purpose: Enable consistent API mocking across development and testing
  - _Leverage: src/mocks/handlers.ts_
  - _Requirements: US6 (AC6.1, AC6.2)_