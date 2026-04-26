// =========================================
// api/_lib/db.js — Vercel Postgres helper
// =========================================
import { sql } from '@vercel/postgres';

let initialized = false;

/**
 * Lazily ensures tables + default admin exist.
 * Runs once per warm Lambda. Safe to call on every request.
 */
export async function ensureSchema() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      service TEXT DEFAULT 'consultation',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (date, time)
    );
  `;

  // Seed default admin (admin / admin123) — change in production!
  const { rows } = await sql`SELECT id FROM admins WHERE username='admin' LIMIT 1`;
  if (rows.length === 0) {
    const bcrypt = (await import('bcryptjs')).default;
    const hashed = await bcrypt.hash('admin123', 12);
    await sql`INSERT INTO admins (username, password) VALUES ('admin', ${hashed})`;
  }

  initialized = true;
}

export { sql };
