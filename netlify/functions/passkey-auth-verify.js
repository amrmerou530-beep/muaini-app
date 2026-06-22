const { response, requireUser, getAdminClient, parseBody } = require('./_shared');
const { passkeyLib, rpInfo, getChallenge, clearChallenge } = require('./_passkey-shared');
exports.handler = async event => {
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const admin = getAdminClient();
    const { data:key, error:keyError } = await admin.from('passkeys').select('*').eq('user_id',user.id).eq('credential_id',body.id).maybeSingle();
    if (keyError) throw keyError;
    if (!key) return response(404, { error:'مفتاح المرور غير مسجل.' });
    const saved = await getChallenge(user.id, 'authentication');
    const { verifyAuthenticationResponse } = await passkeyLib();
    const { rpID, origin } = rpInfo(event);
    const verification = await verifyAuthenticationResponse({
      response:body,
      expectedChallenge:saved.challenge,
      expectedOrigin:origin,
      expectedRPID:rpID,
      requireUserVerification:true,
      credential:{ id:key.credential_id, publicKey:new Uint8Array(Buffer.from(key.public_key,'base64')), counter:Number(key.counter||0), transports:key.transports||[] }
    });
    if (!verification.verified) return response(400, { verified:false, error:'فشل التحقق.' });
    await admin.from('passkeys').update({ counter:Number(verification.authenticationInfo.newCounter||0), last_used_at:new Date().toISOString() }).eq('id',key.id);
    await clearChallenge(user.id, 'authentication');
    return response(200, { verified:true });
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
