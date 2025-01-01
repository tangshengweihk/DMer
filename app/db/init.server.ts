import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

export async function initializeDatabase() {
  const dbPath = path.join(process.cwd(), 'app/db/database.sqlite');
  const schemaPath = path.join(process.cwd(), 'app/db/schema.sql');

  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schema);
    
    await db.close();
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
} 