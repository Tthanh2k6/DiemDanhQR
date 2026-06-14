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
  isCameraActive: false,
  html5QrCode: null,
  cameras: [],                // Danh sách camera khả dụng
  activeCameraId: null,       // ID camera đang dùng
  scanHistory: (() => { try { return JSON.parse(localStorage.getItem('qr_attendance_history')) || []; } catch(e) { return []; } })(),
  theme: localStorage.getItem('qr_attendance_theme') || 'dark',
  continuousScan: localStorage.getItem('qr_attendance_continuous') !== 'false', // Default true
  voiceOutput: localStorage.getItem('qr_attendance_voice') !== 'false', // Default true
  autoCloseTimeout: null,
  toastTimeout: null
};

// 2. Định nghĩa các phần tử DOM (DOM Elements)
const DOM = {
  html: document.documentElement,
  gasUrlInput: document.getElementById('gasUrl'),
  attendanceDateInput: document.getElementById('attendanceDate'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  btnSettings: document.getElementById('btnSettings'),
  settingsModal: document.getElementById('settingsModal'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnCancelSettings: document.getElementById('btnCancelSettings'),
  connStatusDot: document.getElementById('connStatusDot'),
  connStatusText: document.getElementById('connStatusText'),
  dateIndicator: document.getElementById('dateIndicator'),
  btnStartCamera: document.getElementById('btnStartCamera'),
  cameraPlaceholder: document.getElementById('cameraPlaceholder'),
  scannerOverlay: document.getElementById('scannerOverlay'),
  laserLine: document.getElementById('laserLine'),
  chkContinuous: document.getElementById('chkContinuous'),
  chkVoice: document.getElementById('chkVoice'),
  
  // Hộp thoại Kết quả (Result Popup - single scan mode)
  resultPopup: document.getElementById('resultPopup'),
  resultIcon: document.getElementById('resultIcon'),
  resultTitle: document.getElementById('resultTitle'),
  resultName: document.getElementById('resultName'),
  resultId: document.getElementById('resultId'),
  btnConfirmResult: document.getElementById('btnConfirmResult'),

  // Toast nhanh (continuous mode)
  scanToast: document.getElementById('scanToast'),
  scanToastIcon: document.getElementById('scanToastIcon'),
  scanToastName: document.getElementById('scanToastName'),
  scanToastId: document.getElementById('scanToastId'),
  pendingIndicator: document.getElementById('pendingIndicator'),
  pendingText: document.getElementById('pendingText'),
  btnSwitchCamera: document.getElementById('btnSwitchCamera'),

  // Bảng Lịch sử (Logs)
  logList: document.getElementById('logList'),
  logCount: document.getElementById('logCount')
};

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
  // Cài đặt Theme mặc định
  DOM.html.setAttribute('data-theme', state.theme);
  updateThemeIcon();
  
  // Nạp cấu hình lưu trữ
  if (state.gasUrl) {
    DOM.gasUrlInput.value = state.gasUrl;
    testSheetConnection(state.gasUrl);
  } else {
    updateConnectionStatus(false, "Chưa cấu hình Google Sheet");
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
  
  // Đặt các ô kiểm Toggle đúng trạng thái lưu trữ
  DOM.chkContinuous.checked = state.continuousScan;
  DOM.chkVoice.checked = state.voiceOutput;
  
  // Nạp và vẽ Lịch sử
  renderHistory();
}

// 6. Đăng ký các sự kiện tương tác (Event Listeners)
function registerEvents() {
  // Theme Toggle
  DOM.btnThemeToggle.addEventListener('click', toggleTheme);
  
  // Settings Dialog Control
  DOM.btnSettings.addEventListener('click', () => {
    DOM.gasUrlInput.value = state.gasUrl;
    DOM.settingsModal.classList.add('active');
  });
  
  DOM.btnCancelSettings.addEventListener('click', () => {
    DOM.settingsModal.classList.remove('active');
  });
  
  DOM.btnSaveSettings.addEventListener('click', () => {
    const newUrl = DOM.gasUrlInput.value.trim();
    if (newUrl) {
      state.gasUrl = newUrl;
      localStorage.setItem('qr_attendance_gas_url', newUrl);
      testSheetConnection(newUrl);
    } else {
      state.gasUrl = '';
      localStorage.removeItem('qr_attendance_gas_url');
      updateConnectionStatus(false, "Chưa cấu hình Google Sheet");
    }
    DOM.settingsModal.classList.remove('active');
  });
  
  // Date Input change
  DOM.attendanceDateInput.addEventListener('change', (e) => {
    updateDateIndicator(e.target.value);
  });
  
  // Toggles Change
  DOM.chkContinuous.addEventListener('change', (e) => {
    state.continuousScan = e.target.checked;
    localStorage.setItem('qr_attendance_continuous', state.continuousScan);
  });
  
  DOM.chkVoice.addEventListener('change', (e) => {
    state.voiceOutput = e.target.checked;
    localStorage.setItem('qr_attendance_voice', state.voiceOutput);
  });
  
  // Start/Stop Camera
  DOM.btnStartCamera.addEventListener('click', toggleCamera);

  // Switch Camera
  DOM.btnSwitchCamera.addEventListener('click', switchCamera);
  
  // Result Confirmation Close
  DOM.btnConfirmResult.addEventListener('click', () => {
    closeResultPopup();
  });
  
  // Close Result when tapping overlay in Continuous mode
  DOM.resultPopup.addEventListener('click', (e) => {
    if (e.target === DOM.resultPopup && !state.continuousScan) {
      closeResultPopup();
    }
  });
}

// 7. Các hàm tiện ích giao diện
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  DOM.html.setAttribute('data-theme', state.theme);
  localStorage.setItem('qr_attendance_theme', state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = DOM.btnThemeToggle.querySelector('i');
  if (state.theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
  }
}

function updateDateIndicator(dateStr) {
  if (!dateStr) return;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    DOM.dateIndicator.innerText = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
}

function updateConnectionStatus(success, message) {
  if (success) {
    DOM.connStatusDot.className = 'status-dot active';
    DOM.connStatusText.innerText = message || "Đã kết nối Google Sheet";
    DOM.connStatusText.style.color = 'var(--success)';
  } else {
    DOM.connStatusDot.className = 'status-dot';
    DOM.connStatusText.innerText = message || "Không có kết nối";
    DOM.connStatusText.style.color = 'var(--error)';
  }
}

// Kiểm tra kết nối đến Google Sheets
async function testSheetConnection(url) {
  updateConnectionStatus(false, "Đang kiểm tra kết nối...");
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
        updateConnectionStatus(true, "Bảng tính: Sẵn sàng");
      } else {
        // GAS cũ chưa có check TEST_CONN → sẽ tạo cột 24/5. Cần redeploy GAS mới!
        updateConnectionStatus(false, "⚠️ GAS cũ - Hãy cập nhật & Redeploy Google Apps Script!");
      }
    } else {
      updateConnectionStatus(false, "Lỗi kết nối Web App (HTTP " + response.status + ")");
    }
  } catch (err) {
    console.error("Lỗi test connection:", err);
    updateConnectionStatus(false, "Không thể kết nối đến URL Web App!");
  }
}

// 8. Quản lý Camera quét QR (html5-qrcode)
function toggleCamera() {
  if (state.isCameraActive) {
    stopScanning();
  } else {
    startScanning();
  }
}

async function startScanning() {
  if (!state.gasUrl) {
    alert("Vui lòng click vào biểu tượng Răng cưa cài đặt ở góc trên bên phải để cấu hình URL Google Sheet trước!");
    DOM.btnSettings.click();
    return;
  }

  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e){}
  }

  DOM.btnStartCamera.disabled = true;
  DOM.btnStartCamera.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang khởi động camera...';

  if (!state.html5QrCode) {
    state.html5QrCode = new Html5Qrcode("reader");
  }

  const config = {
    fps: 10,
    qrbox: function(width, height) {
      const size = Math.min(width, height) * 0.65;
      return { width: size, height: size };
    },
    aspectRatio: 1.0
  };

  // Tự động chọn camera góc rộng (0.6x) nếu có
  let primaryCam = { facingMode: "environment" };
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (cameras && cameras.length > 0) {
      state.cameras = cameras;

      // Tìm camera góc rộng qua nhãn
      const wide = cameras.find(c => /wide|ultra|0\.6|góc.rộng/i.test(c.label || ''));
      if (wide) {
        primaryCam = wide.id;
        state.activeCameraId = wide.id;
      } else {
        // Lọc camera sau (loại bỏ camera trước)
        const rear = cameras.filter(c => !/front|user|facing front|trước/i.test(c.label || ''));
        if (rear.length >= 2) {
          // Camera sau thứ 2 thường là góc rộng trên điện thoại 3-camera
          primaryCam = rear[1].id;
          state.activeCameraId = rear[1].id;
        } else if (rear.length === 1) {
          primaryCam = rear[0].id;
          state.activeCameraId = rear[0].id;
        }
      }

      if (cameras.length > 1) {
        DOM.btnSwitchCamera.style.display = 'flex';
      }
    }
  } catch (e) {
    console.warn('Không thể liệt kê camera, dùng mặc định:', e);
  }

  const onStarted = () => {
    state.isCameraActive = true;
    DOM.btnStartCamera.disabled = false;
    DOM.btnStartCamera.innerHTML = '<i class="fa-solid fa-power-off"></i> Tắt Camera Điểm Danh';
    DOM.btnStartCamera.style.background = 'linear-gradient(135deg, var(--error), #d90429)';
    DOM.btnStartCamera.style.boxShadow = '0 10px 25px var(--error-glow)';
    DOM.cameraPlaceholder.style.display = 'none';
    DOM.scannerOverlay.style.display = 'block';
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
      DOM.btnStartCamera.innerHTML = '<i class="fa-solid fa-camera"></i> Bật Camera Điểm Danh';
    }
  };

  state.html5QrCode.start(primaryCam, config, onQrCodeSuccess, onQrCodeError)
    .then(onStarted)
    .catch(err => onFailed(err, false));
}

function stopScanning() {
  if (state.html5QrCode && state.isCameraActive) {
    DOM.btnStartCamera.disabled = true;
    DOM.btnStartCamera.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tắt camera...';
    
    state.html5QrCode.stop().then(() => {
      state.isCameraActive = false;
      DOM.btnStartCamera.disabled = false;
      DOM.btnStartCamera.innerHTML = '<i class="fa-solid fa-camera"></i> Bật Camera Điểm Danh';
      DOM.btnStartCamera.style.background = '';
      DOM.btnStartCamera.style.boxShadow = '';
      
      // Ẩn khung quét laser + reset toast/pending
      DOM.cameraPlaceholder.style.display = 'flex';
      DOM.scannerOverlay.style.display = 'none';
      DOM.laserLine.style.display = 'none';
      DOM.scanToast.classList.remove('show');
      DOM.pendingIndicator.style.display = 'none';
      DOM.btnSwitchCamera.style.display = 'none';
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
  if (!state.isCameraActive || state.cameras.length < 2) return;

  const currentIdx = state.cameras.findIndex(c => c.id === state.activeCameraId);
  const nextIdx = (currentIdx + 1) % state.cameras.length;
  const next = state.cameras[nextIdx];

  DOM.btnSwitchCamera.innerHTML = '<i class="fa-solid fa-camera-rotate fa-spin"></i>';

  try {
    await state.html5QrCode.stop();
    state.activeCameraId = next.id;

    const config = {
      fps: 10,
      qrbox: function(width, height) {
        const size = Math.min(width, height) * 0.65;
        return { width: size, height: size };
      },
      aspectRatio: 1.0
    };

    await state.html5QrCode.start(next.id, config, onQrCodeSuccess, onQrCodeError);
  } catch (err) {
    console.error("Lỗi đổi camera:", err);
  } finally {
    DOM.btnSwitchCamera.innerHTML = '<i class="fa-solid fa-camera-rotate"></i>';
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
          addHistoryItem(qrId, fullName, true, "Thành công");
          showScanToast(fullName, qrId, true);
        } else {
          const errorDetail = resultMessage.replace("ERROR:", "").trim();
          playAudioAlert(false);
          speakVietnamese("Lỗi điểm danh");
          addHistoryItem(qrId, errorDetail, false, "Thất bại");
          showScanToast(errorDetail, qrId, false);
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
      addHistoryItem(qrId, "Lỗi kết nối mạng", false, "Lỗi mạng");
      showScanToast("Không thể kết nối Internet!", qrId, false);
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

  DOM.resultPopup.className = "result-popup active success";
  DOM.resultIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
  DOM.resultTitle.innerText = "ĐIỂM DANH THÀNH CÔNG";
  DOM.resultName.innerText = fullName;
  DOM.resultId.innerText = `Mã số: ${id}`;

  addHistoryItem(id, fullName, true, "Thành công");

  DOM.btnConfirmResult.style.display = 'block';
  DOM.btnConfirmResult.innerText = "Xác nhận & Quét tiếp";
}

// Xử lý khi Quét THẤT BẠI (Lỗi hệ thống hoặc ID không khớp)
function handleScanError(id, errorMessage) {
  // Phát âm trầm báo lỗi
  playAudioAlert(false);
  
  // Đọc âm lỗi
  speakVietnamese("Lỗi điểm danh");
  
  // Cập nhật giao diện thông báo lỗi
  DOM.resultPopup.className = "result-popup active error";
  DOM.resultIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
  DOM.resultTitle.innerText = "ĐIỂM DANH THẤT BẠI";
  DOM.resultName.innerText = errorMessage;
  DOM.resultId.innerText = `Mã quét: ${id}`;
  
  DOM.btnConfirmResult.style.display = 'block';
  DOM.btnConfirmResult.innerText = "Thử lại";

  addHistoryItem(id, errorMessage, false, "Thất bại");

  clearTimeout(state.autoCloseTimeout);
}

// Giao diện trung gian khi chờ phản hồi API
function showResultLoading(id) {
  DOM.resultPopup.className = "result-popup active";
  DOM.resultPopup.style.background = "rgba(18, 22, 38, 0.95)";
  DOM.resultIcon.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: var(--primary)"></i>';
  DOM.resultTitle.innerText = "ĐANG XÁC THỰC";
  DOM.resultTitle.style.color = "var(--primary)";
  DOM.resultName.innerText = "Đang kiểm tra bảng điểm danh...";
  DOM.resultId.innerText = `ID: ${id}`;
  DOM.btnConfirmResult.style.display = 'none';
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
function showScanToast(text, id, isSuccess) {
  DOM.scanToast.className = 'scan-toast ' + (isSuccess ? 'success-toast' : 'error-toast');
  DOM.scanToastIcon.innerHTML = isSuccess
    ? '<i class="fa-solid fa-circle-check"></i>'
    : '<i class="fa-solid fa-triangle-exclamation"></i>';
  DOM.scanToastName.textContent = text;
  DOM.scanToastId.textContent = `Mã: ${id}`;

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
    DOM.pendingIndicator.style.display = 'flex';
    DOM.pendingText.textContent = state.pendingCount;
  } else {
    DOM.pendingIndicator.style.display = 'none';
  }
}

// 10. Quản lý Lịch sử Quét (Local Session Logs)
function addHistoryItem(id, name, success, note) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;

  const newItem = {
    id: id,
    name: name,
    date: dateStr,
    time: timeStr,
    success: success,
    note: note
  };
  
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
  if (state.scanHistory.length === 0) {
    DOM.logList.innerHTML = '<div class="log-empty">Chưa có ai điểm danh trong phiên này</div>';
    DOM.logCount.innerText = 'Đã quét: 0';
    return;
  }
  
  DOM.logCount.innerText = `Đã quét: ${state.scanHistory.length}`;
  
  let html = '';
  state.scanHistory.forEach(item => {
    const successIcon = item.success 
      ? `<i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 16px;"></i>`
      : `<i class="fa-solid fa-circle-xmark" style="color: var(--error); font-size: 16px;"></i>`;
      
    html += `
      <div class="log-item">
        <div class="log-info-group">
          <span class="log-name">${item.name}</span>
          <span class="log-details">${item.id} • ${item.note}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="log-time">${item.date ? item.date + ' ' : ''}${item.time}</span>
          ${successIcon}
        </div>
      </div>
    `;
  });
  
  DOM.logList.innerHTML = html;
}
