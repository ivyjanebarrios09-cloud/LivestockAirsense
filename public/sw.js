self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// An empty fetch handler is enough to pass the Chrome PWA requirement
// without doing any caching or intercepting
self.addEventListener('fetch', (event) => {
  // Do nothing. Fall back to the network.
});
