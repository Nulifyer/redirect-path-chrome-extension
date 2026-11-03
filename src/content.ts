// Only navigation hints are collected. No text, form values, or click targets leave the page.
(() => {
  let lastMeta = '';
  let lastGesture = 0;
  function send(payload: object) {
    void chrome.runtime.sendMessage({ type: 'document', ...payload }).catch(() => {});
  }
  function checkMeta() {
    const element = [...document.querySelectorAll('meta[http-equiv]')].find(el => el.getAttribute('http-equiv')?.toLowerCase() === 'refresh');
    const value = element?.getAttribute('content') ?? '';
    if (!value || value === lastMeta) return;
    lastMeta = value;
    const match = value.match(/^\s*(\d+(?:\.\d+)?)\s*(?:;\s*url\s*=\s*(.*?)\s*)?$/i);
    if (!match?.[2]) return;
    try {
      const url = new URL(match[2].replace(/^['"]|['"]$/g, ''), document.baseURI);
      if (/^https?:$/.test(url.protocol)) send({ meta: { url: url.href, delay: Number(match[1]) } });
    } catch {}
  }
  const observer = new MutationObserver(checkMeta);
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['content', 'http-equiv'] });
  document.addEventListener('DOMContentLoaded', checkMeta, { once: true });
  document.addEventListener('DOMContentLoaded', () => { observer.disconnect(); if(document.head) observer.observe(document.head, { subtree:true,childList:true,attributes:true,attributeFilter:['content','http-equiv'] }); },{once:true});
  for (const name of ['pointerdown', 'keydown', 'click', 'submit']) document.addEventListener(name, event => {
    if (event.isTrusted && Date.now()-lastGesture>100) { lastGesture=Date.now(); send({ userGesture: true }); }
  }, { capture: true, passive: true });
})();
