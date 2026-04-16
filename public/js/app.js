let projects = [];
let categories = [];
let currentCategory = '全部';
let currentView = 'grid';
let currentIframeUrl = '';
let currentProjectId = null;
let currentProjectScreenshots = [];
let quillEditor = null;

const API = '/api';

// Initialize Quill editor when DOM is loaded
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
});

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
      previewHtml = `<img src="${escapeHtml(paths[0] || p.thumbnail)}" alt="${escapeHtml(p.name)}预览" loading="lazy" class="card-preview-img" data-lightbox="${escapeHtml(paths[0] || p.thumbnail)}">`;
    } else {
      const badge = count < 4 ? `<span class="screenshot-badge">${count}/4</span>` : `<span class="screenshot-badge full">满载</span>`;
      const imgs = paths.slice(0, 4).map(s =>
        `<img src="${escapeHtml(s)}" data-lightbox="${escapeHtml(s)}">`
      ).join('');
      previewHtml = `
        <div class="card-preview-grid">
          ${imgs}
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
        <div class="card-info-row">
          <span class="card-info-label">地址:</span>
          <span class="card-url" title="${escapeHtml(p.url)}">${escapeHtml(p.url)}</span>
        </div>
        ${p.description ? `
        <div class="card-info-row">
          <span class="card-info-label">描述:</span>
          <span class="card-desc" title="${escapeHtml(stripHtml(p.description))}">${stripHtml(p.description)}</span>
        </div>` : ''}
        <div class="card-footer">
          <span class="card-time">${formatTime(p.created_at)}</span>
          <div class="card-actions">
            <button class="card-action-btn" onclick="event.stopPropagation();window.open('${escapeHtml(p.url)}', '_blank')" title="外部打开">外部打开</button>
            <button class="card-action-btn" onclick="event.stopPropagation();showDetailModal(${p.id})" title="详情">详情</button>
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

  // 直接在新标签页打开，避免 iframe 嵌套限制
  window.open(p.url, '_blank');

  fetch(`${API}/projects/${id}/open`).catch(() => {});

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

function showAddModal(prefillUrl, prefillName, prefillDesc) {
  document.getElementById('editId').value = '';
  document.getElementById('modalTitle').textContent = '新增项目';
  document.getElementById('submitBtn').textContent = '保存';
  document.getElementById('projectForm').reset();
  if (quillEditor) {
    quillEditor.root.innerHTML = '';
  }
  document.getElementById('addModal').style.display = 'flex';

  // 支持预填充（拖拽导入时使用）
  if (prefillUrl) document.getElementById('projUrl').value = prefillUrl;
  if (prefillName) document.getElementById('projName').value = prefillName;
  if (prefillDesc && quillEditor) {
    quillEditor.clipboard.dangerouslyPasteHTML(prefillDesc);
  }
}

function hideAddModal() {
  document.getElementById('addModal').style.display = 'none';
  document.getElementById('screenshotSection').style.display = 'none';
  document.getElementById('screenshotList').innerHTML = '';
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
  if (quillEditor) {
    quillEditor.root.innerHTML = p.description || '';
  }
  document.getElementById('addModal').style.display = 'flex';

  // Load screenshots
  const screenshots = await api(`${API}/projects/${id}/screenshots`);
  const section = document.getElementById('screenshotSection');
  const list = document.getElementById('screenshotList');
  if (screenshots.data && screenshots.data.length > 0) {
    section.style.display = 'block';
    list.innerHTML = screenshots.data.map(s => `
      <div class="screenshot-item" id="ss-${s.id}">
        <img src="${escapeHtml(s.path)}" alt="截图">
        <span class="screenshot-badge">${s.thumbnail ? '主图' : ''}</span>
        <button class="screenshot-delete-btn" onclick="deleteScreenshot(${s.id}, ${p.id})" title="删除截图">✕</button>
      </div>
    `).join('');
  } else {
    section.style.display = 'none';
  }
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
    description: quillEditor ? quillEditor.root.innerHTML : '',
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

async function deleteScreenshot(screenshotId, projectId) {
  if (!confirm('确定要删除此截图吗？')) return;
  await api(`${API}/projects/${projectId}/screenshot/${screenshotId}`, { method: 'DELETE' });
  showToast('截图已删除');
  // Refresh screenshot list
  const screenshots = await api(`${API}/projects/${projectId}/screenshots`);
  const section = document.getElementById('screenshotSection');
  const list = document.getElementById('screenshotList');
  if (screenshots.data && screenshots.data.length > 0) {
    list.innerHTML = screenshots.data.map(s => `
      <div class="screenshot-item" id="ss-${s.id}">
        <img src="${escapeHtml(s.path)}" alt="截图">
        <span class="screenshot-badge">${s.thumbnail ? '主图' : ''}</span>
        <button class="screenshot-delete-btn" onclick="deleteScreenshot(${s.id}, ${projectId})" title="删除截图">✕</button>
      </div>
    `).join('');
  } else {
    section.style.display = 'none';
  }
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
    <div class="detail-row" style="flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span class="detail-label" style="width: 100%; margin-bottom: 8px;">描述</span>
      <div class="detail-value rich-text" style="width: 100%;">${p.description || '-'}</div>
    </div>
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

// ============ 预览大图 (Lightbox) ============

function initLightbox() {
  const grid = document.getElementById('projectsGrid');
  let currentCardPreview = null;
  
  // 使用 mouseover/mouseout 进行事件委托
  grid.addEventListener('mouseover', function(e) {
    // 从事件目标向上查找 .card-preview 容器
    const cardPreview = e.target.closest('.card-preview');
    
    // 如果进入了一个新的 card-preview
    if (cardPreview && cardPreview !== currentCardPreview) {
      currentCardPreview = cardPreview;
      
      // 查找当前卡片内的所有带 data-lightbox 的图片
      const lightboxImgs = cardPreview.querySelectorAll('[data-lightbox]');
      if (lightboxImgs.length === 0) return;
      
      // 如果是单张图片，直接显示
      if (lightboxImgs.length === 1) {
        const src = lightboxImgs[0].getAttribute('data-lightbox');
        if (src) {
          document.getElementById('lightboxImg').src = src;
          document.getElementById('lightboxOverlay').style.display = 'flex';
        }
      } else {
        // 多张图片时，显示第一张（或可以根据需求调整）
        const firstSrc = lightboxImgs[0].getAttribute('data-lightbox');
        if (firstSrc) {
          document.getElementById('lightboxImg').src = firstSrc;
          document.getElementById('lightboxOverlay').style.display = 'flex';
        }
      }
    }
  });

  grid.addEventListener('mouseout', function(e) {
    const cardPreview = e.target.closest('.card-preview');
    if (!cardPreview) return;
    
    // 检查鼠标是否真的离开了 card-preview 区域
    const relatedTarget = e.relatedTarget;
    if (!cardPreview.contains(relatedTarget)) {
      currentCardPreview = null;
      document.getElementById('lightboxOverlay').style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLightbox();
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 从HTML字符串中提取纯文本
function stripHtml(html) {
  if (!html) return '';
  // 创建一个临时div元素来解析HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // 获取纯文本内容
  const text = tmp.textContent || tmp.innerText || '';
  // 去除多余空白并限制长度
  return text.trim().substring(0, 100);
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

// ============ 键盘快捷键 ============
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    hideAddModal();
    hideDetailModal();
    hideIframe();
    document.getElementById('lightboxOverlay').style.display = 'none';
  }
});

// ============ 拖拽导入网页功能 ============
(function initDragDrop() {
  var dragCounter = 0;
  var overlay = document.getElementById('dragOverlay');

  // 阻止浏览器默认拖拽行为（打开链接）
  function prevent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  document.addEventListener('dragenter', function(e) {
    prevent(e);
    dragCounter++;
    if (overlay) overlay.classList.add('active');
  }, false);

  document.addEventListener('dragover', function(e) {
    prevent(e);
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, false);

  document.addEventListener('dragleave', function(e) {
    prevent(e);
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (overlay) overlay.classList.remove('active');
    }
  }, false);

  document.addEventListener('drop', function(e) {
    prevent(e);
    dragCounter = 0;
    if (overlay) overlay.classList.remove('active');

    if (!e.dataTransfer) return;

    // 尝试多种方式获取拖拽的URL
    var rawData = '';
    try { rawData = e.dataTransfer.getData('URL'); } catch(ex) {}
    if (!rawData) try { rawData = e.dataTransfer.getData('text/uri-list'); } catch(ex) {}
    if (!rawData) try { rawData = e.dataTransfer.getData('text/plain'); } catch(ex) {}
    if (!rawData) try { rawData = e.dataTransfer.getData('text'); } catch(ex) {}

    if (!rawData || !rawData.trim()) return;

    // 从数据中提取URL
    var lines = rawData.trim().split('\n');
    var foundUrl = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.match(/^https?:\/\//i)) {
        foundUrl = line;
        break;
      }
    }

    if (!foundUrl) return;

    try {
      var urlObj = new URL(foundUrl);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return;

      var name = urlObj.hostname.replace(/^www\./, '');
      showAddModal(urlObj.href, name, '');
      showToast('已识别拖拽链接，请补充信息后保存');
    } catch(ex) {
      // 不是有效URL，忽略
    }
  }, false);
})();

// ============ 启动 ============
refresh();
