(() => {
  if(window.__dailyAnalytics || !['jejutoktokyi.com','www.jejutoktokyi.com'].includes(location.hostname)) return;
  window.__dailyAnalytics=true;
  const endpoint='https://ttoktokyi-telegram.jaewoo1860-f18.workers.dev';
  let shops=[{id:'jeju-face',path:'/pages/shops/jejusi-01.html'}];
  let memory=null;
  const seen=new Set();
  function identity() {
    const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
    try {
      const stored=JSON.parse(localStorage.getItem('ttok-daily-visitor')||'null');
      if(stored?.day===day && /^[0-9a-f-]{36}$/.test(stored.id)) return stored;
      memory={day,id:crypto.randomUUID()};
      localStorage.setItem('ttok-daily-visitor',JSON.stringify(memory));
      return memory;
    }catch {
      if(memory?.day!==day)memory={day,id:crypto.randomUUID()};
      return memory;
    }
  }
  function track(kind,shop='') {
    const {day,id}=identity();
    const key=day+':'+kind+':'+shop;
    if(seen.has(key))return;
    seen.add(key);
    const body=JSON.stringify({day,visitor:id,kind,shop});
    // Never delay navigation or the phone dialer.
    fetch(endpoint+'/analytics/collect',{method:'POST',headers:{'Content-Type':'text/plain'},body,keepalive:true,credentials:'omit'})
      .then(r=>{if(!r.ok)seen.delete(key);}).catch(()=>seen.delete(key));
  }
  function page() {
    track('visit');
    const shop=shops.find(s=>s.path===location.pathname);
    if(shop)track('detail',shop.id);
  }
  if(document.visibilityState==='visible')page();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')page();});
  window.addEventListener('pageshow',page);
  fetch(endpoint+'/analytics/config',{credentials:'omit'}).then(r=>r.json()).then(config=>{
    if(Array.isArray(config.shops))shops=config.shops;
    if(document.visibilityState==='visible')page();
  }).catch(()=>{});
  document.addEventListener('click',event=>{
    const a=event.target.closest?.('a[href]');
    if(!a || !/^tel:\+?[0-9][0-9 -]+$/.test(a.getAttribute('href')||''))return;
    const shop=shops.find(s=>s.path===location.pathname);
    if(shop){track('visit');track('detail',shop.id);track('phone',shop.id);}
  },true);
})();
