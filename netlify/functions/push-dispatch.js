const { getAdminClient, configurePush } = require('./_shared');

const PRAYER_NAMES = { fajr:'الفجر', dhuhr:'الظهر', asr:'العصر', maghrib:'المغرب', isha:'العشاء' };

function localParts(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date:`${map.year}-${map.month}-${map.day}`, hour:Number(map.hour), minute:Number(map.minute) };
}
function toMinutes(value) { const [h,m] = String(value || '').match(/\d{1,2}:\d{2}/)?.[0].split(':').map(Number) || [-99,-99]; return h*60+m; }

exports.handler = async () => {
  const admin = getAdminClient();
  const webpush = configurePush();
  const { data: subscriptions, error } = await admin.from('push_subscriptions').select('*').eq('active', true).limit(5000);
  if (error) throw error;
  let sent = 0;
  for (const sub of subscriptions || []) {
    const now = localParts(sub.time_zone);
    const current = now.hour * 60 + now.minute;
    for (const [prayer, value] of Object.entries(sub.prayer_times || {})) {
      const prayerMinute = toMinutes(value);
      let stage = null;
      if (current === prayerMinute - 15) stage = 'prepare';
      if (current === prayerMinute) stage = 'time';
      if (!stage) continue;
      const deliveryKey = `${now.date}-${prayer}-${stage}`;
      const { data: existing } = await admin.from('push_delivery_log').select('id').eq('subscription_id', sub.id).eq('delivery_key', deliveryKey).maybeSingle();
      if (existing) continue;
      const name = PRAYER_NAMES[prayer] || prayer;
      const payload = JSON.stringify({
        title: stage === 'prepare' ? `استعد لصلاة ${name}` : `حان وقت صلاة ${name}`,
        body: stage === 'prepare' ? `بقي 15 دقيقة على صلاة ${name}.` : `دخل الآن وقت صلاة ${name}.`,
        tag: `muaini-${deliveryKey}`,
        url: './index.html#page-prayers'
      });
      try {
        await webpush.sendNotification(sub.subscription, payload);
        await admin.from('push_delivery_log').insert({ subscription_id: sub.id, delivery_key: deliveryKey });
        sent += 1;
      } catch (pushError) {
        if ([404, 410].includes(pushError.statusCode)) await admin.from('push_subscriptions').update({ active:false }).eq('id', sub.id);
      }
    }
  }
  return { statusCode: 200, body: JSON.stringify({ ok:true, sent }) };
};
