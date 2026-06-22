const { response, requireUser, getAdminClient } = require('./_shared');
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return response(405, { error:'Method not allowed.' });
  try {
    const user = await requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const admin = getAdminClient();
    const { data: profile } = await admin.from('profiles').select('plan,plan_status').eq('id',user.id).single();
    if (profile?.plan !== 'premium' || !['active','trialing'].includes(profile.plan_status)) return response(403, { error:'Premium subscription required.' });
    let query = admin.from('audio_catalog').select('storage_path,name').eq('active',true);
    query = body.audioId ? query.eq('id',body.audioId) : query.eq('name',body.name);
    const { data: audio, error } = await query.single();
    if (error || !audio) return response(404, { error:'Audio not found.' });
    const { data, error: signError } = await admin.storage.from('audio-library').createSignedUrl(audio.storage_path, 300);
    if (signError) throw signError;
    return response(200, { url:data.signedUrl, expiresIn:300 });
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
