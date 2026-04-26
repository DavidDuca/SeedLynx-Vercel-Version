// =========================================
// GET /api/auth/me  (protected)
// =========================================
import { sql, ensureSchema } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { applyCors } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (requireAdmin(req, res)) return;

  try {
    await ensureSchema();
    const { rows } = await sql`SELECT id, username, created_at FROM admins WHERE id=${req.admin.id}`;
    if (!rows[0]) return res.status(404).json({ message: 'Admin not found.' });
    return res.json({ admin: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}
