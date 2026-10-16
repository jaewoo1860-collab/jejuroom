(() => {
  const link = document.querySelector('[data-face-sms]');
  if (!link) return;
  // iOS Messages uses an ampersand before the optional draft body.
  const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  link.href = 'sms:01067239601' + (appleMobile ? '&' : '?') + 'body=' + encodeURIComponent(link.dataset.message);
})();
