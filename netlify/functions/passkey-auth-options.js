const { response, requireUser } = require('./_shared');
const { passkeyLib, rpInfo, saveChallenge, userPasskeys } = require('./_passkey-shared');
exports.handler = async event => {
  try {
    const user = await requireUser(event);
    const keys = await userPasskeys(user.id);
    if (!keys.length) return response(404, { error:'لا يوجد مفتاح مرور مسجل لهذا الحساب.' });
    const { generateAuthenticationOptions } = await passkeyLib();
    const { rpID } = rpInfo(event);
    const options = await generateAuthenticationOptions({ rpID, allowCredentials:keys.map(key=>({id:key.credential_id,transports:key.transports||[]})), userVerification:'required', timeout:60000 });
    await saveChallenge(user.id, 'authentication', options);
    return response(200, options);
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
