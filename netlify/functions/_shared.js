const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

function response(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  };
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment variables are missing.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getBearer(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

async function getAuthenticatedUser(event) {
  const token = getBearer(event);
  if (!token) return null;
  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function requireUser(event) {
  const user = await getAuthenticatedUser(event);
  if (!user) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  return user;
}

async function requireAdmin(event) {
  const user = await requireUser(event);
  const admin = getAdminClient();
  const { data, error } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (error || data?.role !== 'admin') throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  return user;
}

function configurePush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  if (!publicKey || !privateKey) throw new Error('VAPID keys are missing.');
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return webpush;
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(raw);
}

module.exports = { response, getAdminClient, getAuthenticatedUser, requireUser, requireAdmin, configurePush, parseBody };
