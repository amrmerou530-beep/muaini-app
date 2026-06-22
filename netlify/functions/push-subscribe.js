const { response, getAdminClient, getAuthenticatedUser, parseBody } = require('./_shared');
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' });
  try {
    const body = parseBody(event);
    if (!body.subscription?.endpoint) return response(400, { error: 'Invalid push subscription.' });
    const authUser = await getAuthenticatedUser(event);
    const admin = getAdminClient();
    const record = {
      endpoint: body.subscription.endpoint,
      subscription: body.subscription,
      user_id: authUser?.id || null,
      local_user_key: String(body.user || '').slice(0, 150),
      country: String(body.country || 'EG').slice(0, 10),
      time_zone: String(body.timeZone || 'UTC').slice(0, 100),
      prayer_times: body.prayerTimes || {},
      active: true,
      updated_at: new Date().toISOString()
    };
    const { error } = await admin.from('push_subscriptions').upsert(record, { onConflict: 'endpoint' });
    if (error) throw error;
    return response(200, { ok: true });
  } catch (error) {
    return response(error.statusCode || 500, { error: error.message });
  }
};
