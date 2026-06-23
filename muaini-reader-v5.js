'use strict';

/* =========================================================
   مُعيني 5 — قارئ المصحف، تنظيم الهاتف، وبوصلة القبلة الحية
   يضيف الوظائف فوق الإصدار السابق دون حذف أي وظيفة قائمة.
   ========================================================= */

const MUAINI_V5_READER = {
  pageCache: new Map(),
  audioIndex: 0,
  audioRepeatTarget: 1,
  audioRepeatDone: 0,
  sleepTimer: null,
  touchStartX: 0,
  touchStartY: 0,
  qiblaWatchId: null,
  compassEnabled: false,
  orientationHandler: null,
  smoothedHeading: null,
  aligned: false,
  readerReady: false,
  qiblaReady: false
};

function v5SafeUserName() {
  try { return safeUserName(); }
  catch (error) { return String(currentUser?.name || 'guest').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_'); }
}

function v5WardPageKey() {
  return `muaini_last_page_${v5SafeUserName()}`;
}

function v5ReaderSettingKey(name) {
  return `muaini_reader_${name}_${v5SafeUserName()}`;
}

function v5Clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

function v5NormalizeAngle(value) {
  return ((Number(value) % 360) + 360) % 360;
}

function v5ShortestAngle(value) {
  const angle = v5NormalizeAngle(value);
  return angle > 180 ? angle - 360 : angle;
}

function v5Escape(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function v5ReaderIsDouble() {
  if (window.matchMedia('(max-width: 1000px)').matches) return false;
  const select = document.getElementById('reader-spread-mode');
  const mode = select?.value || localStorage.getItem(v5ReaderSettingKey('spread')) || 'auto';
  if (mode === 'double') return true;
  if (mode === 'single') return false;
  return window.matchMedia('(min-width: 1080px)').matches;
}

function v5ReaderPageStep() {
  return v5ReaderIsDouble() ? 2 : 1;
}

function v5UpdateWardResumeLabels() {
  const page = v5Clamp(localStorage.getItem(v5WardPageKey()) || lastReadPage || 1, 1, 604);
  const labels = document.querySelectorAll('[data-ward-resume]');
  labels.forEach(label => { label.textContent = `استكمل من الصفحة ${page}`; });
}

function v5BuildQuranHub() {
  const cards = [...document.querySelectorAll('#azkar-main-view > .card')];
  const card = cards.find(item => item.querySelector('h2')?.textContent.includes('وردي والمصحف'));
  if (!card || card.dataset.v5Ready === '1') return;
  card.dataset.v5Ready = '1';
  card.classList.add('quran-hub-card');
  const oldButtons = card.querySelector('.grid-buttons');
  if (oldButtons) {
    oldButtons.outerHTML = `
      <div class="quran-entry-grid" aria-label="الدخول إلى المصحف">
        <button class="quran-entry-card ward-entry" type="button" onclick="enterMyWardPage()">
          <span class="quran-entry-icon">✨</span>
          <span class="quran-entry-copy"><b>وردي</b><small data-ward-resume>استكمل من آخر صفحة</small></span>
          <span class="quran-entry-arrow">←</span>
        </button>
        <button class="quran-entry-card quran-entry" type="button" onclick="openGeneralQuranPage()">
          <span class="quran-entry-icon">🕌</span>
          <span class="quran-entry-copy"><b>قرآني</b><small>يفتح دائمًا من سورة الفاتحة</small></span>
          <span class="quran-entry-arrow">←</span>
        </button>
      </div>
      <div class="quran-hub-features">
        <span>📖 عرض صفحات مريح</span><span>🎧 تلاوة آية بآية</span><span>🔖 علامات وملاحظات</span><span>🌙 وضع ليلي</span>
      </div>`;
  }
  v5UpdateWardResumeLabels();
}

function v5BuildReaderMarkup() {
  const page = document.getElementById('quran-reader-page');
  if (!page || page.dataset.v5Ready === '1') return;
  page.dataset.v5Ready = '1';
  page.innerHTML = `
    <div class="mushaf-reader-shell" id="mushaf-reader-shell">
      <header class="mushaf-reader-topbar">
        <button class="reader-icon-button" type="button" onclick="closeSubPage();stopQuranAudio()" aria-label="إغلاق المصحف">✕</button>
        <div class="reader-title-block">
          <span id="reader-mode-badge" class="reader-mode-badge">المصحف</span>
          <h2 id="reader-header-title">المصحف الشريف</h2>
          <small id="reader-page-meta">صفحة 1</small>
        </div>
        <div class="reader-top-actions">
          <button class="reader-icon-button" type="button" onclick="v5ToggleReaderControls()" aria-label="إظهار أدوات القراءة">⚙️</button>
          <button class="reader-icon-button" type="button" onclick="v5ToggleReaderFocus()" aria-label="وضع القراءة الهادئ">⛶</button>
        </div>
      </header>

      <section id="reader-controls-panel" class="reader-controls-panel">
        <div class="reader-select-grid">
          <label><span>السورة</span><select id="select-surah" class="smart-select" onchange="navigateBySurah()"><option value="">-- السورة --</option></select></label>
          <label><span>الجزء</span><select id="select-juz" class="smart-select" onchange="navigateByJuz()"><option value="">-- الجزء --</option></select></label>
          <label><span>الربع</span><select id="select-rub" class="smart-select" onchange="navigateByRub()"><option value="">-- الربع --</option></select></label>
          <label><span>صفحة</span><div class="reader-page-jump"><input id="reader-page-input" class="smart-input" type="number" min="1" max="604" value="1"><button type="button" class="mini-btn" onclick="v5JumpToPage()">انتقال</button></div></label>
        </div>
        <div class="reader-preference-row">
          <label>العرض<select id="reader-spread-mode" class="smart-select compact" onchange="v5ChangeSpreadMode(this.value)"><option value="auto">تلقائي</option><option value="single">صفحة واحدة</option><option value="double">صفحتان</option></select></label>
          <label>الخلفية<select id="reader-paper-theme" class="smart-select compact" onchange="v5SetPaperTheme(this.value)"><option value="paper">ورقي</option><option value="sepia">دافئ</option><option value="night">ليلي</option></select></label>
          <label class="reader-zoom-control">حجم الخط<input id="reader-zoom" type="range" min="80" max="135" step="5" value="100" oninput="v5SetReaderZoom(this.value)"><output id="reader-zoom-value">100%</output></label>
        </div>
      </section>

      <div class="mushaf-stage" id="mushaf-stage">
        <button class="mushaf-edge-nav mushaf-edge-prev" type="button" onclick="changePage(-1)" aria-label="الصفحة السابقة">❯</button>
        <div id="quran-text-content" class="mushaf-spread" aria-live="polite">
          <div class="mushaf-loading">جاري تحميل صفحة المصحف…</div>
        </div>
        <button class="mushaf-edge-nav mushaf-edge-next" type="button" onclick="changePage(1)" aria-label="الصفحة التالية">❮</button>
      </div>

      <div class="reader-page-bar">
        <button class="page-btn" type="button" onclick="changePage(-1)">السابقة</button>
        <span id="page-indicator">صفحة: 1</span>
        <span id="page-number-footer" hidden>1</span>
        <button class="page-btn" type="button" onclick="changePage(1)">التالية</button>
      </div>

      <section class="reader-audio-dock" id="reader-audio-dock">
        <div class="reader-audio-heading">
          <div><b>🎧 التلاوة</b><small id="reader-audio-now">اختر آية أو اضغط تشغيل</small></div>
          <button class="reader-icon-button" type="button" onclick="v5ToggleAudioDock()" aria-label="طي شريط الصوت">⌄</button>
        </div>
        <div class="reader-audio-content">
          <div class="reader-audio-controls">
            <button type="button" class="audio-circle" onclick="v5PreviousAyah()" aria-label="الآية السابقة">⏮</button>
            <button id="reader-audio-play" type="button" class="audio-circle primary" onclick="v5ToggleQuranAudio()" aria-label="تشغيل أو إيقاف">▶</button>
            <button type="button" class="audio-circle" onclick="v5NextAyah()" aria-label="الآية التالية">⏭</button>
          </div>
          <div class="reader-audio-options">
            <label>القارئ<select id="reciter-select" class="smart-select" onchange="changeReciter()"><option value="ar.abdulbasit">عبد الباسط عبد الصمد</option><option value="ar.minshawi">محمد صديق المنشاوي</option><option value="ar.husary">محمود خليل الحصري</option><option value="ar.mustafaismail">مصطفى إسماعيل</option><option value="ar.alafasy">مشاري العفاسي</option></select></label>
            <label>السرعة<select id="reader-audio-speed" class="smart-select" onchange="v5SetAudioSpeed(this.value)"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>
            <label>تكرار الآية<select id="reader-audio-repeat" class="smart-select" onchange="v5SetAudioRepeat(this.value)"><option value="1">مرة</option><option value="2">مرتان</option><option value="3">3 مرات</option><option value="5">5 مرات</option><option value="10">10 مرات</option></select></label>
            <label>مؤقت النوم<select id="reader-sleep-timer" class="smart-select" onchange="v5SetSleepTimer(this.value)"><option value="0">بدون</option><option value="10">10 دقائق</option><option value="20">20 دقيقة</option><option value="30">30 دقيقة</option></select></label>
          </div>
          <div class="reader-progress-track"><span id="reader-audio-progress"></span></div>
          <audio id="quran-page-player" preload="metadata"></audio>
        </div>
      </section>
    </div>`;
  MUAINI_V5_READER.readerReady = true;
  v5RestoreReaderSettings();
  v5BindReaderGestures();
}

function v5PopulateReaderSelects() {
  const surahSelect = document.getElementById('select-surah');
  if (surahSelect && surahSelect.options.length <= 1 && Array.isArray(surahsData)) {
    surahsData.forEach(surah => {
      const option = document.createElement('option');
      option.value = surah.number;
      option.textContent = surah.name;
      surahSelect.appendChild(option);
    });
  }
  const juzSelect = document.getElementById('select-juz');
  if (juzSelect && juzSelect.options.length <= 1) {
    for (let index = 1; index <= 30; index += 1) juzSelect.add(new Option(`الجزء ${index}`, index));
  }
  const rubSelect = document.getElementById('select-rub');
  if (rubSelect && rubSelect.options.length <= 1) {
    for (let index = 1; index <= 240; index += 1) rubSelect.add(new Option(`الربع ${index}`, index));
  }
}

function v5RestoreReaderSettings() {
  const spread = localStorage.getItem(v5ReaderSettingKey('spread')) || 'auto';
  const theme = localStorage.getItem(v5ReaderSettingKey('theme')) || 'paper';
  const zoom = v5Clamp(localStorage.getItem(v5ReaderSettingKey('zoom')) || 100, 80, 135);
  const reciter = localStorage.getItem(v5ReaderSettingKey('reciter')) || 'ar.abdulbasit';
  const speed = localStorage.getItem(v5ReaderSettingKey('speed')) || '1';
  const spreadEl = document.getElementById('reader-spread-mode');
  const themeEl = document.getElementById('reader-paper-theme');
  const zoomEl = document.getElementById('reader-zoom');
  const reciterEl = document.getElementById('reciter-select');
  const speedEl = document.getElementById('reader-audio-speed');
  if (spreadEl) spreadEl.value = spread;
  if (themeEl) themeEl.value = theme;
  if (zoomEl) zoomEl.value = zoom;
  if (reciterEl) reciterEl.value = reciter;
  if (speedEl) speedEl.value = speed;
  v5SetPaperTheme(theme, false);
  v5SetReaderZoom(zoom, false);
}

function v5SetPaperTheme(theme, persist = true) {
  const shell = document.getElementById('mushaf-reader-shell');
  if (!shell) return;
  shell.dataset.paperTheme = ['paper', 'sepia', 'night'].includes(theme) ? theme : 'paper';
  if (persist) localStorage.setItem(v5ReaderSettingKey('theme'), shell.dataset.paperTheme);
}

function v5SetReaderZoom(value, persist = true) {
  const zoom = v5Clamp(value, 80, 135);
  const shell = document.getElementById('mushaf-reader-shell');
  if (shell) shell.style.setProperty('--reader-zoom', `${zoom / 100}`);
  const output = document.getElementById('reader-zoom-value');
  if (output) output.textContent = `${zoom}%`;
  if (persist) localStorage.setItem(v5ReaderSettingKey('zoom'), zoom);
}

function v5ChangeSpreadMode(value) {
  localStorage.setItem(v5ReaderSettingKey('spread'), value);
  loadPageInReader(currentPage);
}

function v5ToggleReaderControls() {
  document.getElementById('reader-controls-panel')?.classList.toggle('collapsed');
}

function v5ToggleAudioDock() {
  document.getElementById('reader-audio-dock')?.classList.toggle('collapsed');
}

function v5ToggleReaderFocus() {
  document.body.classList.toggle('mushaf-focus-mode');
}

function v5JumpToPage() {
  const value = Number(document.getElementById('reader-page-input')?.value || 1);
  loadPageInReader(v5Clamp(value, 1, 604));
}

function v5BindReaderGestures() {
  const stage = document.getElementById('mushaf-stage');
  if (!stage || stage.dataset.gestures === '1') return;
  stage.dataset.gestures = '1';
  stage.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    MUAINI_V5_READER.touchStartX = touch.clientX;
    MUAINI_V5_READER.touchStartY = touch.clientY;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - MUAINI_V5_READER.touchStartX;
    const dy = touch.clientY - MUAINI_V5_READER.touchStartY;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    changePage(dx > 0 ? 1 : -1);
  }, { passive: true });
}

async function v5FetchQuranPage(pageNumber) {
  const page = v5Clamp(pageNumber, 1, 604);
  if (MUAINI_V5_READER.pageCache.has(page)) return MUAINI_V5_READER.pageCache.get(page);
  const promise = fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(payload => ({ page, ayahs: payload?.data?.ayahs || [] }))
    .catch(error => {
      MUAINI_V5_READER.pageCache.delete(page);
      throw error;
    });
  MUAINI_V5_READER.pageCache.set(page, promise);
  return promise;
}

function v5CreateAyahNode(ayah, audioIndex) {
  const span = document.createElement('span');
  span.className = 'ayah-text mushaf-ayah';
  span.id = `ayah-${ayah.number}`;
  span.dataset.audioIndex = String(audioIndex);
  span.dataset.verseKey = `${ayah.surah?.number || ''}:${ayah.numberInSurah}`;
  span.tabIndex = 0;
  span.setAttribute('role', 'button');
  span.setAttribute('aria-label', `الآية ${ayah.numberInSurah} من ${ayah.surah?.name || 'السورة'}`);
  span.append(document.createTextNode(` ${ayah.text} `));
  const marker = document.createElement('span');
  marker.className = 'ayah-marker';
  marker.textContent = `﴿${ayah.numberInSurah}﴾`;
  span.appendChild(marker);
  span.addEventListener('click', () => v5PlayAyahAt(audioIndex, true));
  span.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      v5PlayAyahAt(audioIndex, true);
    }
  });
  return span;
}

function v5BuildMushafSheet(pageData, audioOffset) {
  const sheet = document.createElement('article');
  sheet.className = 'mushaf-page-sheet';
  sheet.dataset.page = pageData.page;

  const top = document.createElement('div');
  top.className = 'mushaf-page-ornament';
  const first = pageData.ayahs[0];
  const last = pageData.ayahs[pageData.ayahs.length - 1];
  top.innerHTML = `<span>${v5Escape(first?.surah?.name || 'المصحف الشريف')}</span><span>الجزء ${first?.juz || '—'} · الحزب ${Math.ceil(Number(first?.hizbQuarter || 0) / 4) || '—'}</span>`;
  sheet.appendChild(top);

  const content = document.createElement('div');
  content.className = 'mushaf-page-text';
  let previousSurah = null;
  pageData.ayahs.forEach((ayah, index) => {
    if (ayah.surah?.number !== previousSurah && ayah.numberInSurah === 1) {
      const heading = document.createElement('div');
      heading.className = 'mushaf-surah-heading';
      heading.innerHTML = `<span>سورة ${v5Escape(ayah.surah?.name?.replace(/^سُورَةُ\s*/, '') || '')}</span>`;
      content.appendChild(heading);
    }
    previousSurah = ayah.surah?.number;
    content.appendChild(v5CreateAyahNode(ayah, audioOffset + index));
  });
  sheet.appendChild(content);

  const footer = document.createElement('div');
  footer.className = 'mushaf-page-footer';
  footer.innerHTML = `<span>${v5Escape(first?.surah?.name || '')}${last?.surah?.number !== first?.surah?.number ? ` — ${v5Escape(last?.surah?.name || '')}` : ''}</span><b>${pageData.page}</b><span>صفحة المصحف</span>`;
  sheet.appendChild(footer);
  return sheet;
}

function v5UpdateReaderHeader(pageDataList) {
  const firstAyah = pageDataList[0]?.ayahs?.[0];
  const lastPage = pageDataList[pageDataList.length - 1]?.page || currentPage;
  const title = document.getElementById('reader-header-title');
  const meta = document.getElementById('reader-page-meta');
  const badge = document.getElementById('reader-mode-badge');
  if (title) title.textContent = firstAyah?.surah?.name || 'المصحف الشريف';
  if (meta) meta.textContent = pageDataList.length > 1 ? `الصفحتان ${currentPage}–${lastPage}` : `الصفحة ${currentPage} · الجزء ${firstAyah?.juz || '—'}`;
  if (badge) badge.textContent = isWardMode ? 'وردي' : 'قرآني';
  const indicator = document.getElementById('page-indicator');
  if (indicator) indicator.textContent = pageDataList.length > 1 ? `صفحتا ${currentPage} و${lastPage}` : `صفحة: ${currentPage}`;
  const footer = document.getElementById('page-number-footer');
  if (footer) footer.textContent = String(currentPage);
  const input = document.getElementById('reader-page-input');
  if (input) input.value = String(currentPage);
}

function v5SaveQuranProgress(pageNumber) {
  const day = systemLogs[currentDayKey];
  if (!day) return;
  if (isWardMode) {
    if (!Array.isArray(day.readPageSet)) day.readPageSet = [];
    if (!day.readPageSet.includes(pageNumber)) {
      day.readPageSet.push(pageNumber);
      day.readPagesToday = day.readPageSet.length;
    }
    localStorage.setItem(v5WardPageKey(), String(pageNumber));
    lastReadPage = pageNumber;
    v5UpdateWardResumeLabels();
  }
  if (activeTimers.quranStart) {
    day.quranTime = Number(day.quranTime || 0) + Math.max(0, Math.floor((Date.now() - activeTimers.quranStart.getTime()) / 60000));
    activeTimers.quranStart = new Date();
  }
  saveLogs();
  calculateAndRenderAllStats();
}

async function v5LoadPageInReader(pageNumber) {
  const spreadCount = v5ReaderIsDouble() ? 2 : 1;
  const bounded = v5Clamp(pageNumber, 1, spreadCount === 2 ? 603 : 604);
  currentPage = bounded;
  const spread = document.getElementById('quran-text-content');
  if (!spread) return;
  spread.className = `mushaf-spread ${spreadCount === 2 ? 'is-double' : 'is-single'}`;
  spread.innerHTML = '<div class="mushaf-loading">جاري تحميل صفحة المصحف…</div>';
  try {
    const pages = [bounded];
    if (spreadCount === 2 && bounded < 604) pages.push(bounded + 1);
    const pageDataList = await Promise.all(pages.map(v5FetchQuranPage));
    currentAyahAudioMapping = [];
    pageDataList.forEach(pageData => pageData.ayahs.forEach(ayah => currentAyahAudioMapping.push({
      globalNumber: ayah.number,
      verseKey: `${ayah.surah?.number || ''}:${ayah.numberInSurah}`,
      surahName: ayah.surah?.name || '',
      numberInSurah: ayah.numberInSurah
    })));
    spread.innerHTML = '';
    let offset = 0;
    pageDataList.forEach(pageData => {
      spread.appendChild(v5BuildMushafSheet(pageData, offset));
      offset += pageData.ayahs.length;
    });
    v5UpdateReaderHeader(pageDataList);
    v5PrepareAudioSource(false);
    v5SaveQuranProgress(bounded);
  } catch (error) {
    spread.innerHTML = `<div class="mushaf-error"><b>تعذر تحميل الصفحة</b><span>تحقق من اتصال الإنترنت ثم حاول مجددًا.</span><button class="smart-btn" type="button" onclick="loadPageInReader(${bounded})">إعادة المحاولة</button></div>`;
  }
}

function v5EnterMyWardPage() {
  const plan = document.getElementById('quran-plan')?.value || profileMeta.quranPlan || '0';
  if (plan === '0') {
    alert('يرجى اختيار خطة الختم أولًا.');
    return;
  }
  isWardMode = true;
  activeTimers.quranStart = new Date();
  const savedPage = v5Clamp(localStorage.getItem(v5WardPageKey()) || lastReadPage || 1, 1, 604);
  openSubPage('quran-reader-page');
  v5LoadPageInReader(savedPage);
}

function v5OpenGeneralQuranPage() {
  isWardMode = false;
  activeTimers.quranStart = null;
  openSubPage('quran-reader-page');
  v5LoadPageInReader(1);
}

function v5ChangePage(direction) {
  const step = v5ReaderPageStep();
  const next = currentPage + Number(direction) * step;
  v5LoadPageInReader(next);
}

function v5CurrentReciter() {
  return document.getElementById('reciter-select')?.value || 'ar.abdulbasit';
}

function v5UpdateAudioUi() {
  const player = document.getElementById('quran-page-player');
  const button = document.getElementById('reader-audio-play');
  const progress = document.getElementById('reader-audio-progress');
  if (button) button.textContent = player && !player.paused ? '⏸' : '▶';
  if (progress && player && Number.isFinite(player.duration) && player.duration > 0) progress.style.width = `${(player.currentTime / player.duration) * 100}%`;
}

function v5HighlightAudioIndex(index) {
  document.querySelectorAll('.mushaf-ayah.highlighted').forEach(element => element.classList.remove('highlighted'));
  const item = currentAyahAudioMapping[index];
  const target = item ? document.getElementById(`ayah-${item.globalNumber}`) : null;
  if (target) {
    target.classList.add('highlighted');
    if (!target.getBoundingClientRect().top || target.getBoundingClientRect().top < 100 || target.getBoundingClientRect().bottom > innerHeight - 160) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const now = document.getElementById('reader-audio-now');
  if (now && item) now.textContent = `${item.surahName} — الآية ${item.numberInSurah}`;
}

function v5SetPlayerSource(index) {
  const player = document.getElementById('quran-page-player');
  const item = currentAyahAudioMapping[index];
  if (!player || !item) return false;
  MUAINI_V5_READER.audioIndex = index;
  MUAINI_V5_READER.audioRepeatDone = 0;
  player.src = `https://cdn.islamic.network/quran/audio/128/${v5CurrentReciter()}/${item.globalNumber}.mp3`;
  player.playbackRate = Number(document.getElementById('reader-audio-speed')?.value || 1);
  v5HighlightAudioIndex(index);
  return true;
}

function v5PrepareAudioSource(keepIndex = true) {
  const player = document.getElementById('quran-page-player');
  if (!player || !currentAyahAudioMapping.length) return;
  player.pause();
  const index = keepIndex ? v5Clamp(MUAINI_V5_READER.audioIndex, 0, currentAyahAudioMapping.length - 1) : 0;
  v5SetPlayerSource(index);
  player.onplay = v5UpdateAudioUi;
  player.onpause = v5UpdateAudioUi;
  player.ontimeupdate = v5UpdateAudioUi;
  player.onended = () => {
    MUAINI_V5_READER.audioRepeatDone += 1;
    if (MUAINI_V5_READER.audioRepeatDone < MUAINI_V5_READER.audioRepeatTarget) {
      player.currentTime = 0;
      player.play().catch(() => {});
      return;
    }
    MUAINI_V5_READER.audioRepeatDone = 0;
    if (MUAINI_V5_READER.audioIndex < currentAyahAudioMapping.length - 1) {
      v5PlayAyahAt(MUAINI_V5_READER.audioIndex + 1, true);
    } else {
      v5UpdateAudioUi();
    }
  };
}

function v5PlayAyahAt(index, autoplay = true) {
  const bounded = v5Clamp(index, 0, Math.max(0, currentAyahAudioMapping.length - 1));
  if (!v5SetPlayerSource(bounded)) return;
  const player = document.getElementById('quran-page-player');
  if (autoplay) player.play().catch(() => {});
  v5UpdateAudioUi();
}

function v5ToggleQuranAudio() {
  const player = document.getElementById('quran-page-player');
  if (!player || !currentAyahAudioMapping.length) return;
  if (!player.src) v5SetPlayerSource(MUAINI_V5_READER.audioIndex || 0);
  if (player.paused) player.play().catch(() => {}); else player.pause();
}

function v5PreviousAyah() {
  v5PlayAyahAt(Math.max(0, MUAINI_V5_READER.audioIndex - 1), true);
}

function v5NextAyah() {
  v5PlayAyahAt(Math.min(currentAyahAudioMapping.length - 1, MUAINI_V5_READER.audioIndex + 1), true);
}

function v5SetAudioSpeed(value) {
  const player = document.getElementById('quran-page-player');
  const speed = Number(value || 1);
  if (player) player.playbackRate = speed;
  localStorage.setItem(v5ReaderSettingKey('speed'), String(speed));
}

function v5SetAudioRepeat(value) {
  MUAINI_V5_READER.audioRepeatTarget = v5Clamp(value, 1, 10);
  MUAINI_V5_READER.audioRepeatDone = 0;
}

function v5SetSleepTimer(value) {
  clearTimeout(MUAINI_V5_READER.sleepTimer);
  MUAINI_V5_READER.sleepTimer = null;
  const minutes = Number(value || 0);
  if (!minutes) return;
  MUAINI_V5_READER.sleepTimer = setTimeout(() => {
    document.getElementById('quran-page-player')?.pause();
    const now = document.getElementById('reader-audio-now');
    if (now) now.textContent = 'انتهى مؤقت التلاوة';
  }, minutes * 60000);
}

function v5ChangeReciter() {
  localStorage.setItem(v5ReaderSettingKey('reciter'), v5CurrentReciter());
  v5PrepareAudioSource(true);
}

function v5StopQuranAudio() {
  if (activeTimers?.quranStart && systemLogs?.[currentDayKey]) {
    systemLogs[currentDayKey].quranTime = Number(systemLogs[currentDayKey].quranTime || 0) + Math.max(0, Math.floor((Date.now() - activeTimers.quranStart.getTime()) / 60000));
    activeTimers.quranStart = null;
    saveLogs();
  }
  isWardMode = false;
  const player = document.getElementById('quran-page-player');
  if (!player) return;
  player.pause();
  player.removeAttribute('src');
  player.load();
  clearTimeout(MUAINI_V5_READER.sleepTimer);
  document.body.classList.remove('mushaf-focus-mode');
  v5UpdateAudioUi();
}

/* =========================
   البوصلة الحية للقبلة
========================= */
function v5BuildQiblaCard() {
  const card = document.querySelector('#page-tools .extension-card');
  if (!card || card.dataset.qiblaV5 === '1') return;
  card.dataset.qiblaV5 = '1';
  card.innerHTML = `
    <h2>🧭 بوصلة القبلة الحقيقية</h2>
    <p class="privacy-note">تستخدم موقع الهاتف وحساس الاتجاه لحظيًا. حرّك الهاتف على شكل رقم 8 للمعايرة، وابتعد عن المعادن والمغناطيس.</p>
    <div class="qibla-live-stage">
      <div id="qibla-compass-live" class="qibla-compass-live">
        <div id="qibla-cardinal-ring" class="qibla-cardinal-ring"><span class="north">ش</span><span class="east">ق</span><span class="south">ج</span><span class="west">غ</span></div>
        <div class="qibla-degree-ring"></div>
        <div id="qibla-arrow" class="qibla-kaaba-arrow"><span>🕋</span></div>
        <div class="qibla-phone-axis"></div>
        <div class="qibla-center-dot"></div>
      </div>
      <div id="qibla-alignment-message" class="qibla-alignment-message">حدّد موقعك ثم شغّل البوصلة</div>
      <div class="qibla-metrics-grid">
        <div><small>اتجاه القبلة</small><b id="qibla-target-degree">—</b></div>
        <div><small>اتجاه الهاتف</small><b id="qibla-heading-degree">—</b></div>
        <div><small>الانحراف</small><b id="qibla-difference-degree">—</b></div>
        <div><small>دقة الموقع</small><b id="qibla-location-accuracy">—</b></div>
      </div>
      <div id="qibla-result" class="status-pill warn">لم يتم تحديد الموقع بعد.</div>
      <div class="action-row qibla-action-row">
        <button class="smart-btn" type="button" onclick="locateQibla()">📍 تحديد موقعي</button>
        <button class="soft-btn" type="button" onclick="enableCompassMode()">🧭 تشغيل البوصلة</button>
        <button class="soft-btn" type="button" onclick="v5RecalibrateCompass()">∞ إعادة المعايرة</button>
        <button class="danger-btn" type="button" onclick="v5StopQiblaTracking()">إيقاف</button>
      </div>
      <p id="qibla-support-note" class="qibla-support-note">على iPhone يجب الضغط على «تشغيل البوصلة» للسماح بحساس الاتجاه.</p>
    </div>`;
  MUAINI_V5_READER.qiblaReady = true;
}

function v5CalculateQiblaBearing(lat, lon) {
  const kaabaLat = 21.422487 * Math.PI / 180;
  const kaabaLon = 39.826206 * Math.PI / 180;
  const userLat = Number(lat) * Math.PI / 180;
  const userLon = Number(lon) * Math.PI / 180;
  const deltaLon = kaabaLon - userLon;
  const y = Math.sin(deltaLon);
  const x = Math.cos(userLat) * Math.tan(kaabaLat) - Math.sin(userLat) * Math.cos(deltaLon);
  return v5NormalizeAngle(Math.atan2(y, x) * 180 / Math.PI);
}

function v5HaversineKm(lat1, lon1, lat2, lon2) {
  const radius = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function v5LocateQiblaWithCoords(lat, lon, accuracy = null) {
  qiblaBearing = v5CalculateQiblaBearing(lat, lon);
  const distance = v5HaversineKm(lat, lon, 21.422487, 39.826206);
  profileMeta.lastLocation = { lat, lon, accuracy: Number(accuracy || 0) };
  saveLogs();
  const target = document.getElementById('qibla-target-degree');
  const accuracyEl = document.getElementById('qibla-location-accuracy');
  if (target) target.textContent = `${qiblaBearing.toFixed(1)}°`;
  if (accuracyEl) accuracyEl.textContent = accuracy ? `±${Math.round(accuracy)} م` : 'غير متاحة';
  setElementStatus('qibla-result', `اتجاه القبلة ${qiblaBearing.toFixed(1)}° — تبعد مكة نحو ${Math.round(distance).toLocaleString('ar-EG')} كم`, true);
  v5UpdateQiblaCompass(MUAINI_V5_READER.smoothedHeading ?? lastCompassHeading ?? 0);
}

function v5LocateQibla() {
  if (!navigator.geolocation) {
    setElementStatus('qibla-result', 'تحديد الموقع غير مدعوم على هذا الجهاز.', false);
    return;
  }
  setElementStatus('qibla-result', 'جارٍ تحديد الموقع بدقة…', false);
  if (MUAINI_V5_READER.qiblaWatchId !== null) navigator.geolocation.clearWatch(MUAINI_V5_READER.qiblaWatchId);
  MUAINI_V5_READER.qiblaWatchId = navigator.geolocation.watchPosition(position => {
    v5LocateQiblaWithCoords(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
  }, error => {
    setElementStatus('qibla-result', `تعذر تحديد الموقع: ${error.message}`, false);
  }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 18000 });
}

function v5ScreenOrientationAngle() {
  return Number(screen.orientation?.angle ?? window.orientation ?? 0) || 0;
}

function v5ExtractHeading(event) {
  if (Number.isFinite(event.webkitCompassHeading)) return v5NormalizeAngle(event.webkitCompassHeading);
  if (event.absolute === true && Number.isFinite(event.alpha)) return v5NormalizeAngle(360 - event.alpha + v5ScreenOrientationAngle());
  if (Number.isFinite(event.alpha)) return v5NormalizeAngle(360 - event.alpha + v5ScreenOrientationAngle());
  return null;
}

function v5SmoothHeading(next) {
  if (!Number.isFinite(MUAINI_V5_READER.smoothedHeading)) {
    MUAINI_V5_READER.smoothedHeading = next;
    return next;
  }
  const delta = v5ShortestAngle(next - MUAINI_V5_READER.smoothedHeading);
  MUAINI_V5_READER.smoothedHeading = v5NormalizeAngle(MUAINI_V5_READER.smoothedHeading + delta * 0.22);
  return MUAINI_V5_READER.smoothedHeading;
}

function v5UpdateQiblaCompass(heading) {
  if (!Number.isFinite(heading)) return;
  lastCompassHeading = heading;
  const arrow = document.getElementById('qibla-arrow');
  const ring = document.getElementById('qibla-cardinal-ring');
  const compass = document.getElementById('qibla-compass-live');
  const headingEl = document.getElementById('qibla-heading-degree');
  const diffEl = document.getElementById('qibla-difference-degree');
  const message = document.getElementById('qibla-alignment-message');
  if (ring) ring.style.transform = `rotate(${-heading}deg)`;
  if (headingEl) headingEl.textContent = `${heading.toFixed(1)}°`;
  if (qiblaBearing === null || !Number.isFinite(qiblaBearing)) return;
  const difference = v5ShortestAngle(qiblaBearing - heading);
  if (arrow) arrow.style.transform = `translate(-50%, -86%) rotate(${difference}deg)`;
  if (diffEl) diffEl.textContent = `${Math.abs(difference).toFixed(1)}°`;
  const aligned = Math.abs(difference) <= 3;
  compass?.classList.toggle('aligned', aligned);
  if (message) {
    if (aligned) message.textContent = '✓ أنت الآن في اتجاه القبلة';
    else message.textContent = difference > 0 ? `أدر الهاتف يمينًا ${Math.round(Math.abs(difference))}°` : `أدر الهاتف يسارًا ${Math.round(Math.abs(difference))}°`;
  }
  if (aligned && !MUAINI_V5_READER.aligned && navigator.vibrate) navigator.vibrate(80);
  MUAINI_V5_READER.aligned = aligned;
}

function v5HandleOrientation(event) {
  const raw = v5ExtractHeading(event);
  if (!Number.isFinite(raw)) return;
  const heading = v5SmoothHeading(raw);
  v5UpdateQiblaCompass(heading);
}

async function v5EnableCompassMode() {
  try {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setElementStatus('qibla-result', 'هذا الهاتف لا يوفّر حساس اتجاه للمتصفح.', false);
      return;
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        setElementStatus('qibla-result', 'لم يتم منح إذن البوصلة.', false);
        return;
      }
    }
    if (!MUAINI_V5_READER.orientationHandler) MUAINI_V5_READER.orientationHandler = v5HandleOrientation;
    window.removeEventListener('deviceorientationabsolute', MUAINI_V5_READER.orientationHandler, true);
    window.removeEventListener('deviceorientation', MUAINI_V5_READER.orientationHandler, true);
    window.addEventListener('deviceorientationabsolute', MUAINI_V5_READER.orientationHandler, true);
    window.addEventListener('deviceorientation', MUAINI_V5_READER.orientationHandler, true);
    MUAINI_V5_READER.compassEnabled = true;
    setElementStatus('qibla-result', qiblaBearing === null ? 'البوصلة تعمل. حدّد موقعك لحساب القبلة.' : 'البوصلة تعمل. حرّك الهاتف ببطء حتى يتطابق السهم.', true);
  } catch (error) {
    setElementStatus('qibla-result', `تعذر تشغيل البوصلة: ${error.message}`, false);
  }
}

function v5RecalibrateCompass() {
  MUAINI_V5_READER.smoothedHeading = null;
  MUAINI_V5_READER.aligned = false;
  const message = document.getElementById('qibla-alignment-message');
  if (message) message.textContent = 'حرّك الهاتف على شكل رقم 8 ثم وجّه أعلاه للأمام';
  setElementStatus('qibla-result', 'أعد المعايرة بعيدًا عن المعادن والمغناطيس.', true);
}

function v5StopQiblaTracking() {
  if (MUAINI_V5_READER.qiblaWatchId !== null) navigator.geolocation.clearWatch(MUAINI_V5_READER.qiblaWatchId);
  MUAINI_V5_READER.qiblaWatchId = null;
  if (MUAINI_V5_READER.orientationHandler) {
    window.removeEventListener('deviceorientationabsolute', MUAINI_V5_READER.orientationHandler, true);
    window.removeEventListener('deviceorientation', MUAINI_V5_READER.orientationHandler, true);
  }
  MUAINI_V5_READER.compassEnabled = false;
  setElementStatus('qibla-result', 'تم إيقاف التتبع. يمكنك تشغيله مجددًا عند الحاجة.', false);
}

/* =========================
   تنظيم الواجهة والهاتف
========================= */
function v5BuildMobileNavigation() {
  const nav = document.querySelector('.mobile-bottom-nav');
  if (!nav) return;
  nav.innerHTML = `
    <button data-page="about" onclick="showPage('about')"><span>⌂</span>الرئيسية</button>
    <button data-page="prayers" onclick="showPage('prayers')"><span>🕌</span>صلاتي</button>
    <button data-page="azkar" onclick="showPage('azkar')"><span>📖</span>القرآن</button>
    <button data-page="stats" onclick="showPage('stats')"><span>📊</span>الإحصاء</button>
    <button data-page="more" onclick="showPage('more')"><span>✨</span>المزيد</button>`;
}

function v5BuildHomeDashboard() {
  const about = document.getElementById('page-about');
  if (!about || document.getElementById('home-daily-dashboard')) return;
  const dashboard = document.createElement('section');
  dashboard.id = 'home-daily-dashboard';
  dashboard.className = 'home-daily-dashboard';
  dashboard.innerHTML = `
    <button class="home-dashboard-card prayer" type="button" onclick="showPage('prayers')"><span>🕌</span><div><small>الصلاة القادمة</small><b id="home-next-prayer">جارٍ الحساب…</b></div></button>
    <button class="home-dashboard-card quran" type="button" onclick="showPage('azkar');setTimeout(enterMyWardPage,100)"><span>📖</span><div><small>تابع وردك</small><b data-ward-resume>استكمل من آخر صفحة</b></div></button>
    <button class="home-dashboard-card progress" type="button" onclick="showPage('stats')"><span>📊</span><div><small>إنجاز اليوم</small><b id="home-today-progress">0%</b></div></button>
    <button class="home-dashboard-card tasbeeh" type="button" onclick="showPage('azkar')"><span>📿</span><div><small>تسبيحات اليوم</small><b id="home-tasbeeh-count">0</b></div></button>`;
  const hero = about.querySelector('.about-hero');
  hero?.insertAdjacentElement('afterend', dashboard);
  v5UpdateHomeDashboard();
}

function v5UpdateHomeDashboard() {
  v5UpdateWardResumeLabels();
  const tasbeeh = document.getElementById('home-tasbeeh-count');
  if (tasbeeh) tasbeeh.textContent = Number(systemLogs?.[currentDayKey]?.tasbeehCount || 0).toLocaleString('ar-EG');
  const progress = document.getElementById('home-today-progress');
  if (progress) {
    try { progress.textContent = `${getDayMetrics(systemLogs?.[currentDayKey]).overall || 0}%`; }
    catch (error) { progress.textContent = '0%'; }
  }
  const prayer = document.getElementById('home-next-prayer');
  const countdown = document.getElementById('countdown-label')?.textContent;
  if (prayer) prayer.textContent = countdown?.replace('المتبقي على ', '') || 'عرض المواقيت';
}

function v5SetActiveNavigation(pageId) {
  document.querySelectorAll('.mobile-bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.page === pageId || (pageId === 'tools' || pageId === 'goals' || pageId === 'settings' ? button.dataset.page === 'more' : false)));
}

function v5EnhanceShowPage() {
  const original = showPage;
  showPage = function enhancedShowPage(pageId) {
    original(pageId);
    v5SetActiveNavigation(pageId);
    v5UpdateHomeDashboard();
  };
}

function v5InstallOverrides() {
  enterMyWardPage = v5EnterMyWardPage;
  openGeneralQuranPage = v5OpenGeneralQuranPage;
  loadPageInReader = v5LoadPageInReader;
  saveQuranProgress = v5SaveQuranProgress;
  changePage = v5ChangePage;
  prepareAudioSource = v5PrepareAudioSource;
  changeReciter = v5ChangeReciter;
  stopQuranAudio = v5StopQuranAudio;
  locateQibla = v5LocateQibla;
  locateQiblaWithCoords = v5LocateQiblaWithCoords;
  enableCompassMode = v5EnableCompassMode;
  handleOrientation = v5HandleOrientation;
  updateQiblaArrow = v5UpdateQiblaCompass;
}

function v5Initialize() {
  v5BuildQuranHub();
  v5BuildReaderMarkup();
  v5BuildQiblaCard();
  v5BuildMobileNavigation();
  v5BuildHomeDashboard();
  v5InstallOverrides();
  v5EnhanceShowPage();
  v5SetActiveNavigation('about');
  setTimeout(() => {
    v5PopulateReaderSelects();
    v5UpdateWardResumeLabels();
    v5UpdateHomeDashboard();
    if (profileMeta?.lastLocation) v5LocateQiblaWithCoords(profileMeta.lastLocation.lat, profileMeta.lastLocation.lon, profileMeta.lastLocation.accuracy);
  }, 900);
  window.addEventListener('resize', () => {
    if (document.getElementById('quran-reader-page')?.classList.contains('active-sub') && (document.getElementById('reader-spread-mode')?.value || 'auto') === 'auto') {
      clearTimeout(v5Initialize.resizeTimer);
      v5Initialize.resizeTimer = setTimeout(() => v5LoadPageInReader(currentPage), 250);
    }
  });
  setInterval(v5UpdateHomeDashboard, 30000);
}

window.v5ToggleReaderControls = v5ToggleReaderControls;
window.v5ToggleReaderFocus = v5ToggleReaderFocus;
window.v5ToggleAudioDock = v5ToggleAudioDock;
window.v5JumpToPage = v5JumpToPage;
window.v5ChangeSpreadMode = v5ChangeSpreadMode;
window.v5SetPaperTheme = v5SetPaperTheme;
window.v5SetReaderZoom = v5SetReaderZoom;
window.v5ToggleQuranAudio = v5ToggleQuranAudio;
window.v5PreviousAyah = v5PreviousAyah;
window.v5NextAyah = v5NextAyah;
window.v5SetAudioSpeed = v5SetAudioSpeed;
window.v5SetAudioRepeat = v5SetAudioRepeat;
window.v5SetSleepTimer = v5SetSleepTimer;
window.v5RecalibrateCompass = v5RecalibrateCompass;
window.v5StopQiblaTracking = v5StopQiblaTracking;

window.addEventListener('DOMContentLoaded', v5Initialize);
