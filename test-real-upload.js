/**
 * 測試真實照片上傳腳本
 * 生成一個測試圖片並上傳到指定專案
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 生成測試圖片
async function generateTestImage() {
  const width = 800;
  const height = 600;

  // 使用 Sharp 創建一個漸變測試圖片
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#4ECDC4;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#45B7D1;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="40%" text-anchor="middle" fill="white" font-size="48" font-weight="bold">
        測試照片
      </text>
      <text x="50%" y="50%" text-anchor="middle" fill="white" font-size="24">
        ${new Date().toLocaleString('zh-TW')}
      </text>
      <text x="50%" y="60%" text-anchor="middle" fill="white" font-size="20">
        PCM iPhoto 2.0 系統測試
      </text>
    </svg>
  `;

  // 將 SVG 轉換為 JPEG
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();

  return buffer;
}

// 上傳照片到專案
async function uploadPhoto(projectId, imageBuffer) {
  const FormData = require('form-data');
  const form = new FormData();

  // 創建 Blob/File 對象
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  form.append('file', imageBuffer, {
    filename: `test_photo_${Date.now()}.jpg`,
    contentType: 'image/jpeg',
  });

  const response = await fetch(
    `http://localhost:3002/api/projects/${projectId}/photos/upload`,
    {
      method: 'POST',
      body: form,
    }
  );

  return await response.json();
}

// 主函數
async function main() {
  try {
    console.log('📷 生成測試圖片...');
    const imageBuffer = await generateTestImage();
    console.log(`✅ 測試圖片已生成 (${imageBuffer.length} bytes)`);

    // 儲存測試圖片到本地（可選）
    const testFilePath = path.join(__dirname, 'test_photo.jpg');
    fs.writeFileSync(testFilePath, imageBuffer);
    console.log(`💾 測試圖片已儲存到: ${testFilePath}`);

    // 上傳到 proj002
    console.log('\n📤 上傳照片到 proj002...');
    const result = await uploadPhoto('proj002', imageBuffer);

    if (result.success) {
      console.log('✅ 照片上傳成功！');
      console.log('📊 回應資料:', JSON.stringify(result.data, null, 2));
      console.log(
        `\n🔗 縮圖URL: http://localhost:3002${result.data.thumbnailUrl}`
      );
      console.log(
        `🔗 中型圖URL: http://localhost:3002${result.data.mediumUrl}`
      );
      console.log(
        `🔗 原圖URL: http://localhost:3002${result.data.originalUrl}`
      );
    } else {
      console.error('❌ 上傳失敗:', result.error);
    }
  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

// 執行
main();
