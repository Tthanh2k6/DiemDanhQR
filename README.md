# QR Attendance — Công cụ điểm danh cá nhân bằng mã QR

> **Lưu ý:** Đây là công cụ tác giả tự xây dựng để phục vụ việc điểm danh của chính mình cho một cộng đồng nhỏ. Không phải sản phẩm thương mại, không có hỗ trợ kỹ thuật chính thức. Ai muốn dùng thì tự cấu hình theo hướng dẫn bên dưới.

---

## Nó làm gì?

Mở trên điện thoại, bật camera, quét mã QR của từng thành viên → tự động ghi điểm danh vào Google Sheets. Không cần server riêng, không cần cài app từ store.

**Luồng hoạt động:**

```text
Điện thoại quét QR  →  Gọi Google Apps Script  →  Ghi vào Google Sheets
```

---

## Tính năng

- Quét camera trực tiếp, nhận diện QR nhanh
- Hai chế độ: **Quét liên tục** (không cần xác nhận) và **Quét từng người** (chờ xác nhận)
- Phát âm thanh + đọc tên tiếng Việt khi điểm danh thành công
- Lịch sử quét hiển thị ngay trên màn hình
- Lưu kết quả trực tiếp vào Google Sheets theo ngày
- Hỗ trợ chọn camera (góc rộng, camera trước, camera sau...)
- Cài được lên màn hình chính như app thông thường (PWA)
- Dark mode / Light mode

---

## Yêu cầu

- Một tài khoản Google
- Một file Google Sheets đã có sẵn danh sách thành viên và mã QR tương ứng
- Điện thoại có camera, dùng Chrome (Android) hoặc Safari (iOS)

---

## Cài đặt

### Bước 1 — Cắm script vào Google Sheets

1. Mở Google Sheets của bạn
2. Chọn **Tiện ích mở rộng → Apps Script**
3. Xóa toàn bộ code mặc định, dán nội dung file [`google-apps-script.js`](google-apps-script.js) vào
4. Nhấn **Lưu**

### Bước 2 — Triển khai thành Web App

1. Trong Apps Script, nhấn **Triển khai → Triển khai mới**
2. Chọn loại: **Ứng dụng web**
3. Cấu hình:
   - Thực thi dưới danh nghĩa: **Tôi**
   - Ai có quyền truy cập: **Mọi người**
4. Nhấn **Triển khai**, cấp quyền nếu Google yêu cầu
5. Sao chép **URL ứng dụng web** (`https://script.google.com/macros/s/.../exec`)

### Bước 3 — Kết nối App với Sheets

1. Mở app (file `index.html` hoặc link GitHub Pages)
2. Nhấn biểu tượng **⚙️ Cài đặt** góc trên phải
3. Dán URL vừa sao chép vào ô **Google Apps Script URL**
4. Nhấn **Lưu cài đặt**
5. Đèn trạng thái chuyển xanh = đã kết nối

---

## Chọn camera (tùy chọn)

Vào **⚙️ Cài đặt → Lựa chọn Camera** để chọn ống kính cụ thể (góc rộng, camera trước, v.v.). Cần bật camera ít nhất một lần trước để trình duyệt cấp quyền enumerate danh sách.

---

## Cài lên điện thoại như app (PWA)

**Android / Chrome:** Nhấn biểu tượng 3 chấm → *Thêm vào màn hình chính*

**iOS / Safari:** Nhấn nút Chia sẻ → *Thêm vào MH chính*

---

## Hosting miễn phí

Đẩy code lên GitHub, bật **GitHub Pages** từ nhánh `main` là xong. Xem chi tiết trong file [`Huong_dan_Hosting.md`](Huong_dan_Hosting.md).

---

## Giấy phép

Không có. Dùng thoải mái, sửa thoải mái — nhưng đừng hỏi tác giả khi gặp lỗi.
