import pg from 'pg';
const { Client } = pg;
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../.env') });

// Script: wipe all user tables except the trip_types reference
(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL env-var not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Get list of all tables in public schema except trip_types
    const { rows } = await client.query(
      `SELECT tablename
         FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('trip_types', 'cities');`
    );

    if (rows.length === 0) {
      console.log('ℹ️  No tables to truncate – database is empty.');
      return;
    }

    const tableNames = rows.map(r => r.tablename).join(', ');

    // Transaction in case of error
    await client.query('BEGIN');
    await client.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
    await client.query('COMMIT');

    console.log(`✅ Tables truncated: ${tableNames}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Wipe error:', err);
  } finally {
    await client.end();
  }
})(); 