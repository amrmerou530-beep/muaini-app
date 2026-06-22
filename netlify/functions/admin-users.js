const { response, requireAdmin, getAdminClient, parseBody } = require('./_shared');
exports.handler = async event => {
  try {
    await requireAdmin(event);
    const admin = getAdminClient();
    if (event.httpMethod === 'GET') {
      const [{ data: authData, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
        admin.auth.admin.listUsers({ page:1, perPage:1000 }),
        admin.from('profiles').select('*').order('created_at', { ascending:false }).limit(1000)
      ]);
      if (authError) throw authError;
      if (profileError) throw profileError;
      const emails = new Map((authData.users || []).map(user => [user.id, user.email]));
      return response(200, { users:(profiles || []).map(profile => ({ ...profile, email:emails.get(profile.id) || '' })) });
    }
    if (event.httpMethod === 'POST') {
      const { userId, plan } = parseBody(event);
      if (!userId || !['free','premium'].includes(plan)) return response(400, { error:'Invalid user or plan.' });
      const { error } = await admin.from('profiles').update({
        plan,
        plan_status:plan === 'premium' ? 'active' : 'inactive',
        updated_at:new Date().toISOString()
      }).eq('id', userId);
      if (error) throw error;
      return response(200, { ok:true });
    }
    return response(405, { error:'Method not allowed.' });
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
