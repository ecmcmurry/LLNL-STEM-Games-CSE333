// Vercel serverless function — liveness probe for Forge & Fortune AI status badge.
export default function handler(_req, res) {
  res.status(200).json({ ok: true, model: 'claude-haiku-4-5-20251001' });
}
