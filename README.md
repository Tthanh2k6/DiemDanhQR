# 📱 QR Attendance Pro - App Điểm Danh Bằng QR Code (PWA)

Chào mừng bạn đến với **QR Attendance Pro**! Đây là ứng dụng quét mã QR để điểm danh nhanh chóng, chạy trực tiếp trên trình duyệt điện thoại/máy tính của bạn dưới dạng **PWA (Progressive Web App)** và lưu trực tiếp dữ liệu điểm danh về Google Sheets mà không cần dùng server trung gian.

Ứng dụng được thiết kế theo phong cách **Glassmorphism hiện đại (Dark Mode mặc định)**, hỗ trợ quét camera trực tiếp siêu mượt, tự động phát âm thanh thông báo và **đọc tên bằng tiếng Việt** khi điểm danh thành công!

---

## 🛠️ Hướng dẫn cài đặt nhanh (Mất 2 phút)

Để ứng dụng kết nối trực tiếp đến bảng tính Google Sheets của bạn, hãy làm theo các bước đơn giản sau:

### Bước 1: Cấu hình mã trên Google Sheets
1. Mở bảng tính Google Sheet **"Bảng điểm danh Giới Trẻ"** của bạn.
2. Trên thanh công cụ, chọn **Tiện ích mở rộng** (Extensions) -> **Apps Script**.
3. Xóa toàn bộ mã code mặc định đang có trong khung soạn thảo.
4. Mở file [google-apps-script.js](google-apps-script.js) trong thư mục này, sao chép toàn bộ nội dung và dán vào Apps Script.
5. Nhấp vào nút **Lưu** (biểu tượng ổ đĩa ở phía trên).

### Bước 2: Triển khai thành Web App API (Cực kỳ quan trọng)
1. Ở góc trên bên phải trang Apps Script, nhấp vào nút **Triển khai** (Deploy) -> chọn **Triển khai mới** (New deployment).
2. Nhấp vào biểu tượng bánh răng ở mục "Chọn loại" -> chọn **Ứng dụng web** (Web app).
3. Điền cấu hình như sau:
   - *Mô tả*: `QR Attendance API`
   - *Thực thi dưới danh nghĩa*: **Tôi** (Địa chỉ Gmail của bạn)
   - *Ai có quyền truy cập*: **Mọi người** (Anyone) *(Yêu cầu chọn mục này để ứng dụng trên điện thoại có thể gọi điện điểm danh).*
4. Nhấp vào nút **Triển khai** (Deploy). Nếu Google yêu cầu cấp quyền truy cập, hãy nhấn nút "Cấp quyền truy cập", đăng nhập tài khoản Gmail của bạn và chọn "Nâng cao" (Advanced) -> chọn "Đi tới dự án không an toàn" rồi ấn **Cho phép** (Allow).
5. Sau khi triển khai xong, Google sẽ cung cấp cho bạn một **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`). Hãy **Sao chép (Copy)** URL này!

### Bước 3: Cấu hình trên App Điểm Danh
1. Kích hoạt ứng dụng bằng cách mở tệp [index.html](index.html) trên trình duyệt của bạn (hoặc điện thoại).
2. Nhấn vào biểu tượng **Răng cưa (Cài đặt)** ở góc trên bên phải màn hình.
3. Dán đường dẫn **URL ứng dụng web** bạn vừa sao chép ở Bước 2 vào ô nhập liệu.
4. Nhấn **Lưu cài đặt**. Lúc này:
   - Đèn trạng thái trên ứng dụng sẽ chuyển sang **Màu xanh lá** kèm dòng chữ **"Bảng tính: Sẵn sàng"** báo hiệu kết nối thành công!
   - Ứng dụng sẽ tự động lưu liên kết này vào trình duyệt của bạn, lần sau mở ra sẽ tự động kết nối mà không cần cấu hình lại.

---

## 📲 Hướng dẫn cài đặt thành ứng dụng trên Điện thoại (PWA)

Vì ứng dụng được tích hợp tiêu chuẩn PWA (Progressive Web App), bạn có thể dễ dàng cài đặt nó trực tiếp lên điện thoại Android hoặc iOS thành một app độc lập với Icon ngoài màn hình chính (không cần qua Google Play / App Store).

### Dành cho điện thoại Android (Sử dụng Google Chrome):
1. Dùng điện thoại mở trang web điểm danh của bạn (sau khi đưa lên hosting miễn phí như GitHub Pages hoặc chạy qua địa chỉ IP mạng nội bộ).
2. Trình duyệt Chrome sẽ tự động hiển thị một thanh thông báo nhỏ ở dưới: **"Thêm QR Điểm Danh vào Màn hình chính"** (Add to Home screen).
3. Nhấp vào thông báo đó và chọn **Cài đặt** (Install).
4. *Nếu không thấy thông báo:* Nhấn vào biểu tượng **3 dấu chấm** ở góc trên bên phải Chrome -> chọn **Thêm vào Màn hình chính** hoặc **Cài đặt ứng dụng**.
5. Một Icon biểu tượng mã QR tuyệt đẹp sẽ xuất hiện trên màn hình điện thoại của bạn. Nhấp vào đó, ứng dụng sẽ mở ra **toàn màn hình (không có thanh địa chỉ)** và chạy mượt mà như một app APK cài đặt thông thường!

### Dành cho điện thoại iPhone (Sử dụng Safari):
1. Dùng trình duyệt **Safari** trên iPhone mở trang web điểm danh của bạn.
2. Nhấp vào nút **Chia sẻ** (biểu tượng hình vuông có mũi tên chỉ lên ở thanh công cụ phía dưới).
3. Kéo xuống dưới và chọn **Thêm vào MH chính** (Add to Home Screen).
4. Nhấn **Thêm** (Add). Icon ứng dụng sẽ lập tức xuất hiện trên màn hình chính iPhone của bạn.

---

## 🌟 Các tính năng nổi bật của ứng dụng

1. **Quét Camera Trực Tiếp (Live Stream)**: Sử dụng luồng camera liên tục của điện thoại để nhận diện QR siêu nhanh (chỉ mất 0.2 giây), không cần chụp ảnh rồi tải lên như các giải pháp cũ.
2. **2 Chế độ Quét tùy chọn**:
   - **Quét liên tục (Auto Scan)**: Quét xong -> Điểm danh thành công -> Đọc tên -> Tự động bật camera quét tiếp sau 2.5 giây. Rất phù hợp khi điểm danh số lượng đông, nhanh.
   - **Quét & Xác nhận (Confirm Scan)**: Quét xong -> Camera tạm dừng hiển thị thông tin chi tiết người được điểm danh -> Đợi người điều hành nhấn nút **"Xác nhận"** rồi mới bật camera quét tiếp.
3. **Phát âm thanh & Đọc tên tiếng Việt (TTS)**: Phát tiếng bíp vui tai khi thành công và đọc to thành tiếng *"Xin chào GIUSE Nguyễn Lâm Triều"* giúp kiểm soát danh sách điểm danh từ xa mà không cần dán mắt vào màn hình.
4. **Lịch sử tức thời**: Hiển thị danh sách những người vừa điểm danh gần nhất ngay bên dưới để người quản lý dễ dàng đối chiếu số lượng và thời gian quét.
5. **Dark Mode / Light Mode**: Chuyển đổi giao diện sáng/tối bảo vệ mắt chỉ với 1 chạm.

---

Chúc bạn có những trải nghiệm tuyệt vời cùng **QR Attendance Pro**! Nếu cần hỗ trợ thêm, hãy nhắn cho tôi ngay nhé! 😊
