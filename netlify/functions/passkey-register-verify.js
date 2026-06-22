const { response, requireUser, getAdminClient, parseBody } = require('./_shared');
const { passkeyLib, rpInfo, getChallenge, clearChallenge } = require('./_passkey-shared');
exports.handler = async event => {
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const { verifyRegistrationResponse } = await passkeyLib();
    const { rpID, origin } = rpInfo(event);
    const saved = await getChallenge(user.id, 'registration');
    const verification = await verifyRegistrationResponse({ response:body, expectedChallenge:saved.challenge, expectedOrigin:origin, expectedRPID:rpID, requireUserVerification:true });
    if (!verification.verified || !verification.registrationInfo) return response(400, { verified:false, error:'لم يتم التحقق من مفتاح المرور.' });
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const admin = getAdminClient();
    const { error } = await admin.from('passkeys').upsert({
      user_id:user.id,
      credential_id:credential.id,
      public_key:Buffer.from(credential.publicKey).toString('base64'),
      counter:Number(credential.counter || 0),
      transports:credential.transports || body.response?.transports || [],
      webauthn_user_id:saved.options?.user?.id || '',
      device_type:credentialDeviceType,
      backed_up:Boolean(credentialBackedUp),
      last_used_at:new Date().toISOString()
    }, { onConflict:'credential_id' });
    if (error) throw error;
    await clearChallenge(user.id, 'registration');
    return response(200, { verified:true });
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
