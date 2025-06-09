import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use local PostgreSQL database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://reposition_user:1234@localhost:5432/reposition_db';

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  // Additional local connection options
  host: 'localhost',
  port: 5432,
  database: 'reposition_db',
  user: 'reposition_user',
  password: '1234'
});

export const db = drizzle(pool, { schema });