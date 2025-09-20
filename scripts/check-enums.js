#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '192.168.1.183',
  port: 30432,
  database: 'app_db',
  user: 'admin',
  password: 'XcW04ByX6GbVdt1gw4EJ5XRY',
  ssl: { rejectUnauthorized: false }
};

async function checkEnums() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 連接資料庫...');
    await client.connect();
    console.log('✅ 資料庫連接成功！');

    // 檢查所有枚舉類型
    console.log('\n📋 檢查資料庫中的枚舉類型:');
    const enumTypes = await client.query(`
      SELECT 
        t.typname as enum_name,
        string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      GROUP BY t.typname
      ORDER BY t.typname
    `);
    
    enumTypes.rows.forEach(row => {
      console.log(`\n🏷️  ${row.enum_name}:`);
      console.log(`   值: ${row.enum_values}`);
    });

    // 檢查現有的廠商資料
    console.log('\n📊 現有廠商資料範例:');
    const existingVendors = await client.query(`
      SELECT name, type, status 
      FROM vendors 
      LIMIT 5
    `);
    
    if (existingVendors.rows.length > 0) {
      existingVendors.rows.forEach((vendor, index) => {
        console.log(`   ${index + 1}. ${vendor.name} - type: "${vendor.type}", status: "${vendor.status}"`);
      });
    } else {
      console.log('   沒有現有的廠商資料');
    }

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 資料庫連接已關閉');
  }
}

checkEnums().catch(console.error);