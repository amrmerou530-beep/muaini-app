const { response, requireAdmin, getAdminClient, configurePush, parseBody } = require('./_shared');
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return response(405, { error:'Method not allowed.' });
  try {
    await requireAdmin(event);
    const { title, body } = parseBody(event);
    if (!title || !body) return response(400, { error:'Title and body are required.' });
    const admin = getAdminClient();
    const webpush = configurePush();
    const { data } = await admin.from('push_subscriptions').select('*').eq('active', true).limit(5000);
    let sent = 0;
    await Promise.all((data || []).map(async sub => {
      try { await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body, tag:`admin-${Date.now()}`, url:'./index.html' })); sent += 1; }
      catch (error) { if ([404,410].includes(error.statusCode)) await admin.from('push_subscriptions').update({active:false}).eq('id',sub.id); }
    }));
    return response(200, { ok:true, sent });
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
