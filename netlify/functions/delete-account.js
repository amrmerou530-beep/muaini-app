const { response, requireUser, getAdminClient } = require('./_shared');
exports.handler = async event => {
  try {
    if (event.httpMethod !== 'POST') return response(405,{error:'Method not allowed.'});
    const user = await requireUser(event);
    const admin = getAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id, true);
    if (error) throw error;
    return response(200,{ok:true});
  } catch (error) { return response(error.statusCode || 500,{error:error.message}); }
};
