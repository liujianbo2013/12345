// 缓存名称（加版本号，方便更新缓存）
const CACHE_NAME = 'pwa-offline-demo-v1';
// 需要缓存的核心资源（这里只缓存首页，可扩展）
const CACHE_ASSETS = [
    '/',          // 根路径
    '/index.html' // 主页面
];

// 1. 安装阶段：缓存核心资源
self.addEventListener('install', (event) => {
    // 等待缓存完成后再激活
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 缓存资源中...');
                return cache.addAll(CACHE_ASSETS);
            })
            .then(() => {
                // 跳过等待，直接激活新的 Service Worker
                return self.skipWaiting();
            })
    );
});

// 2. 激活阶段：清理旧缓存（避免缓存冗余）
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            // 遍历所有缓存名称，删除旧版本缓存
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('🗑️ 删除旧缓存：', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => {
            // 接管所有页面的请求
            return self.clients.claim();
        })
    );
});

// 3. 拦截请求：离线时返回缓存资源
self.addEventListener('fetch', (event) => {
    // 只处理 GET 请求（避免 POST 等请求出错）
    if (event.request.method === 'GET') {
        event.respondWith(
            // 先从缓存找资源
            caches.match(event.request)
                .then((cachedResponse) => {
                    // 缓存有则返回，无则走网络请求
                    if (cachedResponse) {
                        console.log('🔌 从缓存加载：', event.request.url);
                        return cachedResponse;
                    }

                    // 网络请求（在线时）
                    console.log('🌐 从网络加载：', event.request.url);
                    return fetch(event.request)
                        // 可选：把新请求的资源加入缓存（扩展功能）
                        .then((networkResponse) => {
                            // 克隆响应（响应只能用一次）
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    // 缓存新请求的资源
                                    cache.put(event.request, responseClone);
                                });
                            return networkResponse;
                        })
                        // 网络失败（离线）且无缓存时，返回友好提示
                        .catch(() => {
                            return new Response('<h1>⚠️ 离线且无缓存</h1>', {
                                headers: { 'Content-Type': 'text/html; charset=utf-8' }
                            });
                        });
                })
        );
    }
});
