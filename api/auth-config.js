module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: 'Authentication is not configured yet.' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY });
};
