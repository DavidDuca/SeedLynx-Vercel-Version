// =========================================
// /api/bookings/:id
//   GET    → admin (single booking)
//   PUT    → admin (update)
//   DELETE → admin (remove)
// =========================================
import { sql, ensureSchema } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { applyCors } from '../_lib/cors.js';

const VALID_TIMES    = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
const VALID_SERVICES = ['web','multimedia','both','consultation'];
const VALID_STATUS   = ['pending','confirmed','cancelled'];

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (requireAdmin(req, res)) return;

  const { id } = req.query;
  if (!id || isNaN(parseInt(id, 10))) {
    return res.status(400).json({ message: 'Invalid booking id.' });
  }
  const bookingId = parseInt(id, 10);

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM bookings WHERE id=${bookingId}`;
      if (!rows[0]) return res.status(404).json({ message: 'Booking not found.' });
      return res.json({ booking: rows[0] });
    }

    if (req.method === 'DELETE') {
      const { rowCount } = await sql`DELETE FROM bookings WHERE id=${bookingId}`;
      if (!rowCount) return res.status(404).json({ message: 'Booking not found.' });
      return res.json({ message: 'Booking deleted successfully.' });
    }

    if (req.method === 'PUT') {
      const { name, email, date, time, service, message, status } = req.body || {};

      const cur = await sql`SELECT * FROM bookings WHERE id=${bookingId}`;
      if (!cur.rows[0]) return res.status(404).json({ message: 'Booking not found.' });
      const current = cur.rows[0];

      // Validate provided fields
      if (time && !VALID_TIMES.includes(time))
        return res.status(400).json({ message: 'Invalid time slot.', field: 'time' });
      if (service && !VALID_SERVICES.includes(service))
        return res.status(400).json({ message: 'Invalid service.', field: 'service' });
      if (status && !VALID_STATUS.includes(status))
        return res.status(400).json({ message: 'Invalid status.', field: 'status' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ message: 'Invalid email.', field: 'email' });

      // Duplicate check if date/time changed
      const newDate = date || current.date;
      const newTime = time || current.time;
      if (newDate !== current.date || newTime !== current.time) {
        const dup = await sql`
          SELECT id FROM bookings WHERE date=${newDate} AND time=${newTime} AND id<>${bookingId}
        `;
        if (dup.rows.length) {
          return res.status(409).json({ message: 'That time slot is already taken.', field: 'time' });
        }
      }

      const merged = {
        name:    name    ?? current.name,
        email:   email   ? email.toLowerCase().trim() : current.email,
        date:    newDate,
        time:    newTime,
        service: service ?? current.service,
        message: message !== undefined ? message : current.message,
        status:  status  ?? current.status,
      };

      const { rows } = await sql`
        UPDATE bookings SET
          name=${merged.name},
          email=${merged.email},
          date=${merged.date},
          time=${merged.time},
          service=${merged.service},
          message=${merged.message},
          status=${merged.status},
          updated_at=NOW()
        WHERE id=${bookingId}
        RETURNING *
      `;
      return res.json({ message: 'Booking updated successfully.', booking: rows[0] });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That time slot is already taken.', field: 'time' });
    }
    console.error('Booking [id] error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}
