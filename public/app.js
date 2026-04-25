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

async function apiAction({ path, method = 'POST', body, btn, loadingText = '保存中...', successText, onSuccess }) {
  const btnLabel = btn?.querySelector('.btn-label');
  if (btn) { btn.disabled = true; if (btnLabel) btnLabel.textContent = loadingText; }
  try {
    const res = await apiFetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '请求失败');
    if (onSuccess) onSuccess(data);
    if (successText) showToast(successText, 'success');
    return data;
  } catch (err) {
    showToast(err.message || '请求失败', 'error');
    throw err;
  } finally {
    if (btn) { btn.disabled = false; const lbl = btn.querySelector('.btn-label'); if (lbl) lbl.textContent = '保存配置'; }
  }
}

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

const modeTabsContainer = document.querySelector('.mode-tabs');

// Pagination & exclude refs
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const resetExcludedBtn = document.getElementById('resetExcludedBtn');
const batchDeleteBtn = document.getElementById('batchDeleteBtn');
const selectAll = document.getElementById('selectAll');
const pageSizeSelect = document.getElementById('pageSizeSelect');

let previewAllData = [];
let currentPage = 1;
let pageSize = 20;
let excludedNames = new Set();

// Filter & sort state
const columnFilters = {
  name: '',
  type: '',
  server: '',
  port: '',
};
let sortField = '';
let sortOrder = '';

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
  const loginLabel = loginBtn.querySelector('.btn-text');
  if (loginLabel) loginLabel.textContent = '验证中...';

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

      localStorage.setItem(TOKEN_KEY, data.token || '');
    hideLogin();
    await loadConfig();
  } catch (err) {
    showToast(err.message, 'error');
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
    loginBtn.disabled = false;
    const loginLabel2 = loginBtn.querySelector('.btn-text');
    if (loginLabel2) loginLabel2.textContent = '建立连接';
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

function renderPreviewRows(preview, startIndex = 1) {
  return preview
    .map(
      (item, idx) => `
        <tr>
          <td class="col-check"><input type="checkbox" data-select-name="${escapeHtml(item.name)}" /></td>
          <td class="col-index" title="${startIndex + idx}">${startIndex + idx}</td>
          <td title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</td>
          <td title="${escapeHtml(item.type)}">${escapeHtml(item.type)}</td>
          <td title="${escapeHtml(item.server)}">${escapeHtml(item.server)}</td>
          <td title="${escapeHtml(String(item.port))}">${escapeHtml(String(item.port))}</td>
          <td title="${escapeHtml(item.host || '-')}">${escapeHtml(item.host || '-')}</td>
          <td title="${escapeHtml(item.sni || '-')}">${escapeHtml(item.sni || '-')}</td>
          <td>
            <button type="button" class="btn-delete" data-exclude-name="${escapeHtml(item.name)}" aria-label="删除 ${escapeHtml(item.name)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>`,
    )
    .join('');
}

function renderPagination(total) {
  if (total === 0) {
    pagination.classList.add('hidden');
    return;
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  pagination.classList.remove('hidden');
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function updateBatchDeleteButton() {
  const checked = previewBody.querySelectorAll('input[type="checkbox"][data-select-name]:checked');
  const label = batchDeleteBtn.querySelector('.btn-label');
  if (label) label.textContent = checked.length > 0 ? `批量删除 (${checked.length})` : '批量删除';
  batchDeleteBtn.disabled = checked.length === 0;
}

function filterAndSortData() {
  let data = previewAllData.slice();

  Object.entries(columnFilters).forEach(([field, value]) => {
    if (!value) return;
    const q = String(value).toLowerCase();
    data = data.filter((item) => String(item[field]).toLowerCase().includes(q));
  });

  if (sortField && sortOrder) {
    data.sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      let cmp = 0;
      if (sortField === 'port') {
        cmp = (Number(va) || 0) - (Number(vb) || 0);
      } else {
        cmp = String(va).localeCompare(String(vb), 'zh-CN');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }

  return data;
}

function applyPreviewPage() {
  const displayData = filterAndSortData();
  const totalPages = Math.max(1, Math.ceil(displayData.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const start = (currentPage - 1) * pageSize;
  const pageData = displayData.slice(start, start + pageSize);
  if (displayData.length === 0) {
    previewBody.innerHTML = `
      <tr class="preview-empty-row">
        <td colspan="9">
          <div class="preview-empty-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p>未找到匹配的节点</p>
            <span>尝试调整过滤条件</span>
          </div>
        </td>
      </tr>`;
    selectAll.checked = false;
    selectAll.disabled = true;
  } else {
    previewBody.innerHTML = renderPreviewRows(pageData, start + 1);
    selectAll.disabled = false;
  }
  selectAll.checked = false;
  renderPagination(displayData.length);
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
  const resetLabel = resetExcludedBtn.querySelector('.btn-label');
  if (resetLabel) resetLabel.textContent = excludedNames.size > 0 ? `重置排除 (${excludedNames.size})` : '重置排除';
  resetExcludedBtn.disabled = excludedNames.size === 0;

  // Reset filters and sort on data refresh
  Object.keys(columnFilters).forEach((k) => { columnFilters[k] = ''; });
  sortField = '';
  sortOrder = '';
  document.querySelectorAll('.th-filter-popover input, .th-filter-popover select').forEach((el) => { el.value = ''; });
  document.querySelectorAll('.th-filter-icon').forEach((icon) => {
    icon.classList.remove('active');
    icon.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.sort-indicator').forEach((el) => { el.textContent = ''; });
  document.querySelectorAll('th.sortable').forEach((th) => {
    th.classList.remove('has-filter');
  });

  currentPage = 1;
  if (previewAllData.length > 0) {
    applyPreviewPage();
    previewSection.classList.remove('hidden');
  } else {
    previewBody.innerHTML = '';
    previewSection.classList.add('hidden');
    pagination.classList.add('hidden');
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

  await apiAction({
    path: '/api/update-subscription',
    body: {
      mode: 'preferred',
      nodeLinks: nodeLinks.value,
      preferredIps: preferredIps.value,
      namePrefix: namePrefixInput.value,
      keepOriginalHost: keepOriginalHost.checked,
    },
    btn: submitBtn,
    successText: '配置已保存',
    onSuccess(data) {
      showResultState(data.counts, data.fixedId);
      showPreview(data.preview, data.excluded);
      if (data.warnings?.length) showToast(data.warnings.join('\n'), 'warning', 5000);
      if (data.isNew) showToast('首次保存，已生成订阅链接。', 'success');
      smoothScrollToElement(resultSection, 650);
    },
  });
});

aggregateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  warningBox.classList.add('hidden');
  previewBody.innerHTML = '';

  await apiAction({
    path: '/api/update-subscription',
    body: { mode: 'aggregate', nodeLinks: aggregateNodeLinks.value },
    btn: submitAggregateBtn,
    successText: '聚合节点已保存',
    onSuccess(data) {
      showResultState(data.counts, data.fixedId);
      showPreview(data.preview, data.excluded);
      if (data.warnings?.length) showToast(data.warnings.join('\n'), 'warning', 5000);
      smoothScrollToElement(resultSection, 650);
    },
  });
});

rotateUrlBtn.addEventListener('click', async () => {
  const confirmed = await showConfirm('更新订阅URL后，旧链接将失效。客户端需要重新配置。确定继续？');
  if (!confirmed) return;

  await apiAction({
    path: '/api/update-url',
    btn: rotateUrlBtn,
    loadingText: '更新中...',
    successText: '订阅URL已更新，请复制新链接到客户端。',
    onSuccess(data) {
      populateUrls(data.fixedId);
      fixedIdDisplay.textContent = data.fixedId;
      smoothScrollToElement(resultSection, 650);
    },
  });
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
    const copyLabel = copyButton.querySelector('.btn-label');
    const originalText = copyLabel ? copyLabel.textContent : '复制链接';
    if (copyLabel) copyLabel.textContent = '已复制';
    setTimeout(() => {
      if (copyLabel) copyLabel.textContent = originalText;
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

  if (event.target.closest('#qrModal [data-close-modal="true"]')) {
    closeQrDialog();
  }

  const deleteBtn = event.target.closest('[data-exclude-name]');
  if (deleteBtn) {
    const name = deleteBtn.dataset.excludeName;
    if (!name) return;
    const confirmed = await showConfirm(`确定要删除节点 "${name}" 吗？`);
    if (confirmed) {
      excludeNode(name);
    }
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

  const filterIcon = event.target.closest('.th-filter-icon');
  if (filterIcon) {
    const field = filterIcon.dataset.filter;
    const popover = document.querySelector(`.th-filter-popover[data-filter-popover="${field}"]`);
    if (popover) {
      const wasHidden = popover.classList.contains('hidden');
      document.querySelectorAll('.th-filter-popover').forEach((el) => {
        el.classList.add('hidden');
      });
      document.querySelectorAll('.th-filter-icon').forEach((icon) => {
        icon.setAttribute('aria-expanded', 'false');
      });
      if (wasHidden) {
        popover.classList.remove('hidden');
        filterIcon.setAttribute('aria-expanded', 'true');
        const input = popover.querySelector('input, select');
        if (input) {
          setTimeout(() => input.focus(), 50);
        }
      }
    }
    return;
  }

  if (event.target.closest('.th-filter-popover')) {
    return;
  }

  const sortHeader = event.target.closest('th[data-sort]');
  if (sortHeader) {
    const field = sortHeader.dataset.sort;
    if (sortField === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : (sortOrder === 'desc' ? '' : 'asc');
    } else {
      sortField = field;
      sortOrder = 'asc';
    }
    document.querySelectorAll('.sort-indicator').forEach((el) => { el.textContent = ''; });
    if (sortOrder) {
      sortHeader.querySelector('.sort-indicator').textContent = sortOrder === 'asc' ? '▲' : '▼';
    }
    currentPage = 1;
    applyPreviewPage();
    return;
  }
});

closeQrModal.addEventListener('click', closeQrDialog);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!qrModal.classList.contains('hidden')) closeQrDialog();
  const confirmModal = document.getElementById('confirmModal');
  if (confirmModal && !confirmModal.classList.contains('hidden')) {
    confirmModal.querySelector('#confirmCancel')?.click();
  }
  closeAllFilterPopovers();
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

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    applyPreviewPage();
  }
});

nextPageBtn.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(filterAndSortData().length / pageSize));
  if (currentPage < totalPages) {
    currentPage++;
    applyPreviewPage();
  }
});

pageSizeSelect.addEventListener('change', () => {
  const val = parseInt(pageSizeSelect.value, 10);
  pageSize = isNaN(val) || val < 1 ? 20 : val;
  currentPage = 1;
  applyPreviewPage();
});

function updateFilterVisuals(field) {
  const icon = document.querySelector(`.th-filter-icon[data-filter="${field}"]`);
  const th = document.querySelector(`th[data-sort="${field}"]`);
  const hasValue = Boolean(columnFilters[field]);
  if (icon) icon.classList.toggle('active', hasValue);
  if (th) th.classList.toggle('has-filter', hasValue);
}

document.addEventListener('input', (event) => {
  const popover = event.target.closest('.th-filter-popover');
  if (!popover) return;
  const field = popover.dataset.filterPopover;
  if (!field) return;
  columnFilters[field] = event.target.value;
  updateFilterVisuals(field);
  currentPage = 1;
  applyPreviewPage();
});

document.addEventListener('change', (event) => {
  const popover = event.target.closest('.th-filter-popover');
  if (!popover) return;
  const field = popover.dataset.filterPopover;
  if (!field) return;
  columnFilters[field] = event.target.value;
  updateFilterVisuals(field);
  currentPage = 1;
  applyPreviewPage();
});

function closeAllFilterPopovers() {
  document.querySelectorAll('.th-filter-popover').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.th-filter-icon').forEach((icon) => icon.setAttribute('aria-expanded', 'false'));
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.th-filter-icon') || event.target.closest('.th-filter-popover')) {
    return;
  }
  closeAllFilterPopovers();
});

async function excludeNode(name) {
  try {
    await apiAction({
      path: '/api/exclude-node',
      body: { name },
      successText: `已删除「${name}」`,
      onSuccess(data) {
        showResultState(data.counts, fixedIdDisplay.textContent);
        showPreview(data.preview, data.excluded);
      },
    });
  } catch {
    // toast already shown by apiAction
  }
}

resetExcludedBtn.addEventListener('click', async () => {
  const confirmed = await showConfirm('确定重置排除列表？所有被排除的节点将恢复显示。');
  if (!confirmed) return;

  try {
    await apiAction({
      path: '/api/reset-excluded',
      successText: '已重置排除列表',
      onSuccess(data) {
        showResultState(data.counts, fixedIdDisplay.textContent);
        showPreview(data.preview, data.excluded);
      },
    });
  } catch {
    // toast already shown by apiAction
  }
});

batchDeleteBtn.addEventListener('click', async () => {
  const checked = previewBody.querySelectorAll('input[type="checkbox"][data-select-name]:checked');
  const names = Array.from(checked).map((cb) => cb.dataset.selectName).filter(Boolean);
  if (names.length === 0) return;

  const confirmed = await showConfirm(`确定删除选中的 ${names.length} 个节点？`);
  if (!confirmed) return;

  try {
    await apiAction({
      path: '/api/exclude-nodes',
      body: { names },
      btn: batchDeleteBtn,
      successText: `已删除 ${names.length} 个节点`,
      onSuccess(data) {
        showResultState(data.counts, fixedIdDisplay.textContent);
        showPreview(data.preview, data.excluded);
      },
    });
  } catch {
    // toast already shown by apiAction
  }
});

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
  } else {
    setActiveMode('aggregate');
  }
}

// Theme system
const THEME_FAMILIES = [
  { key: 'terracotta', label: '赤陶橘', swatch: '#c4785a' },
  { key: 'sage', label: '鼠尾草', swatch: '#7daa7d' },
  { key: 'rose', label: '烟灰玫瑰', swatch: '#c97a7a' },
  { key: 'teal', label: '深青灰', swatch: '#5a9e9e' }
];

function getSystemMode() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function applyTheme(family, mode) {
  document.documentElement.dataset.theme = `${family}-${mode}`;
  localStorage.setItem('themeFamily', family);
  localStorage.setItem('themeMode', mode);
}

function initTheme() {
  const savedFamily = localStorage.getItem('themeFamily');
  const savedMode = localStorage.getItem('themeMode');
  const oldTheme = localStorage.getItem('theme');

  let family = savedFamily;
  let mode = savedMode;

  if (!family || !THEME_FAMILIES.find((f) => f.key === family)) {
    family = 'teal';
  }
  if (mode !== 'dark' && mode !== 'light') {
    if (oldTheme === 'light' || oldTheme === 'dark') {
      mode = oldTheme;
    } else {
      mode = getSystemMode();
    }
  }

  applyTheme(family, mode);
}

function setThemeFamily(family) {
  const currentMode = localStorage.getItem('themeMode') || getSystemMode();
  applyTheme(family, currentMode);
  updateThemeSelectorUI();
}

function toggleThemeMode() {
  const currentFamily = localStorage.getItem('themeFamily') || 'teal';
  const currentMode = localStorage.getItem('themeMode') || getSystemMode();
  const nextMode = currentMode === 'light' ? 'dark' : 'light';
  applyTheme(currentFamily, nextMode);
  updateThemeSelectorUI();
}

function updateThemeSelectorUI() {
  const family = localStorage.getItem('themeFamily') || 'teal';
  const mode = localStorage.getItem('themeMode') || 'dark';
  const familyInfo = THEME_FAMILIES.find((f) => f.key === family);

  const trigger = document.getElementById('themeSelectorTrigger');
  const currentName = trigger?.querySelector('.theme-current-name');
  const currentSwatch = trigger?.querySelector('.theme-current-swatch');

  if (currentName && familyInfo) {
    currentName.textContent = familyInfo.label;
  }
  if (currentSwatch && familyInfo) {
    currentSwatch.style.background = familyInfo.swatch;
  }

  document.querySelectorAll('.theme-family-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.family === family);
  });

  const modeToggle = document.getElementById('themeModeToggle');
  if (modeToggle) {
    modeToggle.classList.toggle('light', mode === 'light');
  }
}

function setupThemeSelector() {
  const trigger = document.getElementById('themeSelectorTrigger');
  const dropdown = document.getElementById('themeSelectorDropdown');
  const originalParent = dropdown?.parentElement;
  if (!trigger || !dropdown || !originalParent) return;

  function positionDropdown() {
    const rect = trigger.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom + 8 + scrollY}px`;
    dropdown.style.left = `${rect.left + scrollX}px`;
    dropdown.style.right = 'auto';
    dropdown.style.width = '130px';
  }

  function showDropdown() {
    document.body.appendChild(dropdown);
    dropdown.classList.remove('hidden');
    positionDropdown();
    trigger.setAttribute('aria-expanded', 'true');
  }

  function hideDropdown() {
    dropdown.classList.add('hidden');
    originalParent.appendChild(dropdown);
    dropdown.style.top = '';
    dropdown.style.left = '';
    dropdown.style.right = '';
    dropdown.style.width = '';
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains('hidden')) {
      showDropdown();
    } else {
      hideDropdown();
    }
  });

  document.querySelectorAll('.theme-family-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setThemeFamily(btn.dataset.family);
      hideDropdown();
    });
  });

  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
      if (!dropdown.classList.contains('hidden')) hideDropdown();
    }
  });

  window.addEventListener('scroll', () => {
    if (!dropdown.classList.contains('hidden')) positionDropdown();
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!dropdown.classList.contains('hidden')) positionDropdown();
  });
}

document.getElementById('themeModeToggle')?.addEventListener('click', toggleThemeMode);

initTheme();
setupThemeSelector();
updateThemeSelectorUI();

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
