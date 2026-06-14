/**
 * GOOGLE APPS SCRIPT - HỆ THỐNG ĐIỂM DANH QR CODE (PHIÊN BẢN HỖ TRỢ PWA)
 * 
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Sheet "Bảng điểm danh Giới Trẻ" của bạn.
 * 2. Chọn "Tiện ích mở rộng" (Extensions) -> "Apps Script".
 * 3. Xóa hết code cũ (nếu có) và dán toàn bộ đoạn code dưới đây vào.
 * 4. Nhấp vào nút "Lưu" (biểu tượng ổ đĩa).
 * 5. Nhấp vào nút "Triển khai" (Deploy) ở góc trên bên phải -> "Triển khai mới" (New deployment).
 * 6. Chọn Loại cấu hình là "Ứng dụng khách Web" (Web app).
 * 7. Cấu hình:
 *    - Mô tả: Điểm danh QR PWA API
 *    - Thực thi dưới danh nghĩa: "Tôi" (Chính bạn - Your email)
 *    - Ai có quyền truy cập: "Mọi người" (Anyone - để PWA có thể gọi trực tiếp).
 * 8. Nhấp "Triển khai" (Deploy), cấp quyền truy cập nếu Google yêu cầu.
 * 9. Sao chép "URL ứng dụng khách Web" (Web App URL) và dán vào ô Cấu hình trên App PWA của bạn!
 */

function doGet(e) {
  // Kiểm tra nếu có tham số gọi API từ PWA ngoài (scannedId và selectedDate)
  if (e && e.parameter && e.parameter.scannedId) {
    var scannedId = e.parameter.scannedId.toString().trim();
    var selectedDate = e.parameter.selectedDate;
    
    // NẾU LÀ KIỂM TRA KẾT NỐI: Phản hồi ngay để tránh gọi processScan gây tạo cột mới trên Sheet
    if (scannedId === "TEST_CONN") {
      return ContentService.createTextOutput(JSON.stringify({ result: "SUCCESS: CONNECTION_OK" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = processScan(scannedId, selectedDate);
    
    // Trả về JSON để PWA bên ngoài đọc, hỗ trợ CORS hoàn hảo
    return ContentService.createTextOutput(JSON.stringify({ result: result }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Mặc định: Trả về file giao diện Index.html cũ trong Google Sheets nếu truy cập trực tiếp
  try {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    // Tránh lỗi nếu file Index.html chưa được tạo trong thư mục Apps Script
    return HtmlService.createHtmlOutput(
      "<h3>Google Apps Script Điểm Danh QR đã hoạt động!</h3>" +
      "<p>Web App API đã sẵn sàng nhận kết nối từ ứng dụng PWA bên ngoài.</p>" +
      "<p>Hãy sao chép URL ở trình duyệt này hoặc URL Deploy dán vào cài đặt PWA.</p>"
    );
  }
}

/**
 * Xử lý quét mã QR điểm danh
 * @param {string} scannedId Mã số được quét từ QR (Ví dụ: GT01)
 * @param {string} selectedDate Chuỗi ngày được chọn (Định dạng: YYYY-MM-DD từ input date)
 */
function processScan(scannedId, selectedDate) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Data");
    if (!sheet) return "ERROR: Không tìm thấy sheet 'Data'!";

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var lastRow = sheet.getLastRow();
    
    // 1. Định dạng ngày theo kiểu Việt Nam: dd-mm-yyyy
    var inputDate = new Date(selectedDate);
    var inputDateStr = Utilities.formatDate(inputDate, Session.getScriptTimeZone(), "dd-MM-yyyy");
    
    // 2. Tìm cột ngày đã có hoặc xác định vị trí cột mới (Bắt đầu từ cột E - index 4 trở đi)
    var colIndex = -1;
    for (var i = 4; i < headers.length; i++) { // Bắt đầu từ cột thứ 5 (index 4) là cột điểm danh
      var headerVal = headers[i];
      var headerStr = (headerVal instanceof Date) 
        ? Utilities.formatDate(headerVal, Session.getScriptTimeZone(), "dd-MM-yyyy") 
        : headerVal.toString().trim();
      
      if (headerStr === inputDateStr) {
        colIndex = i;
        break;
      }
    }

    // Nếu KHÔNG tìm thấy ngày, tạo cột mới ở cuối bảng và định dạng
    if (colIndex === -1) {
      colIndex = headers.length;
      var headerCell = sheet.getRange(1, colIndex + 1);
      
      headerCell.setValue(inputDateStr);
      headerCell.setBackground("#e2e2e2").setFontWeight("bold").setHorizontalAlignment("center");
      
      // Kẻ khung cho cả cột
      var colRange = sheet.getRange(1, colIndex + 1, lastRow, 1);
      colRange.setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      colRange.setHorizontalAlignment("center");

      // Tự động mở rộng cột để vừa nội dung
      sheet.autoResizeColumn(colIndex + 1);
    }
    
    // 3. Tìm ID (trong Cột A) và đánh dấu 'x'
    for (var j = 1; j < data.length; j++) {
      if (data[j][0].toString().trim() === scannedId.toString().trim()) {
        sheet.getRange(j + 1, colIndex + 1).setValue("x").setHorizontalAlignment("center");
        
        // Trả về đầy đủ Tên Thánh (Cột B - index 1) và Họ Tên (Cột C - index 2) để hiển thị/đọc tiếng Việt
        var tenThanh = data[j][1] ? data[j][1].toString().trim() : "";
        var hoTen = data[j][2] ? data[j][2].toString().trim() : "";
        var fullName = tenThanh ? (tenThanh + " " + hoTen) : hoTen;
        
        return "SUCCESS: " + fullName; 
      }
    }
    
    return "ERROR: Không tìm thấy ID " + scannedId; 
  } catch (e) {
    return "ERROR: " + e.toString();
  }
}
