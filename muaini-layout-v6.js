'use strict';

/* =========================================================
   مُعيني 6.0 — تنظيم غير مدمّر للواجهة
========================================================= */
(function () {
  const ICONS = {
    home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V21h14V10.5"/><path d="M9 21v-6h6v6"/>',
    mosque:'<path d="M4 21V10h16v11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M2 21h20"/><path d="M10 21v-5h4v5"/><path d="M3 10h18"/>',
    quran:'<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/><path d="M7 7h2M15 7h2"/>',
    tasbih:'<circle cx="8" cy="7" r="2"/><circle cx="13" cy="5" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="18" cy="13" r="2"/><circle cx="15" cy="17" r="2"/><circle cx="10" cy="18" r="2"/><circle cx="6" cy="15" r="2"/><circle cx="5" cy="11" r="2"/><path d="M10 20l-1 3m6-4 2 3"/>',
    chart:'<path d="M4 21V10"/><path d="M10 21V4"/><path d="M16 21v-7"/><path d="M22 21H2"/>',
    crescent:'<path d="M20 15.5A8 8 0 1 1 8.5 4 6.5 6.5 0 0 0 20 15.5z"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.2.37.6.72 1 .9.3.14.7.2 1.1.2h.1v4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    sparkles:'<path d="m12 3-1 3-3 1 3 1 1 3 1-3 3-1-3-1zM18 13l-.7 2.3L15 16l2.3.7L18 19l.7-2.3L21 16l-2.3-.7zM5 12l-.6 1.8L2.5 14l1.9.6L5 16.5l.6-1.9 1.9-.6-1.9-.2z"/>',
    arrow:'<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    cloud:'<path d="M17.5 19H7a5 5 0 1 1 1.1-9.88A7 7 0 0 1 21 12a4 4 0 0 1-3.5 7z"/>',
    kaaba:'<path d="M5 7h14v14H5z"/><path d="M5 7l7-4 7 4M5 12h14M9 12V8h6v4"/>',
    star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1z"/>',
    logout:'<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/>'
  };

  const PAGE_META = {
    about:{label:'الرئيسية',sub:'ملخص يومك وعباداتك',icon:'home'},
    prayers:{label:'صلاتي',sub:'المواقيت والأذان والإقامة',icon:'mosque'},
    quran:{label:'القرآن الكريم',sub:'وردي وقرآني والتفسير',icon:'quran'},
    azkar:{label:'أذكاري',sub:'الأذكار والسبحة',icon:'tasbih'},
    stats:{label:'الإحصائيات',sub:'تحليل يومي وأسبوعي وشهري',icon:'chart'},
    'more-hub':{label:'المزيد',sub:'الأدوات والحساب والإعدادات',icon:'sparkles'},
    tools:{label:'الأدوات الإسلامية',sub:'القبلة والتقويم الهجري',icon:'compass'},
    goals:{label:'الأهداف والإنجازات',sub:'خططك وسلسلة التزامك',icon:'target'},
    more:{label:'مُعيني بلس',sub:'رمضان والسفر والمجتمع',icon:'crescent'},
    settings:{label:'الإعدادات',sub:'الحساب والموقع وسهولة الاستخدام',icon:'settings'},
    admin:{label:'الإدارة',sub:'لوحة تحكم المشرف',icon:'shield'}
  };
  const PRIMARY = ['about','prayers','quran','azkar','stats','more-hub'];
  const MOBILE = ['about','prayers','quran','azkar','stats'];
  let currentV6Page = 'about';

  function icon(name, cls='') {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.sparkles}</svg>`;
  }

  function safeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function waitReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }

  function buildQuranPage() {
    if (document.getElementById('page-quran')) return;
    const page = document.createElement('section');
    page.id = 'page-quran';
    page.className = 'page-section';
    page.innerHTML = `
      <div id="v6-quran-main" class="v6-quran-main">
        <div class="v6-section-hero">
          <span class="v6-kicker">${icon('quran')} القرآن الكريم</span>
          <h1>قراءة هادئة، ورد محفوظ، وتفسير قريب</h1>
          <p>قسم واحد يجمع وردك اليومي، المصحف الحر، التفسير، الحفظ والمراجعة والعلامات المرجعية مع بقاء كل بياناتك السابقة كما هي.</p>
          <div class="v6-hero-actions">
            <button class="v6-primary-btn" onclick="enterMyWardPage()">${icon('book')} استكمل وردي</button>
            <button class="v6-secondary-btn" onclick="openGeneralQuranPage()">${icon('quran')} افتح قرآني من الفاتحة</button>
          </div>
          <div class="v6-quran-mode-note"><strong>وردي:</strong> يحتفظ بآخر صفحة. &nbsp; <strong>قرآني:</strong> يبدأ دائمًا من سورة الفاتحة.</div>
        </div>
        <div class="v6-action-grid">
          ${actionCard('وردي','استكمل من آخر صفحة وصلت إليها مع حفظ التقدم تلقائيًا.','book',"enterMyWardPage()",'استكمل وردي')}
          ${actionCard('قرآني','مصحف حر يبدأ دائمًا من الفاتحة ثم يتيح التنقل بين السور والأجزاء.','quran',"openGeneralQuranPage()",'فتح المصحف')}
          ${actionCard('التفسير الميسر','ابحث بالسورة أو الآية واقرأ التفسير بطريقة منظمة.','search',"openQuranFeature('tafseer')",'فتح التفسير')}
          ${actionCard('الحفظ والمراجعة','جدول مراجعة وتكرار ومتابعة للسور والآيات المحفوظة.','star',"openAdvancedKnowledge('memorization')",'فتح الحفظ')}
          ${actionCard('العلامات والملاحظات','ارجع إلى الآيات والصفحات المحفوظة وملاحظاتك.','book',"openAdvancedKnowledge('bookmarks')",'فتح العلامات')}
          ${actionCard('التلاوة والاستماع','اختر القارئ وشغّل الآية مع التكرار والسرعة المناسبة.','bell',"openGeneralQuranPage()",'فتح التلاوة')}
        </div>
        <div id="v6-quran-plan-slot"></div>
      </div>`;
    document.body.appendChild(page);

    const azkarMain = document.getElementById('azkar-main-view');
    const quranCard = azkarMain?.querySelectorAll(':scope > .card')?.[2];
    const slot = page.querySelector('#v6-quran-plan-slot');
    if (quranCard && slot) slot.appendChild(quranCard);

    const reader = document.getElementById('quran-reader-page');
    if (reader) page.appendChild(reader);

    const tafseerPage = document.getElementById('page-tafseer');
    if (tafseerPage) {
      const tafMain = document.getElementById('tafseer-main-view');
      const tafDisplay = document.getElementById('tafseer-display-page');
      if (tafMain) { tafMain.classList.remove('active-sub'); page.appendChild(tafMain); addQuranHomeButton(tafMain); }
      if (tafDisplay) page.appendChild(tafDisplay);
      tafseerPage.classList.add('v6-legacy-page');
    }
  }

  function actionCard(title, text, iconName, onclick, buttonText) {
    return `<article class="v6-action-card"><div class="v6-card-icon">${icon(iconName)}</div><h3>${title}</h3><small>${text}</small><button class="v6-secondary-btn" onclick="${onclick}">${buttonText}</button></article>`;
  }

  function addQuranHomeButton(container) {
    if (!container || container.querySelector('.v6-quran-home-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'v6-section-back v6-quran-home-btn';
    btn.innerHTML = `${icon('arrow')} العودة لقسم القرآن`;
    btn.onclick = () => closeQuranFeature();
    container.prepend(btn);
  }

  function buildMoreHub() {
    if (document.getElementById('page-more-hub')) return;
    const page = document.createElement('section');
    page.id = 'page-more-hub';
    page.className = 'page-section';
    page.innerHTML = `
      <div class="v6-section-hero">
        <span class="v6-kicker">${icon('sparkles')} المزيد</span>
        <h1>كل أداة في مكانها الصحيح</h1>
        <p>القبلة والتقويم والأهداف ورمضان والسفر والمجتمع والحساب والإعدادات موزعة في مجموعات واضحة، من غير حذف أي ميزة قديمة.</p>
      </div>
      <div class="v6-more-grid">
        ${moreCard('الأدوات الإسلامية','القبلة الحية، التقويم الهجري والمناسبات.','compass',[['القبلة والتقويم',"showOrganizedPage('tools')"],['وضع السفر',"openAdvancedTab('daily')"]])}
        ${moreCard('الأهداف والإنجازات','الأهداف الشخصية، قضاء الصلوات والشارات.','target',[['أهدافي',"showOrganizedPage('goals')"],['الإحصائيات',"showOrganizedPage('stats')"]])}
        ${moreCard('رمضان والعبادات','خطة رمضان، الصيام، القيام، الصدقة وختم القرآن.','crescent',[['وضع رمضان',"openAdvancedTab('daily')"],['أذكاري',"showOrganizedPage('azkar')"]])}
        ${moreCard('المجتمع والتحديات','دائرة الأسرة، المجموعات الطيبة والتحديات الخاصة.','users',[['المجتمع',"openAdvancedTab('community')"],['مشاركة الإنجاز',"openAdvancedTab('daily')"]])}
        ${moreCard('الحساب والتطبيق','الحساب السحابي، الإشعارات، المظهر والعمل دون إنترنت.','settings',[['الإعدادات',"showOrganizedPage('settings')"],['الخصوصية',"openAdvancedTab('security')"]])}
        ${moreCard('الأمان والإدارة','البصمة، الأجهزة والجلسات ولوحة تحكم المشرف.','shield',[['الأمان',"openAdvancedTab('security')"],['الإدارة',"showOrganizedPage('admin')"]])}
      </div>`;
    document.body.appendChild(page);
  }

  function moreCard(title, text, iconName, links) {
    return `<article class="v6-more-card"><div class="v6-card-icon">${icon(iconName)}</div><h3>${title}</h3><small>${text}</small><div class="v6-more-links">${links.map(([label,call])=>`<button class="v6-chip" onclick="${call}">${label}</button>`).join('')}</div></article>`;
  }

  function buildDashboard() {
    const about = document.getElementById('page-about');
    if (!about || about.querySelector('.v6-dashboard')) return;
    const dashboard = document.createElement('div');
    dashboard.className = 'v6-dashboard';
    dashboard.innerHTML = `
      <div class="v6-section-hero">
        <span class="v6-kicker">${icon('crescent')} منصة يومية للعبادة والمتابعة</span>
        <h1>يومك الروحي في شاشة واحدة</h1>
        <p>تابع الصلاة القادمة، استكمل وردك، راقب تقدمك اليومي وافتح أهم الأدوات من غير التنقل بين صفحات كثيرة.</p>
        <div class="v6-hero-actions">
          <button class="v6-primary-btn" onclick="showOrganizedPage('prayers')">${icon('mosque')} الصلاة القادمة</button>
          <button class="v6-secondary-btn" onclick="showOrganizedPage('quran')">${icon('quran')} استكمل وردك</button>
        </div>
      </div>
      <div class="v6-dashboard-grid">
        ${dashCard('الصلاة القادمة','--:--','المواقيت تتحدث حسب موقعك','mosque','v6-next-prayer')}
        ${dashCard('استكمل وردك','الصفحة 1','مكان القراءة محفوظ تلقائيًا','book','v6-ward-page')}
        ${dashCard('إنجاز اليوم','0%','صلوات وأذكار وورد','chart','v6-day-score')}
        ${dashCard('تسبيحات اليوم','0','العداد اليومي والتراكمي','tasbih','v6-tasbeeh-count')}
        ${dashCard('الهدف اليومي','ابدأ الآن','هدفك الأقرب للإنجاز','target','v6-goal-status')}
        ${dashCard('التاريخ الهجري','--','المناسبات والأيام الفاضلة','calendar','v6-hijri-date')}
      </div>`;
    about.prepend(dashboard);
  }

  function dashCard(label,value,note,iconName,id) {
    return `<article class="v6-dash-card"><div class="v6-card-icon">${icon(iconName)}</div><small>${label}</small><strong id="${id}">${value}</strong><small>${note}</small></article>`;
  }

  function buildShell() {
    if (document.getElementById('v6-sidebar')) return;
    document.body.classList.add('muaini-v6');
    const sidebar = document.createElement('aside');
    sidebar.id = 'v6-sidebar'; sidebar.className = 'v6-sidebar';
    sidebar.innerHTML = `
      <div class="v6-brand"><img src="logo.jpg" onerror="this.onerror=null;this.src='logo-placeholder.png'" alt="شعار مُعيني"><div><strong>مُعيني</strong><small>للعبادات والمتابعة</small></div></div>
      <div class="v6-user-mini"><div class="v6-user-avatar" id="v6-user-letter">م</div><div><strong id="v6-user-name">زائر</strong><small id="v6-user-plan">الحساب المحلي</small></div></div>
      <nav class="v6-side-nav" aria-label="التنقل الرئيسي">${PRIMARY.map(navButton).join('')}</nav>
      <div class="v6-side-spacer"></div>
      <div class="v6-side-actions"><button class="v6-icon-btn" onclick="showOrganizedPage('settings')">${icon('settings')} إعدادات</button><button class="v6-icon-btn" onclick="openV6Search()">${icon('search')} بحث</button></div>`;
    document.body.prepend(sidebar);

    const topbar = document.createElement('div');
    topbar.className = 'v6-topbar'; topbar.id = 'v6-topbar';
    topbar.innerHTML = `
      <div class="v6-page-title"><span class="v6-title-icon" id="v6-page-icon">${icon('home')}</span><div><strong id="v6-page-title">الرئيسية</strong><small id="v6-page-subtitle">ملخص يومك وعباداتك</small></div></div>
      <div class="v6-search-wrap">${icon('search')}<input aria-label="البحث في المنصة" placeholder="ابحث عن سورة، ذكر، مؤذن أو أداة..." onfocus="openV6Search()"></div>
      <div class="v6-top-actions"><button class="v6-icon-btn" title="الإشعارات" onclick="showOrganizedPage('prayers')">${icon('bell')}</button><button class="v6-icon-btn" title="المزيد" onclick="showOrganizedPage('more-hub')">${icon('sparkles')}</button></div>`;
    sidebar.insertAdjacentElement('afterend', topbar);

    const mobileTop = document.createElement('div');
    mobileTop.className = 'v6-mobile-topbar';
    mobileTop.innerHTML = `<div class="v6-mobile-brand"><img src="logo.jpg" onerror="this.onerror=null;this.src='logo-placeholder.png'" alt="شعار مُعيني"><span>مُعيني</span></div><div class="v6-mobile-actions"><button class="v6-icon-btn" onclick="openV6Search()" aria-label="بحث">${icon('search')}</button><button class="v6-icon-btn" onclick="showOrganizedPage('more-hub')" aria-label="المزيد">${icon('sparkles')}</button></div>`;
    document.body.prepend(mobileTop);

    const mobileNav = document.createElement('nav');
    mobileNav.className = 'v6-mobile-nav'; mobileNav.setAttribute('aria-label','التنقل السفلي');
    mobileNav.innerHTML = MOBILE.map(key => `<button data-v6-page="${key}" onclick="showOrganizedPage('${key}')">${icon(PAGE_META[key].icon)}<span>${PAGE_META[key].label}</span></button>`).join('');
    document.body.appendChild(mobileNav);

    buildSearchPanel();
  }

  function navButton(key) {
    const meta = PAGE_META[key];
    return `<button class="v6-nav-btn" data-v6-page="${key}" onclick="showOrganizedPage('${key}')">${icon(meta.icon)}<span>${meta.label}</span></button>`;
  }

  function buildSearchPanel() {
    const panel = document.createElement('div');
    panel.id = 'v6-search-panel'; panel.className = 'v6-search-panel';
    panel.innerHTML = `<div class="v6-search-box"><div style="display:flex;gap:8px;align-items:center"><input id="v6-search-input" placeholder="اكتب اسم القسم أو الأداة..." autocomplete="off"><button class="v6-icon-btn" onclick="closeV6Search()">إغلاق</button></div><div class="v6-search-results" id="v6-search-results"></div></div>`;
    panel.addEventListener('click', e => { if (e.target === panel) closeV6Search(); });
    document.body.appendChild(panel);
    const input = panel.querySelector('input');
    input.addEventListener('input', () => renderV6Search(input.value));
  }

  const SEARCH_ITEMS = [
    ['الرئيسية','about','home'],['الصلاة والأذان','prayers','mosque'],['القرآن الكريم','quran','quran'],['أذكار الصباح والمساء','azkar','tasbih'],['الإحصائيات','stats','chart'],['اتجاه القبلة','tools','compass'],['التقويم الهجري','tools','calendar'],['الأهداف وقضاء الصلوات','goals','target'],['رمضان والسفر','more','crescent'],['الأسرة والتحديات','more','users'],['الإعدادات والحساب','settings','settings'],['الخصوصية والبصمة','more','shield']
  ];

  function renderV6Search(query='') {
    const box = document.getElementById('v6-search-results'); if (!box) return;
    const q = query.trim().toLowerCase();
    const items = SEARCH_ITEMS.filter(([label]) => !q || label.toLowerCase().includes(q));
    box.innerHTML = items.length ? items.map(([label,page,ic])=>`<button class="v6-search-result" onclick="closeV6Search();showOrganizedPage('${page}')">${icon(ic)}<span>${label}</span></button>`).join('') : '<div class="v6-search-empty">لا توجد نتيجة مطابقة.</div>';
  }

  function addBackButtons() {
    ['tools','goals','more','settings','admin'].forEach(key => {
      const page = document.getElementById(`page-${key}`);
      if (!page || page.querySelector(':scope > .v6-section-back')) return;
      const btn = document.createElement('button');
      btn.className='v6-section-back'; btn.innerHTML=`${icon('arrow')} العودة إلى المزيد`;
      btn.onclick=()=>showOrganizedPage('more-hub');
      page.prepend(btn);
    });
  }

  function patchNavigation() {
    const currentShowPage = window.showPage;
    window.showPage = function patchedShowPage(pageId) {
      if (pageId === 'tafseer') return window.showOrganizedPage('quran', {feature:'tafseer'});
      if (['about','prayers','azkar','stats','tools','goals','more','settings','admin'].includes(pageId)) {
        return window.showOrganizedPage(pageId);
      }
      return currentShowPage(pageId);
    };

    const currentOpenSubPage = window.openSubPage;
    window.openSubPage = function patchedOpenSubPage(id) {
      if (id === 'quran-reader-page' || id.startsWith('tafseer')) {
        document.querySelectorAll('#page-quran .sub-page').forEach(p=>p.classList.remove('active-sub'));
        document.getElementById('v6-quran-main')?.setAttribute('hidden','');
        document.getElementById(id)?.classList.add('active-sub');
        window.scrollTo({top:0,behavior:'smooth'});
        return;
      }
      return currentOpenSubPage(id);
    };

    const currentCloseSubPage = window.closeSubPage;
    window.closeSubPage = function patchedCloseSubPage() {
      const quranPage = document.getElementById('page-quran');
      if (quranPage?.classList.contains('active-page')) {
        quranPage.querySelectorAll('.sub-page').forEach(p=>p.classList.remove('active-sub'));
        document.getElementById('v6-quran-main')?.removeAttribute('hidden');
        if (typeof stopQuranAudio === 'function') stopQuranAudio();
        return;
      }
      return currentCloseSubPage();
    };

    const currentCloseTafseer = window.closeTafseerSubPage;
    window.closeTafseerSubPage = function patchedCloseTafseer() {
      const quranPage = document.getElementById('page-quran');
      if (quranPage?.classList.contains('active-page')) {
        quranPage.querySelectorAll('.sub-page').forEach(p=>p.classList.remove('active-sub'));
        document.getElementById('tafseer-main-view')?.classList.add('active-sub');
        return;
      }
      return currentCloseTafseer();
    };

    const oldGeneral = window.openGeneralQuranPage;
    window.openGeneralQuranPage = function openGeneralFromFatiha() {
      try {
        if (typeof isWardMode !== 'undefined') isWardMode = false;
        window.showOrganizedPage('quran');
        window.openSubPage('quran-reader-page');
        if (typeof currentPage !== 'undefined') currentPage = 1;
        if (typeof loadPageInReader === 'function') loadPageInReader(1);
      } catch (e) { oldGeneral?.(); }
    };

    const oldWard = window.enterMyWardPage;
    window.enterMyWardPage = function enterWardOrganized() {
      window.showOrganizedPage('quran');
      setTimeout(() => oldWard?.(), 0);
    };
  }

  function updateActiveUI(pageId) {
    currentV6Page = pageId;
    const meta = PAGE_META[pageId] || PAGE_META.about;
    const primaryActive = ['tools','goals','more','settings','admin'].includes(pageId) ? 'more-hub' : pageId;
    document.querySelectorAll('[data-v6-page]').forEach(btn=>btn.classList.toggle('active',btn.dataset.v6Page===primaryActive));
    const title = document.getElementById('v6-page-title'); if(title) title.textContent=meta.label;
    const sub = document.getElementById('v6-page-subtitle'); if(sub) sub.textContent=meta.sub;
    const ic = document.getElementById('v6-page-icon'); if(ic) ic.innerHTML=icon(meta.icon);
  }

  function updateUserUI() {
    const name = (typeof currentUser !== 'undefined' && currentUser?.name) ? currentUser.name : 'زائر';
    const plan = (typeof profileMeta !== 'undefined' && profileMeta?.cloud?.plan === 'premium') ? 'عضوية مميزة' : 'الحساب المحلي';
    const nameEl=document.getElementById('v6-user-name'); if(nameEl) nameEl.textContent=name;
    const letter=document.getElementById('v6-user-letter'); if(letter) letter.textContent=name.trim().charAt(0)||'م';
    const planEl=document.getElementById('v6-user-plan'); if(planEl) planEl.textContent=plan;
  }

  function updateDashboard() {
    try {
      const page = (typeof lastReadPage !== 'undefined' ? lastReadPage : 1) || 1;
      setText('v6-ward-page',`الصفحة ${page}`);
      const today = (typeof systemLogs !== 'undefined' && typeof currentDayKey !== 'undefined') ? systemLogs[currentDayKey] : null;
      const prayers = today?.prayers ? Object.values(today.prayers).filter(v=>v?.completed).length : 0;
      const az = today?.azkar ? Number(Boolean(today.azkar.sabah))+Number(Boolean(today.azkar.masaa)) : 0;
      const quran = Number(today?.readPagesToday||0)>0 ? 1 : 0;
      const score = Math.round(((prayers/5)+(az/2)+quran)/3*100);
      setText('v6-day-score',`${Math.max(0,Math.min(100,score||0))}%`);
      setText('v6-tasbeeh-count',String(today?.tasbeehCount || today?.tasbeehToday || 0));
      const hijri = document.getElementById('hijri-date-display')?.textContent || document.getElementById('hijri-current-date')?.textContent || '--';
      setText('v6-hijri-date',hijri.trim().slice(0,45)||'--');
      const label = document.getElementById('countdown-label')?.textContent || 'الصلاة القادمة';
      const time = document.getElementById('digital-timer')?.textContent || '--:--';
      setText('v6-next-prayer',`${label.replace('المتبقي على','')} ${time}`.trim());
      const goal = document.querySelector('#goals-list .goal-item, .goal-card')?.textContent?.trim();
      setText('v6-goal-status',goal ? goal.slice(0,26) : 'حدد هدفك');
      updateUserUI();
    } catch (_) {}
  }

  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}

  window.showOrganizedPage = function showOrganizedPage(pageId, options={}) {
    const targetId = `page-${pageId}`;
    if (!document.getElementById(targetId)) pageId='about';
    document.querySelectorAll('.page-section').forEach(p=>p.classList.remove('active-page'));
    document.getElementById(`page-${pageId}`)?.classList.add('active-page');
    if (pageId === 'quran') {
      document.getElementById('v6-quran-main')?.removeAttribute('hidden');
      document.querySelectorAll('#page-quran .sub-page').forEach(p=>p.classList.remove('active-sub'));
      if (options.feature === 'tafseer') window.openQuranFeature('tafseer');
    }
    if (pageId === 'azkar') {
      document.querySelectorAll('#page-azkar .sub-page').forEach(p=>p.classList.remove('active-sub'));
      document.getElementById('azkar-main-view')?.classList.add('active-sub');
    }
    if (pageId === 'stats' && typeof calculateAndRenderAllStats === 'function') calculateAndRenderAllStats();
    if (pageId === 'more' && typeof renderAdvancedHub === 'function') renderAdvancedHub();
    updateActiveUI(pageId);
    updateDashboard();
    window.scrollTo({top:0,behavior:'smooth'});
  };

  window.openQuranFeature = function openQuranFeature(feature) {
    window.showOrganizedPage('quran');
    document.getElementById('v6-quran-main')?.setAttribute('hidden','');
    document.querySelectorAll('#page-quran .sub-page').forEach(p=>p.classList.remove('active-sub'));
    if (feature === 'tafseer') document.getElementById('tafseer-main-view')?.classList.add('active-sub');
  };
  window.closeQuranFeature = function closeQuranFeature() {
    document.querySelectorAll('#page-quran .sub-page').forEach(p=>p.classList.remove('active-sub'));
    document.getElementById('v6-quran-main')?.removeAttribute('hidden');
  };

  window.openAdvancedTab = function openAdvancedTab(tab) {
    window.showOrganizedPage('more');
    setTimeout(()=>{
      const btn=document.querySelector(`[data-advanced-tab="${tab}"]`);
      if (typeof switchAdvancedTab === 'function') switchAdvancedTab(tab,btn);
    },0);
  };
  window.openAdvancedKnowledge = function openAdvancedKnowledge(anchor) {
    window.openAdvancedTab('knowledge');
    setTimeout(()=>document.getElementById(anchor)?.scrollIntoView({behavior:'smooth',block:'start'}),250);
  };
  window.openV6Search = function openV6Search() {
    const panel=document.getElementById('v6-search-panel'); panel?.classList.add('open');
    renderV6Search(''); setTimeout(()=>document.getElementById('v6-search-input')?.focus(),60);
  };
  window.closeV6Search = function closeV6Search() { document.getElementById('v6-search-panel')?.classList.remove('open'); };

  function init() {
    try {
      buildQuranPage();
      buildMoreHub();
      buildDashboard();
      buildShell();
      addBackButtons();
      patchNavigation();
      window.showOrganizedPage('about');
      setInterval(updateDashboard, 15000);
      document.addEventListener('keydown',e=>{if(e.key==='Escape')closeV6Search();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openV6Search();}});
    } catch (error) {
      console.error('MUAINI_V6_INIT', error);
    }
  }

  waitReady(()=>setTimeout(init,0));
})();
