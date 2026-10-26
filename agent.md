# Hướng dẫn Làm việc & Cập nhật Tài liệu cho AI Agent (`DiemDanhQR`)

> **Tệp tài liệu kiến trúc nguồn:** [`CODEBASE.md`](./CODEBASE.md)
> **Frontend PWA:** [`index.html`](./index.html) · [`style.css`](./style.css) · [`app.js`](./app.js) · [`sw.js`](./sw.js) · [`manifest.json`](./manifest.json)
> **Backend Google Sheets:** [`google-apps-script.js`](./google-apps-script.js) · **Dev Server:** [`server.js`](./server.js)

---

## 1. Mục đích của Tệp này

Tệp `agent.md` giúp mọi AI Agent ở các phiên chat mới và tác giả dự án nắm bắt tức thì kiến trúc PWA + Google Apps Script của **QR Attendance (`DiemDanhQR`)**, tránh các lỗi kinh điển của PWA cache / GAS deployment, và duy trì [`CODEBASE.md`](./CODEBASE.md) luôn cập nhật sau mỗi lần sửa đổi.

---

## 2. Quy trình BẮT BUỘC Trước Khi Sửa Code (Read-First Protocol)

1. **Bước 1:** Đọc **Mục 2** (Kiến trúc & 2 chế độ quét), **Mục 5** (Schema Sheet `Data` & API) và **Mục 8** (Các bất biến về Cache PWA & Google Sheets) trong [`CODEBASE.md`](./CODEBASE.md).
2. **Bước 2 — Định tuyến nhanh đến tệp cần sửa:**

| Khi cần thực hiện công việc... | Đọc mục nào trong `CODEBASE.md` | Mở và kiểm tra tệp nguồn |
| :--- | :--- | :--- |
| Sửa logic camera, chọn ống kính, tốc độ quét QR | Mục 4.1.E | `app.js`: `loadCameraOptions()`, `startScanning()`, `stopScanning()`, `switchCamera()` (`448–687`) |
| Sửa chế độ Quét liên tục (Queue/Debounce) hoặc Từng người (Popup) | Mục 2.2, 4.1.F | `app.js`: `onQrCodeSuccess()`, `performAttendance()`, `handleScanSuccess/Error()` (`689–923`) |
| Sửa tiếng bíp Web Audio hoặc giọng đọc tiếng Việt TTS | Mục 4.1.B, 4.1.C | `app.js`: `playAudioAlert()` (`108–156`), `speakVietnamese()` (`168–195`) |
| Sửa giao diện, màu Light/Dark, hiệu ứng khung ngắm hoặc Bottom Sheet cài đặt | Mục 4.1.A, 6 | `index.html` (`1–257`), `style.css` (`1–1023`), `applyTheme()` trong `app.js` (`352–389`) |
| Sửa cách tìm thành viên, định dạng cột ngày hoặc dữ liệu trả về từ Google Sheets | Mục 4.2, 5.1, 5.3, 8.1, 8.4, 8.5 | `google-apps-script.js`: `doGet()` & `processScan()` (`19–122`) |
| Sửa cấu hình cài đặt App PWA hoặc bộ nhớ đệm Offline | Mục 4.3, 8.2, 8.3 | `manifest.json` (`1–24`), `sw.js` (`1–61`) |
| Sửa server chạy thử cục bộ trên máy tính | Mục 4.3, 7.1, 8.6 | `server.js` (`1–54`), `Chay_App.bat` (`1–14`) |

---

## 3. Các Bất biến Kỹ thuật & Quy tắc An toàn Riêng của Dự án (Guardrails)

1. **LUÔN tăng phiên bản `CACHE_NAME` trong `sw.js` khi sửa `index.html`, `style.css`, `app.js` hoặc `manifest.json`:** Do `sw.js` áp dụng chiến lược **Cache-first**, nếu quên nâng version cache (ví dụ `v2` → `v3`), người dùng mở PWA trên điện thoại sẽ không bao giờ nhận được bản code mới!
2. **Không bao giờ xóa điều kiện bypass `script.google.com` và `googleusercontent.com` trong `sw.js`:** API điểm danh và kiểm tra kết nối tuyệt đối không được đi qua bộ nhớ đệm Service Worker.
3. **Bảo toàn nhánh kiểm tra `scannedId === "TEST_CONN"` trong `google-apps-script.js` và `checkConnection()` trong `app.js`:** Đảm bảo thao tác kiểm tra kết nối không ghi rác hoặc tự sinh cột ngày thử nghiệm lên bảng tính thật.
4. **Giữ tương thích cấu trúc 4 cột đầu (`A: Mã`, `B: Tên Thánh`, `C: Họ Tên`, `D: Dự phòng`) và cột `E+` cho ngày `dd-MM-yyyy`** trên sheet `Data`, trừ khi người dùng chủ động yêu cầu thiết kế lại bảng tính (và khi đó phải nhắc người dùng Redeploy bản mới trên Google Apps Script).
5. **Mọi dữ liệu tên/mã chèn vào `innerHTML` phải qua `escapeHtml(...)`:** Nội dung mã QR đến từ bên ngoài camera, không bao giờ nối chuỗi thẳng vào HTML mà không escape.

---

## 4. Quy trình BẮT BUỘC Cập nhật Tài liệu Sau Mỗi Lần Sửa Code (Post-Edit Sync Protocol)

> **QUY TẮC BẮT BUỘC:** Sau khi hoàn tất chỉnh sửa bất kỳ tệp nào trong `d:\Project\DiemDanhQR`, bạn **PHẢI** cập nhật [`CODEBASE.md`](./CODEBASE.md) ngay trong cùng phiên làm việc!

| Loại thay đổi trong code | Các mục cần cập nhật trong `CODEBASE.md` | Cập nhật thêm tại `agent.md` / `README.md`? |
| :--- | :--- | :--- |
| Thêm / xóa tệp nguồn hoặc nâng cấp thư viện CDN (`html5-qrcode`, font, icon) | **Mục 1.2**, **Mục 3** (File Map), **Mục 4.3** (`ASSETS_TO_CACHE` của `sw.js`) | Cập nhật danh sách file cần upload trong `Huong_dan_Hosting.md` & `README.md` |
| Thay đổi trạng thái `state`, khóa `localStorage`, logic camera, âm thanh, chế độ quét | **Mục 2.2**, **Mục 4.1**, **Mục 5.2** (Bảng khóa `localStorage`) | Cập nhật bảng định tuyến **Mục 2** `agent.md` nếu thêm nhóm tính năng mới |
| Thay đổi tham số hoặc định dạng phản hồi giữa `app.js` và `google-apps-script.js` | **Mục 2.1** (Sequence Diagram), **Mục 4.2**, **Mục 5.1 & 5.3** | Nhắc rõ người dùng Redeploy GAS mới và cập nhật `README.md` |
| Thay đổi giao diện HTML/CSS, biến màu theme hoặc kích thước khung quét | **Mục 6** | Không cần |
| Nâng phiên bản `CACHE_NAME` trong `sw.js` | **Mục 1.2**, **Mục 2.1**, **Mục 4.3** | Không cần |

Cuối cùng, luôn ghi thêm 1 dòng vào **Mục 9 (Nhật ký Cập nhật Tài liệu)** trong `CODEBASE.md`.

---

## 5. Lệnh Kiểm tra Nhanh & Checklist Hoàn tất

### Kiểm tra cú pháp JavaScript & JSON
```powershell
node --check "d:\Project\DiemDanhQR\app.js"
node --check "d:\Project\DiemDanhQR\sw.js"
node --check "d:\Project\DiemDanhQR\server.js"
node --check "d:\Project\DiemDanhQR\google-apps-script.js"
python -c "import json; json.load(open(r'd:\Project\DiemDanhQR\manifest.json', encoding='utf-8')); print('manifest OK')"
```

### Checklist trước khi báo cáo hoàn thành
- [ ] Tất cả các tệp `.js` và `manifest.json` đều vượt qua kiểm tra cú pháp?
- [ ] Nếu có sửa `index.html` / `style.css` / `app.js` / `manifest.json`, đã tăng `CACHE_NAME` trong `sw.js` chưa?
- [ ] Nếu có sửa `google-apps-script.js`, đã nhắc người dùng vào Apps Script bấm *Manage deployments → New version → Deploy* chưa?
- [ ] Đã đồng bộ đầy đủ nội dung mới vào `CODEBASE.md` và ghi nhận ở **Mục 9 Changelog**?
