import {
  DataComparisonTool,
  DatabaseConfig,
  DatabaseConnection,
  CountComparisonResult,
  ContentComparisonResult,
  StructureComparisonResult,
  ComparisonReport,
  ComparisonConfig,
  TableMetadata,
  ComparisonSummary,
  ComparisonError,
  ProgressCallback
} from './data-comparison.types';

export class DataComparisonService implements DataComparisonTool {
  private sourceConnection: DatabaseConnection;
  private targetConnection: DatabaseConnection;

  constructor(sourceConnection: DatabaseConnection, targetConnection: DatabaseConnection) {
    this.sourceConnection = sourceConnection;
    this.targetConnection = targetConnection;
  }

  async compareTableCounts(tables: string[]): Promise<CountComparisonResult[]> {
    const results: CountComparisonResult[] = [];

    for (const tableName of tables) {
      try {
        const sourceCount = await this.getRowCountFromConnection(this.sourceConnection, tableName);
        const targetCount = await this.getRowCountFromConnection(this.targetConnection, tableName);

        const difference = Math.abs(sourceCount - targetCount);
        const percentageDiff = sourceCount === 0 ? 0 : (difference / sourceCount) * 100;

        results.push({
          tableName,
          sourceCount,
          targetCount,
          countMatch: sourceCount === targetCount,
          difference,
          percentageDiff
        });
      } catch (error) {
        throw new Error(`Failed to compare counts for table ${tableName}: ${error}`);
      }
    }

    return results;
  }

  async compareTableContent(tables: string[], sampleSize = 1000): Promise<ContentComparisonResult[]> {
    const results: ContentComparisonResult[] = [];

    for (const tableName of tables) {
      try {
        const sourceData = await this.extractSampleDataFromConnection(
          this.sourceConnection,
          tableName,
          sampleSize
        );
        const targetData = await this.extractSampleDataFromConnection(
          this.targetConnection,
          tableName,
          sampleSize
        );

        const comparison = this.compareDataSets(sourceData, targetData, tableName);
        results.push(comparison);
      } catch (error) {
        throw new Error(`Failed to compare content for table ${tableName}: ${error}`);
      }
    }

    return results;
  }

  async compareTableStructure(tables: string[]): Promise<StructureComparisonResult[]> {
    const results: StructureComparisonResult[] = [];

    for (const tableName of tables) {
      try {
        const sourceMetadata = await this.sourceConnection.getMetadata(tableName);
        const targetMetadata = await this.targetConnection.getMetadata(tableName);

        const comparison = this.compareTableStructures(sourceMetadata, targetMetadata);
        results.push(comparison);
      } catch (error) {
        throw new Error(`Failed to compare structure for table ${tableName}: ${error}`);
      }
    }

    return results;
  }

  async performFullComparison(config: ComparisonConfig): Promise<ComparisonReport> {
    const startTime = Date.now();
    const executionId = `comp_${startTime}`;
    const errors: ComparisonError[] = [];

    try {
      // 連線到資料庫
      await this.connectDatabases();

      // 執行各種比對
      const countResults = await this.compareTableCounts(config.tables);
      const contentResults = await this.compareTableContent(config.tables, config.maxSampleSize);
      const structureResults = await this.compareTableStructure(config.tables);

      // 生成摘要
      const summary = this.generateSummary(countResults, contentResults, structureResults);

      // 確保執行時間至少為 1ms
      const executionTime = Math.max(1, Date.now() - startTime);

      return {
        executionId,
        timestamp: new Date(),
        config,
        summary,
        countResults,
        contentResults,
        structureResults,
        errors,
        executionTime
      };
    } catch (error) {
      errors.push({
        operation: 'full_comparison',
        errorCode: 'COMPARISON_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      throw error;
    } finally {
      await this.disconnectDatabases();
    }
  }

  async getTableList(database: DatabaseConfig): Promise<string[]> {
    // 簡化實作，實際應該查詢資料庫元資料
    return ['users', 'projects', 'wbs_items', 'project_members', 'vendors', 'duty_schedules'];
  }

  async getTableMetadata(database: DatabaseConfig, tableName: string): Promise<TableMetadata> {
    // 根據資料庫類型選擇連線
    const connection = database.type === 'postgresql' ? this.sourceConnection : this.targetConnection;

    if (!connection.isConnected()) {
      await connection.connect();
    }

    return await connection.getMetadata(tableName);
  }

  async extractSampleData(database: DatabaseConfig, tableName: string, sampleSize: number): Promise<any[]> {
    const connection = database.type === 'postgresql' ? this.sourceConnection : this.targetConnection;
    return await this.extractSampleDataFromConnection(connection, tableName, sampleSize);
  }

  async getRowCount(database: DatabaseConfig, tableName: string): Promise<number> {
    const connection = database.type === 'postgresql' ? this.sourceConnection : this.targetConnection;

    if (!connection.isConnected()) {
      await connection.connect();
    }

    return await this.getRowCountFromConnection(connection, tableName);
  }

  async generateReport(results: ComparisonReport): Promise<string> {
    const reportLines: string[] = [];

    reportLines.push('='.repeat(80));
    reportLines.push('資料比對報告');
    reportLines.push('='.repeat(80));
    reportLines.push(`執行時間: ${results.timestamp.toISOString()}`);
    reportLines.push(`執行 ID: ${results.executionId}`);
    reportLines.push(`總耗時: ${results.executionTime}ms`);
    reportLines.push('');

    // 摘要
    reportLines.push('摘要');
    reportLines.push('-'.repeat(40));
    reportLines.push(`總表格數: ${results.summary.totalTables}`);
    reportLines.push(`計數不匹配: ${results.summary.tablesWithCountMismatch}`);
    reportLines.push(`內容差異: ${results.summary.tablesWithContentDifferences}`);
    reportLines.push(`結構差異: ${results.summary.tablesWithStructureDifferences}`);
    reportLines.push(`資料完整性: ${results.summary.overallDataIntegrity.toFixed(2)}%`);
    reportLines.push('');

    // 計數結果
    if (results.countResults.length > 0) {
      reportLines.push('表格計數比對');
      reportLines.push('-'.repeat(40));
      for (const result of results.countResults) {
        const status = result.countMatch ? '✓' : '✗';
        reportLines.push(`${status} ${result.tableName}: ${result.sourceCount} -> ${result.targetCount}`);
        if (!result.countMatch) {
          reportLines.push(`  差異: ${result.difference} (${result.percentageDiff.toFixed(2)}%)`);
        }
      }
      reportLines.push('');
    }

    // 錯誤報告
    if (results.errors.length > 0) {
      reportLines.push('錯誤報告');
      reportLines.push('-'.repeat(40));
      for (const error of results.errors) {
        reportLines.push(`✗ ${error.operation}: ${error.message}`);
      }
    }

    return reportLines.join('\n');
  }

  async exportResults(results: ComparisonReport, format: 'json' | 'csv' | 'html'): Promise<Buffer> {
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(results, null, 2), 'utf-8');

      case 'csv':
        return this.generateCSVReport(results);

      case 'html':
        return this.generateHTMLReport(results);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // 私有輔助方法
  private async connectDatabases(): Promise<void> {
    if (!this.sourceConnection.isConnected()) {
      await this.sourceConnection.connect();
    }
    if (!this.targetConnection.isConnected()) {
      await this.targetConnection.connect();
    }
  }

  private async disconnectDatabases(): Promise<void> {
    if (this.sourceConnection.isConnected()) {
      await this.sourceConnection.disconnect();
    }
    if (this.targetConnection.isConnected()) {
      await this.targetConnection.disconnect();
    }
  }

  private async getRowCountFromConnection(connection: DatabaseConnection, tableName: string): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM ${tableName}`;
    const result = await connection.executeQuery(query);
    return result[0]?.count || 0;
  }

  private async extractSampleDataFromConnection(
    connection: DatabaseConnection,
    tableName: string,
    sampleSize: number
  ): Promise<any[]> {
    const query = `SELECT * FROM ${tableName} LIMIT ${sampleSize}`;
    return await connection.executeQuery(query);
  }

  private compareDataSets(sourceData: any[], targetData: any[], tableName: string): ContentComparisonResult {
    const totalRecords = Math.max(sourceData.length, targetData.length);
    let exactMatches = 0;
    let partialMatches = 0;
    let missingInTarget = 0;
    let extraInTarget = 0;

    // 簡化的比對邏輯 - 基於索引位置
    const minLength = Math.min(sourceData.length, targetData.length);

    for (let i = 0; i < minLength; i++) {
      if (this.deepEqual(sourceData[i], targetData[i])) {
        exactMatches++;
      } else {
        partialMatches++;
      }
    }

    missingInTarget = Math.max(0, sourceData.length - targetData.length);
    extraInTarget = Math.max(0, targetData.length - sourceData.length);

    return {
      tableName,
      totalRecords,
      sampledRecords: totalRecords,
      exactMatches,
      partialMatches,
      missingInTarget,
      extraInTarget,
      fieldDifferences: [] // 簡化版本暫不實作詳細差異
    };
  }

  private compareTableStructures(source: TableMetadata, target: TableMetadata): StructureComparisonResult {
    const missingColumns = source.columns.filter(
      sc => !target.columns.some(tc => tc.name === sc.name)
    );

    const extraColumns = target.columns.filter(
      tc => !source.columns.some(sc => sc.name === tc.name)
    );

    const structureMatch = missingColumns.length === 0 && extraColumns.length === 0;

    return {
      tableName: source.name,
      structureMatch,
      missingColumns,
      extraColumns,
      columnDifferences: [],
      missingIndexes: [],
      extraIndexes: []
    };
  }

  private generateSummary(
    countResults: CountComparisonResult[],
    contentResults: ContentComparisonResult[],
    structureResults: StructureComparisonResult[]
  ): ComparisonSummary {
    const totalTables = countResults.length;
    const tablesWithCountMismatch = countResults.filter(r => !r.countMatch).length;
    const tablesWithContentDifferences = contentResults.filter(r =>
      r.exactMatches < r.totalRecords || r.missingInTarget > 0 || r.extraInTarget > 0
    ).length;
    const tablesWithStructureDifferences = structureResults.filter(r => !r.structureMatch).length;

    const totalIssues = tablesWithCountMismatch + tablesWithContentDifferences + tablesWithStructureDifferences;
    const overallDataIntegrity = totalTables === 0 ? 100 : ((totalTables - totalIssues) / totalTables) * 100;

    return {
      totalTables,
      tablesWithCountMismatch,
      tablesWithContentDifferences,
      tablesWithStructureDifferences,
      overallDataIntegrity,
      criticalIssues: tablesWithCountMismatch,
      warnings: tablesWithContentDifferences + tablesWithStructureDifferences
    };
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  private generateCSVReport(results: ComparisonReport): Buffer {
    const lines: string[] = [];
    lines.push('Table,Source Count,Target Count,Count Match,Difference,Percentage Diff');

    for (const result of results.countResults) {
      lines.push([
        result.tableName,
        result.sourceCount,
        result.targetCount,
        result.countMatch,
        result.difference,
        result.percentageDiff.toFixed(2)
      ].join(','));
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private generateHTMLReport(results: ComparisonReport): Buffer {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>資料比對報告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .match { color: green; }
        .mismatch { color: red; }
    </style>
</head>
<body>
    <h1>資料比對報告</h1>
    <p>執行時間: ${results.timestamp.toISOString()}</p>
    <p>執行 ID: ${results.executionId}</p>

    <h2>摘要</h2>
    <ul>
        <li>總表格數: ${results.summary.totalTables}</li>
        <li>計數不匹配: ${results.summary.tablesWithCountMismatch}</li>
        <li>資料完整性: ${results.summary.overallDataIntegrity.toFixed(2)}%</li>
    </ul>

    <h2>表格計數比對</h2>
    <table>
        <tr>
            <th>表格名稱</th>
            <th>來源計數</th>
            <th>目標計數</th>
            <th>狀態</th>
            <th>差異</th>
        </tr>
        ${results.countResults.map(r => `
        <tr>
            <td>${r.tableName}</td>
            <td>${r.sourceCount}</td>
            <td>${r.targetCount}</td>
            <td class="${r.countMatch ? 'match' : 'mismatch'}">
                ${r.countMatch ? '✓' : '✗'}
            </td>
            <td>${r.difference}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>`;

    return Buffer.from(html, 'utf-8');
  }
}