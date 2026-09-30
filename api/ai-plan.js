const { examples } = require('./orbit-training');

async function jsonRequest(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

const words = value => String(value || '').toLowerCase().match(/[a-z0-9]+/g) || [];
const STOP = new Set('a an the to for with about of my me please can you could would and in on into from by is send create add make set move update schedule book put post notify tell share email message task deal opportunity stage calendar slack gmail google'.split(' '));
function exampleIntent(prompt) {
  const input = new Set(words(prompt).filter(word => !STOP.has(word)));
  let best = { score: 0, intent: null };
  for (const example of examples) {
    const candidate = new Set(words(example.prompt).filter(word => !STOP.has(word)));
    const score = [...input].filter(word => candidate.has(word)).length / Math.max(input.size, candidate.size, 1);
    if (score > best.score) best = { score, intent: example.intent };
  }
  return best.score >= 0.18 ? best.intent : null;
}

function inferIntent(prompt) {
  const text = prompt.toLowerCase();
  if (/\b(slack|channel|notify the team|tell the team|post internally)\b/.test(text)) return 'post_slack_message';
  if (/\b(calendar|schedule|book a|meeting|kickoff|demo|invite|call with)\b/.test(text) && /\b(create|add|schedule|book|set up|arrange|put)\b/.test(text)) return 'create_calendar_event';
  if (/\b(email|e-mail|gmail|send .*message|welcome email)\b/.test(text) && /\b(send|email|write|draft)\b/.test(text)) return 'send_email';
  if (/\b(deal|opportunity|pipeline)\b/.test(text) && /\b(move|update|change|advance|mark|set|stage)\b/.test(text)) return 'update_deal';
  if (/\b(task|remind|follow[- ]?up|to[- ]do)\b/.test(text) && /\b(create|add|make|remind|follow[- ]?up)\b/.test(text)) return 'create_task';
  return exampleIntent(prompt);
}

function findRecord(prompt, records) {
  const text = prompt.toLowerCase();
  return records.filter(record => record.name && text.includes(record.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0] || null;
}

function findDeal(prompt, deals, companies) {
  const text = prompt.toLowerCase();
  return deals.map(deal => ({
    deal,
    labels: [deal.name, companies.find(company => company.id === deal.company_id)?.name].filter(Boolean)
  })).filter(item => item.labels.some(label => text.includes(label.toLowerCase())))
    .sort((a, b) => Math.max(...b.labels.map(label => label.length)) - Math.max(...a.labels.map(label => label.length)))[0]?.deal || null;
}

function makePlan(prompt, { companies, deals, contacts }) {
  const intent = inferIntent(prompt);
  const ask = (question, details = question) => ({ summary: question, clarification: question, actions: [{ type: 'ask_user', title: question, record_id: null, target_name: null, stage: null, details }] });
  if (!intent) return ask('I can create CRM tasks, update a deal stage, prepare an email, schedule a meeting, or draft a Slack update. What would you like me to do?');

  if (intent === 'update_deal') {
    const stages = ['Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const stage = stages.find(value => prompt.toLowerCase().includes(value.toLowerCase()));
    const deal = findDeal(prompt, deals, companies);
    if (!stage) return ask('Which stage should I move the deal to?');
    if (!deal) return ask('Which existing deal should I update? Include its deal or company name.');
    return { summary: `Move ${deal.name} to ${stage}`, clarification: null, actions: [{ type: 'update_deal', title: `Move ${deal.name} to ${stage}`, record_id: deal.id, target_name: deal.name, stage, details: `Change the CRM deal stage from ${deal.stage} to ${stage}.` }] };
  }

  if (intent === 'create_task') {
    const company = findRecord(prompt, companies);
    const taskTitle = prompt.replace(/^(please\s+)?(create|add|make|set up)\s+(a\s+)?(follow[- ]?up\s+)?(crm\s+)?task\s*(to\s+)?/i, '')
      .replace(/^(please\s+)?(remind me to|remind me|follow up to|follow up with|task to)\s*/i, '').trim();
    if (!taskTitle || taskTitle.length < 4) return ask('What should the task be called?');
    return { summary: `Create task: ${taskTitle}`, clarification: null, actions: [{ type: 'create_task', title: taskTitle.slice(0, 180), record_id: company?.id || null, target_name: company?.name || null, stage: null, details: company ? `Create a CRM task associated with ${company.name}.` : 'Create a CRM task. No company was matched.' }] };
  }

  const service = { send_email: 'Gmail', create_calendar_event: 'Google Calendar', post_slack_message: 'Slack' }[intent];
  const requiredAction = { send_email: 'Send Email', create_calendar_event: 'Create Event', post_slack_message: 'Send Message' }[intent];
  const contact = findRecord(prompt, contacts);
  const company = findRecord(prompt, companies);
  if (intent === 'send_email' && (!contact || !contact.email)) return ask('Which contact should receive the email? Add or mention a contact with an email address.', 'Orbit needs a known contact and email address before preparing this email.');
  if (intent === 'create_calendar_event' && !/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|next week|\d{4}-\d{2}-\d{2})\b/i.test(prompt)) return ask('What date and time should I use for the calendar event?');
  const target = contact?.name || company?.name || null;
  const title = intent === 'send_email' ? `Prepare email to ${contact.name}` : intent === 'create_calendar_event' ? `Schedule requested meeting${target ? ` with ${target}` : ''}` : `Prepare Slack update${target ? ` about ${target}` : ''}`;
  return { summary: `${title} using ${service}`, clarification: null, actions: [{ type: intent, title, record_id: contact?.id || company?.id || null, target_name: target, stage: null, details: `Propose this ${requiredAction} for review. Prompt: ${prompt}`, required_service: service, required_action: requiredAction }] };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Sign-in and workspace database are not configured.' });
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt || prompt.length > 4000) return res.status(400).json({ error: 'Enter a prompt of 1 to 4,000 characters.' });
  const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return res.status(401).json({ error: 'Sign in before asking Orbit to plan an action.' });

  try {
    const base = SUPABASE_URL.replace(/\/$/, '');
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${bearer}` };
    const user = await jsonRequest(`${base}/auth/v1/user`, { headers });
    const membership = await jsonRequest(`${base}/rest/v1/workspace_members?user_id=eq.${encodeURIComponent(user.id)}&select=workspace_id&limit=1`, { headers });
    const workspaceId = membership[0]?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'This account does not have a workspace.' });
    const scoped = `workspace_id=eq.${encodeURIComponent(workspaceId)}`;
    const [companies, deals, contacts] = await Promise.all([
      'companies?select=id,name,website,industry,data',
      'deals?select=id,name,stage,amount,close_date,company_id,data',
      'contacts?select=id,name,email,title,company_id'
    ].map(path => jsonRequest(`${base}/rest/v1/${path}&${scoped}`, { headers })));
    const plan = makePlan(prompt, { companies, deals, contacts });
    for (const action of plan.actions) {
      action.required_service ||= ({ send_email: 'Gmail', create_calendar_event: 'Google Calendar', post_slack_message: 'Slack' })[action.type] || null;
      action.required_action ||= ({ send_email: 'Send Email', create_calendar_event: 'Create Event', post_slack_message: 'Send Message' })[action.type] || null;
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(plan);
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Orbit could not build an action plan.' });
  }
};
