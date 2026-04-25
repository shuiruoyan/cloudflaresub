const TOKEN_KEY = 'sub_access_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

function smoothScrollToElement(element, duration = 900) {
  const startY = window.scrollY;
  const targetY = element.getBoundingClientRect().top + window.scrollY - 24;
  const distance = targetY - startY;
  const startTime = performance.now();

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function scroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutCubic(progress);
    window.scrollTo(0, startY + distance * easedProgress);
    if (progress < 1) {
      requestAnimationFrame(scroll);
    }
  }

  requestAnimationFrame(scroll);
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');

    msgEl.textContent = message;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    const cleanup = () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    };

    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    okBtn.addEventListener('click', onOk, { once: true });
    cancelBtn.addEventListener('click', onCancel, { once: true });
    const backdrop = modal.querySelector('[data-close-modal="true"]');
    backdrop.addEventListener('click', onCancel, { once: true });
  });
}

function showLogin(errorMsg) {
  const overlay = document.getElementById('loginOverlay');
  const errorBox = document.getElementById('loginError');
  overlay.classList.remove('hidden');
  if (errorMsg) {
    errorBox.textContent = errorMsg;
    errorBox.classList.remove('hidden');
  }
}

function hideLogin() {
  document.getElementById('loginOverlay').classList.add('hidden');
  document.getElementById('loginError').classList.add('hidden');
}

// API helper
async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'x-sub-token': getToken(),
      ...opts.headers,
    },
  });
  if (res.status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    showLogin('登录已过期，请重新输入令牌');
    throw new Error('登录已过期');
  }
  return res;
}

// DOM refs
const submitBtn = document.getElementById('submitBtn');
const rotateUrlBtn = document.getElementById('rotateUrlBtn');
const logoutBtn = document.getElementById('logoutBtn');
const resultSection = document.getElementById('resultSection');
const warningBox = document.getElementById('warningBox');
const previewBody = document.getElementById('previewBody');
const emptyState = document.getElementById('emptyState');
const urlStatus = document.getElementById('urlStatus');
const fixedIdDisplay = document.getElementById('fixedIdDisplay');

const autoUrl = document.getElementById('autoUrl');
const rawUrl = document.getElementById('rawUrl');
const clashUrl = document.getElementById('clashUrl');
const surgeUrl = document.getElementById('surgeUrl');

const qrModal = document.getElementById('qrModal');
const qrCanvas = document.getElementById('qrCanvas');
const qrText = document.getElementById('qrText');
const closeQrModal = document.getElementById('closeQrModal');

const nodeLinks = document.getElementById('nodeLinks');
const preferredIps = document.getElementById('preferredIps');
const namePrefixInput = document.getElementById('namePrefix');
const keepOriginalHost = document.getElementById('keepOriginalHost');
const statsBar = document.getElementById('statsBar');
const urlGenerator = document.getElementById('urlGenerator');
const previewSection = document.getElementById('previewSection');
const rocketUrl = document.getElementById('rocketUrl');
const activeUrl = document.getElementById('activeUrl');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const statInputNodes = document.getElementById('statInputNodes');
const statEndpoints = document.getElementById('statEndpoints');
const statOutputNodes = document.getElementById('statOutputNodes');
const clientTabs = document.querySelectorAll('.client-tab');
const modeTabs = document.querySelectorAll('.mode-tab');
const modeForms = document.querySelectorAll('.mode-form');
const aggregateForm = document.getElementById('generator-form-aggregate');
const aggregateNodeLinks = document.getElementById('aggregateNodeLinks');
const submitAggregateBtn = document.getElementById('submitAggregateBtn');

// Pagination & exclude refs
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const resetExcludedBtn = document.getElementById('resetExcludedBtn');
const batchDeleteBtn = document.getElementById('batchDeleteBtn');
const selectAll = document.getElementById('selectAll');

let previewAllData = [];
let currentPage = 1;
const PAGE_SIZE = 20;
let excludedNames = new Set();

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
});

// Login form handling
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById('loginError');
  errorBox.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = '验证中...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: loginUser.value,
        password: loginPass.value,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '登录失败');

    // 登录成功后，保存一个标记到 localStorage（实际API调用仍需输密码）
    localStorage.setItem(TOKEN_KEY, data.token || '');
    hideLogin();
    await loadConfig();
  } catch (err) {
    showToast(err.message, 'error');
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
    loginBtn.disabled = false;
    loginBtn.textContent = '登录';
  }
});

function populateUrls(fixedId) {
  const token = getToken();
  const base = `${location.origin}/sub/${fixedId}`;
  const withToken = (target) =>
    target
      ? `${base}?target=${target}&token=${encodeURIComponent(token)}`
      : `${base}?token=${encodeURIComponent(token)}`;

  autoUrl.value = withToken('');
  rawUrl.value = withToken('raw');
  rocketUrl.value = withToken('raw');
  clashUrl.value = withToken('clash');
  surgeUrl.value = withToken('surge');

  const activeTab = document.querySelector('.client-tab.active');
  if (activeTab) {
    const source = document.getElementById(activeTab.dataset.target);
    if (source) activeUrl.value = source.value;
  }
}

function renderPreviewRows(preview) {
  return preview
    .map(
      (item) => `
        <tr>
          <td class="col-check"><input type="checkbox" data-select-name="${escapeHtml(item.name)}" /></td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.server)}</td>
          <td>${escapeHtml(String(item.port))}</td>
          <td>${escapeHtml(item.host || '-')}</td>
          <td>${escapeHtml(item.sni || '-')}</td>
          <td>
            <button type="button" class="btn-delete" data-exclude-name="${escapeHtml(item.name)}" aria-label="删除 ${escapeHtml(item.name)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>`,
    )
    .join('');
}

function renderPagination() {
  const total = previewAllData.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) {
    pagination.classList.add('hidden');
    return;
  }
  pagination.classList.remove('hidden');
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function updateBatchDeleteButton() {
  const checked = previewBody.querySelectorAll('input[type="checkbox"][data-select-name]:checked');
  if (checked.length > 0) {
    batchDeleteBtn.classList.remove('hidden');
    batchDeleteBtn.textContent = `批量删除 (${checked.length})`;
  } else {
    batchDeleteBtn.classList.add('hidden');
  }
}

function applyPreviewPage() {
  const totalPages = Math.max(1, Math.ceil(previewAllData.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = previewAllData.slice(start, start + PAGE_SIZE);
  previewBody.innerHTML = renderPreviewRows(pageData);
  selectAll.checked = false;
  renderPagination();
  updateBatchDeleteButton();
}

function showResultState(counts, fixedId) {
  fixedIdDisplay.textContent = fixedId;
  urlStatus.classList.remove('hidden');
  populateUrls(fixedId);
  emptyState.classList.add('hidden');
  statsBar.classList.remove('hidden');
  urlGenerator.classList.remove('hidden');
  if (counts) {
    statInputNodes.textContent = counts.preferredNodes ?? 0;
    statEndpoints.textContent = counts.aggregateNodes ?? 0;
    statOutputNodes.textContent = counts.totalNodes ?? 0;
  }
}

function showPreview(preview, excluded) {
  previewAllData = preview || [];
  if (excluded) {
    excludedNames = new Set(excluded);
  }
  if (excludedNames.size > 0) {
    resetExcludedBtn.classList.remove('hidden');
  } else {
    resetExcludedBtn.classList.add('hidden');
  }
  currentPage = 1;
  if (previewAllData.length > 0) {
    applyPreviewPage();
    previewSection.classList.remove('hidden');
  } else {
    previewBody.innerHTML = '';
    previewSection.classList.add('hidden');
    pagination.classList.add('hidden');
    batchDeleteBtn.classList.add('hidden');
  }
}

async function loadConfig() {
  try {
    const res = await apiFetch('/api/subscription');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '加载失败');

    if (data.exists) {
      if (data.preferred) {
        nodeLinks.value = data.preferred.nodeLinks || '';
        preferredIps.value = data.preferred.preferredIps || '';
        namePrefixInput.value = data.preferred.namePrefix || '';
        keepOriginalHost.checked = data.preferred.keepOriginalHost !== false;
      }
      if (data.aggregate) {
        aggregateNodeLinks.value = data.aggregate.nodeLinks || '';
      }

      if (data.fixedId) {
        showResultState(data.counts, data.fixedId);
        showPreview(data.preview, data.excluded);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

const preferredForm = document.getElementById('generator-form-preferred');
preferredForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  warningBox.classList.add('hidden');
  previewBody.innerHTML = '';

  const payload = {
    mode: 'preferred',
    nodeLinks: nodeLinks.value,
    preferredIps: preferredIps.value,
    namePrefix: namePrefixInput.value,
    keepOriginalHost: keepOriginalHost.checked,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = '保存中...';

  try {
    const response = await apiFetch('/api/update-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '保存失败');
    }

    showResultState(data.counts, data.fixedId);
    showPreview(data.preview, data.excluded);

    if (Array.isArray(data.warnings) && data.warnings.length) {
      showToast(data.warnings.join('\n'), 'warning', 5000);
    }

    if (data.isNew) {
      showToast('首次保存，已生成订阅链接。', 'success');
    } else {
      showToast('配置已保存', 'success');
    }

    smoothScrollToElement(resultSection, 650);
  } catch (error) {
    showToast(error.message || '请求失败', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '保存配置';
  }
});

aggregateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  warningBox.classList.add('hidden');
  previewBody.innerHTML = '';

  const payload = {
    mode: 'aggregate',
    nodeLinks: aggregateNodeLinks.value,
  };

  submitAggregateBtn.disabled = true;
  submitAggregateBtn.textContent = '保存中...';

  try {
    const response = await apiFetch('/api/update-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '保存失败');
    }

    showResultState(data.counts, data.fixedId);
    showPreview(data.preview, data.excluded);

    if (Array.isArray(data.warnings) && data.warnings.length) {
      showToast(data.warnings.join('\n'), 'warning', 5000);
    }

    showToast('聚合节点已保存', 'success');
    smoothScrollToElement(resultSection, 650);
  } catch (error) {
    showToast(error.message || '请求失败', 'error');
  } finally {
    submitAggregateBtn.disabled = false;
    submitAggregateBtn.textContent = '保存配置';
  }
});

rotateUrlBtn.addEventListener('click', async () => {
  const confirmed = await showConfirm('更新订阅URL后，旧链接将失效。客户端需要重新配置。确定继续？');
  if (!confirmed) return;

  rotateUrlBtn.disabled = true;
  rotateUrlBtn.textContent = '更新中...';

  try {
    const response = await apiFetch('/api/update-url', { method: 'POST' });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '更新失败');
    }

    populateUrls(data.fixedId);
    fixedIdDisplay.textContent = data.fixedId;

    showToast('订阅URL已更新，请复制新链接到客户端。', 'success');
    smoothScrollToElement(resultSection, 650);
  } catch (error) {
    showToast(error.message || '请求失败', 'error');
  } finally {
    rotateUrlBtn.disabled = false;
    rotateUrlBtn.textContent = '更新订阅URL';
  }
});

// Copy & QR code handlers
document.addEventListener('click', async (event) => {
  const copyButton = event.target.closest('[data-copy-target]');
  if (copyButton) {
    const input = document.getElementById(copyButton.dataset.copyTarget);
    if (!input?.value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand('copy');
    }
    showToast('链接已复制到剪贴板', 'success');
    const copyLive = document.getElementById('copyLive');
    if (copyLive) copyLive.textContent = '链接已复制到剪贴板';
    const originalText = copyButton.textContent;
    copyButton.textContent = '已复制';
    setTimeout(() => {
      copyButton.textContent = originalText;
      if (copyLive) copyLive.textContent = '';
    }, 1200);
    return;
  }

  const qrButton = event.target.closest('[data-qrcode-target]');
  if (qrButton) {
    const input = document.getElementById(qrButton.dataset.qrcodeTarget);
    if (!input?.value) {
      showToast('请先生成订阅链接，再显示二维码。', 'warning');
      return;
    }

    if (!window.QRCode) {
      showToast('二维码组件加载失败，请刷新页面后重试。', 'error');
      return;
    }

    qrCanvas.innerHTML = '';
    qrText.textContent = input.value;
    qrModal.classList.remove('hidden');
    qrModal.setAttribute('aria-hidden', 'false');

    new window.QRCode(qrCanvas, {
      text: input.value,
      width: 220,
      height: 220,
      correctLevel: window.QRCode.CorrectLevel.M,
    });
    return;
  }

  if (event.target.closest('[data-close-modal="true"]')) {
    closeQrDialog();
  }

  const deleteBtn = event.target.closest('[data-exclude-name]');
  if (deleteBtn) {
    const name = deleteBtn.dataset.excludeName;
    if (!name) return;
    excludeNode(name);
    return;
  }

  const checkbox = event.target.closest('input[type="checkbox"][data-select-name]');
  if (checkbox) {
    updateBatchDeleteButton();
    const allBoxes = previewBody.querySelectorAll('input[type="checkbox"][data-select-name]');
    const checkedBoxes = previewBody.querySelectorAll('input[type="checkbox"][data-select-name]:checked');
    selectAll.checked = allBoxes.length > 0 && allBoxes.length === checkedBoxes.length;
    return;
  }
});

closeQrModal.addEventListener('click', closeQrDialog);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!qrModal.classList.contains('hidden')) {
      closeQrDialog();
    }
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal && !confirmModal.classList.contains('hidden')) {
      confirmModal.querySelector('#confirmCancel')?.click();
    }
  }
});

function closeQrDialog() {
  qrModal.classList.add('hidden');
  qrModal.setAttribute('aria-hidden', 'true');
  qrCanvas.innerHTML = '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Pagination handlers
prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    applyPreviewPage();
  }
});

nextPageBtn.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(previewAllData.length / PAGE_SIZE));
  if (currentPage < totalPages) {
    currentPage++;
    applyPreviewPage();
  }
});

// Exclude / reset handlers
async function excludeNode(name) {
  try {
    const response = await apiFetch('/api/exclude-node', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '删除失败');
    }
    showResultState(data.counts, fixedIdDisplay.textContent);
    showPreview(data.preview, data.excluded);
    showToast(`已删除「${name}」`, 'success');
  } catch (error) {
    showToast(error.message || '删除失败', 'error');
  }
}

resetExcludedBtn.addEventListener('click', async () => {
  const confirmed = await showConfirm('确定重置排除列表？所有被排除的节点将恢复显示。');
  if (!confirmed) return;

  try {
    const response = await apiFetch('/api/reset-excluded', { method: 'POST' });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '重置失败');
    }
    showResultState(data.counts, fixedIdDisplay.textContent);
    showPreview(data.preview, data.excluded);
    showToast('已重置排除列表', 'success');
  } catch (error) {
    showToast(error.message || '重置失败', 'error');
  }
});

// Batch delete handler
batchDeleteBtn.addEventListener('click', async () => {
  const checked = previewBody.querySelectorAll('input[type="checkbox"][data-select-name]:checked');
  const names = Array.from(checked).map((cb) => cb.dataset.selectName).filter(Boolean);
  if (names.length === 0) return;

  const confirmed = await showConfirm(`确定删除选中的 ${names.length} 个节点？`);
  if (!confirmed) return;

  batchDeleteBtn.disabled = true;
  try {
    const response = await apiFetch('/api/exclude-nodes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ names }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '批量删除失败');
    }
    showResultState(data.counts, fixedIdDisplay.textContent);
    showPreview(data.preview, data.excluded);
    showToast(`已删除 ${names.length} 个节点`, 'success');
  } catch (error) {
    showToast(error.message || '批量删除失败', 'error');
  } finally {
    batchDeleteBtn.disabled = false;
  }
});

// Select all handler
selectAll.addEventListener('change', () => {
  const boxes = previewBody.querySelectorAll('input[type="checkbox"][data-select-name]');
  boxes.forEach((cb) => { cb.checked = selectAll.checked; });
  updateBatchDeleteButton();
});

clientTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    clientTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const source = document.getElementById(tab.dataset.target);
    if (source) activeUrl.value = source.value;
  });
});

// Mode tab switching
function setActiveMode(mode) {
  modeTabs.forEach((t) => t.classList.remove('active'));
  modeForms.forEach((f) => f.classList.remove('active'));
  const targetTab = document.querySelector(`.mode-tab[data-mode="${mode}"]`);
  const targetForm = document.getElementById(`generator-form-${mode}`);
  if (targetTab) targetTab.classList.add('active');
  if (targetForm) targetForm.classList.add('active');
}

modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    setActiveMode(mode);
    localStorage.setItem('activeMode', mode);
  });
});

function restoreActiveMode() {
  const saved = localStorage.getItem('activeMode');
  if (saved === 'preferred' || saved === 'aggregate') {
    setActiveMode(saved);
  }
}

// Theme toggle
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.dataset.theme = 'light';
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme === 'light' ? 'dark' : 'light';
  html.dataset.theme = next;
  localStorage.setItem('theme', next);
}

initTheme();
document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

// Empty state CTA — focus first input of active form
document.getElementById('emptyStateCta')?.addEventListener('click', () => {
  const activeForm = document.querySelector('.mode-form.active');
  const firstInput = activeForm?.querySelector('textarea, input');
  if (firstInput) firstInput.focus();
  else document.getElementById('nodeLinks')?.focus();
});

// Initialize
if (getToken()) {
  hideLogin();
  loadConfig();
  restoreActiveMode();
} else {
  showLogin();
}
