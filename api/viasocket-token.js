const { createHmac } = require('node:crypto');

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { VIASOCKET_ORG_ID, VIASOCKET_PROJECT_ID, VIASOCKET_EMBED_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!VIASOCKET_ORG_ID || !VIASOCKET_PROJECT_ID || !VIASOCKET_EMBED_SECRET) {
    return res.status(503).json({ error: 'ViaSocket is not configured on this deployment.' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Authentication is not configured.' });
  const accessToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!accessToken) return res.status(401).json({ error: 'Sign in before connecting an app.' });
  let userResponse;
  try {
    userResponse = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return res.status(502).json({ error: 'Could not verify the signed-in account.' });
  }
  if (!userResponse.ok) return res.status(401).json({ error: 'Your session expired. Sign in again.' });
  const user = await userResponse.json();
  if (!user?.id) return res.status(401).json({ error: 'Could not verify the signed-in account.' });

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    org_id: VIASOCKET_ORG_ID,
    project_id: VIASOCKET_PROJECT_ID,
    unique_identifier: user.id,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', VIASOCKET_EMBED_SECRET).update(unsigned).digest('base64url');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ embedToken: `${unsigned}.${signature}` });
};
