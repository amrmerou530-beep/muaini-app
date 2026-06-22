# منصة مُعيني — النسخة المتكاملة

هذه النسخة تحافظ على جميع خصائص الكود السابق، وتضيف:

- مواقيت صلاة حقيقية حسب المدينة أو إحداثيات الجهاز وطريقة الحساب.
- حسابات Supabase وتسجيل بالبريد واستعادة كلمة السر ومزامنة البيانات.
- Web Push حقيقي عبر Netlify Functions عند إغلاق الموقع.
- اشتراك Stripe فعلي وفتح الأصوات المميزة بعد تأكيد الخادم.
- اتجاه القبلة وبوصلة الهاتف والمسافة إلى مكة.
- تقويم هجري ومناسبات وتذكيرات موسمية.
- خطة قضاء الصلوات وأهداف شخصية وإنجازات وسلسلة التزام.
- وضع كبار السن والتباين المرتفع وتقليل الحركة والقراءة الصوتية.
- PWA والعمل دون إنترنت وتحديث الكاش.
- النسخ الاحتياطي والاستعادة وحذف البيانات.
- لوحة مشرف لرفع الأصوات وإرسال إشعارات عامة.
- بلاغات الأخطاء والاقتراحات.

## تشغيل النسخة المحلية

يمكن رفع المجلد كما هو إلى Netlify. المزايا الأساسية تعمل دون قاعدة بيانات. المزامنة والدفع وPush المغلق تحتاج الإعدادات التالية.

## إعداد Supabase

1. أنشئ مشروعًا في Supabase.
2. افتح SQL Editor وشغّل الملف `supabase/schema.sql` كاملًا.
3. من Project Settings > API انسخ:
   - Project URL
   - anon public key
4. ضعهما داخل `config.js`:

```js
window.MUAINI_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY'
};
```

5. في Netlify Environment Variables أضف:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

لا تضع `SUPABASE_SERVICE_ROLE_KEY` داخل `config.js` أو أي ملف متاح للمتصفح.

## إعداد Web Push

1. بعد تنزيل المشروع شغّل:

```bash
npm install
npm run generate-vapid
```

2. أضف إلى Netlify:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` مثل `mailto:admin@example.com`
3. Netlify تشغّل `push-dispatch` كل دقيقة من خلال `netlify.toml`.

## إعداد Stripe

1. أنشئ منتج اشتراك وسعرًا شهريًا في Stripe.
2. أضف إلى Netlify:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`
3. أنشئ Webhook إلى:

```text
https://YOUR-SITE.netlify.app/api/billing/webhook
```

وفعّل الأحداث:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`

## جعل حسابك مشرفًا

بعد إنشاء حسابك، نفّذ في Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com');
```

## هيكل الأصوات المحلية

ضع ملفاتك المجانية داخل `audio/` بالأسماء الموجودة حاليًا. الأصوات المميزة تُرفع من لوحة الإدارة إلى Storage الخاص في Supabase.

## نشر Netlify

ارفع المجلد كاملًا أو اربطه بمستودع Git. يجب أن تظل الملفات التالية في جذر النشر:

- `index.html`
- `config.js`
- `service-worker.js`
- `manifest.json`
- `netlify.toml`
- مجلد `audio`
- مجلد `netlify/functions`

بعد النشر، افتح الموقع واضغط `Ctrl + F5` أو امسح بيانات الموقع مرة واحدة لتحديث Service Worker القديم.

## إضافات مُعيني بلس 4.0

أضيفت فوق النسخة السابقة دون حذف الأقسام الأصلية:

- Passkeys لقفل وفتح المنصة بعد تسجيل الدخول السحابي.
- Background Sync لطابور المزامنة عند عودة الإنترنت.
- وضع رمضان والسفر.
- البحث الشامل والعلامات والملاحظات.
- نظام الحفظ والمراجعة.
- مساعد يومي محلي لا يصدر فتاوى.
- بطاقات إنجاز قابلة للمشاركة.
- دوائر أسرية وتحديات مع عرض النسبة الإجمالية فقط.
- مركز خصوصية وسجل نشاط ونظام تحديث.
- فحص تقني للمشرف.

## إعداد Passkeys

Passkeys تحتاج HTTPS وحساب Supabase مفعّلًا وNetlify Functions تعمل.

أضف إلى Netlify Environment Variables:

- `PASSKEY_RP_NAME=منصة مُعيني`
- `PASSKEY_RP_ID=YOUR-SITE.netlify.app`
- `PASSKEY_ORIGIN=https://YOUR-SITE.netlify.app`

ثم شغّل `supabase/schema.sql` من جديد لإضافة جداول Passkeys والدوائر.

بعد تسجيل الدخول السحابي افتح:

```text
المزيد ← الخصوصية ← إضافة مفتاح مرور
```

مفتاح المرور في هذه النسخة يستخدم كقفل قوي للجلسة الحالية بعد تسجيل الدخول مرة واحدة، وليس بديلًا مستقلًا لإنشاء جلسة Supabase على جهاز جديد.

## المزامنة عند عودة الإنترنت

عند توفر Background Sync، يضع التطبيق نسخة البيانات في طابور داخل Service Worker ويرسلها تلقائيًا عند استقرار الاتصال. إذا كان المتصفح لا يدعمها، تتم المحاولة عند فتح التطبيق وعودة الإنترنت.

## دوائر الأسرة

في الوضع المحلي تعمل الدائرة على الجهاز نفسه. للتزامن بين الأجهزة:

1. فعّل Supabase.
2. شغّل آخر نسخة من `supabase/schema.sql`.
3. سجّل كل عضو بحسابه.
4. أنشئ دائرة وشارك رمز الدعوة.

لا تُشارك تفاصيل الصلاة أو الذكر، وإنما نسبة أسبوعية إجمالية فقط عندما يسمح المستخدم بذلك من مركز الخصوصية.
