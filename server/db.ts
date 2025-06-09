import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Force local PostgreSQL database connection
const LOCAL_DATABASE_URL = 'postgresql://reposition_user:1234@localhost:5432/reposition_db';

console.log('Connecting to LOCAL database:', LOCAL_DATABASE_URL);

export const pool = new Pool({ 
  connectionString: LOCAL_DATABASE_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

pool.on('connect', () => {
  console.log('Successfully connected to LOCAL PostgreSQL database');
});

export const db = drizzle(pool, { schema });