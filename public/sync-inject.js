(() => {
  let video = null;
  let applying = false;

  function findVideo(root) {
    const v = root.querySelector('video');
    if (v) return v;
    const frames = root.querySelectorAll('iframe');
    for (const f of frames) {
      try {
        const inner = findVideo(f.contentDocument);
        if (inner) return inner;
      } catch {}
    }
    return null;
  }

  function bind(v) {
    if (video === v) return;
    video = v;
    video.addEventListener('play', () => {
      if (applying) return;
      top.postMessage({ source: 'wt-sync', type: 'play', position: video.currentTime }, '*');
    });
    video.addEventListener('pause', () => {
      if (applying) return;
      top.postMessage({ source: 'wt-sync', type: 'pause', position: video.currentTime }, '*');
    });
    video.addEventListener('seeked', () => {
      if (applying) return;
      top.postMessage({ source: 'wt-sync', type: 'seek', position: video.currentTime }, '*');
    });
  }

  const observer = new MutationObserver(() => {
    const v = findVideo(document);
    if (v) bind(v);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const initial = findVideo(document);
  if (initial) bind(initial);

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || msg.source !== 'wt-control' || !video) return;
    applying = true;
    if (typeof msg.position === 'number' && Math.abs(video.currentTime - msg.position) > 0.75) {
      video.currentTime = msg.position;
    }
    if (msg.type === 'play') video.play().catch(() => {});
    if (msg.type === 'pause') video.pause();
    setTimeout(() => { applying = false; }, 150);
  });
})();
