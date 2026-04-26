import { applyCors } from './_lib/cors.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
