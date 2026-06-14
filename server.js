const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Loại bỏ tham số query để lấy đường dẫn file chuẩn
  let filePath = '.' + req.url.split('?')[0];
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Không tìm thấy tệp tin (404 Not Found)</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Lỗi hệ thống: ' + error.code + ' ..\n');
      }
    } else {
      // Thiết lập CORS và Cache-Control cho môi trường thử nghiệm mượt mà nhất
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 MÁY CHỦ ĐÃ KHỞI CHẠY THÀNH CÔNG!`);
  console.log(`👉 Hãy mở link sau trên trình duyệt điện thoại/máy tính:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
