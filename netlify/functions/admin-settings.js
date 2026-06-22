const { response, requireAdmin, getAdminClient, parseBody } = require('./_shared');
const ALLOWED_KEYS = new Set(['stripe_price_id']);
exports.handler = async event => {
  try {
    const user = await requireAdmin(event);
    const admin = getAdminClient();
    if (event.httpMethod === 'GET') {
      const { data, error } = await admin.from('app_settings').select('key,value');
      if (error) throw error;
      const settings = Object.fromEntries((data || []).map(row => [row.key, row.value?.value ?? row.value]));
      return response(200, { settings });
    }
    if (event.httpMethod === 'POST') {
      const { key, value } = parseBody(event);
      if (!ALLOWED_KEYS.has(key) || typeof value !== 'string' || value.length > 500) return response(400, { error:'Invalid setting.' });
      const { error } = await admin.from('app_settings').upsert({ key, value:{ value }, updated_by:user.id, updated_at:new Date().toISOString() }, { onConflict:'key' });
      if (error) throw error;
      return response(200, { ok:true });
    }
    return response(405, { error:'Method not allowed.' });
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
