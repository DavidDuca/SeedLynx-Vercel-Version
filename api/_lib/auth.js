// =========================================
// api/_lib/auth.js — JWT helpers
// =========================================
import jwt from 'jsonwebtoken';

const JWT_SECRET  = process.env.JWT_SECRET  || 'seedlynx_secret_dev_key';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * Returns decoded payload if valid, else null.
 */
export function verifyRequest(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Express-style guard. Returns true if request was rejected.
 */
export function requireAdmin(req, res) {
  const decoded = verifyRequest(req);
  if (!decoded) {
    res.status(401).json({ message: 'Access denied. Invalid or missing token.' });
    return true;
  }
  req.admin = decoded;
  return false;
}
