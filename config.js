/*
  إعدادات مُعيني العامة.
  اترك القيم فارغة ليعمل الموقع محليًا فقط.
  لا تضع SUPABASE_SERVICE_ROLE_KEY أو STRIPE_SECRET_KEY هنا مطلقًا.
*/

window.MUAINI_CONFIG = {
  supabaseUrl: 'https://gznvnsqlyrfazfnipzzh.supabase.co',
  supabaseAnonKey: 'sb_publishable_ZjzYPj8EKlzxKXHMHs_7pg_mmLhTAks',
  siteName: 'منصة مُعيني',
  supportEmail: '',
  premiumPriceLabel: 'اشتراك شهري',
  defaultCountry: 'EG'
};

// يمكن وضع مفتاح VAPID العام هنا، أو تركه فارغًا ليجلبه الموقع من Netlify Function.
window.MUAINI_VAPID_PUBLIC_KEY = '';

// توافق مع كود تسجيل الدخول القديم والجديد.
window.SUPABASE_URL = window.MUAINI_CONFIG.supabaseUrl;
window.SUPABASE_ANON_KEY = window.MUAINI_CONFIG.supabaseAnonKey;
