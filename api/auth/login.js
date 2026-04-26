// =========================================
// POST /api/auth/login
// =========================================
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';
import { applyCors } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await ensureSchema();
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const { rows } = await sql`
      SELECT * FROM admins WHERE username = ${username.toLowerCase().trim()} LIMIT 1
    `;
    const admin = rows[0];
    if (!admin) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = signToken({ id: admin.id, username: admin.username });

    return res.json({
      message: 'Login successful',
      token,
      admin: { id: admin.id, username: admin.username },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
}
