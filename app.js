/**
 * CORE LOGIC - HỆ THỐNG ĐIỂM DANH QR CODE PWA
 * Hỗ trợ Camera Live Stream, Web Audio Synthesizer, Web Speech TTS và Kết nối Google Sheets
 */

// 1. Khai báo Trạng thái Ứng dụng (App State)
const state = {
  gasUrl: localStorage.getItem('qr_attendance_gas_url') || '',
  isProcessing: false,        // Chỉ dùng ở chế độ single scan
  recentScans: new Map(),     // Debounce: QR code → timestamp quét gần nhất
  SCAN_DEBOUNCE_MS: 3000,     // Không quét lại cùng mã trong 3 giây
  pendingCount: 0,            // Số API call đang chờ phản hồi
  sessionPresent: 0,          // Số lượt có mặt trong phiên này
  isCameraActive: false,
  html5QrCode: null,
  cameras: [],                // Danh sách camera khả dụng
  activeCameraId: null,       // ID camera đang dùng
  selectedCameraId: localStorage.getItem('qr_attendance_camera_id') || '', // Camera người dùng chọn
  scanHistory: (() => { try { return JSON.parse(localStorage.getItem('qr_attendance_history')) || []; } catch(e) { return []; } })(),
  theme: localStorage.getItem('qr_attendance_theme') || 'light', // light | dark | system
  pendingTheme: null,         // Theme đang xem thử trong cài đặt
  lastCheckText: '',          // Kết quả kiểm tra kết nối gần nhất
  continuousScan: localStorage.getItem('qr_attendance_continuous') !== 'false', // Default true
  voiceOutput: localStorage.getItem('qr_attendance_voice') !== 'false', // Default true
  autoCloseTimeout: null,
  toastTimeout: null
};

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

// 2. Định nghĩa các phần tử DOM (DOM Elements)
const DOM = {
  html: document.documentElement,
  body: document.body,
  themeColorMeta: document.querySelector('meta[name="theme-color"]'),
  gasUrlInput: document.getElementById('gasUrl'),
  attendanceDateInput: document.getElementById('attendanceDate'),
  datePickers: document.querySelectorAll('.js-pick-date'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  btnSettings: document.getElementById('btnSettings'),
  settingsModal: document.getElementById('settingsModal'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnCancelSettings: document.getElementById('btnCancelSettings'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  btnTestConn: document.getElementById('btnTestConn'),
  sheetStatusDot: document.getElementById('sheetStatusDot'),
  sheetStatusText: document.getElementById('sheetStatusText'),
  themeSegment: document.getElementById('themeSegment'),
  connStatusDot: document.getElementById('connStatusDot'),
  connStatusText: document.getElementById('connStatusText'),
  dateIndicator: document.getElementById('dateIndicator'),
  dateChipText: document.getElementById('dateChipText'),
  sessionCount: document.getElementById('sessionCount'),
  btnStartCamera: document.getElementById('btnStartCamera'),
  cameraPlaceholder: document.getElementById('cameraPlaceholder'),
  scannerOverlay: document.getElementById('scannerOverlay'),
  laserLine: document.getElementById('laserLine'),
  statusPillText: document.getElementById('statusPillText'),
  modeSegment: document.getElementById('modeSegment'),
  modeDesc: document.getElementById('modeDesc'),
  chkVoice: document.getElementById('chkVoice'),

  // Hộp thoại Kết quả (Result Popup - single scan mode)
  resultPopup: document.getElementById('resultPopup'),
  resultIcon: document.getElementById('resultIcon'),
  resultTitle: document.getElementById('resultTitle'),
  resultName: document.getElementById('resultName'),
  resultId: document.getElementById('resultId'),
  resultDate: document.getElementById('resultDate'),
  resultTime: document.getElementById('resultTime'),
  resultHint: document.getElementById('resultHint'),
  btnConfirmResult: document.getElementById('btnConfirmResult'),
  btnSkipResult: document.getElementById('btnSkipResult'),

  // Toast nhanh (continuous mode)
  scanToast: document.getElementById('scanToast'),
  scanToastIcon: document.getElementById('scanToastIcon'),
  scanToastName: document.getElementById('scanToastName'),
  scanToastId: document.getElementById('scanToastId'),
  pendingIndicator: document.getElementById('pendingIndicator'),
  pendingText: document.getElementById('pendingText'),
  btnSwitchCamera: document.getElementById('btnSwitchCamera'),
  cameraSelect: document.getElementById('cameraSelect'),
  camHint: document.getElementById('camHint'),

  // Bảng Lịch sử (Logs)
  logList: document.getElementById('logList'),
  logCount: document.getElementById('logCount')
};

// Icon SVG từ bộ symbol trong index.html
function icon(name) {
  return `<svg class="ic"><use href="#i-${name}"/></svg>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const BTN_START_HTML = `${icon('camera')} Bật camera điểm danh`;
const BTN_STOP_HTML = `${icon('power')} Tắt camera`;

// 3. Khởi tạo Trình tổng hợp Âm thanh (Web Audio API Synthesizer)
// Dùng Web Audio để phát tiếng bíp trực tiếp mà không cần file âm thanh
let audioCtx = null;

function playAudioAlert(isSuccess) {
  try {
    // Khởi tạo AudioContext khi có tương tác đầu tiên của người dùng
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Đảm bảo AudioContext không bị treo
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (isSuccess) {
      // Âm thanh thành công: 2 tiếng bíp cao (Happy Chirp)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gainNode2 = audioCtx.createGain();
        osc2.connect(gainNode2);
        gainNode2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(850, audioCtx.currentTime);
        gainNode2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.12);
      }, 100);
    } else {
      // Âm thanh thất bại: Tiếng buzz trầm, kéo dài (Buzz Error)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch (err) {
    console.error("Không thể phát âm thanh:", err);
  }
}

// 4. Khởi tạo Đọc giọng nói Tiếng Việt (Web Speech API)
let voiceList = [];
if (window.speechSynthesis) {
  // Tải danh sách giọng nói khả dụng
  voiceList = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    voiceList = window.speechSynthesis.getVoices();
  };
}

function speakVietnamese(text) {
  if (!state.voiceOutput || !window.speechSynthesis) return;

  try {
    // Dừng các giọng đọc đang phát dở
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95; // Tốc độ vừa phải, dễ nghe
    utterance.pitch = 1.05; // Cao độ sáng ấm

    // Tìm kiếm giọng đọc tiếng Việt chuẩn
    const viVoice = voiceList.find(voice =>
      voice.lang.includes('vi') ||
      voice.lang.includes('VI') ||
      voice.name.toLowerCase().includes('vietnam')
    );

    if (viVoice) {
      utterance.voice = viVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Lỗi phát giọng nói:", err);
  }
}

// 5. Khởi tạo Ứng dụng & Nạp dữ liệu cũ
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  registerEvents();

  // Đăng ký Service Worker cho PWA (Hỗ trợ cài đặt thành App trên điện thoại)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker đã đăng ký thành công với scope:', reg.scope))
      .catch(err => console.error('Lỗi đăng ký Service Worker:', err));
  }
});

function initApp() {
  // Cài đặt Theme
  applyTheme(state.theme);

  // Nạp cấu hình lưu trữ
  if (state.gasUrl) {
    DOM.gasUrlInput.value = state.gasUrl;
    refreshConnection();
  } else {
    updateConnectionStatus('none', "Chưa cấu hình Google Sheets");
  }

  // Điền ngày hiện tại dạng YYYY-MM-DD
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const localDateStr = `${year}-${month}-${day}`;
  DOM.attendanceDateInput.value = localDateStr;

  // Hiển thị ngày lên màn hình
  updateDateIndicator(localDateStr);
  updateSessionCount();

  // Đặt chế độ quét & giọng đọc đúng trạng thái lưu trữ
  updateModeUI();
  DOM.chkVoice.checked = state.voiceOutput;

  // Nạp và vẽ Lịch sử
  renderHistory();
}

// 6. Đăng ký các sự kiện tương tác (Event Listeners)
function registerEvents() {
  // Theme Toggle (Sáng ⇄ Tối)
  DOM.btnThemeToggle.addEventListener('click', () => {
    setTheme(resolveTheme(state.theme) === 'dark' ? 'light' : 'dark');
  });

  systemDark.addEventListener('change', () => {
    applyTheme(state.pendingTheme || state.theme);
  });

  // Settings Dialog Control
  DOM.btnSettings.addEventListener('click', openSettings);
  DOM.btnCancelSettings.addEventListener('click', closeSettings);
  DOM.btnCloseSettings.addEventListener('click', closeSettings);
  DOM.settingsModal.addEventListener('click', (e) => {
    if (e.target === DOM.settingsModal) closeSettings();
  });

  DOM.themeSegment.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-opt]');
    if (!btn) return;
    // Xem thử ngay, chỉ lưu khi nhấn "Lưu cài đặt"
    state.pendingTheme = btn.dataset.themeOpt;
    applyTheme(state.pendingTheme);
  });

  DOM.btnTestConn.addEventListener('click', async () => {
    const url = DOM.gasUrlInput.value.trim();
    if (!url) {
      setStatus(DOM.sheetStatusDot, DOM.sheetStatusText, 'error', 'Chưa nhập URL Web App');
      return;
    }
    DOM.btnTestConn.disabled = true;
    setStatus(DOM.sheetStatusDot, DOM.sheetStatusText, 'checking', 'Đang kiểm tra kết nối...');
    const res = await checkConnection(url);
    setStatus(DOM.sheetStatusDot, DOM.sheetStatusText, res.status, sheetStatusMessage(res));
    if (url === state.gasUrl) updateConnectionStatus(res.status, res.message);
    DOM.btnTestConn.disabled = false;
  });

  DOM.btnSaveSettings.addEventListener('click', () => {
    const newUrl = DOM.gasUrlInput.value.trim();
    if (newUrl) {
      if (newUrl !== state.gasUrl) {
        state.gasUrl = newUrl;
        localStorage.setItem('qr_attendance_gas_url', newUrl);
        refreshConnection();
      }
    } else {
      state.gasUrl = '';
      localStorage.removeItem('qr_attendance_gas_url');
      updateConnectionStatus('none', "Chưa cấu hình Google Sheets");
    }

    // Lưu camera đã chọn
    const camId = DOM.cameraSelect.value;
    state.selectedCameraId = camId;
    if (camId) {
      localStorage.setItem('qr_attendance_camera_id', camId);
    } else {
      localStorage.removeItem('qr_attendance_camera_id');
    }

    // Lưu giao diện
    if (state.pendingTheme) setTheme(state.pendingTheme);
    state.pendingTheme = null;

    DOM.settingsModal.classList.remove('active');
  });

  // Chọn ngày: mở bộ chọn ngày gốc của trình duyệt
  DOM.datePickers.forEach(el => el.addEventListener('click', openDatePicker));

  DOM.attendanceDateInput.addEventListener('change', (e) => {
    updateDateIndicator(e.target.value);
  });

  // Chế độ quét (Liên tục / Từng người)
  DOM.modeSegment.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    state.continuousScan = btn.dataset.mode === 'continuous';
    localStorage.setItem('qr_attendance_continuous', state.continuousScan);
    updateModeUI();
  });

  DOM.chkVoice.addEventListener('change', (e) => {
    state.voiceOutput = e.target.checked;
    localStorage.setItem('qr_attendance_voice', state.voiceOutput);
  });

  // Start/Stop Camera
  DOM.btnStartCamera.addEventListener('click', toggleCamera);

  // Switch Camera (khi camera tắt thì mở cài đặt để chọn camera)
  DOM.btnSwitchCamera.addEventListener('click', () => {
    if (state.isCameraActive) {
      switchCamera();
    } else {
      openSettings();
    }
  });

  // Result Confirmation Close
  DOM.btnConfirmResult.addEventListener('click', closeResultPopup);
  DOM.btnSkipResult.addEventListener('click', closeResultPopup);
}

// 7. Các hàm tiện ích giao diện
function resolveTheme(theme) {
  if (theme === 'system') return systemDark.matches ? 'dark' : 'light';
  return theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  DOM.html.setAttribute('data-theme', resolved);
  DOM.themeColorMeta.setAttribute('content', resolved === 'dark' ? '#0E1012' : '#F3F4F1');
  DOM.btnThemeToggle.innerHTML = icon(resolved === 'dark' ? 'sun' : 'moon');
  DOM.themeSegment.querySelectorAll('[data-theme-opt]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeOpt === theme);
  });
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem('qr_attendance_theme', theme);
  applyTheme(theme);
}

function openSettings() {
  DOM.gasUrlInput.value = state.gasUrl;
  state.pendingTheme = null;
  applyTheme(state.theme);
  // Đồng bộ trạng thái kết nối của header vào bảng cài đặt
  DOM.sheetStatusDot.className = DOM.connStatusDot.className;
  DOM.sheetStatusText.textContent = state.gasUrl ? (state.lastCheckText || DOM.connStatusText.textContent) : 'Chưa nhập URL Web App';
  DOM.settingsModal.classList.add('active');
  loadCameraOptions();
}

function closeSettings() {
  // Hủy xem thử theme
  state.pendingTheme = null;
  applyTheme(state.theme);
  DOM.settingsModal.classList.remove('active');
}

function openDatePicker() {
  const input = DOM.attendanceDateInput;
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
  } catch (e) { /* Trình duyệt chặn showPicker → dùng cách dự phòng */ }
  input.focus();
  input.click();
}

function updateModeUI() {
  const mode = state.continuousScan ? 'continuous' : 'single';
  DOM.modeSegment.querySelectorAll('[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  DOM.modeDesc.textContent = state.continuousScan
    ? 'Quét mã kế tiếp ngay, không cần chờ kết quả.'
    : 'Hiện kết quả và chờ xác nhận sau mỗi lượt quét.';
  DOM.statusPillText.textContent = `Đang quét · ${state.continuousScan ? 'Liên tục' : 'Từng người'}`;
}

function formatDisplayDate(dateStr) {
  const parts = (dateStr || '').split('-');
  if (parts.length !== 3) return '';
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  return `${WEEKDAYS[d.getDay()]}, ${parts[2]}/${parts[1]}/${parts[0]}`;
}

function updateDateIndicator(dateStr) {
  const text = formatDisplayDate(dateStr);
  if (!text) return;
  DOM.dateIndicator.innerText = text;
  DOM.dateChipText.innerText = text;
}

function updateSessionCount() {
  DOM.sessionCount.textContent = `Phiên này: ${state.sessionPresent} có mặt`;
}

function setStatus(dotEl, textEl, status, message) {
  dotEl.className = 'status-dot' + (status === 'none' ? '' : ' ' + status);
  textEl.textContent = message;
}

function updateConnectionStatus(status, message) {
  setStatus(DOM.connStatusDot, DOM.connStatusText, status, message);
}

function sheetStatusMessage(res) {
  if (res.status !== 'ok') return res.message;
  const now = new Date();
  return `Đã kết nối · kiểm tra lúc ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Liệt kê và hiển thị danh sách camera trong settings
async function loadCameraOptions() {
  DOM.cameraSelect.innerHTML = '<option value="">Đang tải danh sách camera...</option>';
  DOM.camHint.textContent = '';

  try {
    const cameras = await Html5Qrcode.getCameras();
    state.cameras = cameras;

    if (!cameras || cameras.length === 0) {
      DOM.cameraSelect.innerHTML = '<option value="">Không tìm thấy camera nào</option>';
      DOM.camHint.textContent = 'Hãy cấp quyền camera cho trình duyệt rồi thử lại.';
      return;
    }

    let options = '<option value="">Tự động (ưu tiên góc rộng)</option>';
    cameras.forEach((cam, i) => {
      const rawLabel = cam.label || '';
      const label = formatCameraLabel(rawLabel, i, cameras.length);
      const selected = cam.id === state.selectedCameraId ? ' selected' : '';
      options += `<option value="${escapeHtml(cam.id)}"${selected}>${escapeHtml(label)}</option>`;
    });

    DOM.cameraSelect.innerHTML = options;

    // Nếu chưa chọn, thử pre-select camera góc rộng
    if (!state.selectedCameraId) {
      const wide = cameras.find(c => /wide|ultra|0\.6/i.test(c.label || ''));
      if (wide) DOM.cameraSelect.value = wide.id;
    }

    DOM.camHint.textContent = `Tìm thấy ${cameras.length} camera. Chọn xong nhấn “Lưu cài đặt”.`;
  } catch (e) {
    DOM.cameraSelect.innerHTML = '<option value="">Cần cấp quyền camera trước</option>';
    DOM.camHint.textContent = 'Bật camera một lần rồi vào lại đây để tải danh sách.';
  }
}

function formatCameraLabel(rawLabel, index, total) {
  const isWide = /wide|ultra|0\.6/i.test(rawLabel);
  const isFront = /front|user|facing front/i.test(rawLabel);
  const isBack = /back|rear|environment|facing back/i.test(rawLabel);

  if (isWide) return `Camera góc rộng (0.6×)`;
  if (isFront) return `Camera trước (Front camera)`;
  if (isBack) return `Camera sau (Back camera)`;
  if (!rawLabel) return `Camera ${index + 1}`;
  return rawLabel;
}

// Kiểm tra kết nối đến Google Sheets, trả về { status, message }
async function checkConnection(url) {
  try {
    // Gửi yêu cầu với mã thử nghiệm
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const testUrl = `${url}?scannedId=TEST_CONN&selectedDate=2026-05-24`;
    const response = await fetch(testUrl, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.result && data.result.includes('CONNECTION_OK')) {
        return { status: 'ok', message: "Đã kết nối Google Sheets" };
      }
      // GAS cũ chưa có check TEST_CONN → sẽ tạo cột 24/5. Cần redeploy GAS mới!
      return { status: 'error', message: "GAS cũ – hãy cập nhật & Redeploy Apps Script" };
    }
    return { status: 'error', message: "Lỗi kết nối Web App (HTTP " + response.status + ")" };
  } catch (err) {
    console.error("Lỗi test connection:", err);
    return { status: 'error', message: "Không thể kết nối đến URL Web App" };
  }
}

async function refreshConnection() {
  updateConnectionStatus('checking', "Đang kiểm tra kết nối...");
  const url = state.gasUrl;
  const res = await checkConnection(url);
  if (url !== state.gasUrl) return; // URL đã đổi trong lúc chờ
  updateConnectionStatus(res.status, res.message);
  state.lastCheckText = sheetStatusMessage(res);
}

// 8. Quản lý Camera quét QR (html5-qrcode)
function toggleCamera() {
  if (state.isCameraActive) {
    stopScanning();
  } else {
    startScanning();
  }
}

function getScanConfig() {
  return {
    fps: 10,
    qrbox: function(width, height) {
      const size = Math.min(width, height) * 0.65;
      return { width: size, height: size };
    },
    aspectRatio: 1.0
  };
}

async function startScanning() {
  if (!state.gasUrl) {
    // Chưa cấu hình URL → mở cài đặt để nhập
    openSettings();
    setStatus(DOM.sheetStatusDot, DOM.sheetStatusText, 'error', 'Nhập URL Web App để bắt đầu điểm danh');
    DOM.gasUrlInput.focus();
    return;
  }

  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e){}
  }

  DOM.btnStartCamera.disabled = true;
  DOM.btnStartCamera.innerHTML = '<span class="spinner"></span> Đang khởi động camera...';

  if (!state.html5QrCode) {
    state.html5QrCode = new Html5Qrcode("reader");
  }

  const config = getScanConfig();

  // Dùng camera đã chọn trong cài đặt; nếu chưa chọn thì tự chọn góc rộng
  let primaryCam = { facingMode: "environment" };
  if (state.selectedCameraId) {
    primaryCam = state.selectedCameraId;
    state.activeCameraId = state.selectedCameraId;
  } else {
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        state.cameras = cameras;
        const wide = cameras.find(c => /wide|ultra|0\.6/i.test(c.label || ''));
        if (wide) {
          primaryCam = wide.id; state.activeCameraId = wide.id;
        } else {
          const rear = cameras.filter(c => !/front|user|facing front/i.test(c.label || ''));
          if (rear.length >= 2) { primaryCam = rear[1].id; state.activeCameraId = rear[1].id; }
          else if (rear.length === 1) { primaryCam = rear[0].id; state.activeCameraId = rear[0].id; }
        }
      }
    } catch (e) {
      console.warn('Không thể liệt kê camera, dùng mặc định:', e);
    }
  }

  const onStarted = () => {
    state.isCameraActive = true;
    DOM.btnStartCamera.disabled = false;
    DOM.btnStartCamera.innerHTML = BTN_STOP_HTML;
    DOM.btnStartCamera.classList.replace('btn-accent', 'btn-ink');
    DOM.body.classList.add('scanning');
    DOM.cameraPlaceholder.style.display = 'none';
    DOM.laserLine.style.display = 'block';
  };

  const onFailed = (err, retried) => {
    if (!retried && state.activeCameraId) {
      // Thử lại bằng camera mặc định nếu chọn theo ID thất bại
      state.activeCameraId = null;
      state.html5QrCode.start({ facingMode: "environment" }, config, onQrCodeSuccess, onQrCodeError)
        .then(onStarted)
        .catch(e => onFailed(e, true));
    } else {
      console.error("Không mở được camera:", err);
      alert("Không thể truy cập camera của bạn! Vui lòng cấp quyền camera cho trang web trong phần cài đặt trình duyệt.");
      DOM.btnStartCamera.disabled = false;
      DOM.btnStartCamera.innerHTML = BTN_START_HTML;
    }
  };

  state.html5QrCode.start(primaryCam, config, onQrCodeSuccess, onQrCodeError)
    .then(onStarted)
    .catch(err => onFailed(err, false));
}

function stopScanning() {
  if (state.html5QrCode && state.isCameraActive) {
    DOM.btnStartCamera.disabled = true;
    DOM.btnStartCamera.innerHTML = '<span class="spinner"></span> Đang tắt camera...';

    state.html5QrCode.stop().then(() => {
      state.isCameraActive = false;
      DOM.btnStartCamera.disabled = false;
      DOM.btnStartCamera.innerHTML = BTN_START_HTML;
      DOM.btnStartCamera.classList.replace('btn-ink', 'btn-accent');

      // Ẩn khung quét laser + reset toast/pending
      DOM.body.classList.remove('scanning');
      DOM.cameraPlaceholder.style.display = 'flex';
      DOM.laserLine.style.display = 'none';
      DOM.scanToast.classList.remove('show');
      DOM.pendingIndicator.style.display = 'none';
      state.pendingCount = 0;
      state.activeCameraId = null;
      state.recentScans.clear();
      closeResultPopup();
    }).catch(err => {
      console.error("Lỗi khi tắt camera:", err);
      state.isCameraActive = false;
      DOM.btnStartCamera.disabled = false;
    });
  }
}

async function switchCamera() {
  if (!state.isCameraActive) return;

  DOM.btnSwitchCamera.classList.add('busy');

  try {
    // Lấy lại danh sách camera mới nhất từ trình duyệt
    let cameras = state.cameras;
    if (!cameras || cameras.length === 0) {
      cameras = await Html5Qrcode.getCameras();
      state.cameras = cameras;
    }

    if (!cameras || cameras.length < 2) return;

    const currentIdx = cameras.findIndex(c => c.id === state.activeCameraId);
    const nextIdx = (currentIdx + 1) % cameras.length;
    const next = cameras[nextIdx];

    await state.html5QrCode.stop();
    state.activeCameraId = next.id;

    await state.html5QrCode.start(next.id, getScanConfig(), onQrCodeSuccess, onQrCodeError);
  } catch (err) {
    console.error("Lỗi đổi camera:", err);
  } finally {
    DOM.btnSwitchCamera.classList.remove('busy');
  }
}

function onQrCodeSuccess(decodedText) {
  if (state.continuousScan) {
    // QUEUE MODE: mỗi mã có debounce riêng, không khoá camera toàn cục
    const now = Date.now();
    const lastScan = state.recentScans.get(decodedText);
    if (lastScan && (now - lastScan) < state.SCAN_DEBOUNCE_MS) return;

    state.recentScans.set(decodedText, now);

    // Dọn dẹp các entry đã hết hạn debounce
    for (const [code, ts] of state.recentScans) {
      if (now - ts > state.SCAN_DEBOUNCE_MS) state.recentScans.delete(code);
    }

    // Fire-and-forget: camera tiếp tục quét ngay lập tức
    performAttendance(decodedText);
  } else {
    // SINGLE MODE: khoá toàn cục cho đến khi người dùng xác nhận
    if (state.isProcessing) return;
    state.isProcessing = true;
    performAttendance(decodedText);
  }
}

function onQrCodeError(errorMessage) {
  // Hàm này chạy liên tục khi quét không thấy mã, bỏ qua để tránh rác log
}

// Chuyển thông báo lỗi từ Apps Script thành tiêu đề ngắn + gợi ý
function describeError(message) {
  if (/Không tìm thấy ID/i.test(message)) {
    return {
      title: 'Không tìm thấy mã',
      short: 'Chưa có trong sheet “Data”',
      hint: 'Mã này chưa có trong sheet “Data”. Kiểm tra lại thẻ hoặc thêm thành viên.'
    };
  }
  if (/Không tìm thấy sheet/i.test(message)) {
    return {
      title: 'Thiếu sheet “Data”',
      short: 'Bảng tính chưa có sheet “Data”',
      hint: 'Bảng tính chưa có sheet tên “Data”. Tạo sheet này rồi quét lại.'
    };
  }
  if (/kết nối|Internet|CORS|mạng/i.test(message)) {
    return {
      title: 'Lỗi kết nối',
      short: 'Không thể kết nối Internet',
      hint: 'Không thể kết nối Internet hoặc lỗi CORS. Kiểm tra mạng rồi quét lại.'
    };
  }
  return { title: 'Có lỗi xảy ra', short: message, hint: escapeHtml(message) };
}

// 9. Xử lý logic Điểm Danh qua API Google Sheets
async function performAttendance(qrId) {
  const selectedDate = DOM.attendanceDateInput.value;
  if (!selectedDate) {
    alert("Vui lòng chọn ngày điểm danh trước!");
    if (!state.continuousScan) state.isProcessing = false;
    return;
  }

  if (state.continuousScan) {
    // ── QUEUE MODE: chạy nền, camera không bị block ──
    state.pendingCount++;
    updatePendingBadge();

    try {
      const url = `${state.gasUrl}?scannedId=${encodeURIComponent(qrId)}&selectedDate=${encodeURIComponent(selectedDate)}`;
      const response = await fetch(url, { method: 'GET' });

      if (response.ok) {
        const data = await response.json();
        const resultMessage = data.result || '';

        if (resultMessage.startsWith("SUCCESS:")) {
          const fullName = resultMessage.replace("SUCCESS:", "").trim();
          playAudioAlert(true);
          speakVietnamese("Xin chào " + fullName);
          addHistoryItem(qrId, fullName, true, "Có mặt");
          showScanToast(fullName, `${qrId} · Đã ghi vào Google Sheets`, true);
        } else {
          const err = describeError(resultMessage.replace("ERROR:", "").trim());
          playAudioAlert(false);
          speakVietnamese("Lỗi điểm danh");
          addHistoryItem(qrId, err.title, false, "Lỗi");
          showScanToast(err.title, `${qrId} · ${err.short}`, false);
        }
      } else {
        const errMsg = `Lỗi máy chủ HTTP ${response.status}`;
        playAudioAlert(false);
        addHistoryItem(qrId, errMsg, false, "Lỗi");
        showScanToast(errMsg, qrId, false);
      }
    } catch (err) {
      console.error("Lỗi thực hiện điểm danh:", err);
      playAudioAlert(false);
      addHistoryItem(qrId, "Lỗi kết nối mạng", false, "Lỗi");
      showScanToast("Lỗi kết nối mạng", `${qrId} · Không thể kết nối Internet`, false);
    } finally {
      state.pendingCount--;
      updatePendingBadge();
    }

  } else {
    // ── SINGLE MODE: hiện popup, khoá camera cho đến khi xác nhận ──
    DOM.laserLine.style.display = 'none';
    showResultLoading(qrId);

    try {
      const url = `${state.gasUrl}?scannedId=${encodeURIComponent(qrId)}&selectedDate=${encodeURIComponent(selectedDate)}`;
      const response = await fetch(url, { method: 'GET' });

      if (response.ok) {
        const data = await response.json();
        const resultMessage = data.result || '';

        if (resultMessage.startsWith("SUCCESS:")) {
          const fullName = resultMessage.replace("SUCCESS:", "").trim();
          handleScanSuccess(qrId, fullName);
        } else {
          const errorDetail = resultMessage.replace("ERROR:", "").trim();
          handleScanError(qrId, errorDetail);
        }
      } else {
        handleScanError(qrId, `Lỗi máy chủ Google (HTTP ${response.status})`);
      }
    } catch (err) {
      console.error("Lỗi thực hiện điểm danh:", err);
      handleScanError(qrId, "Không thể kết nối Internet hoặc lỗi CORS!");
    }
  }
}

// Xử lý khi Quét và Điểm danh THÀNH CÔNG (chỉ dùng ở single scan mode)
function handleScanSuccess(id, fullName) {
  playAudioAlert(true);
  speakVietnamese("Xin chào " + fullName);

  const now = new Date();
  const dateParts = DOM.attendanceDateInput.value.split('-');

  DOM.resultPopup.className = "result-popup active success";
  DOM.resultIcon.innerHTML = `<span>${icon('check')}</span>`;
  DOM.resultTitle.innerText = "Điểm danh thành công";
  DOM.resultName.innerText = fullName;
  DOM.resultId.innerText = id;
  DOM.resultDate.innerText = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : '';
  DOM.resultTime.innerText = formatTime(now);
  DOM.resultHint.innerHTML = '';

  addHistoryItem(id, fullName, true, "Có mặt");

  DOM.btnConfirmResult.innerText = "Xác nhận & quét tiếp";
}

// Xử lý khi Quét THẤT BẠI (Lỗi hệ thống hoặc ID không khớp)
function handleScanError(id, errorMessage) {
  // Phát âm trầm báo lỗi
  playAudioAlert(false);

  // Đọc âm lỗi
  speakVietnamese("Lỗi điểm danh");

  const err = describeError(errorMessage);

  // Cập nhật giao diện thông báo lỗi
  DOM.resultPopup.className = "result-popup active error";
  DOM.resultIcon.innerHTML = `<span>${icon('alert')}</span>`;
  DOM.resultTitle.innerText = "Điểm danh thất bại";
  DOM.resultName.innerText = err.title;
  DOM.resultId.innerText = id;
  DOM.resultHint.innerHTML = err.hint;

  DOM.btnConfirmResult.innerText = "Quét lại";

  addHistoryItem(id, err.title, false, "Lỗi");

  clearTimeout(state.autoCloseTimeout);
}

// Giao diện trung gian khi chờ phản hồi API
function showResultLoading(id) {
  DOM.resultPopup.className = "result-popup active loading";
  DOM.resultIcon.innerHTML = '<span><span class="spinner"></span></span>';
  DOM.resultTitle.innerText = "Đang xác thực";
  DOM.resultName.innerText = "Đang kiểm tra bảng điểm danh...";
  DOM.resultId.innerText = id;
  DOM.resultHint.innerHTML = '';
}

// Đóng popup kết quả và khôi phục quét camera
function closeResultPopup() {
  clearTimeout(state.autoCloseTimeout);
  DOM.resultPopup.classList.remove('active');

  // Bật lại hiệu ứng quét laser
  if (state.isCameraActive) {
    DOM.laserLine.style.display = 'block';
  }

  // Chờ 500ms (sau khi đóng xong hiệu ứng) để tránh quét lại lập tức mã cũ
  setTimeout(() => {
    state.isProcessing = false;
  }, 600);
}

// Toast nhanh trong vùng camera (chế độ liên tục)
function showScanToast(text, subText, isSuccess) {
  DOM.scanToast.className = 'scan-toast ' + (isSuccess ? 'success-toast' : 'error-toast');
  DOM.scanToastIcon.innerHTML = icon(isSuccess ? 'check' : 'alert');
  DOM.scanToastName.textContent = text;
  DOM.scanToastId.textContent = subText;

  DOM.scanToast.classList.add('show');

  clearTimeout(state.toastTimeout);
  if (isSuccess) {
    state.toastTimeout = setTimeout(() => {
      DOM.scanToast.classList.remove('show');
    }, 2000);
  }
  // Lỗi: toast giữ nguyên đến khi quét thành công lần tiếp
}

// Cập nhật badge số request đang pending
function updatePendingBadge() {
  if (state.pendingCount > 0) {
    DOM.pendingIndicator.style.display = 'inline-flex';
    DOM.pendingText.textContent = state.pendingCount;
  } else {
    DOM.pendingIndicator.style.display = 'none';
  }
}

// 10. Quản lý Lịch sử Quét (Local Session Logs)
function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatShortDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Lấy chữ cái đầu của 2 từ cuối trong tên (VD: "Maria Nguyễn Thị Lan" → "TL")
function getInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(-2).map(w => w[0]).join('').toUpperCase();
}

function addHistoryItem(id, name, success, note) {
  const now = new Date();

  const newItem = {
    id: id,
    name: name,
    date: formatShortDate(now),
    time: formatTime(now),
    success: success,
    note: note
  };

  if (success) {
    state.sessionPresent++;
    updateSessionCount();
  }

  // Thêm vào đầu mảng
  state.scanHistory.unshift(newItem);

  // Giới hạn tối đa lưu 30 bản ghi gần nhất
  if (state.scanHistory.length > 30) {
    state.scanHistory.pop();
  }

  // Lưu vào localStorage
  localStorage.setItem('qr_attendance_history', JSON.stringify(state.scanHistory));

  // Vẽ lại bảng lịch sử
  renderHistory();
}

function renderHistory() {
  DOM.logCount.innerText = `${state.scanHistory.length} lượt`;

  if (state.scanHistory.length === 0) {
    DOM.logList.innerHTML = '<div class="log-empty">Chưa có ai điểm danh trong phiên này</div>';
    return;
  }

  const today = formatShortDate(new Date());

  DOM.logList.innerHTML = state.scanHistory.map(item => {
    const time = (item.time || '').slice(0, 5);
    const when = item.date && item.date !== today ? `${item.date} ${time}` : time;
    return `
      <div class="log-item${item.success ? '' : ' fail'}">
        <div class="avatar">${item.success ? escapeHtml(getInitials(item.name)) : '!'}</div>
        <div class="log-info">
          <div class="log-name">${escapeHtml(item.name)}</div>
          <div class="log-details">${escapeHtml(item.id)} · ${when}</div>
        </div>
        <span class="badge">${item.success ? 'Có mặt' : 'Lỗi'}</span>
      </div>
    `;
  }).join('');
}
