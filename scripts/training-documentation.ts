#!/usr/bin/env tsx

/**
 * PCM團隊培訓和文件支援工具
 * 提供培訓管理、文件生成和知識分享功能
 */

import { program } from 'commander';
import {
  TrainingManager,
  DocumentationEngine,
  KnowledgeBase,
  InteractiveGuides,
  TeamCollaboration,
} from '../src/lib/database/training-documentation';

// 色彩輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : '';
  console.log(`${colorCode}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

function logStep(message: string) {
  log(`📋 ${message}`, 'cyan');
}

// 建立培訓模組命令
async function createModule(title: string, level: string, duration: string) {
  try {
    logStep(`建立培訓模組: ${title}`);

    if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
      logError('無效的難度等級，請使用: beginner, intermediate, advanced');
      return;
    }

    const trainingManager = new TrainingManager();

    const module = {
      id: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      description: `${title} 培訓模組`,
      level: level as any,
      estimatedDuration: parseInt(duration),
    };

    logInfo('建立模組...');
    const result = await trainingManager.createTrainingModule(module);

    if (result.success) {
      logSuccess('培訓模組建立成功');
      log(`模組ID: ${result.moduleId}`);
      log(`建立時間: ${result.createdAt.toLocaleString()}`);
    } else {
      logError(`模組建立失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `建立模組失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 更新培訓進度命令
async function updateProgress(
  userId: string,
  moduleId: string,
  percentage: string
) {
  try {
    logStep(`更新培訓進度: ${userId} - ${moduleId}`);

    const progressPercentage = parseInt(percentage);
    if (progressPercentage < 0 || progressPercentage > 100) {
      logError('進度百分比必須在0-100之間');
      return;
    }

    const trainingManager = new TrainingManager();

    const progress = {
      completedSections: [],
      currentSection: 'section-1',
      progressPercentage,
    };

    logInfo('更新進度...');
    const result = await trainingManager.updateTrainingProgress(
      userId,
      moduleId,
      progress
    );

    if (result.success) {
      logSuccess('進度更新成功');
      log(`當前進度: ${result.progressPercentage}%`);
      log(`更新時間: ${result.updatedAt.toLocaleString()}`);
    } else {
      logError(`進度更新失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `更新進度失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 生成培訓報告命令
async function generateTrainingReport() {
  try {
    logStep('生成培訓報告');

    const trainingManager = new TrainingManager();

    logInfo('收集培訓數據...');
    const report = await trainingManager.generateTrainingReport();

    log('\n📊 培訓報告', 'bright');
    log('='.repeat(80));

    log(`報告生成時間: ${report.generatedAt.toLocaleString()}`);

    log('\n📈 整體統計:', 'cyan');
    log(`  總模組數: ${report.summary.totalModules}`);
    log(`  總用戶數: ${report.summary.totalUsers}`);
    log(`  完成率: ${Math.round(report.summary.completionRate * 100)}%`);
    log(`  平均進度: ${report.summary.averageProgress}%`);

    if (report.userProgress.length > 0) {
      log('\n👥 用戶進度:', 'blue');
      report.userProgress.forEach(user => {
        log(
          `  ${user.userId}: 完成${user.completedModules}個模組 (${user.totalProgress}%)`
        );
      });
    }

    if (report.moduleStatistics.length > 0) {
      log('\n📚 模組統計:', 'magenta');
      report.moduleStatistics.forEach(module => {
        log(
          `  ${module.moduleId}: ${module.enrollments}人註冊, ${module.completions}人完成, 評分${module.averageRating}`
        );
      });
    }
  } catch (error) {
    logError(
      `報告生成失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 推薦培訓路徑命令
async function recommendPath(userId: string, role: string, experience: string) {
  try {
    logStep(`推薦培訓路徑: ${userId}`);

    if (!['developer', 'admin', 'dba', 'manager'].includes(role)) {
      logError('無效的角色，請使用: developer, admin, dba, manager');
      return;
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(experience)) {
      logError('無效的經驗等級，請使用: beginner, intermediate, advanced');
      return;
    }

    const trainingManager = new TrainingManager();

    const userProfile = {
      userId,
      role: role as any,
      experience: experience as any,
      completedModules: [],
    };

    logInfo('分析用戶需求...');
    const recommendations =
      await trainingManager.recommendTrainingPath(userProfile);

    log('\n🎯 培訓路徑推薦', 'bright');
    log('='.repeat(70));

    log(`總預估時間: ${recommendations.estimatedTime} 分鐘`);
    log(`優先級: ${recommendations.priority}`);

    if (recommendations.recommendations.length > 0) {
      log('\n📚 推薦模組:', 'cyan');
      recommendations.recommendations.forEach((rec, index) => {
        const priorityColor =
          rec.priority === 'high'
            ? 'red'
            : rec.priority === 'medium'
              ? 'yellow'
              : 'blue';
        log(`  ${index + 1}. ${rec.moduleId}`, priorityColor);
        log(`     原因: ${rec.reason}`);
        log(`     優先級: ${rec.priority}`);
        log(`     預估時間: ${rec.estimatedTime} 分鐘`);
        log('');
      });
    } else {
      logInfo('未找到適合的培訓推薦');
    }
  } catch (error) {
    logError(
      `路徑推薦失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 生成API文件命令
async function generateAPIDocs() {
  try {
    logStep('生成API文件');

    const documentationEngine = new DocumentationEngine();

    const apiSpecs = [
      {
        endpoint: '/api/migrate',
        method: 'POST',
        description: '執行資料庫遷移',
        parameters: ['tableName', 'direction', 'options'],
        responses: {
          '200': '遷移成功',
          '400': '無效參數',
          '500': '伺服器錯誤',
        },
        examples: [
          'await fetch("/api/migrate", {\n  method: "POST",\n  body: JSON.stringify({tableName: "users", direction: "postgresql-to-oracle"})\n})',
        ],
      },
      {
        endpoint: '/api/rollback',
        method: 'POST',
        description: '執行資料回滾',
        parameters: ['snapshotId', 'targetDatabase'],
        responses: {
          '200': '回滾成功',
          '404': '快照不存在',
          '500': '回滾失敗',
        },
      },
    ];

    logInfo('生成文件...');
    const result = await documentationEngine.generateAPIDocumentation(apiSpecs);

    if (result.success) {
      logSuccess('API文件生成成功');
      log(`文件位置: ${result.documentPath}`);
      log(`生成時間: ${result.generatedAt.toLocaleString()}`);
    } else {
      logError(`文件生成失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `API文件生成失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 建立故障排除指南命令
async function createTroubleshootingGuide() {
  try {
    logStep('建立故障排除指南');

    const documentationEngine = new DocumentationEngine();

    const issues = [
      {
        problem: 'Oracle連線超時',
        symptoms: [
          '連線Oracle時出現超時錯誤',
          '應用程式無法存取Oracle資料庫',
          '錯誤訊息顯示"Connection timeout"',
        ],
        solutions: [
          '檢查Oracle服務是否正在運行',
          '驗證網路連線和防火牆設定',
          '檢查連線字串配置',
          '增加連線超時時間',
        ],
        severity: 'high' as const,
      },
      {
        problem: '資料同步失敗',
        symptoms: [
          'PostgreSQL和Oracle資料不一致',
          '同步過程中斷',
          '出現資料衝突錯誤',
        ],
        solutions: [
          '檢查資料庫連線狀態',
          '分析衝突記錄並手動解決',
          '重新執行增量同步',
          '使用回滾功能恢復到穩定狀態',
        ],
        severity: 'medium' as const,
      },
    ];

    logInfo('建立指南...');
    const result = await documentationEngine.createTroubleshootingGuide(issues);

    if (result.success) {
      logSuccess('故障排除指南建立成功');
      log(`指南ID: ${result.guideId}`);
      log(`文件位置: ${result.documentPath}`);
    } else {
      logError(`指南建立失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `故障排除指南建立失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 生成遷移執行手冊命令
async function generateRunbook() {
  try {
    logStep('生成遷移執行手冊');

    const documentationEngine = new DocumentationEngine();

    const migrationSteps = [
      {
        phase: '準備階段',
        steps: [
          '備份現有PostgreSQL資料',
          '設定Oracle Docker環境',
          '驗證資料庫連線',
          '建立遷移快照',
        ],
        estimatedTime: 30,
        prerequisites: ['Docker已安裝', 'Oracle映像檔已下載'],
        validation: ['連線測試通過', '備份檔案完整'],
      },
      {
        phase: '遷移執行',
        steps: [
          '執行表格結構遷移',
          '執行資料遷移',
          '驗證資料完整性',
          '建立索引和約束',
        ],
        estimatedTime: 60,
        prerequisites: ['準備階段完成'],
        validation: ['資料計數一致', '索引建立成功'],
      },
      {
        phase: '驗證和切換',
        steps: [
          '執行完整性檢查',
          '進行效能測試',
          '切換應用程式連線',
          '監控系統狀態',
        ],
        estimatedTime: 45,
        prerequisites: ['遷移執行完成'],
        validation: ['所有測試通過', '應用程式正常運作'],
      },
    ];

    logInfo('生成執行手冊...');
    const result =
      await documentationEngine.generateMigrationRunbook(migrationSteps);

    if (result.success) {
      logSuccess('遷移執行手冊生成成功');
      log(`手冊ID: ${result.runbookId}`);
      log(`文件位置: ${result.documentPath}`);
    } else {
      logError(`執行手冊生成失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `執行手冊生成失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 建立程式碼範例命令
async function createCodeExamples() {
  try {
    logStep('建立程式碼範例');

    const documentationEngine = new DocumentationEngine();

    const examples = [
      {
        title: '連線Oracle資料庫',
        description: '如何使用oracledb建立Oracle連線',
        code: `import oracledb from 'oracledb'

const config = {
  user: 'pcm_user',
  password: 'pcm_pass123',
  connectString: 'localhost:1521/XE'
}

try {
  const connection = await oracledb.getConnection(config)
  console.log('Oracle連線成功')

  // 執行查詢
  const result = await connection.execute('SELECT * FROM projects')
  console.log('查詢結果:', result.rows)

  await connection.close()
} catch (error) {
  console.error('連線失敗:', error)
}`,
        language: 'typescript',
        category: '資料庫連線',
        difficulty: 'beginner' as const,
      },
      {
        title: '執行資料同步',
        description: '使用DataSynchronizer同步PostgreSQL和Oracle資料',
        code: `import { DataSynchronizer } from './lib/database/data-synchronization'

const synchronizer = new DataSynchronizer()

try {
  const result = await synchronizer.synchronizeTable('projects', 'bidirectional')

  if (result.success) {
    console.log(\`同步完成: \${result.recordsSynchronized} 筆記錄\`)

    if (result.conflicts.length > 0) {
      console.log('發現衝突:', result.conflicts)
    }
  } else {
    console.error('同步失敗:', result.error)
  }
} catch (error) {
  console.error('同步過程錯誤:', error)
}`,
        language: 'typescript',
        category: '資料同步',
        difficulty: 'intermediate' as const,
      },
      {
        title: '執行快速回滾',
        description: '使用RollbackManager進行資料回滾',
        code: `import { RollbackManager } from './lib/database/rollback-diagnostics'

const rollbackManager = new RollbackManager()

try {
  // 建立快照
  const snapshot = await rollbackManager.createRollbackSnapshot('projects')
  console.log('快照建立:', snapshot.snapshotId)

  // 執行回滾
  const rollback = await rollbackManager.executeRollback(
    snapshot.snapshotId,
    'postgresql'
  )

  if (rollback.success) {
    console.log('回滾成功')
  }
} catch (error) {
  console.error('回滾失敗:', error)
}`,
        language: 'typescript',
        category: '回滾管理',
        difficulty: 'advanced' as const,
      },
    ];

    logInfo('建立程式碼範例...');
    const result = await documentationEngine.createCodeExamples(examples);

    if (result.success) {
      logSuccess('程式碼範例建立成功');
      log(`範例位置: ${result.examplesPath}`);
      log(`建立時間: ${result.generatedAt.toLocaleString()}`);
    } else {
      logError(`程式碼範例建立失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `程式碼範例建立失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 搜尋文件命令
async function searchDocs(query: string) {
  try {
    logStep(`搜尋文件: "${query}"`);

    const documentationEngine = new DocumentationEngine();

    logInfo('執行搜尋...');
    const result = await documentationEngine.searchDocumentation(query);

    log('\n🔍 搜尋結果', 'bright');
    log('='.repeat(60));

    log(
      `找到 ${result.totalResults} 個結果 (搜尋時間: ${result.searchTime}ms)`
    );

    if (result.results.length > 0) {
      log('');
      result.results.forEach((item, index) => {
        log(`${index + 1}. ${item.title}`, 'cyan');
        log(`   類型: ${item.type}`);
        log(`   相關性: ${Math.round(item.relevance * 100)}%`);
        log(`   摘要: ${item.content}`);
        log(`   位置: ${item.path}`);
        log('');
      });
    } else {
      logInfo('未找到相關文件');
    }
  } catch (error) {
    logError(
      `搜尋失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 儲存知識文章命令
async function storeArticle(title: string, category: string, content: string) {
  try {
    logStep(`儲存知識文章: ${title}`);

    const knowledgeBase = new KnowledgeBase();

    const article = {
      title,
      content,
      category,
      tags: category.split(',').map(tag => tag.trim()),
      author: 'system',
    };

    logInfo('儲存文章...');
    const result = await knowledgeBase.storeArticle(article);

    if (result.success) {
      logSuccess('知識文章儲存成功');
      log(`文章ID: ${result.articleId}`);
      log(`儲存時間: ${result.storedAt.toLocaleString()}`);
    } else {
      logError(`文章儲存失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `儲存文章失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 搜尋知識庫命令
async function searchKnowledge(terms: string[]) {
  try {
    logStep(`搜尋知識庫: ${terms.join(', ')}`);

    const knowledgeBase = new KnowledgeBase();

    logInfo('搜尋知識庫...');
    const result = await knowledgeBase.searchKnowledge(terms);

    log('\n🧠 知識搜尋結果', 'bright');
    log('='.repeat(70));

    log(
      `找到 ${result.results.length} 個結果 (搜尋時間: ${result.searchTime}ms)`
    );

    if (result.results.length > 0) {
      log('');
      result.results.forEach((item, index) => {
        log(`${index + 1}. ${item.title}`, 'cyan');
        log(`   相關性: ${Math.round(item.relevance * 100)}%`);
        log(`   內容摘要: ${item.content}`);
        log(`   文章ID: ${item.articleId}`);
        log('');
      });
    } else {
      logInfo('未找到相關知識');
    }
  } catch (error) {
    logError(
      `知識搜尋失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 生成知識報告命令
async function generateKnowledgeReport() {
  try {
    logStep('生成知識庫報告');

    const knowledgeBase = new KnowledgeBase();

    logInfo('收集知識庫統計...');
    const report = await knowledgeBase.generateKnowledgeReport();

    log('\n📚 知識庫報告', 'bright');
    log('='.repeat(80));

    log(`報告ID: ${report.reportId}`);

    log('\n📊 統計資訊:', 'cyan');
    log(`  總文章數: ${report.statistics.totalArticles}`);
    log(`  總瀏覽數: ${report.statistics.totalViews}`);
    log(`  平均評分: ${report.statistics.averageRating.toFixed(1)}`);

    if (report.statistics.topCategories.length > 0) {
      log(
        `  熱門類別: ${report.statistics.topCategories.slice(0, 3).join(', ')}`
      );
    }

    if (report.topArticles.length > 0) {
      log('\n🔥 熱門文章:', 'yellow');
      report.topArticles.slice(0, 5).forEach((article, index) => {
        log(
          `  ${index + 1}. ${article.title} (${article.views} 次瀏覽, ${article.rating.toFixed(1)} 分)`
        );
      });
    }

    if (Object.keys(report.categoryBreakdown).length > 0) {
      log('\n📋 類別分佈:', 'blue');
      Object.entries(report.categoryBreakdown).forEach(([category, count]) => {
        log(`  ${category}: ${count} 篇文章`);
      });
    }
  } catch (error) {
    logError(
      `知識報告生成失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 建立互動式指南命令
async function createGuide(title: string, description: string) {
  try {
    logStep(`建立互動式指南: ${title}`);

    const interactiveGuides = new InteractiveGuides();

    const guide = {
      title,
      description,
      steps: [
        {
          title: '準備環境',
          description: '設定遷移所需的環境',
          actions: ['install_docker', 'download_oracle_image', 'setup_network'],
        },
        {
          title: '建立連線',
          description: '建立到Oracle和PostgreSQL的連線',
          actions: ['test_postgresql_connection', 'test_oracle_connection'],
        },
        {
          title: '執行遷移',
          description: '開始資料遷移過程',
          actions: ['create_snapshot', 'migrate_data', 'verify_migration'],
        },
      ],
      estimatedTime: 90,
      difficulty: 'intermediate' as const,
    };

    logInfo('建立指南...');
    const result = await interactiveGuides.createInteractiveGuide(guide);

    if (result.success) {
      logSuccess('互動式指南建立成功');
      log(`指南ID: ${result.guideId}`);
      log(`建立時間: ${result.createdAt.toLocaleString()}`);
    } else {
      logError(`指南建立失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `建立指南失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 建立團隊工作空間命令
async function createWorkspace(
  name: string,
  description: string,
  members: string[]
) {
  try {
    logStep(`建立團隊工作空間: ${name}`);

    const teamCollaboration = new TeamCollaboration();

    const workspace = {
      name,
      description,
      members,
      permissions: ['read', 'write', 'comment'],
    };

    logInfo('建立工作空間...');
    const result = await teamCollaboration.createWorkspace(workspace);

    if (result.success) {
      logSuccess('團隊工作空間建立成功');
      log(`工作空間ID: ${result.workspaceId}`);
      log(`成員數量: ${members.length}`);
      log(`建立時間: ${result.createdAt.toLocaleString()}`);
    } else {
      logError(`工作空間建立失敗: ${result.error}`);
    }
  } catch (error) {
    logError(
      `建立工作空間失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 追蹤團隊進度命令
async function trackTeamProgress(teamId: string) {
  try {
    logStep(`追蹤團隊進度: ${teamId}`);

    const teamCollaboration = new TeamCollaboration();

    logInfo('收集團隊數據...');
    const progress = await teamCollaboration.trackTeamProgress(teamId);

    log('\n👥 團隊進度報告', 'bright');
    log('='.repeat(70));

    log(`團隊ID: ${progress.teamId}`);
    log(`整體進度: ${Math.round(progress.overallProgress)}%`);

    if (progress.memberProgress.length > 0) {
      log('\n📈 成員進度:', 'cyan');
      progress.memberProgress.forEach(member => {
        log(`  ${member.userName} (${member.userId}): ${member.progress}%`);
        if (member.completedModules.length > 0) {
          log(`    已完成: ${member.completedModules.join(', ')}`);
        }
      });
    }

    if (progress.recommendations.length > 0) {
      log('\n💡 建議:', 'yellow');
      progress.recommendations.forEach(rec => {
        log(`  - ${rec}`);
      });
    }
  } catch (error) {
    logError(
      `團隊進度追蹤失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 生成團隊報告命令
async function generateTeamReport(teamId: string, reportType: string) {
  try {
    logStep(`生成團隊報告: ${teamId} (${reportType})`);

    const teamCollaboration = new TeamCollaboration();

    logInfo('生成報告...');
    const report = await teamCollaboration.generateTeamReport(
      teamId,
      reportType
    );

    log('\n📄 團隊報告', 'bright');
    log('='.repeat(80));

    log(`報告ID: ${report.reportId}`);
    log(`團隊ID: ${report.teamId}`);
    log(`報告類型: ${report.reportType}`);
    log(`生成時間: ${report.generatedAt.toLocaleString()}`);

    log('\n📋 報告內容:', 'cyan');
    log(`進度摘要: ${report.content.progressSummary}`);

    if (report.content.achievements.length > 0) {
      log('\n🏆 成就:', 'green');
      report.content.achievements.forEach(achievement => {
        log(`  ✅ ${achievement}`);
      });
    }

    if (report.content.areas_for_improvement.length > 0) {
      log('\n📈 改進領域:', 'yellow');
      report.content.areas_for_improvement.forEach(area => {
        log(`  🔧 ${area}`);
      });
    }

    if (report.content.upcoming_deadlines.length > 0) {
      log('\n⏰ 即將到期:', 'red');
      report.content.upcoming_deadlines.forEach(deadline => {
        log(`  📅 ${deadline}`);
      });
    }
  } catch (error) {
    logError(
      `團隊報告生成失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// CLI程式設定
program
  .name('training-documentation')
  .description('PCM團隊培訓和文件支援工具')
  .version('1.0.0');

// 培訓管理命令群組
const trainingCommand = program.command('training').description('培訓管理命令');

trainingCommand
  .command('create-module <title> <level> <duration>')
  .description(
    '建立培訓模組 (level: beginner|intermediate|advanced, duration: 分鐘)'
  )
  .action(createModule);

trainingCommand
  .command('update-progress <userId> <moduleId> <percentage>')
  .description('更新培訓進度')
  .action(updateProgress);

trainingCommand
  .command('report')
  .description('生成培訓報告')
  .action(generateTrainingReport);

trainingCommand
  .command('recommend <userId> <role> <experience>')
  .description('推薦培訓路徑 (role: developer|admin|dba|manager)')
  .action(recommendPath);

// 文件生成命令群組
const docsCommand = program.command('docs').description('文件生成命令');

docsCommand.command('api').description('生成API文件').action(generateAPIDocs);

docsCommand
  .command('troubleshooting')
  .description('建立故障排除指南')
  .action(createTroubleshootingGuide);

docsCommand
  .command('runbook')
  .description('生成遷移執行手冊')
  .action(generateRunbook);

docsCommand
  .command('examples')
  .description('建立程式碼範例')
  .action(createCodeExamples);

docsCommand
  .command('search <query>')
  .description('搜尋文件')
  .action(searchDocs);

// 知識庫命令群組
const knowledgeCommand = program
  .command('knowledge')
  .description('知識庫管理命令');

knowledgeCommand
  .command('store <title> <category> <content>')
  .description('儲存知識文章')
  .action(storeArticle);

knowledgeCommand
  .command('search <terms...>')
  .description('搜尋知識庫')
  .action(searchKnowledge);

knowledgeCommand
  .command('report')
  .description('生成知識庫報告')
  .action(generateKnowledgeReport);

// 互動式指南命令群組
const guideCommand = program.command('guide').description('互動式指南管理命令');

guideCommand
  .command('create <title> <description>')
  .description('建立互動式指南')
  .action(createGuide);

// 團隊協作命令群組
const teamCommand = program.command('team').description('團隊協作命令');

teamCommand
  .command('create-workspace <name> <description> <members...>')
  .description('建立團隊工作空間')
  .action(createWorkspace);

teamCommand
  .command('progress <teamId>')
  .description('追蹤團隊進度')
  .action(trackTeamProgress);

teamCommand
  .command('report <teamId> <reportType>')
  .description('生成團隊報告 (reportType: daily|weekly|monthly)')
  .action(generateTeamReport);

// 主程式執行
if (require.main === module) {
  program.parse();
}

export {
  createModule,
  updateProgress,
  generateTrainingReport,
  recommendPath,
  generateAPIDocs,
  createTroubleshootingGuide,
  generateRunbook,
  createCodeExamples,
  searchDocs,
  storeArticle,
  searchKnowledge,
  generateKnowledgeReport,
  createGuide,
  createWorkspace,
  trackTeamProgress,
  generateTeamReport,
};
