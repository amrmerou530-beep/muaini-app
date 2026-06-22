const { getAdminClient } = require('./_shared');
process.env.CBOR_NATIVE_ACCELERATION_DISABLED = 'true';

async function passkeyLib() {
  return import('@simplewebauthn/server');
}

function rpInfo(event) {
  const rawHost = process.env.PASSKEY_RP_ID || event.headers?.['x-forwarded-host'] || event.headers?.host || 'localhost';
  const rpID = rawHost.split(',')[0].trim().split(':')[0];
  const forwardedProto = event.headers?.['x-forwarded-proto'] || '';
  const protocol = process.env.PASSKEY_ORIGIN?.split('://')[0] || forwardedProto || (rpID === 'localhost' ? 'http' : 'https');
  const origin = process.env.PASSKEY_ORIGIN || `${protocol}://${rawHost.split(',')[0].trim()}`.replace(/\/$/, '');
  return { rpID, origin, rpName: process.env.PASSKEY_RP_NAME || 'منصة مُعيني' };
}

async function saveChallenge(userId, kind, options) {
  const admin = getAdminClient();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await admin.from('passkey_challenges').upsert({
    user_id: userId,
    kind,
    challenge: options.challenge,
    options,
    expires_at: expiresAt,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,kind' });
  if (error) throw error;
}

async function getChallenge(userId, kind) {
  const admin = getAdminClient();
  const { data, error } = await admin.from('passkey_challenges').select('*').eq('user_id', userId).eq('kind', kind).maybeSingle();
  if (error) throw error;
  if (!data || new Date(data.expires_at) < new Date()) throw new Error('انتهت صلاحية طلب التحقق. أعد المحاولة.');
  return data;
}

async function clearChallenge(userId, kind) {
  const admin = getAdminClient();
  await admin.from('passkey_challenges').delete().eq('user_id', userId).eq('kind', kind);
}

async function userPasskeys(userId) {
  const admin = getAdminClient();
  const { data, error } = await admin.from('passkeys').select('*').eq('user_id', userId).order('created_at', { ascending:false });
  if (error) throw error;
  return data || [];
}

module.exports = { passkeyLib, rpInfo, saveChallenge, getChallenge, clearChallenge, userPasskeys };
