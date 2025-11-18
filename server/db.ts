import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Function to seed trip types
export async function seedTripTypes() {
  await db.insert(schema.tripTypes).values([
    { id: 'car', name: 'Car' },
    { id: 'plane', name: 'Plane' },
    { id: 'bike', name: 'Bicycle' },
    { id: 'walk', name: 'Walk' },
    { id: 'scooter', name: 'Scooter' },
    { id: 'monowheel', name: 'Monowheel' },
    { id: 'sea', name: 'Sea' },
    { id: 'mountains', name: 'Mountains' },
    { id: 'sights', name: 'Sights' },
  ]).onConflictDoNothing();
}

// Ensure messages table has trip_id column (uuid, nullable)
export async function ensureMessagesTripIdColumn() {
  // Check via information_schema
  const check = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='messages' AND column_name='trip_id'`);
  if (check.rowCount === 0) {
    console.log('[DB] Adding messages.trip_id column');
    await pool.query('ALTER TABLE messages ADD COLUMN trip_id uuid');
  }
}

export async function ensureUsersRoleColumn() {
  const check = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='role'");
  if (check.rowCount === 0) {
    console.log('[DB] Adding users.role column');
    await pool.query("ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'user'");
  }
}

