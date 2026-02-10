import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// DATABASE_URL must be set (e.g. in .env). See .env.example.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and set your database URL.');
}
console.log('Connecting to database:', connectionString.replace(/:[^:@]+@/, ':***@'));

// RDS (and most cloud Postgres) require SSL. Use SSL when not connecting to localhost.
const isLocalDb = /localhost|127\.0\.0\.1/.test(connectionString);
const sslConfig = isLocalDb ? false : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection
pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

pool.on('connect', () => {
  console.log('Successfully connected to PostgreSQL database');
});

export const db = drizzle(pool, { schema });