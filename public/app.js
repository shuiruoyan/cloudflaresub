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
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      backdrop.removeEventListener('click', onCancel);
    };

    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    const backdrop = modal.querySelector('[data-close-modal="true"]');
    backdrop.addEventListener('click', onCancel);
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

// API helpers
async function apiGet(path) {
  const res = await fetch(path, {
    headers: { 'x-sub-token': getToken() },
  });
  if (res.status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    showLogin('登录已过期，请重新输入令牌');
    throw new Error('登录已过期');
  }
  return res;
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sub-token': getToken(),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    showLogin('登录已过期，请重新输入令牌');
    throw new Error('登录已过期');
  }
  return res;
}

// DOM refs
const form = document.getElementById('generator-form');
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
        username: document.getElementById('loginUser').value,
        password: document.getElementById('loginPass').value,
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
  document.getElementById('rocketUrl').value = withToken('raw');
  clashUrl.value = withToken('clash');
  surgeUrl.value = withToken('surge');

  // 同步当前激活选项卡对应的链接到 activeUrl
  const activeTab = document.querySelector('.client-tab.active');
  if (activeTab) {
    const source = document.getElementById(activeTab.dataset.target);
    if (source) document.getElementById('activeUrl').value = source.value;
  }
}

async function loadConfig() {
  try {
    const res = await apiGet('/api/subscription');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '加载失败');

    if (data.exists) {
      document.getElementById('nodeLinks').value = data.config.nodeLinks || '';
      document.getElementById('preferredIps').value = data.config.preferredIps || '';
      document.getElementById('namePrefix').value = data.config.namePrefix || '';
      document.getElementById('keepOriginalHost').checked = data.config.keepOriginalHost !== false;

      if (data.fixedId) {
        fixedIdDisplay.textContent = data.fixedId;
        urlStatus.classList.remove('hidden');
        populateUrls(data.fixedId);
        emptyState.classList.add('hidden');
        document.getElementById('statsBar').classList.remove('hidden');
        document.getElementById('urlGenerator').classList.remove('hidden');

        if (data.counts) {
          document.getElementById('statInputNodes').textContent = data.counts.inputNodes;
          document.getElementById('statEndpoints').textContent = data.counts.preferredEndpoints;
          document.getElementById('statOutputNodes').textContent = data.counts.outputNodes;
        }

        if (data.preview && data.preview.length > 0) {
          previewBody.innerHTML = data.preview
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(item.name)}</td>
                  <td>${escapeHtml(item.type)}</td>
                  <td>${escapeHtml(item.server)}</td>
                  <td>${escapeHtml(String(item.port))}</td>
                  <td>${escapeHtml(item.host || '-')}</td>
                  <td>${escapeHtml(item.sni || '-')}</td>
                </tr>`,
            )
            .join('');
          document.getElementById('previewSection').classList.remove('hidden');
        } else {
          previewBody.innerHTML = '';
          document.getElementById('previewSection').classList.add('hidden');
        }
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  warningBox.classList.add('hidden');
  previewBody.innerHTML = '';

  const payload = {
    nodeLinks: document.getElementById('nodeLinks').value,
    preferredIps: document.getElementById('preferredIps').value,
    namePrefix: document.getElementById('namePrefix').value,
    keepOriginalHost: document.getElementById('keepOriginalHost').checked,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = '保存中...';

  try {
    const response = await apiPost('/api/update-subscription', payload);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '保存失败');
    }

    populateUrls(data.fixedId);
    fixedIdDisplay.textContent = data.fixedId;
    urlStatus.classList.remove('hidden');
    emptyState.classList.add('hidden');
    document.getElementById('statsBar').classList.remove('hidden');
    document.getElementById('urlGenerator').classList.remove('hidden');

    document.getElementById('statInputNodes').textContent = data.counts.inputNodes;
    document.getElementById('statEndpoints').textContent = data.counts.preferredEndpoints;
    document.getElementById('statOutputNodes').textContent = data.counts.outputNodes;

    if (data.preview && data.preview.length > 0) {
      previewBody.innerHTML = data.preview
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td>${escapeHtml(item.type)}</td>
              <td>${escapeHtml(item.server)}</td>
              <td>${escapeHtml(String(item.port))}</td>
              <td>${escapeHtml(item.host || '-')}</td>
              <td>${escapeHtml(item.sni || '-')}</td>
            </tr>`,
        )
        .join('');
      document.getElementById('previewSection').classList.remove('hidden');
    } else {
      previewBody.innerHTML = '';
      document.getElementById('previewSection').classList.add('hidden');
    }

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

rotateUrlBtn.addEventListener('click', async () => {
  const confirmed = await showConfirm('更新订阅URL后，旧链接将失效。客户端需要重新配置。确定继续？');
  if (!confirmed) return;

  rotateUrlBtn.disabled = true;
  rotateUrlBtn.textContent = '更新中...';

  try {
    const response = await apiPost('/api/update-url', {});
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
      showToast('链接已复制到剪贴板', 'success');
      const copyLive = document.getElementById('copyLive');
      if (copyLive) copyLive.textContent = '链接已复制到剪贴板';
      const originalText = copyButton.textContent;
      copyButton.textContent = '已复制';
      setTimeout(() => {
        copyButton.textContent = originalText;
        if (copyLive) copyLive.textContent = '';
      }, 1200);
    } catch {
      input.select();
      document.execCommand('copy');
      showToast('链接已复制到剪贴板', 'success');
      const copyLive = document.getElementById('copyLive');
      if (copyLive) copyLive.textContent = '链接已复制到剪贴板';
      setTimeout(() => {
        if (copyLive) copyLive.textContent = '';
      }, 1200);
    }
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

// 客户端选项卡切换
document.querySelectorAll('.client-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.client-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const source = document.getElementById(tab.dataset.target);
    if (source) document.getElementById('activeUrl').value = source.value;
  });
});

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

// Initialize
if (getToken()) {
  hideLogin();
  loadConfig();
} else {
  showLogin();
}
