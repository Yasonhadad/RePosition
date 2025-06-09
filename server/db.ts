import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use local PostgreSQL database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://reposition_user:1234@localhost:5432/reposition_db';

console.log('Connecting to database:', DATABASE_URL);

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

export const db = drizzle(pool, { schema });