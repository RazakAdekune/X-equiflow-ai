const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL    = process.env.SUPABASE_URL    || 'https://gffqtqvdljtuttkrrzcb.supabase.co';
  const SERVICE_KEY     = process.env.SUPABASE_SERVICE_KEY;

  if (!SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration: missing service key' })
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { email, password, name } = body;
  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'email and password required' }) };
  }

  const payload = JSON.stringify({
    email,
    password,
    email_confirm: true,          // confirmed immediately — no email sent
    user_metadata: { name: name || '' }
  });

  const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users`);

  const result = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   'POST',
        headers: {
          'Content-Type':  'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'apikey':         SERVICE_KEY,
          'Authorization':  'Bearer ' + SERVICE_KEY,
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const parsed = JSON.parse(result.body);

  if (result.status !== 200) {
    return {
      statusCode: result.status,
      body: JSON.stringify({ error: parsed.msg || parsed.message || 'Failed to create user' })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: parsed.id, email: parsed.email })
  };
};
