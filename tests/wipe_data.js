import pg from 'pg';
const { Client } = pg;
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

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
    // Get list of all tables in public schema except trip_types/cities/users
    const { rows } = await client.query(
      `SELECT tablename
         FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('trip_types', 'cities', 'users');`
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

    await preserveAdminUser(client);
    await bootstrapAdminUser(client);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Wipe error:', err);
  } finally {
    await client.end();
  }
})(); 

async function bootstrapAdminUser(client) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️  ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap.');
    return;
  }

  try {
    const { rowCount } = await client.query(
      `SELECT 1 FROM users WHERE email = $1 LIMIT 1;`,
      [adminEmail],
    );

    if (rowCount > 0) {
      console.log(`ℹ️  Admin user already present (${adminEmail})`);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const userId = randomUUID();

    await client.query(
      `INSERT INTO users (id, name, email, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'admin', NOW(), NOW());`,
      [userId, adminName, adminEmail, hashedPassword],
    );

    console.log(`✅ Admin user created (${adminEmail})`);
  } catch (error) {
    console.error('❌ Failed to create admin user after wipe:', error);
  }
}

async function preserveAdminUser(client) {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn(
      '⚠️  ADMIN_EMAIL not set; users table will be truncated along with others.',
    );
    await client.query('TRUNCATE TABLE users CASCADE;');
    return;
  }

  await client.query(
    `DELETE FROM users WHERE email <> $1 OR email IS NULL;`,
    [adminEmail],
  );

  console.log(`✅ Preserved admin user (${adminEmail})`);
}