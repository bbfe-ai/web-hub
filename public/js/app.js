let projects = [];
let categories = [];
let currentCategory = '全部';
let currentView = 'grid';
let currentIframeUrl = '';
let currentProjectId = null;
let currentProjectScreenshots = [];

const API = '/api';

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '请求失败');
  return data;
}

async function loadProjects() {
  const keyword = document.getElementById('searchInput').value.trim();
  const params = new URLSearchParams();
  if (currentCategory !== '全部') params.set('category', currentCategory);
  if (keyword) params.set('keyword', keyword);

  const res = await api(`${API}/projects?${params}`);
  projects = res.data;
  // Ensure screenshot_count field exists
  projects.forEach(p => {
    if (p.screenshot_count === undefined) p.screenshot_count = 0;
  });
  renderProjects();
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

async function loadProjectScreenshots(id) {
  try {
    const res = await api(`${API}/projects/${id}/screenshots`);
    return res.data;
  } catch {
    return [];
  }
}

function renderStats(stats) {
  const bar = document.getElementById('statsBar');
  let html = `
    <div class="stat-item"><span class="stat-value">${stats.total}</span><span class="stat-label">项目总数</span></div>
  `;
  stats.categories.forEach(c => {
    html += `<div class="stat-item"><span class="stat-value">${c.count}</span><span class="stat-label">${c.category}</span></div>`;
  });
  bar.innerHTML = html;
}

function renderCategories() {
  const tabs = document.getElementById('categoryTabs');
  const all = ['全部', ...categories];
  const datalist = document.getElementById('categoryList');
  datalist.innerHTML = categories.map(c => `<option value="${c}">`).join('');
  tabs.innerHTML = all.map(c =>
    `<button class="cat-tab ${c === currentCategory ? 'active' : ''}" onclick="selectCategory('${c}')">${c}</button>`
  ).join('');
}

function selectCategory(cat) {
  currentCategory = cat;
  loadProjects();
  renderCategories();
}

function setView(view) {
  currentView = view;
  const grid = document.getElementById('projectsGrid');
  grid.classList.toggle('list-view', view === 'list');
  document.getElementById('gridBtn').classList.toggle('active', view === 'grid');
  document.getElementById('listBtn').classList.toggle('active', view === 'list');
}

function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  const empty = document.getElementById('emptyState');

  if (projects.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';

  grid.innerHTML = projects.map(p => {
    const count = p.screenshot_count || 0;
    const paths = p.screenshot_paths ? p.screenshot_paths.split(',') : [];
    let previewHtml = '';

    if (count === 0) {
      previewHtml = `
        <div class="card-preview-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          <span>暂无预览</span>
        </div>`;
    } else if (count === 1) {
      previewHtml = `<img src="${escapeHtml(paths[0] || p.thumbnail)}" alt="${escapeHtml(p.name)}预览" loading="lazy" class="card-preview-img">`;
    } else {
      const badge = count < 4 ? `<span class="screenshot-badge">${count}/4</span>` : `<span class="screenshot-badge full">满载</span>`;
      previewHtml = `
        <div class="card-preview-grid">
          ${paths.slice(0, 4).map(s => `<img src="${escapeHtml(s)}">`).join('')}
          ${badge}
        </div>`;
    }

    return `
    <div class="project-card" onclick="openProject(${p.id})">
      <div class="card-preview">
        ${previewHtml}
        <div class="card-preview-overlay">
          <div class="card-preview-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-header">
          <span class="card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          ${p.category ? `<span class="card-category">${escapeHtml(p.category)}</span>` : ''}
        </div>
        <div class="card-url" title="${escapeHtml(p.url)}">${escapeHtml(p.url)}</div>
        ${p.description ? `<div class="card-desc">${escapeHtml(p.description)}</div>` : '<div class="card-desc"></div>'}
        <div class="card-footer">
          <span class="card-time">${formatTime(p.created_at)}</span>
          <div class="card-actions">
            <button class="card-action-btn" onclick="event.stopPropagation();editProject(${p.id})" title="编辑">编辑</button>
            <button class="card-action-btn danger" onclick="event.stopPropagation();deleteProject(${p.id})" title="删除">删除</button>
          </div>
        </div>
      </div>
    </div>
  `}).join('');
}

async function openProject(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;

  currentProjectId = p.id;
  currentIframeUrl = p.url;
  document.getElementById('iframeName').textContent = p.name;
  document.getElementById('iframeUrl').textContent = p.url;
  document.getElementById('projectIframe').src = p.url;
  updateScreenshotBtn(p);
  document.getElementById('iframeOverlay').style.display = 'flex';

  // Auto screenshot on first open only (server handles check)
  fetch(`${API}/projects/${id}/open`).catch(() => {});

  // Poll for screenshot to refresh card (check every 2s for up to 12s)
  let polls = 0;
  const pollInterval = setInterval(async () => {
    polls++;
    try {
      const updated = await api(`${API}/projects`);
      const proj = updated.data.find(x => x.id === id);
      if (proj && proj.screenshot_count > (p.screenshot_count || 0)) {
        p.screenshot_count = proj.screenshot_count;
        p.screenshot_paths = proj.screenshot_paths;
        p.thumbnail = proj.thumbnail;
        renderProjects();
        clearInterval(pollInterval);
      }
    } catch { /* ignore */ }
    if (polls >= 6) clearInterval(pollInterval);
  }, 2000);
}

function updateScreenshotBtn(p) {
  const btn = document.getElementById('screenCapBtn');
  const count = p.screenshot_count || 0;
  const icon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
  if (count >= 4) {
    btn.disabled = true;
    btn.classList.add('btn-disabled');
    btn.innerHTML = `${icon} 满载`;
    btn.title = '已达最大截图数量 (4张)';
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-disabled');
    btn.innerHTML = `${icon} 截图`;
    btn.title = `截图 (当前 ${count}/4)`;
  }
}

async function capturePageScreenshot() {
  if (!currentProjectId) return;
  const btn = document.getElementById('screenCapBtn');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '截图中...';

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
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  } catch (e) {
    showToast('截图请求失败', 'error');
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
}

function hideIframe() {
  document.getElementById('iframeOverlay').style.display = 'none';
  document.getElementById('projectIframe').src = 'about:blank';
  currentIframeUrl = '';
  currentProjectId = null;
  loadProjects();
}

function openInNewTab() {
  if (currentIframeUrl) window.open(currentIframeUrl, '_blank');
}

function showAddModal() {
  document.getElementById('editId').value = '';
  document.getElementById('modalTitle').textContent = '新增项目';
  document.getElementById('submitBtn').textContent = '保存';
  document.getElementById('projectForm').reset();
  document.getElementById('addModal').style.display = 'flex';
}

function hideAddModal() {
  document.getElementById('addModal').style.display = 'none';
}

async function editProject(id) {
  const res = await api(`${API}/projects/${id}`);
  const p = res.data;
  document.getElementById('editId').value = p.id;
  document.getElementById('modalTitle').textContent = '编辑项目';
  document.getElementById('submitBtn').textContent = '更新';
  document.getElementById('projName').value = p.name;
  document.getElementById('projUrl').value = p.url;
  document.getElementById('projUser').value = p.username;
  document.getElementById('projPass').value = p.password;
  document.getElementById('projCategory').value = p.category;
  document.getElementById('projDesc').value = p.description;
  document.getElementById('addModal').style.display = 'flex';
}

async function handleSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const body = {
    name: document.getElementById('projName').value.trim(),
    url: document.getElementById('projUrl').value.trim(),
    username: document.getElementById('projUser').value.trim(),
    password: document.getElementById('projPass').value,
    category: document.getElementById('projCategory').value.trim() || '默认',
    description: document.getElementById('projDesc').value.trim(),
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
  if (!confirm('确定要删除此项目吗？')) return;
  await api(`${API}/projects/${id}`, { method: 'DELETE' });
  showToast('项目已删除');
  refresh();
}

function showDetailModal(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  document.getElementById('detailTitle').textContent = p.name;
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-row"><span class="detail-label">名称</span><span class="detail-value">${escapeHtml(p.name)}</span></div>
    <div class="detail-row"><span class="detail-label">地址</span><span class="detail-value"><a href="${escapeHtml(p.url)}" target="_blank" style="color:var(--primary)">${escapeHtml(p.url)}</a></span></div>
    <div class="detail-row"><span class="detail-label">用户名</span><span class="detail-value">${p.username ? escapeHtml(p.username) : '-'}</span></div>
    <div class="detail-row"><span class="detail-label">密码</span><span class="detail-value">${p.password ? '••••••••' : '-'}</span></div>
    <div class="detail-row"><span class="detail-label">分类</span><span class="detail-value">${p.category ? escapeHtml(p.category) : '-'}</span></div>
    <div class="detail-row"><span class="detail-label">描述</span><span class="detail-value">${p.description ? escapeHtml(p.description) : '-'}</span></div>
    <div class="detail-row"><span class="detail-label">创建时间</span><span class="detail-value">${formatTime(p.created_at)}</span></div>
    <div class="detail-actions">
      <button class="btn btn-primary" onclick="hideDetailModal();openProject(${p.id})">打开项目</button>
      <button class="btn btn-ghost" onclick="hideDetailModal();editProject(${p.id})">编辑</button>
      <button class="btn btn-danger" onclick="hideDetailModal();deleteProject(${p.id})">删除</button>
    </div>
  `;
  document.getElementById('detailModal').style.display = 'flex';
}

function hideDetailModal() {
  document.getElementById('detailModal').style.display = 'none';
}

let searchTimer;
function handleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProjects, 300);
}

async function refresh() {
  await Promise.all([loadProjects(), loadStats(), loadCategories()]);
}

function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts + 'Z');
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前';
  return d.toLocaleDateString('zh-CN');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    hideAddModal();
    hideDetailModal();
    hideIframe();
  }
});

let dragCounter = 0;
const dragOverlay = document.getElementById('dragOverlay');

document.addEventListener('dragenter', e => {
  e.preventDefault();
  dragCounter++;
  if (dragOverlay) dragOverlay.style.display = 'flex';
});

document.addEventListener('dragover', e => {
  e.preventDefault();
});

document.addEventListener('dragleave', e => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0 && dragOverlay) {
    dragOverlay.style.display = 'none';
  }
});

document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  if (dragOverlay) dragOverlay.style.display = 'none';
  console.log('Drop event triggered:', e.dataTransfer);
  const data = e.dataTransfer.getData('URL') || e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
  console.log('Extracted drag data:', data);
  if (data) {
    try {
      const url = new URL(data);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        showAddModal();
        document.getElementById('projUrl').value = url.href;
        document.getElementById('projName').value = url.hostname;
        showToast('已解析拖拽链接');
      }
    } catch (err) {
      console.warn('拖拽的数据不是有效的URL:', data);
    }
  }
});

refresh();
