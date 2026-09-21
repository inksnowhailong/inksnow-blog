/**
 * 极简 Service Worker
 * @description 只为满足浏览器判定「这是个应用」时对 fetch 处理器的检查，
 * 一个字节都不缓存：请求原样交给网络。
 *
 * 刻意不做离线缓存。这个站点的看板数据全部来自接口，离线打开只会看到
 * 一个空壳；而缓存一旦介入，就要处理「发了新版本但用户还看着旧的」——
 * 那是笔只有在真需要离线时才值得付的开销。
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
