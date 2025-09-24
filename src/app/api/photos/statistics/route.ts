/**
 * API Endpoint for Photo Statistics Report
 * Task 8.3: 實作 Metadata 匯出和報告功能
 *
 * 建立照片 metadata 統計報告和分析功能
 * 利用 Oracle 檢視表 photo_statistics 優化查詢
 */

import { NextRequest, NextResponse } from 'next/server';
import { MetadataExportService } from '@/lib/services/metadata-export-service';
import { z } from 'zod';

// 請求參數驗證 schema
const statisticsRequestSchema = z.object({
  projectId: z.string(),
  exportFormat: z.enum(['json', 'pdf', 'html']).optional(),
});

/**
 * GET /api/photos/statistics
 * Get photo statistics for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Project ID is required',
        },
        { status: 400 }
      );
    }

    const exportService = new MetadataExportService();
    const statistics = await exportService.generateStatisticsReport(projectId);

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to generate statistics',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/statistics
 * Generate detailed statistics report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證請求參數
    const validationResult = statisticsRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request parameters',
          errors: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { projectId, exportFormat = 'json' } = validationResult.data;
    const exportService = new MetadataExportService();
    const statistics = await exportService.generateStatisticsReport(projectId);

    // 根據格式返回不同的內容
    if (exportFormat === 'json') {
      return NextResponse.json({
        success: true,
        data: statistics,
      });
    }

    // HTML 格式報告
    if (exportFormat === 'html') {
      const htmlReport = generateHTMLReport(statistics, projectId);
      return new NextResponse(htmlReport, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="photo-statistics-${projectId}.html"`,
        },
      });
    }

    // PDF 格式 (未來實作)
    if (exportFormat === 'pdf') {
      return NextResponse.json(
        {
          success: false,
          message: 'PDF export is not yet implemented',
        },
        { status: 501 }
      );
    }

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to generate statistics',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate HTML report from statistics
 */
function generateHTMLReport(statistics: any, projectId: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>照片統計報告 - 專案 ${projectId}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #00645A;
            border-bottom: 3px solid #00645A;
            padding-bottom: 10px;
        }
        h2 {
            color: #333;
            margin-top: 30px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #00645A;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #00645A;
            color: white;
        }
        tr:hover {
            background: #f5f5f5;
        }
        .chart-container {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>照片統計報告</h1>
        <p>專案 ID: ${projectId}</p>
        <p>報告生成時間: ${new Date().toLocaleString('zh-TW')}</p>

        <h2>總覽</h2>
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${statistics.summary.totalPhotos}</div>
                <div class="stat-label">照片總數</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.summary.totalSize}</div>
                <div class="stat-label">總檔案大小</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.summary.averageSize}</div>
                <div class="stat-label">平均檔案大小</div>
            </div>
            ${
              statistics.averageResolution
                ? `
            <div class="stat-card">
                <div class="stat-value">${statistics.averageResolution.width}x${statistics.averageResolution.height}</div>
                <div class="stat-label">平均解析度</div>
            </div>
            `
                : ''
            }
        </div>

        <h2>檔案類型分布</h2>
        <table>
            <thead>
                <tr>
                    <th>檔案類型</th>
                    <th>數量</th>
                    <th>百分比</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(statistics.typeDistribution)
                  .map(
                    ([type, count]: [string, any]) => `
                    <tr>
                        <td>${type}</td>
                        <td>${count}</td>
                        <td>${((count / statistics.summary.totalPhotos) * 100).toFixed(1)}%</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>

        <h2>上傳者排行榜</h2>
        <table>
            <thead>
                <tr>
                    <th>使用者</th>
                    <th>上傳數量</th>
                </tr>
            </thead>
            <tbody>
                ${statistics.topUploaders
                  .map(
                    (uploader: any) => `
                    <tr>
                        <td>${uploader.userId}</td>
                        <td>${uploader.count}</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>

        <h2>熱門標籤</h2>
        <table>
            <thead>
                <tr>
                    <th>標籤</th>
                    <th>使用次數</th>
                </tr>
            </thead>
            <tbody>
                ${statistics.topTags
                  .map(
                    (tag: any) => `
                    <tr>
                        <td>${tag.tag}</td>
                        <td>${tag.count}</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>

        <h2>月度趨勢</h2>
        <table>
            <thead>
                <tr>
                    <th>月份</th>
                    <th>上傳數量</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(statistics.monthlyTrend)
                  .map(
                    ([month, count]: [string, any]) => `
                    <tr>
                        <td>${month}</td>
                        <td>${count}</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
  `;
}
