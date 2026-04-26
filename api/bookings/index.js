// =========================================
// /api/bookings
//   POST  → public (create booking)
//   GET   → admin (list bookings)
// =========================================
import { sql, ensureSchema } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { applyCors } from '../_lib/cors.js';

const VALID_TIMES    = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
const VALID_SERVICES = ['web','multimedia','both','consultation'];

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  try {
    await ensureSchema();

    if (req.method === 'POST') return createBooking(req, res);
    if (req.method === 'GET')  return listBookings(req, res);

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Bookings handler error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── public ──
async function createBooking(req, res) {
  const { name, email, date, time, service = 'consultation', message = '' } = req.body || {};

  if (!name || !email || !date || !time) {
    return res.status(400).json({ message: 'Name, email, date, and time are required.' });
  }
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ message: 'Name must be 2–100 characters.', field: 'name' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email address.', field: 'email' });
  }
  if (!VALID_TIMES.includes(time)) {
    return res.status(400).json({ message: 'Invalid time slot.', field: 'time' });
  }
  if (service && !VALID_SERVICES.includes(service)) {
    return res.status(400).json({ message: 'Invalid service.', field: 'service' });
  }
  if (message && message.length > 1000) {
    return res.status(400).json({ message: 'Message too long.', field: 'message' });
  }

  // Date must be today or future
  const selected = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(selected) || selected < today) {
    return res.status(400).json({ message: 'Please select a future date.', field: 'date' });
  }

  try {
    const { rows } = await sql`
      INSERT INTO bookings (name, email, date, time, service, message, status)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${date}, ${time},
              ${service}, ${message}, 'pending')
      RETURNING *
    `;
    return res.status(201).json({
      message: 'Booking created successfully!',
      booking: rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        message: 'That time slot is already booked. Please choose another.',
        field: 'time',
      });
    }
    throw err;
  }
}

// ── admin ──
async function listBookings(req, res) {
  if (requireAdmin(req, res)) return;

  const status = req.query.status || null;
  const date   = req.query.date   || null;
  const limit  = Math.min(parseInt(req.query.limit  || '100', 10), 500);
  const page   = Math.max(parseInt(req.query.page   || '1',   10), 1);
  const offset = (page - 1) * limit;

  const { rows } = await sql`
    SELECT * FROM bookings
    WHERE (${status}::text IS NULL OR status = ${status})
      AND (${date}::text   IS NULL OR date   = ${date})
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const totalRes = await sql`
    SELECT COUNT(*)::int AS count FROM bookings
    WHERE (${status}::text IS NULL OR status = ${status})
      AND (${date}::text   IS NULL OR date   = ${date})
  `;

  return res.json({ bookings: rows, total: totalRes.rows[0].count, page });
}
