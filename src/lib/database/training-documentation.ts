import { writeFile, readFile, mkdir, readdir, stat, access } from 'fs/promises'
import path from 'path'

// Types for training and documentation system
type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
type ContentType = 'module' | 'guide' | 'article' | 'example'
type UserRole = 'developer' | 'admin' | 'dba' | 'manager'
type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'revision_needed'

interface TrainingModule {
  id: string
  title: string
  description: string
  level: TrainingLevel
  estimatedDuration: number
  prerequisites?: string[]
  sections?: TrainingSection[]
}

interface TrainingSection {
  id: string
  title: string
  content: string
  estimatedTime: number
  exercises?: Exercise[]
}

interface Exercise {
  id: string
  title: string
  description: string
  type: 'quiz' | 'practical' | 'code'
  solution?: string
}

interface TrainingProgress {
  completedSections: string[]
  currentSection: string
  progressPercentage: number
  startedAt?: Date
  lastUpdatedAt?: Date
}

interface TrainingModuleResult {
  success: boolean
  moduleId: string
  createdAt: Date
  error?: string
}

interface TrainingProgressResult {
  success: boolean
  progressPercentage: number
  updatedAt: Date
  error?: string
}

interface TrainingReport {
  generatedAt: Date
  summary: {
    totalModules: number
    totalUsers: number
    completionRate: number
    averageProgress: number
  }
  userProgress: Array<{
    userId: string
    completedModules: number
    totalProgress: number
  }>
  moduleStatistics: Array<{
    moduleId: string
    enrollments: number
    completions: number
    averageRating: number
  }>
}

interface UserProfile {
  userId: string
  role: UserRole
  experience: TrainingLevel
  completedModules: string[]
  learningPreferences?: string[]
}

interface TrainingRecommendation {
  recommendations: Array<{
    moduleId: string
    reason: string
    priority: 'high' | 'medium' | 'low'
    estimatedTime: number
  }>
  estimatedTime: number
  priority: 'high' | 'medium' | 'low'
}

interface TrainingCompletion {
  isCompleted: boolean
  completionDate?: Date
  certificate?: {
    certificateId: string
    issuedAt: Date
    validUntil?: Date
  }
  finalScore?: number
}

interface APISpec {
  endpoint: string
  method: string
  description: string
  parameters: string[]
  responses?: Record<string, string>
  examples?: string[]
}

interface DocumentationResult {
  success: boolean
  documentPath: string
  generatedAt: Date
  error?: string
}

interface TroubleshootingIssue {
  problem: string
  symptoms: string[]
  solutions: string[]
  relatedArticles?: string[]
  severity?: 'low' | 'medium' | 'high'
}

interface TroubleshootingGuideResult {
  success: boolean
  guideId: string
  documentPath: string
  error?: string
}

interface MigrationStep {
  phase: string
  steps: string[]
  estimatedTime: number
  prerequisites?: string[]
  validation?: string[]
}

interface RunbookResult {
  success: boolean
  runbookId: string
  documentPath: string
  error?: string
}

interface CodeExample {
  title: string
  description: string
  code: string
  language: string
  category?: string
  difficulty?: TrainingLevel
}

interface CodeExamplesResult {
  success: boolean
  examplesPath: string
  generatedAt: Date
  error?: string
}

interface SearchResult {
  results: Array<{
    title: string
    content: string
    type: ContentType
    relevance: number
    path: string
  }>
  totalResults: number
  searchTime: number
}

interface KnowledgeArticle {
  title: string
  content: string
  category: string
  tags: string[]
  author: string
  difficulty?: TrainingLevel
  lastUpdated?: Date
}

interface ArticleResult {
  success: boolean
  articleId: string
  storedAt: Date
  error?: string
}

interface ArticleSearchResult {
  articles: Array<{
    articleId: string
    title: string
    summary: string
    category: string
    rating: number
  }>
  totalCount: number
  category: string
}

interface KnowledgeSearchResult {
  results: Array<{
    articleId: string
    title: string
    content: string
    relevance: number
  }>
  relevanceScores: number[]
  searchTime: number
}

interface RatingResult {
  success: boolean
  newAverageRating: number
  updatedAt: Date
  error?: string
}

interface KnowledgeReport {
  reportId: string
  statistics: {
    totalArticles: number
    totalViews: number
    averageRating: number
    topCategories: string[]
  }
  topArticles: Array<{
    articleId: string
    title: string
    views: number
    rating: number
  }>
  categoryBreakdown: Record<string, number>
}

interface InteractiveGuide {
  title: string
  description: string
  steps: GuideStep[]
  estimatedTime?: number
  difficulty?: TrainingLevel
}

interface GuideStep {
  title: string
  description: string
  actions: string[]
  validation?: ValidationRule[]
  helpContent?: string
}

interface ValidationRule {
  type: 'connection' | 'file_exists' | 'command_success'
  description: string
  validationFunction: string
}

interface GuideResult {
  success: boolean
  guideId: string
  createdAt: Date
  error?: string
}

interface GuideProgressResult {
  success: boolean
  currentStep: number
  progressPercentage: number
  error?: string
}

interface StepValidationResult {
  isValid: boolean
  canProceed: boolean
  feedback: string
  nextStepHint?: string
}

interface ContextualHelpRequest {
  currentGuide: string
  currentStep: string
  userRole: UserRole
  errorContext?: string
}

interface ContextualHelpResult {
  helpContent: string
  relatedArticles: string[]
  quickActions: string[]
  troubleshootingTips?: string[]
}

interface GuideAnalytics {
  guideId: string
  completionRate: number
  averageTime: number
  commonIssues: Array<{
    stepId: string
    issue: string
    frequency: number
  }>
  userFeedback: Array<{
    rating: number
    comment: string
  }>
}

interface Workspace {
  name: string
  description: string
  members: string[]
  permissions: string[]
  resources?: string[]
}

interface WorkspaceResult {
  success: boolean
  workspaceId: string
  createdAt: Date
  error?: string
}

interface ShareRequest {
  fromUserId: string
  toUserIds: string[]
  contentType: ContentType
  contentId: string
  message: string
}

interface ShareResult {
  success: boolean
  sharedAt: Date
  notifiedUsers: string[]
  error?: string
}

interface TeamProgress {
  teamId: string
  overallProgress: number
  memberProgress: Array<{
    userId: string
    userName: string
    progress: number
    completedModules: string[]
  }>
  recommendations: string[]
}

interface ReviewRequest {
  contentId: string
  authorId: string
  reviewerId: string
  reviewType: 'documentation' | 'guide' | 'module'
}

interface ReviewResult {
  success: boolean
  reviewId: string
  requestedAt: Date
  error?: string
}

interface TeamReport {
  reportId: string
  teamId: string
  reportType: string
  generatedAt: Date
  content: {
    progressSummary: string
    achievements: string[]
    areas_for_improvement: string[]
    upcoming_deadlines: string[]
  }
}

/**
 * 培訓管理器
 * 負責管理培訓模組和進度追蹤
 */
export class TrainingManager {
  private trainingPath: string
  private progressPath: string

  constructor() {
    this.trainingPath = process.env.TRAINING_PATH || './training'
    this.progressPath = process.env.PROGRESS_PATH || './training/progress'
  }

  /**
   * 建立培訓模組
   */
  async createTrainingModule(module: TrainingModule): Promise<TrainingModuleResult> {
    try {
      await mkdir(this.trainingPath, { recursive: true })

      const moduleId = module.id || `module_${Date.now()}`
      const modulePath = path.join(this.trainingPath, `${moduleId}.json`)

      const moduleData = {
        ...module,
        id: moduleId,
        createdAt: new Date(),
        version: '1.0.0'
      }

      await writeFile(modulePath, JSON.stringify(moduleData, null, 2))

      return {
        success: true,
        moduleId,
        createdAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        moduleId: '',
        createdAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 更新培訓進度
   */
  async updateTrainingProgress(userId: string, moduleId: string, progress: TrainingProgress): Promise<TrainingProgressResult> {
    try {
      await mkdir(this.progressPath, { recursive: true })

      const progressFile = path.join(this.progressPath, `${userId}_${moduleId}.json`)
      const progressData = {
        userId,
        moduleId,
        ...progress,
        lastUpdatedAt: new Date()
      }

      await writeFile(progressFile, JSON.stringify(progressData, null, 2))

      return {
        success: true,
        progressPercentage: progress.progressPercentage,
        updatedAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        progressPercentage: 0,
        updatedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 生成培訓報告
   */
  async generateTrainingReport(): Promise<TrainingReport> {
    try {
      const moduleFiles = await readdir(this.trainingPath).catch(() => [])
      const progressFiles = await readdir(this.progressPath).catch(() => [])

      const moduleStatistics = []
      for (const moduleFile of moduleFiles.filter(f => f.endsWith('.json'))) {
        const moduleId = path.basename(moduleFile, '.json')
        const enrollments = progressFiles.filter(f => f.includes(moduleId)).length
        const completions = 0 // 需要實際計算完成數

        moduleStatistics.push({
          moduleId,
          enrollments,
          completions,
          averageRating: 4.2 // 模擬數據
        })
      }

      const userProgress = []
      const processedUsers = new Set()

      for (const progressFile of progressFiles) {
        const userId = progressFile.split('_')[0]
        if (!processedUsers.has(userId)) {
          processedUsers.add(userId)
          const userModules = progressFiles.filter(f => f.startsWith(userId))
          userProgress.push({
            userId,
            completedModules: userModules.length,
            totalProgress: 75 // 需要實際計算
          })
        }
      }

      return {
        generatedAt: new Date(),
        summary: {
          totalModules: moduleFiles.length,
          totalUsers: processedUsers.size,
          completionRate: 0.8,
          averageProgress: 75
        },
        userProgress,
        moduleStatistics
      }

    } catch (error) {
      // 返回空報告
      return {
        generatedAt: new Date(),
        summary: {
          totalModules: 0,
          totalUsers: 0,
          completionRate: 0,
          averageProgress: 0
        },
        userProgress: [],
        moduleStatistics: []
      }
    }
  }

  /**
   * 推薦培訓路徑
   */
  async recommendTrainingPath(userProfile: UserProfile): Promise<TrainingRecommendation> {
    const recommendations = []
    let totalTime = 0

    // 基於用戶角色和經驗推薦模組
    const roleBasedModules = {
      'developer': ['oracle-basics', 'sql-advanced', 'performance-tuning'],
      'admin': ['oracle-administration', 'backup-recovery', 'security'],
      'dba': ['advanced-administration', 'monitoring', 'troubleshooting'],
      'manager': ['migration-overview', 'project-management', 'risk-assessment']
    }

    const suggestedModules = roleBasedModules[userProfile.role] || ['oracle-basics']

    for (const moduleId of suggestedModules) {
      if (!userProfile.completedModules.includes(moduleId)) {
        const estimatedTime = 60 // 預設時間
        const priority = userProfile.experience === 'beginner' ? 'high' : 'medium'

        recommendations.push({
          moduleId,
          reason: `推薦給${userProfile.role}角色`,
          priority: priority as 'high' | 'medium' | 'low',
          estimatedTime
        })

        totalTime += estimatedTime
      }
    }

    return {
      recommendations,
      estimatedTime: totalTime,
      priority: recommendations.length > 0 ? recommendations[0].priority : 'low'
    }
  }

  /**
   * 驗證培訓完成
   */
  async validateTrainingCompletion(userId: string, moduleId: string): Promise<TrainingCompletion> {
    try {
      const progressFile = path.join(this.progressPath, `${userId}_${moduleId}.json`)

      try {
        const progressData = JSON.parse(await readFile(progressFile, 'utf-8'))
        const isCompleted = progressData.progressPercentage >= 100

        if (isCompleted) {
          return {
            isCompleted: true,
            completionDate: progressData.lastUpdatedAt ? new Date(progressData.lastUpdatedAt) : new Date(),
            certificate: {
              certificateId: `cert_${userId}_${moduleId}_${Date.now()}`,
              issuedAt: new Date(),
              validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年有效
            },
            finalScore: 85 // 模擬分數
          }
        }

        return {
          isCompleted: false,
          completionDate: undefined
        }

      } catch {
        return {
          isCompleted: false,
          completionDate: undefined
        }
      }

    } catch (error) {
      return {
        isCompleted: false,
        completionDate: undefined
      }
    }
  }
}

/**
 * 文件引擎
 * 負責生成和管理各種文件
 */
export class DocumentationEngine {
  private docsPath: string

  constructor() {
    this.docsPath = process.env.DOCS_PATH || './docs'
  }

  /**
   * 生成API文件
   */
  async generateAPIDocumentation(apiSpecs: APISpec[]): Promise<DocumentationResult> {
    try {
      await mkdir(this.docsPath, { recursive: true })

      const documentPath = path.join(this.docsPath, 'api-documentation.md')

      let content = '# API Documentation\n\n'
      content += `Generated on: ${new Date().toLocaleString()}\n\n`

      for (const spec of apiSpecs) {
        content += `## ${spec.method} ${spec.endpoint}\n\n`
        content += `${spec.description}\n\n`
        content += `### Parameters\n\n`

        for (const param of spec.parameters) {
          content += `- \`${param}\`\n`
        }

        content += '\n'

        if (spec.responses) {
          content += '### Responses\n\n'
          for (const [code, description] of Object.entries(spec.responses)) {
            content += `- **${code}**: ${description}\n`
          }
          content += '\n'
        }

        if (spec.examples && spec.examples.length > 0) {
          content += '### Examples\n\n'
          for (const example of spec.examples) {
            content += '```javascript\n'
            content += example
            content += '\n```\n\n'
          }
        }

        content += '---\n\n'
      }

      await writeFile(documentPath, content)

      return {
        success: true,
        documentPath,
        generatedAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        documentPath: '',
        generatedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 建立故障排除指南
   */
  async createTroubleshootingGuide(issues: TroubleshootingIssue[]): Promise<TroubleshootingGuideResult> {
    try {
      await mkdir(this.docsPath, { recursive: true })

      const guideId = `troubleshooting_${Date.now()}`
      const documentPath = path.join(this.docsPath, `${guideId}.md`)

      let content = '# Troubleshooting Guide\n\n'
      content += `Generated on: ${new Date().toLocaleString()}\n\n`
      content += '## Common Issues and Solutions\n\n'

      for (const issue of issues) {
        content += `### ${issue.problem}\n\n`

        if (issue.severity) {
          content += `**Severity**: ${issue.severity}\n\n`
        }

        content += '#### Symptoms\n\n'
        for (const symptom of issue.symptoms) {
          content += `- ${symptom}\n`
        }
        content += '\n'

        content += '#### Solutions\n\n'
        for (let i = 0; i < issue.solutions.length; i++) {
          content += `${i + 1}. ${issue.solutions[i]}\n`
        }
        content += '\n'

        if (issue.relatedArticles && issue.relatedArticles.length > 0) {
          content += '#### Related Articles\n\n'
          for (const article of issue.relatedArticles) {
            content += `- [${article}](${article})\n`
          }
          content += '\n'
        }

        content += '---\n\n'
      }

      await writeFile(documentPath, content)

      return {
        success: true,
        guideId,
        documentPath
      }

    } catch (error) {
      return {
        success: false,
        guideId: '',
        documentPath: '',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 生成遷移執行手冊
   */
  async generateMigrationRunbook(migrationSteps: MigrationStep[]): Promise<RunbookResult> {
    try {
      await mkdir(this.docsPath, { recursive: true })

      const runbookId = `migration_runbook_${Date.now()}`
      const documentPath = path.join(this.docsPath, `${runbookId}.md`)

      let content = '# Migration Runbook\n\n'
      content += `Generated on: ${new Date().toLocaleString()}\n\n`
      content += '## Migration Process Overview\n\n'

      let totalTime = 0
      for (const step of migrationSteps) {
        totalTime += step.estimatedTime
      }

      content += `**Total Estimated Time**: ${totalTime} minutes\n\n`
      content += '## Migration Phases\n\n'

      for (let i = 0; i < migrationSteps.length; i++) {
        const step = migrationSteps[i]
        content += `### Phase ${i + 1}: ${step.phase}\n\n`
        content += `**Estimated Time**: ${step.estimatedTime} minutes\n\n`

        if (step.prerequisites && step.prerequisites.length > 0) {
          content += '#### Prerequisites\n\n'
          for (const prereq of step.prerequisites) {
            content += `- ${prereq}\n`
          }
          content += '\n'
        }

        content += '#### Steps\n\n'
        for (let j = 0; j < step.steps.length; j++) {
          content += `${j + 1}. ${step.steps[j]}\n`
        }
        content += '\n'

        if (step.validation && step.validation.length > 0) {
          content += '#### Validation\n\n'
          for (const validation of step.validation) {
            content += `- [ ] ${validation}\n`
          }
          content += '\n'
        }

        content += '---\n\n'
      }

      await writeFile(documentPath, content)

      return {
        success: true,
        runbookId,
        documentPath
      }

    } catch (error) {
      return {
        success: false,
        runbookId: '',
        documentPath: '',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 建立程式碼範例
   */
  async createCodeExamples(examples: CodeExample[]): Promise<CodeExamplesResult> {
    try {
      await mkdir(path.join(this.docsPath, 'examples'), { recursive: true })

      const examplesPath = path.join(this.docsPath, 'examples', 'code-examples.md')

      let content = '# Code Examples\n\n'
      content += `Generated on: ${new Date().toLocaleString()}\n\n`

      // 按類別組織範例
      const categorizedExamples = examples.reduce((acc, example) => {
        const category = example.category || 'General'
        if (!acc[category]) acc[category] = []
        acc[category].push(example)
        return acc
      }, {} as Record<string, CodeExample[]>)

      for (const [category, categoryExamples] of Object.entries(categorizedExamples)) {
        content += `## ${category}\n\n`

        for (const example of categoryExamples) {
          content += `### ${example.title}\n\n`
          content += `${example.description}\n\n`

          if (example.difficulty) {
            content += `**Difficulty**: ${example.difficulty}\n\n`
          }

          content += `\`\`\`${example.language}\n`
          content += example.code
          content += '\n```\n\n'
          content += '---\n\n'
        }
      }

      await writeFile(examplesPath, content)

      return {
        success: true,
        examplesPath,
        generatedAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        examplesPath: '',
        generatedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 搜尋文件
   */
  async searchDocumentation(query: string): Promise<SearchResult> {
    const startTime = Date.now()
    const results = []

    try {
      // 模擬搜尋功能（實際實作會使用全文搜尋引擎）
      const docFiles = await readdir(this.docsPath).catch(() => [])

      for (const fileName of docFiles.filter(f => f.endsWith('.md'))) {
        try {
          const filePath = path.join(this.docsPath, fileName)
          const content = await readFile(filePath, 'utf-8')

          if (content.toLowerCase().includes(query.toLowerCase())) {
            const title = this.extractTitle(content) || fileName
            const relevance = this.calculateRelevance(content, query)

            results.push({
              title,
              content: this.extractSummary(content),
              type: 'article' as ContentType,
              relevance,
              path: filePath
            })
          }
        } catch (error) {
          // 跳過無法讀取的檔案
          continue
        }
      }

      // 按相關性排序
      results.sort((a, b) => b.relevance - a.relevance)

      return {
        results: results.slice(0, 10), // 限制結果數量
        totalResults: results.length,
        searchTime: Date.now() - startTime
      }

    } catch (error) {
      return {
        results: [],
        totalResults: 0,
        searchTime: Date.now() - startTime
      }
    }
  }

  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/^#\s+(.+)$/m)
    return titleMatch ? titleMatch[1] : null
  }

  private extractSummary(content: string): string {
    const lines = content.split('\n')
    const nonEmptyLines = lines.filter(line => line.trim().length > 0)
    return nonEmptyLines.slice(0, 3).join(' ').substring(0, 200) + '...'
  }

  private calculateRelevance(content: string, query: string): number {
    const queryWords = query.toLowerCase().split(' ')
    const contentLower = content.toLowerCase()

    let score = 0
    for (const word of queryWords) {
      const matches = (contentLower.match(new RegExp(word, 'g')) || []).length
      score += matches
    }

    return score
  }
}

/**
 * 知識庫
 * 負責管理知識文章和搜尋
 */
export class KnowledgeBase {
  private knowledgePath: string
  private articles: Map<string, KnowledgeArticle & { articleId: string, rating: number, views: number }> = new Map()

  constructor() {
    this.knowledgePath = process.env.KNOWLEDGE_PATH || './knowledge'
  }

  /**
   * 儲存知識文章
   */
  async storeArticle(article: KnowledgeArticle): Promise<ArticleResult> {
    try {
      await mkdir(this.knowledgePath, { recursive: true })

      const articleId = `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const articlePath = path.join(this.knowledgePath, `${articleId}.json`)

      const articleData = {
        ...article,
        articleId,
        createdAt: new Date(),
        lastUpdated: new Date(),
        rating: 0,
        views: 0
      }

      await writeFile(articlePath, JSON.stringify(articleData, null, 2))
      this.articles.set(articleId, articleData)

      return {
        success: true,
        articleId,
        storedAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        articleId: '',
        storedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 按類別獲取文章
   */
  async getArticlesByCategory(category: string): Promise<ArticleSearchResult> {
    try {
      const articles = []

      // 從檔案系統載入文章（如果未載入到記憶體）
      if (this.articles.size === 0) {
        await this.loadArticlesFromDisk()
      }

      for (const [articleId, article] of this.articles) {
        if (article.category === category) {
          articles.push({
            articleId,
            title: article.title,
            summary: this.generateSummary(article.content),
            category: article.category,
            rating: article.rating
          })
        }
      }

      return {
        articles,
        totalCount: articles.length,
        category
      }

    } catch (error) {
      return {
        articles: [],
        totalCount: 0,
        category
      }
    }
  }

  /**
   * 搜尋知識庫
   */
  async searchKnowledge(searchTerms: string[]): Promise<KnowledgeSearchResult> {
    const startTime = Date.now()
    const results = []
    const relevanceScores = []

    try {
      // 確保文章已載入
      if (this.articles.size === 0) {
        await this.loadArticlesFromDisk()
      }

      for (const [articleId, article] of this.articles) {
        let relevance = 0

        for (const term of searchTerms) {
          const termLower = term.toLowerCase()
          const titleMatches = (article.title.toLowerCase().match(new RegExp(termLower, 'g')) || []).length
          const contentMatches = (article.content.toLowerCase().match(new RegExp(termLower, 'g')) || []).length
          const tagMatches = article.tags.filter(tag => tag.toLowerCase().includes(termLower)).length

          relevance += titleMatches * 3 + contentMatches + tagMatches * 2
        }

        if (relevance > 0) {
          results.push({
            articleId,
            title: article.title,
            content: this.generateSummary(article.content),
            relevance
          })
          relevanceScores.push(relevance)
        }
      }

      // 按相關性排序
      results.sort((a, b) => b.relevance - a.relevance)
      relevanceScores.sort((a, b) => b - a)

      return {
        results: results.slice(0, 20), // 限制結果數量
        relevanceScores: relevanceScores.slice(0, 20),
        searchTime: Date.now() - startTime
      }

    } catch (error) {
      return {
        results: [],
        relevanceScores: [],
        searchTime: Date.now() - startTime
      }
    }
  }

  /**
   * 更新文章評分
   */
  async updateArticleRating(articleId: string, rating: number, feedback?: string): Promise<RatingResult> {
    try {
      const article = this.articles.get(articleId)
      if (!article) {
        throw new Error(`文章 ${articleId} 不存在`)
      }

      // 簡單的評分計算（實際實作會更複雜）
      const currentRating = article.rating || 0
      const newRating = (currentRating + rating) / 2

      article.rating = newRating
      this.articles.set(articleId, article)

      // 更新檔案
      const articlePath = path.join(this.knowledgePath, `${articleId}.json`)
      await writeFile(articlePath, JSON.stringify(article, null, 2))

      return {
        success: true,
        newAverageRating: newRating,
        updatedAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        newAverageRating: 0,
        updatedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 生成知識報告
   */
  async generateKnowledgeReport(): Promise<KnowledgeReport> {
    try {
      // 確保文章已載入
      if (this.articles.size === 0) {
        await this.loadArticlesFromDisk()
      }

      const categoryBreakdown: Record<string, number> = {}
      const topArticles = []
      let totalViews = 0
      let totalRating = 0

      for (const [articleId, article] of this.articles) {
        // 統計類別
        categoryBreakdown[article.category] = (categoryBreakdown[article.category] || 0) + 1

        // 收集熱門文章
        topArticles.push({
          articleId,
          title: article.title,
          views: article.views,
          rating: article.rating
        })

        totalViews += article.views
        totalRating += article.rating
      }

      // 排序熱門文章
      topArticles.sort((a, b) => b.views - a.views)

      const reportId = `knowledge_report_${Date.now()}`

      return {
        reportId,
        statistics: {
          totalArticles: this.articles.size,
          totalViews,
          averageRating: this.articles.size > 0 ? totalRating / this.articles.size : 0,
          topCategories: Object.keys(categoryBreakdown).sort((a, b) => categoryBreakdown[b] - categoryBreakdown[a])
        },
        topArticles: topArticles.slice(0, 10),
        categoryBreakdown
      }

    } catch (error) {
      return {
        reportId: `error_report_${Date.now()}`,
        statistics: {
          totalArticles: 0,
          totalViews: 0,
          averageRating: 0,
          topCategories: []
        },
        topArticles: [],
        categoryBreakdown: {}
      }
    }
  }

  private async loadArticlesFromDisk(): Promise<void> {
    try {
      const files = await readdir(this.knowledgePath).catch(() => [])

      for (const fileName of files.filter(f => f.endsWith('.json'))) {
        try {
          const filePath = path.join(this.knowledgePath, fileName)
          const articleData = JSON.parse(await readFile(filePath, 'utf-8'))
          this.articles.set(articleData.articleId, articleData)
        } catch (error) {
          // 跳過無效的文章檔案
          continue
        }
      }
    } catch (error) {
      // 無法載入文章目錄
    }
  }

  private generateSummary(content: string): string {
    return content.substring(0, 200) + (content.length > 200 ? '...' : '')
  }
}

/**
 * 互動式指南
 * 負責建立和管理逐步指南
 */
export class InteractiveGuides {
  private guidesPath: string
  private progressPath: string

  constructor() {
    this.guidesPath = process.env.GUIDES_PATH || './guides'
    this.progressPath = process.env.GUIDE_PROGRESS_PATH || './guides/progress'
  }

  /**
   * 建立互動式指南
   */
  async createInteractiveGuide(guide: InteractiveGuide): Promise<GuideResult> {
    try {
      await mkdir(this.guidesPath, { recursive: true })

      const guideId = `guide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const guidePath = path.join(this.guidesPath, `${guideId}.json`)

      const guideData = {
        ...guide,
        guideId,
        createdAt: new Date(),
        version: '1.0.0'
      }

      await writeFile(guidePath, JSON.stringify(guideData, null, 2))

      return {
        success: true,
        guideId,
        createdAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        guideId: '',
        createdAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 更新指南進度
   */
  async updateGuideProgress(userId: string, guideId: string, currentStep: number): Promise<GuideProgressResult> {
    try {
      await mkdir(this.progressPath, { recursive: true })

      // 載入指南以計算進度百分比
      const guidePath = path.join(this.guidesPath, `${guideId}.json`)
      let totalSteps = 5 // 預設值

      try {
        const guideData = JSON.parse(await readFile(guidePath, 'utf-8'))
        totalSteps = guideData.steps ? guideData.steps.length : 5
      } catch {
        // 使用預設值
      }

      const progressPercentage = Math.round((currentStep / totalSteps) * 100)

      const progressData = {
        userId,
        guideId,
        currentStep,
        totalSteps,
        progressPercentage,
        updatedAt: new Date()
      }

      const progressFile = path.join(this.progressPath, `${userId}_${guideId}.json`)
      await writeFile(progressFile, JSON.stringify(progressData, null, 2))

      return {
        success: true,
        currentStep,
        progressPercentage
      }

    } catch (error) {
      return {
        success: false,
        currentStep: 0,
        progressPercentage: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 驗證步驟完成
   */
  async validateStepCompletion(userId: string, guideId: string, stepId: string, validationData: any): Promise<StepValidationResult> {
    try {
      // 載入指南以獲取驗證規則
      const guidePath = path.join(this.guidesPath, `${guideId}.json`)
      const guideData = JSON.parse(await readFile(guidePath, 'utf-8'))

      const step = guideData.steps?.find((s: any) => s.id === stepId)
      if (!step) {
        return {
          isValid: false,
          canProceed: false,
          feedback: '找不到指定的步驟'
        }
      }

      // 執行驗證邏輯
      let isValid = true
      let feedback = '步驟完成'

      if (step.validation) {
        for (const rule of step.validation) {
          switch (rule.type) {
            case 'connection':
              isValid = validationData.connectionTest === true
              if (!isValid) feedback = '連線測試失敗'
              break
            case 'file_exists':
              isValid = validationData.fileExists === true
              if (!isValid) feedback = '必要檔案不存在'
              break
            case 'command_success':
              isValid = validationData.commandSuccess === true
              if (!isValid) feedback = '命令執行失敗'
              break
            default:
              isValid = true
          }

          if (!isValid) break
        }
      }

      return {
        isValid,
        canProceed: isValid,
        feedback,
        nextStepHint: isValid ? '可以繼續下一步' : '請解決當前問題後再繼續'
      }

    } catch (error) {
      return {
        isValid: false,
        canProceed: false,
        feedback: `驗證失敗: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 提供情境幫助
   */
  async getContextualHelp(context: ContextualHelpRequest): Promise<ContextualHelpResult> {
    try {
      // 載入指南以獲取幫助內容
      const guidePath = path.join(this.guidesPath, `${context.currentGuide}.json`)
      const guideData = JSON.parse(await readFile(guidePath, 'utf-8'))

      const step = guideData.steps?.find((s: any) => s.id === context.currentStep)

      let helpContent = '一般幫助內容'
      if (step && step.helpContent) {
        helpContent = step.helpContent
      }

      // 基於用戶角色提供不同的幫助
      const roleSpecificHelp = {
        'developer': '開發者相關的技術細節和程式碼範例',
        'admin': '系統管理相關的配置和權限設定',
        'dba': '資料庫管理和效能調優建議',
        'manager': '專案進度和風險管理指導'
      }

      helpContent += '\n\n' + roleSpecificHelp[context.userRole]

      return {
        helpContent,
        relatedArticles: [
          'troubleshooting-guide',
          'best-practices',
          'common-issues'
        ],
        quickActions: [
          '重新載入頁面',
          '檢查連線狀態',
          '查看日誌'
        ],
        troubleshootingTips: context.errorContext ? [
          '檢查錯誤訊息的詳細內容',
          '查看相關的故障排除指南',
          '聯繫技術支援'
        ] : undefined
      }

    } catch (error) {
      return {
        helpContent: '無法載入幫助內容，請聯繫技術支援',
        relatedArticles: [],
        quickActions: ['重新載入頁面']
      }
    }
  }

  /**
   * 生成指南分析
   */
  async generateGuideAnalytics(guideId: string): Promise<GuideAnalytics> {
    try {
      // 分析進度檔案
      const progressFiles = await readdir(this.progressPath).catch(() => [])
      const guideProgressFiles = progressFiles.filter(f => f.includes(guideId))

      let completedUsers = 0
      let totalTime = 0
      const userFeedback = []
      const commonIssues = []

      for (const progressFile of guideProgressFiles) {
        try {
          const progressPath = path.join(this.progressPath, progressFile)
          const progressData = JSON.parse(await readFile(progressPath, 'utf-8'))

          if (progressData.progressPercentage >= 100) {
            completedUsers++
          }

          // 模擬用戶反饋
          userFeedback.push({
            rating: 4.2,
            comment: '指南很有幫助'
          })

        } catch (error) {
          // 跳過無效的進度檔案
          continue
        }
      }

      // 模擬常見問題
      commonIssues.push({
        stepId: 'step-2',
        issue: '連線設定困難',
        frequency: 15
      })

      const completionRate = guideProgressFiles.length > 0 ? (completedUsers / guideProgressFiles.length) * 100 : 0

      return {
        guideId,
        completionRate,
        averageTime: 45, // 模擬平均時間
        commonIssues,
        userFeedback
      }

    } catch (error) {
      return {
        guideId,
        completionRate: 0,
        averageTime: 0,
        commonIssues: [],
        userFeedback: []
      }
    }
  }
}

/**
 * 團隊協作
 * 負責團隊工作空間和知識分享
 */
export class TeamCollaboration {
  private workspacesPath: string
  private sharesPath: string

  constructor() {
    this.workspacesPath = process.env.WORKSPACES_PATH || './workspaces'
    this.sharesPath = process.env.SHARES_PATH || './shares'
  }

  /**
   * 建立工作空間
   */
  async createWorkspace(workspace: Workspace): Promise<WorkspaceResult> {
    try {
      await mkdir(this.workspacesPath, { recursive: true })

      const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const workspacePath = path.join(this.workspacesPath, `${workspaceId}.json`)

      const workspaceData = {
        ...workspace,
        workspaceId,
        createdAt: new Date(),
        lastUpdated: new Date()
      }

      await writeFile(workspacePath, JSON.stringify(workspaceData, null, 2))

      return {
        success: true,
        workspaceId,
        createdAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        workspaceId: '',
        createdAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 分享知識
   */
  async shareKnowledge(shareRequest: ShareRequest): Promise<ShareResult> {
    try {
      await mkdir(this.sharesPath, { recursive: true })

      const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const sharePath = path.join(this.sharesPath, `${shareId}.json`)

      const shareData = {
        ...shareRequest,
        shareId,
        sharedAt: new Date(),
        status: 'active'
      }

      await writeFile(sharePath, JSON.stringify(shareData, null, 2))

      return {
        success: true,
        sharedAt: new Date(),
        notifiedUsers: shareRequest.toUserIds
      }

    } catch (error) {
      return {
        success: false,
        sharedAt: new Date(),
        notifiedUsers: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 追蹤團隊進度
   */
  async trackTeamProgress(teamId: string): Promise<TeamProgress> {
    try {
      // 模擬團隊成員和進度數據
      const memberProgress = [
        {
          userId: 'user-1',
          userName: '張三',
          progress: 75,
          completedModules: ['oracle-basics', 'migration-101']
        },
        {
          userId: 'user-2',
          userName: '李四',
          progress: 60,
          completedModules: ['oracle-basics']
        },
        {
          userId: 'user-3',
          userName: '王五',
          progress: 90,
          completedModules: ['oracle-basics', 'migration-101', 'troubleshooting']
        }
      ]

      const overallProgress = memberProgress.reduce((sum, member) => sum + member.progress, 0) / memberProgress.length

      const recommendations = []
      if (overallProgress < 70) {
        recommendations.push('建議加強基礎培訓')
      }
      if (memberProgress.some(m => m.progress < 50)) {
        recommendations.push('關注進度落後的成員')
      }

      return {
        teamId,
        overallProgress,
        memberProgress,
        recommendations
      }

    } catch (error) {
      return {
        teamId,
        overallProgress: 0,
        memberProgress: [],
        recommendations: ['無法載入團隊進度數據']
      }
    }
  }

  /**
   * 請求同儕審查
   */
  async requestPeerReview(reviewRequest: ReviewRequest): Promise<ReviewResult> {
    try {
      const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // 在實際實作中，這裡會發送通知給審查者
      // 並建立審查記錄

      return {
        success: true,
        reviewId,
        requestedAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        reviewId: '',
        requestedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 生成團隊報告
   */
  async generateTeamReport(teamId: string, reportType: string): Promise<TeamReport> {
    const reportId = `team_report_${teamId}_${Date.now()}`

    // 模擬報告內容
    const content = {
      progressSummary: '團隊整體進度良好，平均完成度75%',
      achievements: [
        '完成Oracle基礎培訓',
        '成功執行測試遷移',
        '建立故障排除知識庫'
      ],
      areas_for_improvement: [
        '加強進階查詢優化培訓',
        '提升故障診斷速度'
      ],
      upcoming_deadlines: [
        '2024-02-15: 完成遷移測試',
        '2024-02-28: 提交培訓報告'
      ]
    }

    return {
      reportId,
      teamId,
      reportType,
      generatedAt: new Date(),
      content
    }
  }
}