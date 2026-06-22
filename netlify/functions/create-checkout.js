const Stripe = require('stripe');
const { response, requireUser, getAdminClient, parseBody } = require('./_shared');
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return response(405, { error:'Method not allowed.' });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const admin = getAdminClient();
    const { data: priceSetting } = await admin.from('app_settings').select('value').eq('key','stripe_price_id').maybeSingle();
    const priceId = priceSetting?.value?.value || priceSetting?.value || process.env.STRIPE_PRICE_ID;
    if (!stripeKey || !priceId) return response(503, { error:'Stripe is not configured.' });
    const stripe = new Stripe(stripeKey);
    const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    let customer = profile?.stripe_customer_id || null;
    if (!customer) {
      const created = await stripe.customers.create({ email:user.email, metadata:{ user_id:user.id } });
      customer = created.id;
      await admin.from('profiles').update({ stripe_customer_id:customer }).eq('id', user.id);
    }
    const origin = body.returnUrl || process.env.URL || 'http://localhost:8888';
    const session = await stripe.checkout.sessions.create({
      mode:'subscription', customer, line_items:[{ price:priceId, quantity:1 }],
      success_url:`${origin}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${origin}?checkout=cancelled`,
      client_reference_id:user.id,
      metadata:{ user_id:user.id }, subscription_data:{ metadata:{ user_id:user.id } }
    });
    return response(200, { url:session.url });
  } catch (error) { return response(error.statusCode || 500, { error:error.message }); }
};
