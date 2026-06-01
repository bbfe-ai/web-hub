// ============ 全局状态 ============
let projects = [];
let categories = [];
let tags = [];
let teamInfo = { teamName: '我的团队', totalProjects: 0, todayClicks: 0, weekClicks: 0 };
let currentCategory = '全部';
let currentTag = '';
let currentView = localStorage.getItem('webhub.view') || 'grid';
let currentIframeUrl = '';
let currentProjectId = null;
let quillEditor = null;
let userName = localStorage.getItem('webhub.userName') || '';

const API = '/api';
const LS_FAVS = 'webhub.favorites';

// ============ DOM 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  quillEditor = new Quill('#projDescEditor', {
    theme: 'snow',
    placeholder: '详细描述（支持富文本）...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
      ]
    }
  });
  applyView(currentView);
  updateUserBtn();
  initLightbox();
  initKeyboardShortcuts();
});

// ============ 用户昵称 ============
function updateUserBtn() {
  const label = document.getElementById('userBtnLabel');
  if (label) label.textContent = userName || '设置昵称';
}
function changeUserName() {
  const input = document.getElementById('userNameInput');
  if (input) input.value = userName || '';
  document.getElementById('userModal').style.display = 'flex';
  setTimeout(() => input && input.focus(), 50);
}
function hideUserModal() { document.getElementById('userModal').style.display = 'none'; }
function saveUserName() {
  const val = (document.getElementById('userNameInput').value || '').trim().slice(0, 32);
  userName = val;
  localStorage.setItem('webhub.userName', val);
  updateUserBtn();
  hideUserModal();
  showToast(val ? `欢迎，${val}！` : '已清空昵称');
}

// ============ API ============
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '请求失败');
  return data;
}

async function loadTeamInfo() {
  try {
    const res = await api(`${API}/team`);
    teamInfo = res.data;
    document.getElementById('teamSubtitle').textContent = teamInfo.welcomeMessage || '团队工具墙';
    const stats = document.getElementById('teamStats');
    stats.innerHTML = `
      <span class="team-stat"><strong>${teamInfo.totalProjects}</strong> 项目</span>
      <span class="team-stat-sep">·</span>
      <span class="team-stat">今日 <strong>${teamInfo.todayClicks}</strong></span>
      <span class="team-stat-sep">·</span>
      <span class="team-stat">本周 <strong>${teamInfo.weekClicks}</strong></span>
    `;
    document.title = `${teamInfo.teamName} · WebHub`;
  } catch {}
}

async function loadProjects() {
  const keyword = document.getElementById('searchInput').value.trim();
  const params = new URLSearchParams();
  if (currentCategory !== '全部') params.set('category', currentCategory);
  if (currentTag) params.set('tag', currentTag);
  if (keyword) params.set('keyword', keyword);

  const res = await api(`${API}/projects?${params}`);
  projects = res.data;
  projects.forEach(p => { if (p.screenshot_count === undefined) p.screenshot_count = 0; });

  // 客户端拼音搜索增强
  if (keyword) {
    const lowered = keyword.toLowerCase();
    projects = projects.filter(p => matchesKeywordWithPinyin(p, lowered));
  }
  renderProjects();
  updateProjectsCount();
}

// 简易拼音首字母匹配：常见汉字 → 首字母
const COMMON_PINYIN_INITIALS = {
  // 极简表，覆盖项目名常见汉字。命中即匹配，不命中跳过（不会反向漏掉）。
  '阿':'a','艾':'a','安':'a','奥':'a',
  '巴':'b','白':'b','百':'b','宝':'b','报':'b','北':'b','贝':'b','本':'b','边':'b','便':'b','标':'b','表':'b','播':'b','博':'b','部':'b',
  '才':'c','财':'c','彩':'c','参':'c','测':'c','查':'c','产':'c','常':'c','超':'c','车':'c','成':'c','城':'c','程':'c','创':'c','存':'c','错':'c',
  '搭':'d','打':'d','大':'d','代':'d','单':'d','档':'d','导':'d','的':'d','登':'d','地':'d','点':'d','电':'d','店':'d','调':'d','定':'d','东':'d','动':'d','都':'d','读':'d','度':'d','短':'d','队':'d','对':'d','多':'d',
  '俄':'e','额':'e','二':'e',
  '发':'f','法':'f','番':'f','繁':'f','反':'f','返':'f','方':'f','防':'f','放':'f','飞':'f','非':'f','分':'f','服':'f','复':'f','付':'f',
  '改':'g','概':'g','感':'g','刚':'g','高':'g','告':'g','哥':'g','格':'g','个':'g','给':'g','跟':'g','工':'g','公':'g','功':'g','共':'g','购':'g','估':'g','故':'g','顾':'g','管':'g','光':'g','广':'g','规':'g','贵':'g','国':'g','果':'g','过':'g',
  '哈':'h','海':'h','含':'h','行':'h','航':'h','好':'h','号':'h','合':'h','和':'h','河':'h','黑':'h','很':'h','红':'h','后':'h','护':'h','花':'h','化':'h','华':'h','化':'h','坏':'h','环':'h','换':'h','黄':'h','回':'h','会':'h','货':'h','或':'h',
  '机':'j','基':'j','激':'j','及':'j','级':'j','计':'j','记':'j','技':'j','加':'j','家':'j','假':'j','价':'j','驾':'j','间':'j','检':'j','简':'j','建':'j','健':'j','江':'j','讲':'j','奖':'j','交':'j','教':'j','节':'j','结':'j','解':'j','介':'j','界':'j','金':'j','今':'j','进':'j','京':'j','经':'j','精':'j','警':'j','静':'j','久':'j','酒':'j','旧':'j','局':'j','据':'j','聚':'j','决':'j','觉':'j','均':'j',
  '开':'k','看':'k','康':'k','考':'k','科':'k','可':'k','客':'k','课':'k','空':'k','控':'k','口':'k','库':'k','快':'k','宽':'k',
  '拉':'l','来':'l','蓝':'l','览':'l','劳':'l','老':'l','乐':'l','类':'l','冷':'l','理':'l','力':'l','立':'l','利':'l','联':'l','链':'l','连':'l','两':'l','料':'l','列':'l','林':'l','临':'l','零':'l','留':'l','流':'l','龙':'l','楼':'l','路':'l','陆':'l','律':'l','率':'l','轮':'l','论':'l',
  '马':'m','码':'m','买':'m','卖':'m','满':'m','慢':'m','忙':'m','毛':'m','么':'m','美':'m','门':'m','们':'m','梦':'m','米':'m','秘':'m','密':'m','面':'m','民':'m','明':'m','名':'m','模':'m','末':'m','目':'m',
  '那':'n','哪':'n','内':'n','能':'n','你':'n','年':'n','宁':'n','牛':'n','农':'n','怒':'n','女':'n',
  '哦':'o','偶':'o',
  '怕':'p','排':'p','派':'p','盘':'p','判':'p','配':'p','喷':'p','朋':'p','批':'p','片':'p','飘':'p','拼':'p','品':'p','平':'p','评':'p','破':'p','普':'p',
  '七':'q','起':'q','气':'q','汽':'q','千':'q','签':'q','钱':'q','前':'q','强':'q','墙':'q','悄':'q','切':'q','清':'q','轻':'q','情':'q','请':'q','秋':'q','区':'q','取':'q','去':'q','全':'q','圈':'q','权':'q',
  '让':'r','热':'r','人':'r','认':'r','日':'r','容':'r','如':'r','入':'r','软':'r',
  '三':'s','色':'s','森':'s','沙':'s','商':'s','上':'s','少':'s','社':'s','设':'s','身':'s','深':'s','神':'s','审':'s','生':'s','声':'s','省':'s','胜':'s','失':'s','师':'s','十':'s','时':'s','实':'s','识':'s','史':'s','使':'s','始':'s','示':'s','市':'s','事':'s','视':'s','是':'s','适':'s','收':'s','手':'s','首':'s','受':'s','售':'s','书':'s','输':'s','属':'s','述':'s','数':'s','刷':'s','双':'s','水':'s','顺':'s','说':'s','思':'s','私':'s','死':'s','送':'s','搜':'s','素':'s','算':'s','虽':'s','随':'s',
  '他':'t','她':'t','它':'t','台':'t','太':'t','谈':'t','探':'t','汤':'t','糖':'t','特':'t','腾':'t','题':'t','体':'t','替':'t','天':'t','田':'t','贴':'t','听':'t','停':'t','通':'t','同':'t','统':'t','投':'t','头':'t','透':'t','突':'t','图':'t','土':'t','团':'t','推':'t','拖':'t',
  '哇':'w','歪':'w','外':'w','弯':'w','完':'w','晚':'w','网':'w','望':'w','为':'w','喂':'w','文':'w','闻':'w','问':'w','我':'w','物':'w','务':'w','误':'w',
  '希':'x','西':'x','息':'x','吸':'x','洗':'x','下':'x','先':'x','显':'x','现':'x','线':'x','限':'x','相':'x','向':'x','像':'x','消':'x','小':'x','晓':'x','效':'x','协':'x','写':'x','新':'x','信':'x','行':'x','形':'x','型':'x','性':'x','需':'x','序':'x','选':'x','学':'x',
  '压':'y','呀':'y','烟':'y','严':'y','言':'y','研':'y','演':'y','眼':'y','央':'y','样':'y','要':'y','也':'y','业':'y','页':'y','叶':'y','一':'y','医':'y','以':'y','艺':'y','议':'y','意':'y','因':'y','音':'y','银':'y','引':'y','应':'y','英':'y','迎':'y','营':'y','映':'y','用':'y','优':'y','由':'y','邮':'y','油':'y','友':'y','有':'y','右':'y','余':'y','于':'y','与':'y','宇':'y','语':'y','元':'y','员':'y','原':'y','远':'y','院':'y','约':'y','月':'y','越':'y','云':'y','运':'y',
  '杂':'z','再':'z','在':'z','咱':'z','早':'z','造':'z','则':'z','怎':'z','增':'z','站':'z','张':'z','章':'z','找':'z','照':'z','者':'z','这':'z','真':'z','整':'z','正':'z','证':'z','政':'z','支':'z','知':'z','只':'z','直':'z','值':'z','职':'z','制':'z','智':'z','中':'z','钟':'z','重':'z','周':'z','主':'z','住':'z','注':'z','转':'z','装':'z','状':'z','准':'z','资':'z','子':'z','字':'z','自':'z','宗':'z','总':'z','走':'z','足':'z','组':'z','最':'z','作':'z'
};

function pinyinInitials(s) {
  let out = '';
  for (const ch of (s || '')) {
    if (COMMON_PINYIN_INITIALS[ch]) out += COMMON_PINYIN_INITIALS[ch];
    else if (/[a-z0-9]/i.test(ch)) out += ch.toLowerCase();
  }
  return out;
}

function matchesKeywordWithPinyin(p, keywordLower) {
  const haystack = [p.name, p.url, p.description, p.tips, (p.tags || []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();
  if (haystack.includes(keywordLower)) return true;
  if (/[一-龥]/.test(keywordLower)) return false; // 包含汉字则只走原文
  const initials = pinyinInitials(p.name + ' ' + (p.tags || []).join(' '));
  return initials.includes(keywordLower);
}

async function loadStats() {
  const res = await api(`${API}/stats`);
  renderStats(res.data);
}

async function loadCategories() {
  const res = await api(`${API}/categories`);
  categories = res.data;
  renderCategories();
}

async function loadTags() {
  try {
    const res = await api(`${API}/tags`);
    tags = res.data;
    renderTags();
  } catch {}
}

async function loadHot() {
  try {
    const res = await api(`${API}/projects/hot?limit=3`);
    renderHot(res.data);
  } catch {}
}

async function loadActivity() {
  try {
    const res = await api(`${API}/projects/recent-activity?limit=8`);
    renderActivity(res.data);
  } catch {}
}

function renderStats(stats) {
  const bar = document.getElementById('statsBar');
  let html = `
    <div class="stat-item"><span class="stat-value">${stats.total}</span><span class="stat-label">项目总数</span></div>
  `;
  stats.categories.forEach(c => {
    html += `<div class="stat-item" onclick="selectCategory('${escapeHtml(c.category)}')"><span class="stat-value">${c.count}</span><span class="stat-label">${escapeHtml(c.category)}</span></div>`;
  });
  bar.innerHTML = html;
}

function renderCategories() {
  const tabs = document.getElementById('categoryTabs');
  const all = ['全部', ...categories];
  const datalist = document.getElementById('categoryList');
  datalist.innerHTML = categories.map(c => `<option value="${c}">`).join('');
  tabs.innerHTML = all.map((c, i) =>
    `<button class="cat-tab ${c === currentCategory ? 'active' : ''}" onclick="selectCategory('${escapeHtml(c)}')" data-cat-idx="${i}">
      ${escapeHtml(c)}${i > 0 && i < 10 ? `<kbd class="cat-kbd">${i}</kbd>` : ''}
    </button>`
  ).join('');
}

function renderTags() {
  const section = document.getElementById('tagSection');
  const list = document.getElementById('tagList');
  if (!tags || tags.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = tags.slice(0, 20).map(t =>
    `<button class="tag-chip ${currentTag === t.name ? 'active' : ''}" onclick="selectTag('${escapeHtml(t.name)}')">
      ${escapeHtml(t.name)} <span class="tag-count">${t.count}</span>
    </button>`
  ).join('');
}

function renderActivity(events) {
  const feed = document.getElementById('activityFeed');
  if (!events || events.length === 0) {
    feed.innerHTML = '<div class="activity-empty">还没有团队动态<br/>点击任意项目开始记录</div>';
    return;
  }
  feed.innerHTML = events.map(e => {
    const who = e.user_name || '访客';
    const time = formatTime(e.clicked_at);
    const icon = e.favicon
      ? `<img class="activity-icon" src="${escapeHtml(e.favicon)}" onerror="this.style.display='none'">`
      : `<span class="activity-icon-placeholder">${escapeHtml(e.name.slice(0, 1))}</span>`;
    return `
      <div class="activity-item" onclick="openProjectById(${e.id})">
        ${icon}
        <div class="activity-text">
          <span class="activity-name">${escapeHtml(e.name)}</span>
          <span class="activity-meta"><b>${escapeHtml(who)}</b> · ${time}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderHot(hotProjects) {
  const section = document.getElementById('hotSection');
  const list = document.getElementById('hotList');
  if (!hotProjects || hotProjects.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = hotProjects.map((p, idx) => {
    const medal = ['🥇','🥈','🥉'][idx] || '🔥';
    const icon = p.favicon
      ? `<img class="hot-favicon" src="${escapeHtml(p.favicon)}" onerror="this.style.display='none'">`
      : '';
    return `
      <div class="hot-card" onclick="openProjectById(${p.id})">
        <div class="hot-rank">${medal}</div>
        <div class="hot-body">
          <div class="hot-name">${icon}${escapeHtml(p.name)}</div>
          <div class="hot-meta">
            <span>${p.recent_clicks || 0} 次近期点击</span>
            ${(p.tags || []).slice(0, 2).map(t => `<span class="hot-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderFavorites() {
  const section = document.getElementById('favoritesSection');
  const list = document.getElementById('favoritesList');
  const favs = getLocalFavorites();
  const projectIds = projects.map(p => p.id);
  const visible = favs.filter(f => projectIds.includes(f.id)).slice(0, 5);
  if (visible.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = visible.map(f => {
    const p = projects.find(x => x.id === f.id);
    if (!p) return '';
    const icon = p.favicon
      ? `<img class="fav-favicon" src="${escapeHtml(p.favicon)}" onerror="this.style.display='none'">`
      : `<span class="fav-favicon-placeholder">${escapeHtml(p.name.slice(0, 1))}</span>`;
    return `
      <div class="fav-card" onclick="openProjectById(${p.id})" title="${escapeHtml(p.url)}">
        ${icon}
        <span class="fav-name">${escapeHtml(p.name)}</span>
        <span class="fav-count">${f.count}×</span>
      </div>
    `;
  }).join('');
}

// ============ localStorage favorites ============
function getLocalFavorites() {
  try { return JSON.parse(localStorage.getItem(LS_FAVS) || '[]'); } catch { return []; }
}
function bumpLocalFavorite(id) {
  const favs = getLocalFavorites();
  const exist = favs.find(f => f.id === id);
  if (exist) exist.count++;
  else favs.push({ id, count: 1 });
  favs.sort((a, b) => b.count - a.count);
  localStorage.setItem(LS_FAVS, JSON.stringify(favs.slice(0, 30)));
}

// ============ 选择/过滤 ============
function selectCategory(cat) {
  currentCategory = cat;
  currentTag = '';
  loadProjects();
  renderCategories();
  renderTags();
  updateProjectsTitle();
}
function selectTag(tag) {
  currentTag = currentTag === tag ? '' : tag;
  loadProjects();
  renderTags();
  updateProjectsTitle();
}
function updateProjectsTitle() {
  const title = document.getElementById('projectsTitle');
  if (currentTag) title.textContent = `🏷️ ${currentTag}`;
  else if (currentCategory !== '全部') title.textContent = `📂 ${currentCategory}`;
  else title.textContent = '全部项目';
}
function updateProjectsCount() {
  document.getElementById('projectsCount').textContent = `共 ${projects.length} 个`;
}

// ============ 视图 ============
function setView(view) {
  currentView = view;
  localStorage.setItem('webhub.view', view);
  applyView(view);
  renderProjects();
}
function applyView(view) {
  const grid = document.getElementById('projectsGrid');
  grid.className = 'projects-grid view-' + view;
  ['grid','list','compact'].forEach(v => {
    const btn = document.getElementById(v + 'Btn');
    if (btn) btn.classList.toggle('active', v === view);
  });
}

// ============ NEW 标签 ============
function isNew(createdAt) {
  if (!createdAt) return false;
  const d = new Date(createdAt + 'Z');
  return (Date.now() - d.getTime()) < 7 * 24 * 3600 * 1000;
}

// ============ 渲染项目 ============
function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  const empty = document.getElementById('emptyState');
  if (projects.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'flex';
    renderFavorites();
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';

  if (currentView === 'compact') {
    grid.innerHTML = projects.map(p => renderCompactRow(p)).join('');
  } else if (currentView === 'list') {
    grid.innerHTML = `
      <div class="list-row list-header">
        <span class="list-cell">名称</span>
        <span class="list-cell">分类</span>
        <span class="list-cell">标签</span>
        <span class="list-cell">访问</span>
        <span class="list-cell">最后修改</span>
        <span class="list-cell">操作</span>
      </div>
      ${projects.map(p => renderListRow(p)).join('')}
    `;
  } else {
    grid.innerHTML = projects.map(p => renderCard(p)).join('');
  }
  renderFavorites();
}

function renderCard(p) {
  const count = p.screenshot_count || 0;
  const paths = p.screenshot_paths ? p.screenshot_paths.split(',') : [];
  let previewHtml = '';
  if (count === 0) {
    previewHtml = `
      <div class="card-preview-placeholder">
        ${p.favicon ? `<img class="card-favicon-big" src="${escapeHtml(p.favicon)}" onerror="this.style.display='none'">` : ''}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        <span>暂无预览</span>
      </div>`;
  } else if (count === 1) {
    previewHtml = `<img src="${escapeHtml(paths[0] || p.thumbnail)}" alt="${escapeHtml(p.name)}预览" loading="lazy" class="card-preview-img" data-lightbox="${escapeHtml(paths[0] || p.thumbnail)}">`;
  } else {
    const badge = count < 4 ? `<span class="screenshot-badge">${count}/4</span>` : `<span class="screenshot-badge full">满载</span>`;
    const imgs = paths.slice(0, 4).map(s => `<img src="${escapeHtml(s)}" data-lightbox="${escapeHtml(s)}">`).join('');
    previewHtml = `<div class="card-preview-grid">${imgs}${badge}</div>`;
  }

  const newBadge = isNew(p.created_at) ? '<span class="card-new-badge">NEW</span>' : '';
  const healthDot = p.health_status === 'offline'
    ? '<span class="health-dot offline" title="链接最近不可达"></span>'
    : (p.health_status === 'online' ? '<span class="health-dot online" title="链接正常"></span>' : '');
  const author = p.created_by
    ? `<span class="card-author" title="由 ${escapeHtml(p.created_by)} 添加${p.updated_by && p.updated_by !== p.created_by ? '，最近由 ' + escapeHtml(p.updated_by) + ' 修改' : ''}">
        <span class="author-avatar">${escapeHtml(p.created_by.slice(0, 1).toUpperCase())}</span>
        ${escapeHtml(p.created_by)}
      </span>`
    : '';
  const tagsHtml = (p.tags || []).slice(0, 3).map(t =>
    `<span class="card-tag" onclick="event.stopPropagation();selectTag('${escapeHtml(t)}')">${escapeHtml(t)}</span>`
  ).join('');
  const versionInline = p.version ? `<span class="card-version-inline" title="版本">v${escapeHtml(String(p.version).replace(/^v/i, ''))}</span>` : '';
  const tipsHtml = p.tips ? `<div class="card-tips-bar" title="${escapeHtml(p.tips)}"><span class="tips-icon">💡</span><span class="tips-text">${escapeHtml(p.tips)}</span>${versionInline}</div>` : '';

  return `
    <div class="project-card" onclick="openProject(${p.id})">
      ${newBadge}
      <div class="card-preview">
        ${previewHtml}
        <div class="card-preview-overlay"><div class="card-preview-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
        </div></div>
        ${tipsHtml}
        ${(p.version && !p.tips) ? `<span class="card-version-corner" title="版本 ${escapeHtml(p.version)}">v${escapeHtml(String(p.version).replace(/^v/i, ''))}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-header">
          <span class="card-name" title="${escapeHtml(p.name)}">${healthDot}${p.favicon ? `<img class="card-favicon" src="${escapeHtml(p.favicon)}" onerror="this.style.display='none'">` : ''}${escapeHtml(p.name)}</span>
          ${p.category ? `<span class="card-category">${escapeHtml(p.category)}</span>` : ''}
        </div>
        <span class="card-url" title="${escapeHtml(p.url)}">${escapeHtml(p.url)}</span>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        ${p.description ? `<span class="card-desc" title="${escapeHtml(stripHtml(p.description))}">${stripHtml(p.description)}</span>` : ''}
        <div class="card-footer">
          <div class="card-meta">
            <span class="card-time">${formatTime(p.created_at)}</span>
            ${author}
            <span class="card-click-count" title="点击次数">${p.click_count || 0} 次</span>
          </div>
          <div class="card-actions">
            <button class="card-action-btn" onclick="event.stopPropagation();showQrModal(${p.id})" title="二维码">📱</button>
            <button class="card-action-btn" onclick="event.stopPropagation();showDetailModal(${p.id})" title="详情">详情</button>
            <button class="card-action-btn" onclick="event.stopPropagation();editProject(${p.id})" title="编辑">编辑</button>
            <button class="card-action-btn danger" onclick="event.stopPropagation();deleteProject(${p.id})" title="删除">删除</button>
            <button class="card-action-btn" onclick="event.stopPropagation();openInIframe(${p.id})" title="在平台内打开并截图">截图</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderListRow(p) {
  const newBadge = isNew(p.created_at) ? '<span class="list-new">NEW</span>' : '';
  const healthDot = p.health_status === 'offline'
    ? '<span class="health-dot offline"></span>'
    : (p.health_status === 'online' ? '<span class="health-dot online"></span>' : '');
  const tagsHtml = (p.tags || []).slice(0, 4).map(t => `<span class="list-tag">${escapeHtml(t)}</span>`).join('');
  const author = p.updated_by || p.created_by || '';
  return `
    <div class="list-row" onclick="openProject(${p.id})">
      <span class="list-cell list-name">
        ${healthDot}
        ${p.favicon ? `<img class="card-favicon" src="${escapeHtml(p.favicon)}" onerror="this.style.display='none'">` : ''}
        <span>${escapeHtml(p.name)}</span>
        ${p.version ? `<span class="card-version" title="版本">${escapeHtml(p.version)}</span>` : ''}
        ${newBadge}
      </span>
      <span class="list-cell">${p.category ? escapeHtml(p.category) : '-'}</span>
      <span class="list-cell">${tagsHtml || '-'}</span>
      <span class="list-cell"><b>${p.click_count || 0}</b> 次</span>
      <span class="list-cell">${formatTime(p.updated_at)}${author ? ' · ' + escapeHtml(author) : ''}</span>
      <span class="list-cell list-actions">
        <button onclick="event.stopPropagation();showDetailModal(${p.id})" title="详情">📋</button>
        <button onclick="event.stopPropagation();showQrModal(${p.id})" title="二维码">📱</button>
        <button onclick="event.stopPropagation();editProject(${p.id})" title="编辑">✏️</button>
        <button onclick="event.stopPropagation();deleteProject(${p.id})" title="删除">🗑️</button>
      </span>
    </div>
  `;
}

function renderCompactRow(p) {
  const newBadge = isNew(p.created_at) ? '<span class="compact-new">NEW</span>' : '';
  const healthDot = p.health_status === 'offline'
    ? '<span class="health-dot offline"></span>'
    : (p.health_status === 'online' ? '<span class="health-dot online"></span>' : '');
  return `
    <div class="compact-item" onclick="openProject(${p.id})" title="${escapeHtml(p.url)}">
      ${healthDot}
      ${p.favicon
        ? `<img class="compact-icon" src="${escapeHtml(p.favicon)}" onerror="this.style.display='none'">`
        : `<span class="compact-icon-placeholder">${escapeHtml(p.name.slice(0, 1))}</span>`}
      <span class="compact-name">${escapeHtml(p.name)}</span>
      ${newBadge}
      <span class="compact-count">${p.click_count || 0}</span>
    </div>
  `;
}

// ============ 打开项目 ============
function openProjectById(id) {
  openProject(id);
}
async function openProject(id) {
  const p = projects.find(x => x.id === id);
  if (!p) {
    // 可能是从动态列表里点的，单独取
    try {
      const res = await api(`${API}/projects/${id}`);
      window.open(res.data.url, '_blank');
    } catch {}
    fetch(`${API}/projects/${id}/open?user=${encodeURIComponent(userName)}`).catch(() => {});
    bumpLocalFavorite(id);
    setTimeout(() => refresh(), 800);
    return;
  }
  window.open(p.url, '_blank');
  bumpLocalFavorite(id);
  try {
    const openRes = await api(`${API}/projects/${id}/open?user=${encodeURIComponent(userName)}`);
    if (openRes.data) {
      p.click_count = openRes.data.click_count;
      renderProjects();
      loadHot(); loadActivity(); loadTeamInfo();
    }
  } catch {}
}

function updateScreenshotBtn(p) {
  const btn = document.getElementById('screenCapBtn');
  if (!btn) return;
  const count = p.screenshot_count || 0;
  const icon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
  if (count >= 4) {
    btn.disabled = true; btn.classList.add('btn-disabled');
    btn.innerHTML = `${icon} 满载`; btn.title = '已达最大截图数量 (4张)';
  } else {
    btn.disabled = false; btn.classList.remove('btn-disabled');
    btn.innerHTML = `${icon} 截图`; btn.title = `截图 (当前 ${count}/4)`;
  }
}

async function capturePageScreenshot() {
  if (!currentProjectId) return;
  const btn = document.getElementById('screenCapBtn');
  const origHtml = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '截图中...';
  try {
    const res = await fetch(`${API}/projects/${currentProjectId}/screenshot`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('截图成功');
      await loadProjects();
      const p = projects.find(x => x.id === currentProjectId);
      if (p) updateScreenshotBtn(p);
    } else {
      showToast(data.message || '截图失败', 'error');
      btn.disabled = false; btn.innerHTML = origHtml;
    }
  } catch (e) {
    showToast('截图请求失败', 'error');
    btn.disabled = false; btn.innerHTML = origHtml;
  }
}

function openInIframe(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  currentProjectId = p.id;
  currentIframeUrl = p.url;
  document.getElementById('iframeName').textContent = p.name;
  document.getElementById('iframeUrl').textContent = p.url;
  document.getElementById('projectIframe').src = p.url;
  updateScreenshotBtn(p);
  document.getElementById('iframeOverlay').style.display = 'flex';
  fetch(`${API}/projects/${id}/open?user=${encodeURIComponent(userName)}`).catch(() => {});
  bumpLocalFavorite(id);
}
function hideIframe() {
  document.getElementById('iframeOverlay').style.display = 'none';
  document.getElementById('projectIframe').src = 'about:blank';
  currentIframeUrl = ''; currentProjectId = null;
  refresh();
}
function openInNewTab() { if (currentIframeUrl) window.open(currentIframeUrl, '_blank'); }

// ============ 新增/编辑 ============
function showAddModal(prefillUrl, prefillName, prefillDesc) {
  document.getElementById('editId').value = '';
  document.getElementById('modalTitle').textContent = '新增项目';
  document.getElementById('submitBtn').textContent = '保存';
  document.getElementById('projectForm').reset();
  document.getElementById('projTags').value = '';
  document.getElementById('projTips').value = '';
  const versionEl = document.getElementById('projVersion');
  if (versionEl) versionEl.value = '';
  const passInput = document.getElementById('projPass');
  const passBtn = passInput?.parentElement.querySelector('.password-toggle-btn');
  if (passInput && passBtn) {
    passInput.type = 'password';
    passBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
  if (quillEditor) quillEditor.root.innerHTML = '';
  document.getElementById('addModal').style.display = 'flex';
  if (prefillUrl) document.getElementById('projUrl').value = prefillUrl;
  if (prefillName) document.getElementById('projName').value = prefillName;
  if (prefillDesc && quillEditor) quillEditor.clipboard.dangerouslyPasteHTML(prefillDesc);
  setTimeout(() => document.getElementById('projName').focus(), 80);
}
function hideAddModal() {
  document.getElementById('addModal').style.display = 'none';
  document.getElementById('screenshotSection').style.display = 'none';
  document.getElementById('screenshotList').innerHTML = '';
  // 编辑过程中如有删除截图/上传截图等"局部刷新"操作，关闭模态时统一同步外层列表
  if (window._webhubDirty) {
    window._webhubDirty = false;
    refresh();
  }
}

async function autoFetchMeta() {
  const url = document.getElementById('projUrl').value.trim();
  if (!url) { showToast('请先填 URL', 'error'); return; }
  showToast('正在抓取...');
  try {
    const res = await api(`${API}/metadata`, { method: 'POST', body: JSON.stringify({ url }) });
    const meta = res.data || {};
    if (meta.title && !document.getElementById('projName').value.trim()) {
      document.getElementById('projName').value = meta.title;
    }
    if (meta.description && quillEditor && !quillEditor.getText().trim()) {
      quillEditor.root.innerHTML = escapeHtml(meta.description);
    }
    showToast('自动填充完成');
  } catch (e) { showToast('抓取失败: ' + e.message, 'error'); }
}

function toggleEditPassword(btn) {
  const input = btn.parentElement.querySelector('input');
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.innerHTML = isPassword
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

function toggleDetailPassword(btn) {
  const span = btn.previousElementSibling;
  if (!span) return;
  const isHidden = span.dataset.hidden === 'true';
  if (isHidden) {
    span.textContent = span.dataset.password || '';
    span.dataset.hidden = 'false';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  } else {
    span.textContent = '••••••••';
    span.dataset.hidden = 'true';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

async function editProject(id) {
  const res = await api(`${API}/projects/${id}`);
  const p = res.data;
  document.getElementById('editId').value = p.id;
  document.getElementById('modalTitle').textContent = '编辑项目';
  document.getElementById('submitBtn').textContent = '更新';
  document.getElementById('projName').value = p.name;
  document.getElementById('projUrl').value = p.url;
  document.getElementById('projUser').value = p.username || '';
  document.getElementById('projPass').value = p.password || '';
  document.getElementById('projCategory').value = p.category || '';
  document.getElementById('projTags').value = (p.tags || []).join(', ');
  document.getElementById('projTips').value = p.tips || '';
  const versionEl2 = document.getElementById('projVersion');
  if (versionEl2) versionEl2.value = p.version || '';
  if (quillEditor) quillEditor.root.innerHTML = p.description || '';
  document.getElementById('addModal').style.display = 'flex';

  const screenshots = await api(`${API}/projects/${id}/screenshots`);
  const section = document.getElementById('screenshotSection');
  const list = document.getElementById('screenshotList');
  section.style.display = 'block';
  if (screenshots.data && screenshots.data.length > 0) {
    list.innerHTML = screenshots.data.map(s => `
      <div class="screenshot-item" id="ss-${s.id}">
        <img src="${escapeHtml(s.path)}" alt="截图">
        <span class="screenshot-badge">${s.thumbnail ? '主图' : ''}</span>
        <button type="button" class="screenshot-delete-btn" onclick="event.stopPropagation();event.preventDefault();deleteScreenshot(${s.id}, ${p.id})">✕</button>
      </div>
    `).join('');
  } else {
    list.innerHTML = `<div class="screenshot-paste-hint">📋 在此页面按 Ctrl+V 粘贴截图（最多4张）</div>`;
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const tagsRaw = document.getElementById('projTags').value || '';
  const body = {
    name: document.getElementById('projName').value.trim(),
    url: document.getElementById('projUrl').value.trim(),
    username: document.getElementById('projUser').value.trim(),
    password: document.getElementById('projPass').value,
    category: document.getElementById('projCategory').value.trim() || '默认',
    tips: document.getElementById('projTips').value.trim(),
    version: (document.getElementById('projVersion')?.value || '').trim(),
    description: quillEditor ? quillEditor.root.innerHTML : '',
    tags: tagsRaw.split(/[,，;；\s]+/).map(s => s.trim()).filter(Boolean),
    user_name: userName,
    fetch_metadata: !id
  };
  if (id) {
    await api(`${API}/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    showToast('项目已更新');
  } else {
    await api(`${API}/projects`, { method: 'POST', body: JSON.stringify(body) });
    showToast('项目已添加');
  }
  hideAddModal();
  refresh();
}

async function deleteProject(id) {
  const p = projects.find(x => x.id === id);
  const tip = p ? `确认删除「${p.name}」？` : '确定要删除此项目吗？';
  if (!confirm(tip)) return;
  await api(`${API}/projects/${id}`, { method: 'DELETE' });
  showToast('项目已删除');
  refresh();
}

// ============ 批量添加 ============
function showBatchModal() {
  document.getElementById('batchUrls').value = '';
  document.getElementById('batchCategory').value = '';
  document.getElementById('batchResult').innerHTML = '';
  document.getElementById('batchModal').style.display = 'flex';
  setTimeout(() => document.getElementById('batchUrls').focus(), 80);
}
function hideBatchModal() { document.getElementById('batchModal').style.display = 'none'; }

async function submitBatch() {
  const urls = document.getElementById('batchUrls').value.trim()
    .split(/\s+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s));
  if (urls.length === 0) { showToast('未找到有效 URL', 'error'); return; }

  const category = document.getElementById('batchCategory').value.trim();
  const btn = document.getElementById('batchSubmitBtn');
  btn.disabled = true; btn.textContent = `正在抓取 ${urls.length} 个...`;

  try {
    const res = await api(`${API}/projects/batch`, {
      method: 'POST',
      body: JSON.stringify({ urls, category: category || '默认', user_name: userName })
    });
    const items = res.data || [];
    const ok = items.filter(i => i.success).length;
    const fail = items.length - ok;
    document.getElementById('batchResult').innerHTML = `
      <div class="batch-summary">✅ 成功 ${ok} 个 · ❌ 失败 ${fail} 个</div>
      <div class="batch-list">
        ${items.map(i => `
          <div class="batch-item ${i.success ? 'ok' : 'fail'}">
            ${i.success ? '✓' : '✗'} ${escapeHtml(i.name || i.url)}
            ${!i.success ? `<span class="batch-msg">${escapeHtml(i.message || '失败')}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
    showToast(`批量导入：成功 ${ok}，失败 ${fail}`);
    refresh();
  } catch (e) {
    showToast('批量导入失败: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '开始导入';
  }
}

async function refreshScreenshotList(projectId) {
  const screenshots = await api(`${API}/projects/${projectId}/screenshots`);
  const section = document.getElementById('screenshotSection');
  const list = document.getElementById('screenshotList');
  section.style.display = 'block';
  if (screenshots.data && screenshots.data.length > 0) {
    list.innerHTML = screenshots.data.map(s => `
      <div class="screenshot-item" id="ss-${s.id}">
        <img src="${escapeHtml(s.path)}" alt="截图">
        <span class="screenshot-badge">${s.thumbnail ? '主图' : ''}</span>
        <button class="screenshot-delete-btn" onclick="event.stopPropagation();deleteScreenshot(${s.id}, ${projectId})">✕</button>
      </div>
    `).join('');
  } else {
    list.innerHTML = `<div class="screenshot-paste-hint">📋 在此页面按 Ctrl+V 粘贴截图（最多4张）</div>`;
  }
}

async function deleteScreenshot(screenshotId, projectId) {
  if (!confirm('确定要删除此截图吗？')) return;
  try {
    await api(`${API}/projects/${projectId}/screenshot/${screenshotId}`, { method: 'DELETE' });
    showToast('截图已删除');
    // 关键：编辑模态保持打开，只刷新当前模态内的截图列表
    // 直接 DOM 移除目标项，避免重拉 API 触发任何副作用
    const item = document.getElementById(`ss-${screenshotId}`);
    if (item) item.remove();
    // 若全部删完则显示粘贴提示
    const list = document.getElementById('screenshotList');
    if (list && !list.querySelector('.screenshot-item')) {
      list.innerHTML = `<div class="screenshot-paste-hint">📋 在此页面按 Ctrl+V 粘贴截图（最多4张）</div>`;
    }
    // 同步更新本地卡片的 screenshot_count，不重渲染整个网格、不动模态
    const p = projects.find(x => x.id === projectId);
    if (p && p.screenshot_count > 0) p.screenshot_count -= 1;
    // 标记一次"懒刷新"——下次关闭模态时再同步外层列表
    window._webhubDirty = true;
  } catch (e) {
    showToast('删除失败: ' + (e.message || '未知错误'), 'error');
  }
}

// ============ 详情 ============
function showDetailModal(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  document.getElementById('detailTitle').textContent = p.name;
  const tagsHtml = (p.tags || []).map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join(' ') || '-';
  const health = p.health_status === 'online' ? '<span style="color:#16a34a">● 正常</span>'
              : p.health_status === 'offline' ? '<span style="color:#dc2626">● 不可达</span>'
              : '<span style="color:#94a3b8">○ 未检测</span>';
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-row"><span class="detail-label">名称</span><span class="detail-value">${escapeHtml(p.name)}</span></div>
    <div class="detail-row"><span class="detail-label">地址</span><span class="detail-value"><a href="${escapeHtml(p.url)}" target="_blank" style="color:var(--primary)">${escapeHtml(p.url)}</a></span></div>
    <div class="detail-row"><span class="detail-label">健康状态</span><span class="detail-value">${health} <button class="mini-btn" onclick="manualHealthCheck(${p.id})">检测</button></span></div>
    <div class="detail-row"><span class="detail-label">分类</span><span class="detail-value">${p.category ? escapeHtml(p.category) : '-'}</span></div>
    <div class="detail-row"><span class="detail-label">版本</span><span class="detail-value">${p.version ? `<span class="card-version-badge">${escapeHtml(p.version)}</span>` : '-'}</span></div>
    <div class="detail-row"><span class="detail-label">标签</span><span class="detail-value">${tagsHtml}</span></div>
    ${p.tips ? `<div class="detail-row"><span class="detail-label">小贴士</span><span class="detail-value" style="color:#b45309">💡 ${escapeHtml(p.tips)}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">用户名</span><span class="detail-value">${p.username ? escapeHtml(p.username) : '-'}</span></div>
    <div class="detail-row"><span class="detail-label">密码</span><span class="detail-value" style="display:flex;align-items:center;gap:8px;"><span data-hidden="true" data-password="${escapeHtml(p.password || '')}">${p.password ? '••••••••' : '-'}</span>${p.password ? `<button class="password-toggle-btn" onclick="toggleDetailPassword(this)" title="显示/隐藏"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>` : ''}</span></div>
    <div class="detail-row" style="flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span class="detail-label" style="width: 100%; margin-bottom: 8px;">描述</span>
      <div class="detail-value rich-text" style="width: 100%;">${p.description || '-'}</div>
    </div>
    <div class="detail-row"><span class="detail-label">访问次数</span><span class="detail-value"><b>${p.click_count || 0}</b> 次</span></div>
    <div class="detail-row"><span class="detail-label">添加者</span><span class="detail-value">${p.created_by ? escapeHtml(p.created_by) : '匿名'} · ${formatTime(p.created_at)}</span></div>
    ${p.updated_by && p.updated_by !== p.created_by ? `<div class="detail-row"><span class="detail-label">最近修改</span><span class="detail-value">${escapeHtml(p.updated_by)} · ${formatTime(p.updated_at)}</span></div>` : ''}
    <div class="detail-actions">
      <button class="btn btn-primary" onclick="hideDetailModal();openProject(${p.id})">打开项目</button>
      <button class="btn btn-ghost" onclick="hideDetailModal();showQrModal(${p.id})">📱 二维码</button>
      <button class="btn btn-ghost" onclick="hideDetailModal();editProject(${p.id})">编辑</button>
      <button class="btn btn-danger" onclick="hideDetailModal();deleteProject(${p.id})">删除</button>
    </div>
  `;
  document.getElementById('detailModal').style.display = 'flex';
}
function hideDetailModal() { document.getElementById('detailModal').style.display = 'none'; }

async function manualHealthCheck(id) {
  showToast('检测中...');
  try {
    const res = await fetch(`${API}/health-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.data.status === 'online' ? `✅ 在线 (HTTP ${data.data.http})` : `❌ 不可达 (HTTP ${data.data.http})`);
      refresh();
      const p = projects.find(x => x.id === id);
      if (p && document.getElementById('detailModal').style.display !== 'none') {
        p.health_status = data.data.status;
        showDetailModal(id);
      }
    }
  } catch (e) { showToast('检测失败', 'error'); }
}

// ============ QR 码 ============
function showQrModal(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  document.getElementById('qrName').textContent = p.name;
  document.getElementById('qrUrl').textContent = p.url;
  const canvas = document.getElementById('qrCanvas');
  canvas.innerHTML = '';
  if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
    const canvasEl = document.createElement('canvas');
    canvas.appendChild(canvasEl);
    QRCode.toCanvas(canvasEl, p.url, { width: 280, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
  } else {
    canvas.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(p.url)}" alt="QR">`;
  }
  document.getElementById('qrModal').style.display = 'flex';
}
function hideQrModal() { document.getElementById('qrModal').style.display = 'none'; }

// ============ 搜索 ============
let searchTimer;
function handleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProjects, 200);
}

// ============ 刷新 ============
async function refresh() {
  await Promise.all([loadTeamInfo(), loadProjects(), loadStats(), loadCategories(), loadTags(), loadHot(), loadActivity()]);
}

// ============ Toast ============
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ============ Lightbox ============
function initLightbox() {
  const grid = document.getElementById('projectsGrid');
  let currentCardPreview = null;
  let currentSrc = null;
  let lightboxTimer = null;

  function showLightbox(src) {
    if (!src || src === currentSrc) return;
    currentSrc = src;
    const img = document.getElementById('lightboxImg');
    const overlay = document.getElementById('lightboxOverlay');
    img.src = src;
    overlay.style.display = 'flex';
  }

  function hideLightbox() {
    document.getElementById('lightboxOverlay').style.display = 'none';
    currentSrc = null;
  }

  grid.addEventListener('mouseover', function(e) {
    const cardPreview = e.target.closest('.card-preview');
    if (!cardPreview) return;

    // 鼠标所在的具体那张缩略图
    const hoveredImg = e.target.closest('[data-lightbox]');
    const src = hoveredImg ? hoveredImg.getAttribute('data-lightbox') : null;

    if (cardPreview !== currentCardPreview) {
      // 切换到新卡片：延迟 400ms 展示，避免一划而过就弹
      clearTimeout(lightboxTimer);
      currentCardPreview = cardPreview;
      const firstImg = cardPreview.querySelector('[data-lightbox]');
      if (!firstImg) return;
      const targetSrc = src || firstImg.getAttribute('data-lightbox');
      lightboxTimer = setTimeout(() => {
        if (currentCardPreview === cardPreview) showLightbox(targetSrc);
      }, 400);
    } else if (src && document.getElementById('lightboxOverlay').style.display === 'flex') {
      // 同一卡片内移动到另一张缩略图：立即切换，无延迟
      showLightbox(src);
    }
  });

  grid.addEventListener('mouseout', function(e) {
    const cardPreview = e.target.closest('.card-preview');
    if (!cardPreview) return;
    if (!cardPreview.contains(e.relatedTarget)) {
      clearTimeout(lightboxTimer);
      currentCardPreview = null;
      hideLightbox();
    }
  });
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || '';
  return text.trim().substring(0, 100);
}
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts.includes('T') ? ts : ts + 'Z');
  const now = new Date();
  const diff = now - d;
  if (diff < 0) return '刚刚';
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前';
  return d.toLocaleDateString('zh-CN');
}

// ============ 键盘快捷键 ============
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      hideAddModal(); hideDetailModal(); hideIframe();
      hideBatchModal(); hideQrModal(); hideUserModal();
      document.getElementById('lightboxOverlay').style.display = 'none';
      document.getElementById('shortcutHelp').classList.remove('show');
      return;
    }
    const inInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
    const modalOpen = ['addModal','batchModal','detailModal','qrModal','userModal']
      .some(id => document.getElementById(id).style.display === 'flex');
    if (inInput || modalOpen) return;

    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    } else if (e.key.toLowerCase() === 'g') {
      const order = ['grid', 'list', 'compact'];
      const next = order[(order.indexOf(currentView) + 1) % order.length];
      setView(next);
      showToast(`视图：${next === 'grid' ? '网格' : next === 'list' ? '列表' : '紧凑'}`);
    } else if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      showAddModal();
    } else if (e.key === '?') {
      const help = document.getElementById('shortcutHelp');
      help.classList.toggle('show');
    } else if (/^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key);
      const all = ['全部', ...categories];
      if (all[idx]) selectCategory(all[idx]);
    } else if (e.key === '0') {
      selectCategory('全部');
    }
  });
}

// ============ 拖拽导入 ============
(function initDragDrop() {
  var dragCounter = 0;
  var overlay = document.getElementById('dragOverlay');
  function prevent(e) { e.preventDefault(); e.stopPropagation(); }
  document.addEventListener('dragenter', function(e) {
    prevent(e); dragCounter++;
    if (overlay) overlay.classList.add('active');
  }, false);
  document.addEventListener('dragover', function(e) {
    prevent(e);
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, false);
  document.addEventListener('dragleave', function(e) {
    prevent(e); dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; if (overlay) overlay.classList.remove('active'); }
  }, false);
  document.addEventListener('drop', function(e) {
    prevent(e); dragCounter = 0;
    if (overlay) overlay.classList.remove('active');
    if (!e.dataTransfer) return;
    var rawData = '';
    try { rawData = e.dataTransfer.getData('URL'); } catch(ex) {}
    if (!rawData) try { rawData = e.dataTransfer.getData('text/uri-list'); } catch(ex) {}
    if (!rawData) try { rawData = e.dataTransfer.getData('text/plain'); } catch(ex) {}
    if (!rawData || !rawData.trim()) return;
    var lines = rawData.trim().split('\n');
    var foundUrl = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.match(/^https?:\/\//i)) { foundUrl = line; break; }
    }
    if (!foundUrl) return;
    try {
      var urlObj = new URL(foundUrl);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return;
      var name = urlObj.hostname.replace(/^www\./, '');
      showAddModal(urlObj.href, name, '');
      showToast('已识别拖拽链接，请补充信息后保存');
    } catch(ex) {}
  }, false);
})();

// ============ 粘贴图片 ============
document.addEventListener('paste', function(e) {
  const addModal = document.getElementById('addModal');
  if (!addModal || addModal.style.display === 'none') return;
  const editId = document.getElementById('editId').value;
  if (!editId) return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') === -1) continue;
    const file = items[i].getAsFile();
    if (!file) continue;
    e.preventDefault();
    const count = document.querySelectorAll('.screenshot-item').length;
    if (count >= 4) { showToast('最多支持 4 张截图', 'error'); return; }
    const formData = new FormData();
    formData.append('screenshot', file, `paste-${Date.now()}.png`);
    fetch(`${API}/projects/${editId}/screenshot-upload`, { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.success) { showToast('截图已粘贴上传'); refreshScreenshotList(parseInt(editId)); refresh(); }
        else { showToast(data.message || '上传失败', 'error'); }
      })
      .catch(() => showToast('上传请求失败', 'error'));
    break;
  }
});

// ============ 启动 ============
refresh();

// 首次访问引导设置昵称
setTimeout(() => {
  if (!userName) {
    showToast('💡 提示：点击右上角设置昵称，让团队知道是谁加的工具', 'success');
  }
}, 2000);
