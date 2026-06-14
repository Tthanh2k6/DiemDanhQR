const CACHE_NAME = 'qr-attendance-cache-v1';

// Các tài nguyên cần tải trước và lưu trữ tạm thời
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
  'https://cdn-icons-png.flaticon.com/512/3022/3022250.png'
];

// 1. Sự kiện INSTALL: Tải tất cả tài nguyên vào bộ nhớ Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Đang cache các tệp tin tĩnh...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Sự kiện ACTIVATE: Xóa cache phiên bản cũ khi cập nhật app mới
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Đang xóa bộ nhớ cache cũ:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Sự kiện FETCH: Đọc từ cache trước, nếu không có mới tải từ mạng (Cache-first strategy)
self.addEventListener('fetch', (event) => {
  // Không cache các truy vấn API của Google Sheets
  if (event.request.url.includes('script.google.com') || event.request.url.includes('googleusercontent.com')) {
    return; // Hãy để trình duyệt tự do kết nối mạng cho API
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Trả về tài nguyên cache ngay lập tức
        }
        return fetch(event.request).catch(() => {
          // Xử lý khi mất mạng hoàn toàn và tệp không nằm trong cache
        });
      })
  );
});
