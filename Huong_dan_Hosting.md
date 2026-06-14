# 🌐 Hướng dẫn Đưa App Điểm Danh Lên Hosting Miễn Phí (Có HTTPS)

Để ứng dụng điểm danh của bạn có thể hoạt động trên bất kỳ điện thoại di động nào thông qua internet và kích hoạt được **Camera quét QR**, trang web của bạn bắt buộc phải có chứng chỉ bảo mật **HTTPS** (đường dẫn bắt đầu bằng `https://`).

Dưới đây là 2 cách đưa ứng dụng của bạn lên hosting miễn phí, an toàn và dễ làm nhất hiện nay:

---

## ⚡ CÁCH 1: Dùng Netlify Drop (Kéo & Thả - Dễ nhất & Nhanh nhất)
*Đây là cách nhanh nhất, chỉ mất đúng **10 giây**, không cần tạo tài khoản phức tạp, không cần gõ dòng lệnh.*

1. Mở trình duyệt trên máy tính và truy cập vào trang web: [**https://app.netlify.com/drop**](https://app.netlify.com/drop)
2. Mở thư mục chứa ứng dụng của bạn trên máy tính (`d:\CodeLearn\App điểm danh\`).
3. Chọn các tệp tin sau và nén lại thành 1 file ZIP (hoặc kéo cả thư mục **`App điểm danh`**):
   - `index.html`
   - `style.css`
   - `app.js`
   - `manifest.json`
   - `sw.js`
   *(Lưu ý: Không cần kéo file `google-apps-script.js` hay file `.bat` lên).*
4. **Kéo và thả (Drag & Drop)** thư mục hoặc file ZIP đó vào ô hình vuông nét đứt có chữ **"Drag and drop your site folder here"** trên trang web Netlify.
5. Chờ khoảng 3 giây để hệ thống tải lên. Netlify sẽ lập tức cấp cho bạn một đường dẫn **HTTPS miễn phí** dạng: `https://ten-ngau-nhien.netlify.app`.
6. Bạn đã có thể mở ngay link này trên điện thoại của mình để quét mã điểm danh!
   - *Mẹo:* Bạn có thể đăng ký tài khoản Netlify miễn phí bằng Gmail để đổi tên đường dẫn theo ý muốn (Ví dụ: `diemdanh-gioitre.netlify.app`).

---

## 🐙 CÁCH 2: Dùng GitHub Pages (Chuyên nghiệp & Lâu dài)
*Cách này thích hợp nếu bạn muốn lưu trữ mã nguồn lâu dài và cập nhật mã nguồn một cách chuyên nghiệp.*

### Bước 2.1: Tạo tài khoản & Kho lưu trữ trên GitHub
1. Truy cập [**https://github.com**](https://github.com) và đăng ký một tài khoản miễn phí (nếu chưa có).
2. Nhấn nút **New** (hoặc biểu tượng dấu cộng `+` ở góc trên bên phải -> chọn **New repository**).
3. Cấu hình kho chứa:
   - **Repository name**: Điền tên ứng dụng của bạn (Ví dụ: `diem-danh-qr`).
   - Chọn chế độ **Public** (Công khai - bắt buộc để bật được tính năng Pages miễn phí).
   - Nhấn nút **Create repository** ở dưới cùng.

### Bước 2.2: Tải code lên trực tiếp bằng Trình duyệt (Không cần cài Git)
1. Tại trang kho chứa vừa tạo, hãy nhấn vào dòng chữ **"uploading an existing file"** (tải lên tệp có sẵn).
2. Mở thư mục `d:\CodeLearn\App điểm danh\` trên máy tính.
3. Kéo và thả toàn bộ các file sau vào vùng tải lên của GitHub:
   - `index.html`
   - `style.css`
   - `app.js`
   - `manifest.json`
   - `sw.js`
4. Chờ tệp tải lên xong, kéo xuống dưới cùng màn hình và nhấn nút xanh **Commit changes** (Xác nhận thay đổi).

### Bước 2.3: Kích hoạt tính năng GitHub Pages
1. Tại kho lưu trữ của bạn trên GitHub, chọn tab **Settings** (Cài đặt - có biểu tượng bánh răng ở thanh menu ngang).
2. Ở thanh menu dọc bên trái, tìm mục **Code and automation** -> click chọn **Pages**.
3. Tại phần **Build and deployment**:
   - Ở mục **Source**, giữ nguyên chọn là `Deploy from a branch`.
   - Ở mục **Branch**, nhấp vào nút `None` và chọn **`main`** (hoặc `master`).
   - Nhấn nút **Save** (Lưu) ngay bên cạnh.
4. Chờ khoảng 1 - 2 phút, bạn hãy tải lại (F5) trang Pages đó. Ở phía trên cùng sẽ xuất hiện một khung màu xanh lá cây kèm đường dẫn HTTPS của bạn!
   - *Đường dẫn sẽ có dạng:* `https://<ten-tai-khoan-github>.github.io/diem-danh-qr/`
5. Sao chép link này gửi lên điện thoại để mở ra sử dụng cài đặt PWA thôi! 🎉
