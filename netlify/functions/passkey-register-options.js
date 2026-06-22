const { response, requireUser, getAdminClient } = require('./_shared');
const { passkeyLib, rpInfo, saveChallenge, userPasskeys } = require('./_passkey-shared');
exports.handler = async event => {
  try {
    const user = await requireUser(event);
    const { generateRegistrationOptions } = await passkeyLib();
    const { rpID, rpName } = rpInfo(event);
    const keys = await userPasskeys(user.id);
    const admin = getAdminClient();
    const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email || user.id,
      userDisplayName: profile?.display_name || user.email || 'مستخدم مُعيني',
      attestationType: 'none',
      excludeCredentials: keys.map(key => ({ id:key.credential_id, transports:key.transports || [] })),
      authenticatorSelection: { residentKey:'preferred', userVerification:'required', authenticatorAttachment:'platform' },
      timeout: 60000
    });
    await saveChallenge(user.id, 'registration', options);
    return response(200, options);
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
