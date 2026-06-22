'use strict';

/* =========================================================
   مُعيني بلس 4.0 — إضافات غير مدمرة فوق النسخة الكاملة
   تعمل محليًا، وتتوسع سحابيًا عند إعداد Supabase/Netlify.
========================================================= */
window.MUAINI_APP_VERSION = '4.0.0';
const ADVANCED_STORAGE_VERSION = 1;
let advancedSearchTimer = null;
let advancedSyncTimer = null;
let advancedAudioPreview = null;
let advancedWaitingWorker = null;
let advancedDiagnosticsReport = [];

function advancedDefaults() {
  return {
    version: ADVANCED_STORAGE_VERSION,
    ramadan: { mode:'auto', days:{}, khatmaTarget:604 },
    travel: { enabled:false, savedCities:[], lastTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone },
    audioFavorites: [],
    bookmarks: [],
    memorization: {},
    assistantHistory: [],
    family: { id:null, name:'', inviteCode:'', members:[], challenges:[] },
    privacy: { cloudSync:true, groupVisible:true, passkeyLock:false, activityLog:true, backgroundSync:true },
    accessibilityPlus: { fontSize:'normal', dyslexia:false, monochrome:false },
    passkey: { registered:false, lastVerifiedAt:null },
    activity: [],
    errorLog: [],
    update: { lastSeenVersion:window.MUAINI_APP_VERSION }
  };
}

const previousEnsureExtendedMetaAdvanced = ensureExtendedMeta;
ensureExtendedMeta = function ensureExtendedMetaWithAdvanced() {
  previousEnsureExtendedMetaAdvanced();
  const defaults = advancedDefaults();
  profileMeta.advanced = profileMeta.advanced && typeof profileMeta.advanced === 'object' ? profileMeta.advanced : {};
  const current = profileMeta.advanced;
  current.version = ADVANCED_STORAGE_VERSION;
  current.ramadan = { ...defaults.ramadan, ...(current.ramadan || {}), days:{...(current.ramadan?.days || {})} };
  current.travel = { ...defaults.travel, ...(current.travel || {}), savedCities:Array.isArray(current.travel?.savedCities)?current.travel.savedCities:[] };
  current.audioFavorites = Array.isArray(current.audioFavorites) ? current.audioFavorites : [];
  current.bookmarks = Array.isArray(current.bookmarks) ? current.bookmarks : [];
  current.memorization = current.memorization && typeof current.memorization === 'object' ? current.memorization : {};
  current.assistantHistory = Array.isArray(current.assistantHistory) ? current.assistantHistory : [];
  current.family = { ...defaults.family, ...(current.family || {}), members:Array.isArray(current.family?.members)?current.family.members:[], challenges:Array.isArray(current.family?.challenges)?current.family.challenges:[] };
  current.privacy = { ...defaults.privacy, ...(current.privacy || {}) };
  current.accessibilityPlus = { ...defaults.accessibilityPlus, ...(current.accessibilityPlus || {}) };
  current.passkey = { ...defaults.passkey, ...(current.passkey || {}) };
  current.activity = Array.isArray(current.activity) ? current.activity : [];
  current.errorLog = Array.isArray(current.errorLog) ? current.errorLog : [];
  current.update = { ...defaults.update, ...(current.update || {}) };
};

function advancedMeta() { ensureExtendedMeta(); return profileMeta.advanced; }

function logAdvancedActivity(action, detail='') {
  const meta = advancedMeta();
  if (!meta.privacy.activityLog) return;
  meta.activity.unshift({ id:crypto.randomUUID?.() || String(Date.now()), action, detail, at:new Date().toISOString(), device:navigator.userAgent.slice(0,120) });
  meta.activity = meta.activity.slice(0,60);
}

function captureAdvancedError(kind, message, source='') {
  try {
    const meta = advancedMeta();
    meta.errorLog.unshift({ kind, message:String(message).slice(0,500), source:String(source).slice(0,200), at:new Date().toISOString() });
    meta.errorLog = meta.errorLog.slice(0,40);
    localStorage.setItem(`muaini_profile_${safeUserName(currentUser.name)}`, JSON.stringify(profileMeta));
  } catch (_) {}
}
window.addEventListener('error', event => captureAdvancedError('error', event.message, event.filename));
window.addEventListener('unhandledrejection', event => captureAdvancedError('promise', event.reason?.message || event.reason || 'Unhandled rejection'));

/* ---------- التنقل والتبويبات ---------- */
const previousShowPageAdvanced = showPage;
showPage = function showPageWithAdvanced(pageId) {
  previousShowPageAdvanced(pageId);
  if (pageId === 'more') renderAdvancedHub();
  logAdvancedActivity('فتح صفحة', pageId);
};

function switchAdvancedTab(tab, button) {
  document.querySelectorAll('.advanced-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.advanced-tab-panel').forEach(el => el.classList.remove('active'));
  button?.classList.add('active');
  document.getElementById(`advanced-tab-${tab}`)?.classList.add('active');
  if (tab === 'daily') { renderRamadanDashboard(); renderTravelPanel(); renderAdvancedAudioLibrary(); renderSharePreview(); }
  if (tab === 'knowledge') { renderBookmarks(); populateMemorizationSelect(); renderMemorization(); renderAssistantHistory(); }
  if (tab === 'community') renderFamilyCircle();
  if (tab === 'security') renderSecurityCenter();
}

function renderAdvancedHub() {
  ensureExtendedMeta();
  renderRamadanDashboard();
  renderTravelPanel();
  renderAdvancedAudioLibrary();
  renderSharePreview();
  renderBookmarks();
  populateMemorizationSelect();
  renderMemorization();
  renderAssistantHistory();
  renderFamilyCircle();
  renderSecurityCenter();
  const badge = document.getElementById('advanced-health-badge');
  if (badge) badge.textContent = navigator.onLine ? 'متصل وجاهز' : 'يعمل دون إنترنت';
}

/* ---------- رمضان ---------- */
function isRamadanActive() {
  const mode = advancedMeta().ramadan.mode;
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  try { return hijriParts(adjustedDate()).month === 9; } catch (_) { return false; }
}
function setRamadanMode(mode) { advancedMeta().ramadan.mode = mode; saveLogs(); renderRamadanDashboard(); logAdvancedActivity('تغيير وضع رمضان', mode); }
function ramadanTodayRecord() {
  const meta = advancedMeta();
  meta.ramadan.days[currentDayKey] = { fasted:false, taraweeh:false, qiyam:false, charity:false, ...(meta.ramadan.days[currentDayKey] || {}) };
  return meta.ramadan.days[currentDayKey];
}
function toggleRamadanTask(key, checked) { ramadanTodayRecord()[key] = Boolean(checked); saveLogs(); renderRamadanDashboard(); }
function prayerCountdownText(time) {
  if (!time) return '--:--';
  const [h,m] = time.split(':').map(Number); const now = new Date();
  let target = new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0); if (target <= now) target.setDate(target.getDate()+1);
  const total = Math.max(0,Math.floor((target-now)/60000)); return `${Math.floor(total/60)}س ${total%60}د`;
}
function renderRamadanDashboard() {
  const box = document.getElementById('ramadan-dashboard'); if (!box) return;
  const meta = advancedMeta(), record = ramadanTodayRecord(), active = isRamadanActive();
  const mode = document.getElementById('ramadan-mode'); if (mode) mode.value = meta.ramadan.mode;
  ['fasted','taraweeh','qiyam','charity'].forEach(k=>{const el=document.getElementById(`ramadan-${k}`);if(el)el.checked=Boolean(record[k]);});
  let hijriDay = 1; try { hijriDay = hijriParts(adjustedDate()).day; } catch (_) {}
  const pagesRead = Number(systemLogs[currentDayKey]?.readPagesToday || 0);
  const suggestedPages = Math.max(1, Math.ceil((Number(meta.ramadan.khatmaTarget||604) - Math.min(604,lastReadPage-1)) / Math.max(1,31-hijriDay)));
  const completed = Object.values(record).filter(Boolean).length;
  box.innerHTML = `
    <div class="ramadan-metric"><small>الحالة</small><strong>${active?'مفعّل 🌙':'غير نشط'}</strong></div>
    <div class="ramadan-metric"><small>المتبقي للإفطار</small><strong>${prayerCountdownText(prayerTimesData.maghrib)}</strong></div>
    <div class="ramadan-metric"><small>المتبقي للفجر</small><strong>${prayerCountdownText(prayerTimesData.fajr)}</strong></div>
    <div class="ramadan-metric"><small>خطة الختم اليوم</small><strong>${suggestedPages} صفحة</strong></div>
    <div class="ramadan-metric"><small>قراءة اليوم</small><strong>${pagesRead} صفحة</strong></div>
    <div class="ramadan-metric"><small>مهام اليوم</small><strong>${completed}/4</strong></div>
    <div class="ramadan-metric"><small>اليوم الهجري</small><strong>${hijriDay}</strong></div>
    <div class="ramadan-metric"><small>العشر الأواخر</small><strong>${hijriDay>=21?'نعم ✨':'بعد '+Math.max(0,21-hijriDay)+' يوم'}</strong></div>`;
}

/* ---------- السفر ---------- */
function toggleTravelMode(enabled) { advancedMeta().travel.enabled = Boolean(enabled); saveLogs(); renderTravelPanel(); logAdvancedActivity('وضع السفر', enabled?'تشغيل':'إيقاف'); }
function renderTravelPanel() {
  const meta = advancedMeta(), enabled = document.getElementById('travel-enabled'); if (enabled) enabled.checked=meta.travel.enabled;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const changed = meta.travel.lastTimeZone && meta.travel.lastTimeZone !== tz;
  const status=document.getElementById('travel-status'); if(status){status.className=`status-pill ${meta.travel.enabled?'ok':'warn'}`;status.textContent=meta.travel.enabled?`مفعّل — المنطقة الحالية ${tz}${changed?' (تغيّرت منذ آخر زيارة)':''}`:'غير مفعّل';}
  const list=document.getElementById('saved-cities-list'); if(list) list.innerHTML=meta.travel.savedCities.map((c,i)=>`<div class="compact-item"><div><b>${escapeHtml(c.label)}</b><small>${escapeHtml(c.timeZone||'')} ${c.city?'— '+escapeHtml(c.city):''}</small></div><div class="mini-actions"><button class="mini-btn" onclick="applySavedTravelCity(${i})">استخدام</button><button class="mini-btn" onclick="deleteSavedTravelCity(${i})">حذف</button></div></div>`).join('')||'<div class="empty-state">لم تحفظ مدنًا بعد.</div>';
}
function detectTravelLocation() {
  if (!navigator.geolocation) return setElementStatus('travel-status','تحديد الموقع غير مدعوم.',false);
  setElementStatus('travel-status','جارٍ تحديد الموقع وتحديث المواقيت...',false);
  navigator.geolocation.getCurrentPosition(pos=>{
    const meta=advancedMeta(); meta.travel.enabled=true; meta.travel.lastTimeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    profileMeta.customPrayerLocation={...(profileMeta.customPrayerLocation||{}),latitude:pos.coords.latitude,longitude:pos.coords.longitude,timeZone:meta.travel.lastTimeZone,method:Number(document.getElementById('prayer-method')?.value||5)};
    saveLogs(); refreshPrayerTimesFromApi(); locateQiblaWithCoords(pos.coords.latitude,pos.coords.longitude); renderTravelPanel();
  },e=>setElementStatus('travel-status',e.message,false),{enableHighAccuracy:true,timeout:12000});
}
function saveCurrentTravelCity() {
  const label=prompt('اكتب اسمًا للمدينة المحفوظة:'); if(!label)return;
  const loc=profileMeta.customPrayerLocation||{}; advancedMeta().travel.savedCities.push({label,city:loc.city||'',country:loc.country||'',latitude:loc.latitude??null,longitude:loc.longitude??null,timeZone:loc.timeZone||getTimeZone(),method:loc.method||5});
  saveLogs(); renderTravelPanel();
}
function applySavedTravelCity(index){const c=advancedMeta().travel.savedCities[index];if(!c)return;profileMeta.customPrayerLocation={...c};saveLogs();hydrateExtendedSettings();refreshPrayerTimesFromApi();renderTravelPanel();}
function deleteSavedTravelCity(index){advancedMeta().travel.savedCities.splice(index,1);saveLogs();renderTravelPanel();}

/* ---------- مكتبة المؤذنين ---------- */
function renderAdvancedAudioLibrary() {
  const box=document.getElementById('advanced-audio-library'); if(!box)return;
  const favorites=advancedMeta().audioFavorites;
  box.innerHTML=getAllAdhanVoiceOptions().map(v=>`<div class="audio-library-item"><div><b>${v.premium?'👑 ':''}${escapeHtml(v.name)}</b><small>${v.type==='fajr'||v.id.includes('fajr')?'أذان فجر':v.type==='iqama'||v.id.includes('iqama')?'إقامة':'أذان'} — ${v.premium?'مميز':'متاح'}</small></div><div class="audio-library-actions"><button class="icon-btn ${favorites.includes(v.id)?'active':''}" title="المفضلة" onclick="toggleAudioFavorite('${v.id}')">★</button><button class="icon-btn" title="معاينة" onclick="previewAdvancedVoice('${v.id}',this)">▶</button></div></div>`).join('');
}
function toggleAudioFavorite(id){const list=advancedMeta().audioFavorites,idx=list.indexOf(id);if(idx>=0)list.splice(idx,1);else list.push(id);saveLogs();renderAdvancedAudioLibrary();}
async function previewAdvancedVoice(id,button){
  try{
    if(advancedAudioPreview){advancedAudioPreview.pause();advancedAudioPreview=null;document.querySelectorAll('.audio-library-actions .icon-btn:last-child').forEach(b=>b.textContent='▶');if(button?.dataset.playing==='1'){button.dataset.playing='0';return;}}
    const resolved=await resolveAdhanSource(id);if(!resolved)return;
    const audio=new Audio(resolved.src);audio.volume=Number(profileMeta.adhanVolume??0.85);advancedAudioPreview=audio;button.textContent='⏸';button.dataset.playing='1';
    audio.onended=()=>{button.textContent='▶';button.dataset.playing='0';advancedAudioPreview=null;if(resolved.revoke)URL.revokeObjectURL(resolved.src);};
    audio.onerror=()=>{button.textContent='▶';button.dataset.playing='0';advancedAudioPreview=null;alert('تعذر تشغيل الملف. تأكد من وجوده داخل مجلد audio.');};
    await audio.play();
  }catch(e){button.textContent='▶';button.dataset.playing='0';alert(`تعذر التشغيل: ${e.message}`);}
}

/* ---------- المشاركة ---------- */
function currentAdvancedMetrics(){return getDayMetrics(systemLogs[currentDayKey]||makeEmptyDayRecord());}
function renderSharePreview(){
  const box=document.getElementById('achievement-share-preview');if(!box)return;
  const m=currentAdvancedMetrics(),hide=document.getElementById('share-hide-details')?.checked!==false;
  box.innerHTML=`<div><small>منصة مُعيني</small><h3>إنجاز اليوم</h3></div><div class="share-score">${m.overall}%</div><div>${hide?'خطوة هادئة نحو الاستمرار':`الصلوات ${m.prayerCount}/5 • الأذكار ${m.azkarCount}/2 • القرآن ${systemLogs[currentDayKey]?.readPagesToday||0} صفحة`}</div><small>${new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'long',year:'numeric'}).format(new Date())}</small>`;
}
async function buildAchievementImageBlob(){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=960;const ctx=canvas.getContext('2d');const m=currentAdvancedMetrics(),hide=document.getElementById('share-hide-details')?.checked!==false;
  const grad=ctx.createLinearGradient(0,0,1200,960);grad.addColorStop(0,'#164d3c');grad.addColorStop(1,'#04130f');ctx.fillStyle=grad;ctx.fillRect(0,0,1200,960);ctx.strokeStyle='#d4af37';ctx.lineWidth=8;ctx.strokeRect(28,28,1144,904);ctx.direction='rtl';ctx.textAlign='right';
  ctx.fillStyle='#ffe082';ctx.font='700 54px Arial';ctx.fillText('منصة مُعيني',1080,125);ctx.fillStyle='#ffffff';ctx.font='800 76px Arial';ctx.fillText('إنجاز اليوم',1080,235);ctx.textAlign='center';ctx.font='900 190px Arial';ctx.fillStyle='#ffe082';ctx.fillText(`${m.overall}%`,600,520);ctx.font='600 40px Arial';ctx.fillStyle='#d8e8e0';ctx.fillText(hide?'خطوة هادئة نحو الاستمرار':`الصلوات ${m.prayerCount}/5  •  الأذكار ${m.azkarCount}/2  •  القرآن ${systemLogs[currentDayKey]?.readPagesToday||0} صفحة`,600,640);ctx.font='500 32px Arial';ctx.fillStyle='#a9c1b5';ctx.fillText(new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'long',year:'numeric'}).format(new Date()),600,800);
  return new Promise(resolve=>canvas.toBlob(resolve,'image/png',.94));
}
async function shareAchievementCard(){const blob=await buildAchievementImageBlob();const file=new File([blob],`muaini-${currentDayKey}.png`,{type:'image/png'});const text='إنجاز يومي من منصة مُعيني — دون كشف التفاصيل الشخصية.';if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'إنجازي في مُعيني',text,files:[file]});}else if(navigator.share){await navigator.share({title:'إنجازي في مُعيني',text,url:location.href});}else{downloadBlob(blob,file.name);alert('المشاركة المباشرة غير مدعومة؛ تم تنزيل البطاقة.');}logAdvancedActivity('مشاركة بطاقة إنجاز');}
async function downloadAchievementCard(){const blob=await buildAchievementImageBlob();downloadBlob(blob,`muaini-${currentDayKey}.png`);}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}

/* ---------- البحث الشامل ---------- */
function debouncedGlobalSearch(){clearTimeout(advancedSearchTimer);advancedSearchTimer=setTimeout(runGlobalSearch,280);}
function searchableFeatures(){return[
  ['🕌','مواقيت الصلاة والأذان','الصلاة التنبيهات المؤذنين الإقامة','prayers'],['📿','الأذكار والسبحة','الصباح المساء التسبيح الاستغفار','azkar'],['📖','القرآن والورد','المصحف القراءة الختم الصفحات','azkar'],['🔎','التفسير الميسر','تفسير آية سورة بحث','tafseer'],['📊','الإحصائيات','اليومي الأسبوعي الشهري الإنجاز','stats'],['🧭','القبلة والتقويم','قبلة بوصلة هجري مناسبات','tools'],['🎯','الأهداف والقضاء','هدف قضاء صلاة إنجازات','goals'],['⚙️','الإعدادات والحساب','مزامنة إشعارات ثيم خصوصية','settings'],['🌙','وضع رمضان','صيام تراويح قيام ختم','more'],['✈️','وضع السفر','مدينة توقيت منطقة زمنية قصر جمع','more']];}
function runGlobalSearch(){
  const input=document.getElementById('global-search-input'),box=document.getElementById('global-search-results');if(!input||!box)return;const q=normalizeArabic(input.value.trim());if(q.length<2){box.innerHTML='<div class="empty-state">اكتب كلمتين أو أكثر لبدء البحث.</div>';return;}
  const results=[];searchableFeatures().forEach(([icon,title,keywords,page])=>{if(normalizeArabic(`${title} ${keywords}`).includes(q))results.push({icon,title,desc:keywords,type:'page',value:page});});
  (surahsData||[]).forEach(s=>{if(normalizeArabic(`${s.name} ${s.englishName||''}`).includes(q))results.push({icon:'📖',title:s.name,desc:`سورة — ${s.numberOfAyahs} آية`,type:'surah',value:s.number});});
  Object.entries(azkarData||{}).forEach(([kind,data])=>data.items.forEach((item,i)=>{if(results.length<30&&normalizeArabic(item.text).includes(q))results.push({icon:'📿',title:data.title,desc:item.text.slice(0,100)+'…',type:'azkar',value:kind});}));
  getAllAdhanVoiceOptions().forEach(v=>{if(normalizeArabic(v.name).includes(q))results.push({icon:'🎙️',title:v.name,desc:v.premium?'صوت مميز':'صوت متاح',type:'audio',value:v.id});});
  advancedMeta().bookmarks.forEach(b=>{if(normalizeArabic(`${b.title} ${b.note||''}`).includes(q))results.push({icon:'🔖',title:b.title,desc:b.note||'علامة محفوظة',type:'bookmark',value:b.id});});
  box.innerHTML=results.slice(0,40).map(r=>`<div class="search-result-item"><span class="search-result-icon">${r.icon}</span><div><b>${escapeHtml(r.title)}</b><p>${escapeHtml(r.desc)}</p></div><button class="mini-btn" onclick="activateGlobalSearchResult('${r.type}','${String(r.value).replaceAll("'","\\'")}')">فتح</button></div>`).join('')||'<div class="empty-state">لا توجد نتائج مطابقة.</div>';
}
function activateGlobalSearchResult(type,value){if(type==='page')showPage(value);if(type==='surah'){showPage('azkar');openSubPage('quran-reader-page');loadPageBySurah(Number(value));}if(type==='azkar'){showPage('azkar');openAzkarPage(value);}if(type==='audio'){showPage('more');switchAdvancedTab('daily',document.querySelector('[data-advanced-tab="daily"]'));setTimeout(()=>previewAdvancedVoice(value,document.querySelector(`.audio-library-item button[onclick*="${value}"]:last-child`)),200);}if(type==='bookmark')openBookmark(value);}

/* ---------- العلامات والملاحظات ---------- */
function bookmarkCurrentQuranPage(){const note=prompt('ملاحظة اختيارية لهذه الصفحة:')||'';advancedMeta().bookmarks.unshift({id:crypto.randomUUID?.()||String(Date.now()),type:'quran-page',page:currentPage,title:`صفحة القرآن ${currentPage}`,note,createdAt:new Date().toISOString()});advancedMeta().bookmarks=advancedMeta().bookmarks.slice(0,100);saveLogs();renderBookmarks();}
function addQuickNote(){const title=prompt('عنوان الملاحظة:');if(!title)return;const note=prompt('اكتب الملاحظة:')||'';advancedMeta().bookmarks.unshift({id:crypto.randomUUID?.()||String(Date.now()),type:'note',title,note,createdAt:new Date().toISOString()});saveLogs();renderBookmarks();}
function saveAyahBookmark(span){const text=span.textContent.trim();const note=prompt('ملاحظة على الآية (اختياري):')||'';advancedMeta().bookmarks.unshift({id:crypto.randomUUID?.()||String(Date.now()),type:'ayah',page:currentPage,title:text.slice(0,70),text,note,createdAt:new Date().toISOString()});saveLogs();renderBookmarks();alert('تم حفظ الآية في العلامات.');}
function renderBookmarks(){const box=document.getElementById('bookmarks-list');if(!box)return;box.innerHTML=advancedMeta().bookmarks.map(b=>`<div class="bookmark-item"><div><b>${escapeHtml(b.title)}</b><small>${escapeHtml(b.note||b.type)} — ${new Date(b.createdAt).toLocaleDateString('ar-EG')}</small></div><div class="mini-actions"><button class="mini-btn" onclick="openBookmark('${b.id}')">فتح</button><button class="mini-btn" onclick="deleteBookmark('${b.id}')">حذف</button></div></div>`).join('')||'<div class="empty-state">لا توجد علامات محفوظة.</div>';}
function openBookmark(id){const b=advancedMeta().bookmarks.find(x=>x.id===id);if(!b)return;if(b.page){showPage('azkar');openSubPage('quran-reader-page');loadPageInReader(Number(b.page));}else alert(`${b.title}\n\n${b.note||''}`);}
function deleteBookmark(id){advancedMeta().bookmarks=advancedMeta().bookmarks.filter(x=>x.id!==id);saveLogs();renderBookmarks();}

/* ---------- الحفظ والمراجعة ---------- */
function populateMemorizationSelect(){const select=document.getElementById('memorization-surah');if(!select||select.options.length>1)return;const data=(surahsData&&surahsData.length)?surahsData:Array.from({length:114},(_,i)=>({number:i+1,name:`السورة رقم ${i+1}`}));select.innerHTML=data.map(s=>`<option value="${s.number}">${escapeHtml(s.name)}</option>`).join('');}
function saveMemorizationSurah(){const no=Number(document.getElementById('memorization-surah')?.value),status=document.getElementById('memorization-status')?.value;if(!no)return;const old=advancedMeta().memorization[no]||{};const interval=status==='memorized'?7:status==='review'?3:1;advancedMeta().memorization[no]={...old,surahNo:no,status,stage:Number(old.stage||0),nextReview:new Date(Date.now()+interval*86400000).toISOString(),updatedAt:new Date().toISOString()};saveLogs();renderMemorization();}
function memorizationName(no){return surahsData?.find(s=>s.number===Number(no))?.name||`السورة ${no}`;}
function renderMemorization(){const box=document.getElementById('memorization-list');if(!box)return;const items=Object.values(advancedMeta().memorization).sort((a,b)=>new Date(a.nextReview)-new Date(b.nextReview));box.innerHTML=items.map(x=>{const due=new Date(x.nextReview)<=new Date();return`<div class="memorization-item"><div><b>${escapeHtml(memorizationName(x.surahNo))}</b><small>${x.status==='memorized'?'محفوظ':x.status==='review'?'مراجعة':'قيد الحفظ'} — ${due?'موعد المراجعة الآن':'المراجعة '+new Date(x.nextReview).toLocaleDateString('ar-EG')}</small></div><div class="mini-actions"><button class="mini-btn" onclick="startMemorizationReview(${x.surahNo})">فتح</button><button class="mini-btn" onclick="completeMemorizationReview(${x.surahNo})">تمت المراجعة</button></div></div>`;}).join('')||'<div class="empty-state">أضف سورة لبدء جدول المراجعة.</div>';}
function startMemorizationReview(no){showPage('azkar');openSubPage('quran-reader-page');loadPageBySurah(Number(no));}
function completeMemorizationReview(no){const item=advancedMeta().memorization[no];if(!item)return;item.stage=Math.min(6,Number(item.stage||0)+1);const intervals=[1,3,7,14,30,60,90];item.nextReview=new Date(Date.now()+intervals[item.stage]*86400000).toISOString();item.status=item.stage>=3?'memorized':'review';saveLogs();renderMemorization();}

/* ---------- المساعد المحلي ---------- */
function assistantReply(text){
  const q=normalizeArabic(text),m=currentAdvancedMetrics(),pages=Number(systemLogs[currentDayKey]?.readPagesToday||0),minutes=Number((text.match(/\d+/)||[])[0]||0);
  if(/فتوى|حلال|حرام|حكم شرعي|طلاق|زكاة/.test(q))return 'أنا مساعد استخدام ومتابعة، ولست جهة فتوى. اعرض المسألة على عالم موثوق أو جهة إفتاء رسمية، ويمكنني مساعدتك في تنظيم السؤال أو الوصول لقسم مناسب داخل المنصة.';
  if(/دقيق|وقت|خطة|اعمل ايه|ماذا افعل/.test(q)){if(minutes<=10)return 'خطة سريعة: دقيقتان استغفار، 3 دقائق أذكار، و5 دقائق لقراءة صفحة أو صفحتين بتدبر.';if(minutes<=20)return 'خطة 15–20 دقيقة: أذكار مختصرة، 5 صفحات قرآن، ثم مراجعة هدف واحد وتسجيله.';return 'قسّم الوقت: 10 دقائق أذكار، 15 دقيقة قرآن، 5 دقائق مراجعة للحفظ، والباقي للدعاء أو هدفك الشخصي.';}
  if(/تقدم|نسب|احص|اليوم/.test(q))return `مؤشر اليوم ${m.overall}%. سجلت ${m.prayerCount} من 5 صلوات، ${m.azkarCount} من مجموعتي الأذكار، وقرأت ${pages} صفحة.`;
  if(/قران|ورد|ختم/.test(q))return `قرأت اليوم ${pages} صفحة. افتح «أذكاري ووردي» وحدد خطة الختم، وسأحسب لك النسبة تلقائيًا.`;
  if(/اشعار|اذان|صوت/.test(q))return 'افتح صفحة الصلاة لتفعيل الإشعارات، ثم اختر صوتًا مستقلًا لكل صلاة واختبره بزر التشغيل قبل الحفظ.';
  if(/هدف/.test(q))return 'افتح صفحة «أهدافي»، واختر هدفًا رقميًا يوميًا أو أسبوعيًا. الأفضل أن تبدأ بهدف صغير ثابت ثم ترفعه تدريجيًا.';
  return 'أستطيع مساعدتك في: خطة حسب وقتك، قراءة ملخص تقدمك، ضبط الأذان والإشعارات، تنظيم الورد، الأهداف، الحفظ والمراجعة، أو شرح أي قسم في المنصة.';
}
function askMuainiAssistant(){const input=document.getElementById('assistant-input');if(!input)return;const text=input.value.trim();if(!text)return;const meta=advancedMeta();meta.assistantHistory.push({role:'user',text,at:new Date().toISOString()});const reply=assistantReply(text);meta.assistantHistory.push({role:'bot',text:reply,at:new Date().toISOString()});meta.assistantHistory=meta.assistantHistory.slice(-30);input.value='';saveLogs();renderAssistantHistory();}
function renderAssistantHistory(){const box=document.getElementById('assistant-chat');if(!box)return;const history=advancedMeta().assistantHistory;box.innerHTML=(history.length?history:[{role:'bot',text:'السلام عليكم، أخبرني كم دقيقة متاحة لك أو اسألني عن تقدمك اليوم.'}]).map(x=>`<div class="assistant-message ${x.role==='user'?'user':'bot'}">${escapeHtml(x.text)}</div>`).join('');box.scrollTop=box.scrollHeight;}

/* ---------- دائرة الأسرة ---------- */
async function createFamilyCircle(){const name=document.getElementById('family-group-name')?.value.trim();if(!name)return alert('اكتب اسم الدائرة.');const family=advancedMeta().family;if(muainiSupabase&&cloudSession){const {data,error}=await muainiSupabase.rpc('create_family_group',{group_name_input:name});if(error)return alert(error.message);const row=Array.isArray(data)?data[0]:data;Object.assign(family,{id:row.group_id,name,inviteCode:row.invite_code});}else{Object.assign(family,{id:crypto.randomUUID?.()||String(Date.now()),name,inviteCode:Math.random().toString(36).slice(2,8).toUpperCase(),members:[{name:currentUser.name,score:getPeriodAverage(7)}]});}saveLogs();renderFamilyCircle();}
async function joinFamilyCircle(){const code=prompt('اكتب رمز الدعوة:')?.trim().toUpperCase();if(!code)return;const family=advancedMeta().family;if(muainiSupabase&&cloudSession){const {data,error}=await muainiSupabase.rpc('join_family_group',{invite_code_input:code});if(error)return alert(error.message);const row=Array.isArray(data)?data[0]:data;Object.assign(family,{id:row.group_id,name:row.group_name,inviteCode:code});}else{Object.assign(family,{id:`local-${code}`,name:`دائرة ${code}`,inviteCode:code,members:[{name:currentUser.name,score:getPeriodAverage(7)}]});}saveLogs();renderFamilyCircle();}
async function renderFamilyCircle(){const status=document.getElementById('family-circle-status'),membersBox=document.getElementById('family-circle-members'),challenges=document.getElementById('family-challenges-list');if(!status||!membersBox)return;const family=advancedMeta().family;if(!family.id){status.className='status-pill warn';status.textContent='لا توجد دائرة نشطة.';membersBox.innerHTML='';if(challenges)challenges.innerHTML='';return;}status.className='status-pill ok';status.textContent=`${family.name} — رمز الدعوة: ${family.inviteCode||'—'}`;
  let members=family.members||[];let challengeList=family.challenges||[];
  if(muainiSupabase&&cloudSession&&!String(family.id).startsWith('local-')){const weekKey=getPastDateKeys(7)[0]||currentDayKey;const [{data:m},{data:c},{data:p}]=await Promise.all([muainiSupabase.from('family_members').select('display_name,user_id').eq('group_id',family.id),muainiSupabase.from('family_challenges').select('*').eq('group_id',family.id).eq('active',true),muainiSupabase.from('family_weekly_progress').select('user_id,score').eq('group_id',family.id).eq('week_key',weekKey)]);const scores=new Map((p||[]).map(x=>[x.user_id,Number(x.score||0)]));members=(m||[]).map(x=>({name:x.display_name||'عضو',score:scores.get(x.user_id)||0}));challengeList=c||challengeList;syncFamilyProgress().catch(()=>{});}
  membersBox.innerHTML=members.map(x=>`<div class="family-item"><div><b>${escapeHtml(x.name)}</b><small>يظهر المؤشر الإجمالي فقط</small></div><b>${Number(x.score||0)}%</b></div>`).join('')||'<div class="empty-state">لم تظهر قائمة الأعضاء بعد.</div>';
  if(challenges)challenges.innerHTML=challengeList.map((x,i)=>`<div class="compact-item"><div><b>${escapeHtml(x.title)}</b><small>الهدف ${x.target}</small></div><button class="mini-btn" onclick="deleteLocalFamilyChallenge(${i})">إخفاء</button></div>`).join('')||'<div class="empty-state">لا توجد تحديات.</div>';
}
async function syncFamilyProgress(){const family=advancedMeta().family;if(!family.id||!muainiSupabase||!cloudSession||!advancedMeta().privacy.groupVisible)return;const weekKey=getPastDateKeys(7)[0]||currentDayKey;await muainiSupabase.from('family_weekly_progress').upsert({group_id:family.id,user_id:cloudSession.user.id,week_key:weekKey,score:getPeriodAverage(7),updated_at:new Date().toISOString()},{onConflict:'group_id,user_id,week_key'});}
async function createFamilyChallenge(){const title=document.getElementById('family-challenge-title')?.value.trim(),target=Number(document.getElementById('family-challenge-target')?.value||0),family=advancedMeta().family;if(!family.id)return alert('أنشئ دائرة أولًا.');if(!title||target<1)return alert('اكتب عنوانًا وهدفًا صحيحًا.');const item={id:crypto.randomUUID?.()||String(Date.now()),title,target,active:true};family.challenges.push(item);if(muainiSupabase&&cloudSession&&!String(family.id).startsWith('local-'))await muainiSupabase.from('family_challenges').insert({group_id:family.id,title,target,created_by:cloudSession.user.id,active:true});saveLogs();renderFamilyCircle();}
function deleteLocalFamilyChallenge(index){advancedMeta().family.challenges.splice(index,1);saveLogs();renderFamilyCircle();}

/* ---------- Passkeys وقفل التطبيق ---------- */
function passkeySupported(){return Boolean(window.PublicKeyCredential&&navigator.credentials);}
function b64urlToBuffer(value){const base64=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=');const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));return bytes.buffer;}
function bufferToB64url(value){const bytes=new Uint8Array(value);let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function registrationOptionsToNative(options){return {...options,challenge:b64urlToBuffer(options.challenge),user:{...options.user,id:b64urlToBuffer(options.user.id)},excludeCredentials:(options.excludeCredentials||[]).map(c=>({...c,id:b64urlToBuffer(c.id)}))};}
function authenticationOptionsToNative(options){return {...options,challenge:b64urlToBuffer(options.challenge),allowCredentials:(options.allowCredentials||[]).map(c=>({...c,id:b64urlToBuffer(c.id)}))};}
function credentialToJSON(credential){if(!credential)return null;const response=credential.response;const base={id:credential.id,rawId:bufferToB64url(credential.rawId),type:credential.type,authenticatorAttachment:credential.authenticatorAttachment||undefined,clientExtensionResults:credential.getClientExtensionResults?.()||{}};if('attestationObject' in response){return {...base,response:{clientDataJSON:bufferToB64url(response.clientDataJSON),attestationObject:bufferToB64url(response.attestationObject),transports:response.getTransports?.()||[]}};}return {...base,response:{clientDataJSON:bufferToB64url(response.clientDataJSON),authenticatorData:bufferToB64url(response.authenticatorData),signature:bufferToB64url(response.signature),userHandle:response.userHandle?bufferToB64url(response.userHandle):null}};}
async function startNativeRegistration(options){return credentialToJSON(await navigator.credentials.create({publicKey:registrationOptionsToNative(options)}));}
async function startNativeAuthentication(options){return credentialToJSON(await navigator.credentials.get({publicKey:authenticationOptionsToNative(options)}));}
function passkeyAuthHeaders(){return {'Content-Type':'application/json','Authorization':`Bearer ${cloudSession?.access_token||''}`};}
async function registerMuainiPasskey(){
  if(!passkeySupported())return setElementStatus('passkey-status','الجهاز أو المتصفح لا يدعم Passkeys.',false);
  if(!cloudSession)return setElementStatus('passkey-status','سجّل الدخول السحابي أولًا ثم أضف مفتاح المرور.',false);
  try{setElementStatus('passkey-status','جارٍ تجهيز مفتاح المرور...',false);const optionsResponse=await fetch('/api/passkeys/register-options',{headers:{Authorization:`Bearer ${cloudSession.access_token}`}});const options=await optionsResponse.json();if(!optionsResponse.ok)throw new Error(options.error||'تعذر بدء التسجيل');const attResp=await startNativeRegistration(options);const verifyResponse=await fetch('/api/passkeys/register-verify',{method:'POST',headers:passkeyAuthHeaders(),body:JSON.stringify(attResp)});const result=await verifyResponse.json();if(!verifyResponse.ok||!result.verified)throw new Error(result.error||'لم يتم التحقق');advancedMeta().passkey.registered=true;advancedMeta().privacy.passkeyLock=true;saveLogs();setElementStatus('passkey-status','تم تسجيل مفتاح المرور وتفعيل قفل التطبيق.',true);renderSecurityCenter();logAdvancedActivity('إضافة مفتاح مرور');}catch(e){setElementStatus('passkey-status',`تعذر التسجيل: ${e.message}`,false);}
}
async function verifyMuainiPasskey(unlock=false){
  if(!passkeySupported())return setElementStatus(unlock?'app-lock-status':'passkey-status','Passkeys غير مدعومة.',false);
  if(!cloudSession)return setElementStatus(unlock?'app-lock-status':'passkey-status','جلسة الحساب السحابي غير متاحة.',false);
  try{const id=unlock?'app-lock-status':'passkey-status';setElementStatus(id,'في انتظار بصمة الجهاز...',false);const oRes=await fetch('/api/passkeys/auth-options',{headers:{Authorization:`Bearer ${cloudSession.access_token}`}});const options=await oRes.json();if(!oRes.ok)throw new Error(options.error||'تعذر بدء التحقق');const asseResp=await startNativeAuthentication(options);const vRes=await fetch('/api/passkeys/auth-verify',{method:'POST',headers:passkeyAuthHeaders(),body:JSON.stringify(asseResp)});const result=await vRes.json();if(!vRes.ok||!result.verified)throw new Error(result.error||'فشل التحقق');advancedMeta().passkey.lastVerifiedAt=new Date().toISOString();saveLogs();document.getElementById('app-lock-overlay')?.setAttribute('hidden','');setElementStatus(id,'تم التحقق بنجاح.',true);logAdvancedActivity('فتح بمفتاح المرور');return true;}catch(e){setElementStatus(unlock?'app-lock-status':'passkey-status',`تعذر التحقق: ${e.message}`,false);return false;}
}
function togglePasskeyLock(enabled){const meta=advancedMeta();if(enabled&&!meta.passkey.registered){document.getElementById('privacy-passkey-lock').checked=false;return alert('أضف مفتاح مرور أولًا.');}meta.privacy.passkeyLock=Boolean(enabled);saveLogs();renderSecurityCenter();}
function disableMuainiPasskeyLock(){advancedMeta().privacy.passkeyLock=false;saveLogs();renderSecurityCenter();setElementStatus('passkey-status','تم إيقاف قفل التطبيق. بيانات المفتاح السحابية لم تُحذف.',true);}
function unlockWithCloudSessionFallback(){if(cloudSession&&confirm('سيتم فتح التطبيق بالجلسة السحابية الحالية دون بصمة هذه المرة. متابعة؟'))document.getElementById('app-lock-overlay')?.setAttribute('hidden','');}
function evaluateAppLock(){const meta=advancedMeta();if(meta.privacy.passkeyLock&&meta.passkey.registered&&cloudSession){document.getElementById('app-lock-overlay')?.removeAttribute('hidden');}}

/* ---------- Background Sync ---------- */
const previousSaveLogsAdvanced = saveLogs;
saveLogs = function saveLogsWithAdvancedSync(){ensureExtendedMeta();previousSaveLogsAdvanced();scheduleAdvancedBackgroundSync();};
function toggleBackgroundSync(enabled){advancedMeta().privacy.backgroundSync=Boolean(enabled);saveLogs();renderSecurityCenter();}
function scheduleAdvancedBackgroundSync(){if(!advancedMeta().privacy.backgroundSync||!advancedMeta().privacy.cloudSync||!cloudSession||!isCloudConfigured())return;clearTimeout(advancedSyncTimer);advancedSyncTimer=setTimeout(queueAdvancedCloudSnapshot,1200);}
async function queueAdvancedCloudSnapshot(){
  if(!navigator.serviceWorker?.controller||!cloudSession||!isCloudConfigured())return;
  const url=`${MUAINI_CONFIG.supabaseUrl.replace(/\/$/,'')}/rest/v1/user_data?on_conflict=user_id`;
  const payload={user_id:cloudSession.user.id,logs:systemLogs,meta:profileMeta,last_read_page:lastReadPage,updated_at:new Date().toISOString()};
  navigator.serviceWorker.controller.postMessage({type:'QUEUE_REQUEST',request:{id:`cloud-${cloudSession.user.id}`,url,method:'POST',headers:{'Content-Type':'application/json','apikey':MUAINI_CONFIG.supabaseAnonKey,'Authorization':`Bearer ${cloudSession.access_token}`,'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(payload)}});
  const reg=await navigator.serviceWorker.ready;try{await reg.sync?.register('muaini-sync-queue');setElementStatus('background-sync-status','تمت جدولة المزامنة عند استقرار الإنترنت.',true);}catch(_){if(navigator.onLine)navigator.serviceWorker.controller.postMessage({type:'FLUSH_SYNC_QUEUE'});}
}
function flushAdvancedSyncQueue(){navigator.serviceWorker?.controller?.postMessage({type:'FLUSH_SYNC_QUEUE'});if(navigator.onLine)syncCloudNow(false).catch(()=>{});setElementStatus('background-sync-status','جارٍ محاولة المزامنة...',false);}

/* ---------- مركز الخصوصية والنشاط ---------- */
function setAdvancedPrivacy(key,value){advancedMeta().privacy[key]=Boolean(value);saveLogs();if(key==='groupVisible')syncFamilyProgress().catch(()=>{});renderSecurityCenter();}
function renderSecurityCenter(){
  const meta=advancedMeta(),p=meta.privacy;
  const pairs={'privacy-cloud-sync':p.cloudSync,'privacy-group-visible':p.groupVisible,'privacy-passkey-lock':p.passkeyLock,'privacy-activity-log':p.activityLog,'background-sync-enabled':p.backgroundSync};Object.entries(pairs).forEach(([id,val])=>{const el=document.getElementById(id);if(el)el.checked=Boolean(val);});
  const pass=document.getElementById('passkey-status');if(pass){pass.className=`status-pill ${meta.passkey.registered?'ok':'warn'}`;pass.textContent=!passkeySupported()?'الجهاز لا يدعم Passkeys.':meta.passkey.registered?`مفتاح مرور مسجل${meta.passkey.lastVerifiedAt?' — آخر تحقق '+new Date(meta.passkey.lastVerifiedAt).toLocaleString('ar-EG'):''}`:'Passkeys مدعومة — تحتاج حسابًا سحابيًا مسجلًا.';}
  const sync=document.getElementById('background-sync-status');if(sync){const supported='serviceWorker'in navigator&&'SyncManager'in window;sync.className=`status-pill ${supported?'ok':'warn'}`;sync.textContent=supported?'Background Sync مدعوم على هذا الجهاز.':'سيتم استخدام المزامنة عند عودة الاتصال وفتح التطبيق.';}
  renderActivityLog();renderUpdateStatus();
}
function renderActivityLog(){const box=document.getElementById('activity-log-list'),summary=document.getElementById('activity-summary');if(summary)summary.textContent=`${navigator.onLine?'متصل':'غير متصل'} — ${navigator.platform||'جهاز'} — ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;if(box)box.innerHTML=advancedMeta().activity.slice(0,12).map(x=>`<div class="activity-item"><div><b>${escapeHtml(x.action)}</b><small>${escapeHtml(x.detail||'')} — ${new Date(x.at).toLocaleString('ar-EG')}</small></div></div>`).join('')||'<div class="empty-state">لا يوجد نشاط مسجل بعد.</div>';}
function deleteSelectedDayData(){const key=prompt('اكتب التاريخ بصيغة YYYY-MM-DD:');if(!key)return;if(!systemLogs[key])return alert('لا توجد بيانات لهذا اليوم.');if(confirm(`حذف بيانات يوم ${key} فقط؟`)){delete systemLogs[key];saveLogs();renderAllLiveData();alert('تم حذف اليوم المحدد.');}}
async function deleteCloudAccountCompletely(){if(!cloudSession)return alert('لا يوجد حساب سحابي مسجل.');const phrase=prompt('لحذف الحساب نهائيًا اكتب: حذف حسابي');if(phrase!=='حذف حسابي')return;const r=await fetch('/api/account/delete',{method:'POST',headers:{Authorization:`Bearer ${cloudSession.access_token}`}});const data=await r.json();if(!r.ok)return alert(data.error||'تعذر الحذف');await cloudSignOut();alert('تم حذف الحساب السحابي. البيانات المحلية ما زالت على هذا الجهاز ويمكن حذفها من النسخ الاحتياطي.');}
async function signOutAllCloudDevices(){if(!muainiSupabase||!cloudSession)return alert('لا توجد جلسة سحابية.');if(!confirm('تسجيل الخروج من كل الأجهزة؟'))return;const {error}=await muainiSupabase.auth.signOut({scope:'global'});if(error)return alert(error.message);cloudSession=null;cloudProfile=null;renderCloudStatus();alert('تم تسجيل الخروج من كل الأجهزة.');}


function setAdvancedAccessibility(key,value){advancedMeta().accessibilityPlus[key]=value;saveLogs();applyAdvancedAccessibility();}
function applyAdvancedAccessibility(){const a=advancedMeta().accessibilityPlus;document.body.classList.toggle('advanced-font-xl',a.fontSize==='xl');document.body.classList.toggle('advanced-font-xxl',a.fontSize==='xxl');document.body.classList.toggle('advanced-dyslexia',Boolean(a.dyslexia));document.body.classList.toggle('advanced-monochrome',Boolean(a.monochrome));const size=document.getElementById('advanced-font-size');if(size)size.value=a.fontSize||'normal';const dys=document.getElementById('advanced-dyslexia');if(dys)dys.checked=Boolean(a.dyslexia);const mono=document.getElementById('advanced-monochrome');if(mono)mono.checked=Boolean(a.monochrome);}

/* ---------- تحديث التطبيق ---------- */
async function checkForMuainiUpdate(){try{const reg=serviceWorkerRegistration||await registerServiceWorker();await reg.update();if(reg.waiting){advancedWaitingWorker=reg.waiting;showUpdateToast();setElementStatus('app-update-status','تحديث جديد جاهز للتثبيت.',true);}else setElementStatus('app-update-status',`أنت تستخدم أحدث إصدار (${window.MUAINI_APP_VERSION}).`,true);}catch(e){setElementStatus('app-update-status',`تعذر الفحص: ${e.message}`,false);}}
function showUpdateToast(){document.getElementById('update-toast')?.classList.add('visible');}
function applyWaitingUpdate(){const worker=advancedWaitingWorker||serviceWorkerRegistration?.waiting;if(worker){worker.postMessage({type:'SKIP_WAITING'});}else checkForMuainiUpdate();}
function renderUpdateStatus(){const el=document.getElementById('app-update-status');if(el&&!advancedWaitingWorker)el.textContent=`الإصدار الحالي: ${window.MUAINI_APP_VERSION}`;}

/* ---------- المراقبة التقنية للمشرف ---------- */
async function diagnosticCheck(name,runner){try{const detail=await runner();return{name,status:'ok',detail:String(detail||'سليم')}}catch(e){return{name,status:'bad',detail:e.message}}}
async function runAdminDiagnostics(){const box=document.getElementById('admin-diagnostics-list');if(!box)return;box.innerHTML='<div class="diagnostic-item">جارٍ الفحص...</div>';const audio=getAllAdhanVoiceOptions().filter(v=>!v.premium).slice(0,6);advancedDiagnosticsReport=await Promise.all([
  diagnosticCheck('الاتصال',async()=>navigator.onLine?'متصل':'وضع دون إنترنت'),
  diagnosticCheck('Service Worker',async()=>{const r=await registerServiceWorker();return r.active?.state||'مسجل'}),
  diagnosticCheck('الكاش',async()=>`${(await caches.keys()).length} مخزن`),
  diagnosticCheck('واجهة مواقيت الصلاة',async()=>{const r=await fetch('https://api.aladhan.com/v1/timingsByCity?city=Cairo&country=Egypt&method=5');if(!r.ok)throw new Error(`HTTP ${r.status}`);return'تعمل'}),
  ...audio.map(v=>diagnosticCheck(`الصوت: ${v.name}`,async()=>{const urls=getAudioCandidateUrls(v.files||[]);let last='';for(const u of urls){try{const r=await fetch(u,{headers:{Range:'bytes=0-512'}});if(r.ok||r.status===206)return`${r.status} — متاح`;}catch(e){last=e.message;}}throw new Error(last||'غير موجود');})),
  diagnosticCheck('أخطاء الواجهة المسجلة',async()=>`${advancedMeta().errorLog.length} خطأ/تحذير`)
]);box.innerHTML=advancedDiagnosticsReport.map(x=>`<div class="diagnostic-item ${x.status}"><b>${x.status==='ok'?'✅':'❌'} ${escapeHtml(x.name)}</b><span>${escapeHtml(x.detail)}</span></div>`).join('');}
function exportDiagnosticsReport(){const payload={version:window.MUAINI_APP_VERSION,at:new Date().toISOString(),url:location.href,userAgent:navigator.userAgent,report:advancedDiagnosticsReport,errors:advancedMeta().errorLog};downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`muaini-diagnostics-${Date.now()}.json`);}

/* ---------- تهيئة وربط ---------- */
function renderAdvancedAccessibilityExtras(){document.documentElement.lang='ar';document.querySelectorAll('button:not([type])').forEach(b=>b.setAttribute('type','button'));document.querySelectorAll('img:not([alt])').forEach(i=>i.setAttribute('alt',''));}

window.addEventListener('online',()=>{setElementStatus('background-sync-status','عاد الاتصال — جارٍ مزامنة البيانات.',true);flushAdvancedSyncQueue();renderAdvancedHub();});
window.addEventListener('offline',()=>{setElementStatus('background-sync-status','أنت دون إنترنت. ستُحفظ العمليات وتُزامن لاحقًا.',false);renderAdvancedHub();});
navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='SYNC_QUEUE_DONE')setElementStatus('background-sync-status','اكتملت المزامنة المؤجلة.',true);if(event.data?.type==='UPDATE_READY'){advancedWaitingWorker=serviceWorkerRegistration?.waiting||null;showUpdateToast();}});
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(!sessionStorage.getItem('muaini-reloading')){sessionStorage.setItem('muaini-reloading','1');location.reload();}});

document.addEventListener('click',event=>{const ayah=event.target.closest?.('.ayah-text');if(ayah&&event.detail===2)saveAyahBookmark(ayah);});

window.addEventListener('DOMContentLoaded',()=>{
  ensureExtendedMeta();renderAdvancedAccessibilityExtras();applyAdvancedAccessibility();renderAdvancedHub();
  const hashPage=location.hash.match(/^#page-([a-z-]+)$/i)?.[1];if(hashPage&&document.getElementById(`page-${hashPage}`))setTimeout(()=>showPage(hashPage),80);
  setTimeout(()=>{populateMemorizationSelect();renderAdvancedHub();evaluateAppLock();},1800);
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone,travel=advancedMeta().travel;if(travel.lastTimeZone&&travel.lastTimeZone!==tz&&travel.enabled){setElementStatus('travel-status',`تغيّرت المنطقة الزمنية من ${travel.lastTimeZone} إلى ${tz}. حدّث المواقيت.`,false);}travel.lastTimeZone=tz;
  const ramadanMode=document.getElementById('ramadan-mode');if(ramadanMode)ramadanMode.value=advancedMeta().ramadan.mode;
  if('serviceWorker'in navigator)navigator.serviceWorker.ready.then(reg=>{serviceWorkerRegistration=reg;if(reg.waiting){advancedWaitingWorker=reg.waiting;showUpdateToast();}reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){advancedWaitingWorker=w;showUpdateToast();}});});});
  logAdvancedActivity('تشغيل المنصة',window.MUAINI_APP_VERSION);saveLogs();
});
