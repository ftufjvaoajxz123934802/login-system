self.addEventListener('fetch', event => {
  const preloadResponsePromise = event.preloadResponse;

  event.respondWith(
    (async () => {
      const preloadResponse = await preloadResponsePromise;
      if (preloadResponse) {
        return preloadResponse;
      }
      // 如果沒有預載響應，正常從網路取得
      return fetch(event.request);
    })()
  );
});
