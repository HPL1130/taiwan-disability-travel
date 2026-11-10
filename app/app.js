'use strict';
// 設定：repo 建好後改成實際網址
const REPO_URL = 'https://github.com/HPL1130/taiwan-disability-travel';
const COUNTY_ORDER = ['基隆市','臺北市','新北市','桃園市','新竹市','新竹縣','苗栗縣','臺中市','彰化縣','南投縣','雲林縣',
  '嘉義市','嘉義縣','臺南市','高雄市','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣'];
const CATS = ['博物館美術館','主題樂園','觀光工廠','休閒農場牧場','森林與自然','古蹟歷史','其他'];
const PAGE = 40;
// APK 內建一份資料；有網路時改抓網站上的最新資料
const REMOTE_DATA = 'https://hpl1130.github.io/taiwan-disability-travel/data/attractions.json';
const IN_APP = !!window.Capacitor;

const $ = s => document.querySelector(s);
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

let ALL = [], shown = PAGE;
const state = Object.assign({ q:'', county:'', sort:'county', cat:'', selfFree:false, compFree:false, comp:false,
  allFree:false, favOnly:false }, store.get('filters', {}));
state.q = ''; state.favOnly = false;
let favs = new Set(store.get('favs', []));
const FS = [18, 20, 22, 16]; let fsIdx = store.get('fs', 0);

const money = v => v === null || v === undefined ? '' : (v === 0 ? '免費' : `$${v}`);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function selfBadge(i){
  if (i.allFree) return ['none','全民免費'];
  return ({ '免費':['free','本人免費'], '半價':['half','本人半價'], '優待':['half','本人優待'], '待確認':['none','本人優惠待確認'] })[i.dKind];
}
function compBadge(i){
  if (i.allFree) return null;
  const n = i.cCount > 1 ? i.cCount : 1;
  return ({ '免費':['free',`陪同${n}人免費`], '優惠':['half',`陪同${n}人優惠`], '無':['none','陪同無優惠'], '待確認':['none','陪同待確認'] })[i.cKind];
}
function saving(i){
  if (i.allFree || i.full == null) return -1;
  const d = i.dPrice == null ? 0 : i.full - i.dPrice;
  const c = i.cPrice == null || !i.cCount ? 0 : i.full - i.cPrice;
  return d + c;
}

function filtered(){
  const q = state.q.trim().toLowerCase();
  let r = ALL.filter(i => {
    if (state.favOnly && !favs.has(i.id)) return false;
    if (!state.allFree && i.allFree) return false;
    if (state.county && i.county !== state.county) return false;
    if (state.cat && i.cat !== state.cat) return false;
    if (state.selfFree && i.dKind !== '免費') return false;
    if (state.compFree && i.cKind !== '免費') return false;
    if (state.comp && !(i.cKind === '免費' || i.cKind === '優惠')) return false;
    if (q && !(`${i.name} ${i.county} ${i.addr} ${i.type}`.toLowerCase().includes(q))) return false;
    return true;
  });
  const co = c => { const x = COUNTY_ORDER.indexOf(c); return x < 0 ? 99 : x; };
  const cmp = {
    county: (a,b) => co(a.county) - co(b.county) || a.name.localeCompare(b.name, 'zh-Hant'),
    name: (a,b) => a.name.localeCompare(b.name, 'zh-Hant'),
    price: (a,b) => (a.full ?? 1e9) - (b.full ?? 1e9),
    save: (a,b) => saving(b) - saving(a),
  }[state.sort];
  return r.sort(cmp);
}

function card(i){
  const sb = selfBadge(i), cb = compBadge(i);
  const fav = favs.has(i.id);
  return `<li class="card" data-id="${i.id}" tabindex="0" role="button" aria-label="${esc(i.name)}，查看詳細">
    <button class="fav" data-fav="${i.id}" aria-pressed="${fav}" aria-label="${fav ? '取消收藏' : '加入收藏'}">★</button>
    <h2>${esc(i.name)}</h2>
    <div class="where">${esc(i.county)} · ${esc(i.cat)}</div>
    <div class="badges">
      ${i.closed ? `<span class="b warn">${esc(i.status)}</span>` : ''}
      <span class="b ${sb[0]}">${sb[1]}</span>
      ${cb ? `<span class="b ${cb[0]}">${cb[1]}</span>` : ''}
    </div>
    ${i.allFree ? '' : `<div class="prices">
      <span>全票 <strong>${i.full != null ? '$' + i.full : esc(i.fullText || '—')}</strong></span>
      ${i.dPrice != null ? `<span>本人 <strong>${money(i.dPrice)}</strong></span>` : ''}
      ${i.cPrice != null && i.cCount ? `<span>陪同 <strong>${money(i.cPrice)}</strong></span>` : ''}
    </div>`}
  </li>`;
}

function render(){
  const r = filtered();
  $('#count').textContent = state.favOnly ? `收藏 ${r.length} 筆` : `找到 ${r.length} 個景點`;
  $('#list').innerHTML = r.length ? r.slice(0, shown).map(card).join('')
    : `<li class="empty">${state.favOnly ? '還沒有收藏，點景點右上角的 ★ 加入。' : '沒有符合條件的景點，試試放寬篩選。'}</li>`;
  $('#more').hidden = r.length <= shown;
  store.set('filters', { county:state.county, sort:state.sort, cat:state.cat, selfFree:state.selfFree,
    compFree:state.compFree, comp:state.comp, allFree:state.allFree });
}

function detail(id){
  const i = ALL.find(x => x.id === id); if (!i) return;
  const sb = selfBadge(i), cb = compBadge(i);
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.name + ' ' + i.county)}`;
  const row = (k, v) => v ? `<tr><th>${k}</th><td>${v}</td></tr>` : '';
  $('#dBody').innerHTML = `
    <h2 id="dTitle">${esc(i.name)}</h2>
    <div class="where">${esc(i.county)} · ${esc(i.type)}</div>
    <div class="badges" style="margin-top:8px">
      ${i.closed ? `<span class="b warn">${esc(i.status)}</span>` : ''}
      <span class="b ${sb[0]}">${sb[1]}</span>${cb ? `<span class="b ${cb[0]}">${cb[1]}</span>` : ''}
    </div>
    <table class="tbl">
      ${row('一般全票', i.allFree ? '免費參觀' : `<span class="big">${i.full != null ? '$' + i.full : esc(i.fullText || '—')}</span>`)}
      ${i.allFree ? '' : row('身障者本人', `<span class="big">${money(i.dPrice) || '待確認'}</span><br>${esc(i.dType)}`)}
      ${i.allFree ? '' : row('必要陪同者', `${i.cCount && i.cPrice != null ? `<span class="big">${money(i.cPrice)}</span>（限${i.cCount}人）<br>` : ''}${esc(i.cType)}`)}
      ${row('需備證件', esc(i.doc))}
      ${row('補充說明', esc(i.remark))}
      ${row('營運狀態', esc(i.status))}
      ${row('地址', esc(i.addr))}
      ${row('電話', i.tel ? `<a href="tel:${esc(String(i.tel).replace(/[^\d+#]/g,''))}">${esc(i.tel)}</a>` : '')}
    </table>
    <div class="actions">
      <a class="btn primary" href="${map}" target="_blank" rel="noopener">開啟地圖</a>
      ${/^https?:/.test(i.web) ? `<a class="btn" href="${esc(i.web)}" target="_blank" rel="noopener">官方網站</a>` : ''}
      ${/^https?:/.test(i.srcUrl) ? `<a class="btn" href="${esc(i.srcUrl)}" target="_blank" rel="noopener">資料來源</a>` : ''}
    </div>
    <div class="meta">
      <span>來源：${esc(i.src)}（${esc(i.level)}）</span>
      <span>查核日期：${esc(i.date)} · ${esc(i.verify)}</span>
      <span>編號 ${esc(i.id)} · <a href="${REPO_URL}/issues/new?title=${encodeURIComponent('資料回報：' + i.name + '（' + i.id + '）')}" target="_blank" rel="noopener">回報這筆資料有誤</a></span>
    </div>`;
  const d = $('#detail');
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  history.pushState({ d: id }, '', '#' + id);
}
function closeDetail(){ const d = $('#detail'); if (d.open) d.close(); }

function setupUI(){
  const counties = COUNTY_ORDER.filter(c => ALL.some(i => i.county === c));
  $('#county').insertAdjacentHTML('beforeend', counties.map(c => `<option>${c}</option>`).join(''));
  $('#cats').innerHTML = ['', ...CATS].map(c => `<button class="chip" data-cat="${c}" aria-pressed="${state.cat === c}">${c || '全部類型'}</button>`).join('');
  $('#county').value = state.county; $('#sort').value = state.sort;
  for (const [id, k] of [['#tSelfFree','selfFree'],['#tCompFree','compFree'],['#tComp','comp'],['#tAllFree','allFree']]){
    $(id).checked = state[k];
    $(id).addEventListener('change', e => { state[k] = e.target.checked; shown = PAGE; render(); });
  }
  let t; $('#q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; shown = PAGE; render(); }, 150); });
  $('#county').addEventListener('change', e => { state.county = e.target.value; shown = PAGE; render(); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('#cats').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat; document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b));
    shown = PAGE; render();
  });
  $('#more').addEventListener('click', () => { shown += PAGE; render(); });
  $('#list').addEventListener('click', e => {
    const f = e.target.closest('[data-fav]');
    if (f){ e.stopPropagation(); const id = f.dataset.fav; favs.has(id) ? favs.delete(id) : favs.add(id); store.set('favs', [...favs]); render(); return; }
    const c = e.target.closest('.card'); if (c) detail(c.dataset.id);
  });
  $('#list').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')){ e.preventDefault(); detail(e.target.dataset.id); } });
  $('#favTab').addEventListener('click', e => { state.favOnly = !state.favOnly; e.currentTarget.setAttribute('aria-pressed', state.favOnly); shown = PAGE; render(); });
  $('#fontBtn').addEventListener('click', () => { fsIdx = (fsIdx + 1) % FS.length; applyFont(); store.set('fs', fsIdx); });
  $('#dClose').addEventListener('click', () => history.back());
  $('#detail').addEventListener('click', e => { if (e.target.id === 'detail') history.back(); });
  $('#detail').addEventListener('cancel', e => { e.preventDefault(); history.back(); });
  window.addEventListener('popstate', closeDetail);
  $('#reportLink').href = REPO_URL + '/issues';
}
function applyFont(){ document.documentElement.style.setProperty('--fs', FS[fsIdx] + 'px'); }

async function init(){
  applyFont();
  try{
    let j = null;
    if (IN_APP){ try{ const r = await fetch(REMOTE_DATA, { cache: 'no-cache' }); if (r.ok) j = await r.json(); }catch(e){} }
    if (!j){ const res = await fetch('data/attractions.json', { cache: 'no-cache' }); j = await res.json(); }
    ALL = j.items;
    $('#meta').textContent = `${j.meta.paid} 個收費景點 · ${j.meta.generated} 更新`;
    $('#ver').textContent = `資料版本 ${j.meta.generated}，共 ${j.meta.count} 筆`;
  }catch(e){
    $('#meta').textContent = '資料載入失敗，請檢查網路後重新整理';
    return;
  }
  setupUI(); render();
  if (location.hash.length > 1) history.replaceState(null, '', location.pathname);
}
if (!IN_APP && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
init();
