module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const name = String(req.query.name || '').trim();
  if (!['Gmail', 'Google Calendar', 'Slack'].includes(name)) {
    return res.status(400).json({ error: 'Unsupported app.' });
  }
  try {
    const response = await fetch(`https://flow.sokt.io/func/scri12BSufQM?key=${encodeURIComponent(name)}`);
    if (!response.ok) return res.status(502).json({ error: 'ViaSocket app catalog is unavailable.' });
    const result = await response.json();
    const apps = Array.isArray(result.data) ? result.data : [];
    const app = apps.find(item => String(item.name).toLowerCase() === name.toLowerCase());
    if (!app) return res.status(404).json({ error: `ViaSocket did not return an exact ${name} match.` });
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ app });
  } catch {
    return res.status(502).json({ error: 'Could not reach the ViaSocket app catalog.' });
  }
};
