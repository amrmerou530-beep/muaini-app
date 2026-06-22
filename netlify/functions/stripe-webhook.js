const Stripe = require('stripe');
const { response, getAdminClient } = require('./_shared');
exports.handler = async event => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) return response(503, { error:'Stripe webhook is not configured.' });
  const stripe = new Stripe(stripeKey);
  const signature = event.headers['stripe-signature'];
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
  let stripeEvent;
  try { stripeEvent = stripe.webhooks.constructEvent(raw, signature, webhookSecret); }
  catch (error) { return response(400, { error:`Webhook error: ${error.message}` }); }
  const admin = getAdminClient();
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.client_reference_id || session.metadata?.user_id;
    if (userId) await admin.from('profiles').update({ plan:'premium', plan_status:'active', stripe_customer_id:session.customer, stripe_subscription_id:session.subscription }).eq('id', userId);
  }
  if (['customer.subscription.deleted','customer.subscription.paused'].includes(stripeEvent.type)) {
    const subscription = stripeEvent.data.object;
    await admin.from('profiles').update({ plan:'free', plan_status:subscription.status }).eq('stripe_subscription_id', subscription.id);
  }
  if (stripeEvent.type === 'customer.subscription.updated') {
    const subscription = stripeEvent.data.object;
    const active = ['active','trialing'].includes(subscription.status);
    await admin.from('profiles').update({ plan:active?'premium':'free', plan_status:subscription.status }).eq('stripe_subscription_id', subscription.id);
  }
  return response(200, { received:true });
};
