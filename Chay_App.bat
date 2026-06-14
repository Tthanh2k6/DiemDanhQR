@echo off
title Trình Khởi Chạy App Điểm Danh QR
color 0b
echo ==================================================
echo   KHỞI CHẠY ỨNG DỤNG ĐIỂM DANH QR CODE (PWA)
echo ==================================================
echo.
echo [*] Đang khởi chạy máy chủ cục bộ trên cổng 8080...
echo [*] Trình duyệt sẽ tự động mở trang ứng dụng điểm danh.
echo [*] VUI LÒNG KHÔNG TẮT cửa sổ này khi đang dùng ứng dụng!
echo.
start http://localhost:8080
node server.js
pause
