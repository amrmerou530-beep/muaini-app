const { response } = require('./_shared');
exports.handler = async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  if (!publicKey) return response(503, { error: 'VAPID public key is not configured.' });
  return response(200, { publicKey });
};
