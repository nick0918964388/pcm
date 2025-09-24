#!/usr/bin/env node

/**
 * 測試照片上傳 API 並捕獲詳細日誌
 */

const axios = require('axios');
const FormData = require('form-data');

async function testPhotoUpload() {
  console.log('🚀 開始測試照片上傳 API...');

  try {
    // 建立一個小的測試圖片檔案 (1x1 透明 PNG)
    const pngBuffer = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR chunk length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x00,
      0x01, // width = 1
      0x00,
      0x00,
      0x00,
      0x01, // height = 1
      0x08,
      0x06,
      0x00,
      0x00,
      0x00, // bit depth, color type, compression, filter, interlace
      0x1f,
      0x15,
      0xc4,
      0x89, // CRC
      0x00,
      0x00,
      0x00,
      0x0a, // IDAT chunk length
      0x49,
      0x44,
      0x41,
      0x54, // IDAT
      0x78,
      0x9c,
      0x62,
      0x00,
      0x00,
      0x00,
      0x02,
      0x00,
      0x01, // compressed data
      0xe2,
      0x21,
      0xbc,
      0x33, // CRC
      0x00,
      0x00,
      0x00,
      0x00, // IEND chunk length
      0x49,
      0x45,
      0x4e,
      0x44, // IEND
      0xae,
      0x42,
      0x60,
      0x82, // CRC
    ]);

    // 建立 FormData
    const form = new FormData();
    form.append('files', pngBuffer, {
      filename: 'test-photo.png',
      contentType: 'image/png',
    });
    form.append('album', 'test-album');
    form.append('description', '測試上傳照片');

    console.log('📤 向 API 發送請求...');
    console.log('   URL: http://localhost:3001/api/projects/proj001/photos');
    console.log('   Method: POST');
    console.log('   Content-Type: multipart/form-data');

    // 發送請求
    const response = await axios.post(
      'http://localhost:3001/api/projects/proj001/photos',
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 30000,
      }
    );

    console.log('📥 收到回應:');
    console.log('   Status:', response.status);
    console.log('   Headers:', response.headers);
    console.log('   Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('✅ 照片上傳成功！');
      console.log('📊 照片資訊:');
      console.log('   ID:', response.data.data.id);
      console.log('   專案ID:', response.data.data.projectId);
      console.log('   相簿ID:', response.data.data.albumId);
      console.log('   檔案名稱:', response.data.data.fileName);
      console.log('   上傳時間:', response.data.data.uploadedAt);
    } else {
      console.log('❌ 上傳失敗:', response.data.error);
    }
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }

  console.log('');
  console.log(
    '💡 請檢查 Next.js 開發伺服器的終端機輸出，查看詳細的資料庫操作日誌：'
  );
  console.log('   - 應該看到 "⏳ 正在插入照片到資料庫"');
  console.log('   - 應該看到 "📊 SQL參數"');
  console.log('   - 應該看到 "📊 INSERT結果"');
  console.log('   - 應該看到 "✅ 照片上傳成功"');
}

// 執行測試
testPhotoUpload().catch(console.error);
