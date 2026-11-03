import { refreshTarget } from './refresh';

// Only navigation hints are collected. No text, form values, or click targets leave the page.
(() => {
  let lastMeta = '';
  let lastGesture = 0;
  function send(payload: object) {
    void chrome.runtime.sendMessage({ type: 'document', ...payload }).catch(() => {});
  }
  function checkMeta() {
    const meta = [...document.querySelectorAll('meta[http-equiv]')]
      .filter(el => el.getAttribute('http-equiv')?.toLowerCase() === 'refresh')
      .map(el => refreshTarget(el.getAttribute('content') ?? '', document.baseURI)).find(Boolean);
    const key = meta ? `${meta.delay}:${meta.url}` : '';
    if (!meta || key === lastMeta) return;
    lastMeta = key;
    send({ meta });
  }
  const observer = new MutationObserver(checkMeta);
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['content', 'http-equiv'] });
  document.addEventListener('DOMContentLoaded', checkMeta, { once: true });
  document.addEventListener('DOMContentLoaded', () => { observer.disconnect(); if(document.head) observer.observe(document.head, { subtree:true,childList:true,attributes:true,attributeFilter:['content','http-equiv'] }); },{once:true});
  for (const name of ['pointerdown', 'keydown', 'click', 'submit']) document.addEventListener(name, event => {
    if (event.isTrusted && Date.now()-lastGesture>100) { lastGesture=Date.now(); send({ userGesture: true }); }
  }, { capture: true, passive: true });
})();
