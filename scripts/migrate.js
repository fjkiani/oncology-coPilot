import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dirname } from 'path';
import fetch from 'node-fetch';

global.fetch = fetch;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Hardcode connection string temporarily for testing
const DATABASE_URL = "postgresql://finan-smart_owner:uk3aed9QZotj@ep-wispy-breeze-a5iadk8t.us-east-2.aws.neon.tech/beat-cancer?sslmode=require";

async function runMigration() {
  console.log('Starting migration...');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../drizzle/migrations/0000_initial.sql');
    console.log('SQL file path:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    // Run the migration
    await pool.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 