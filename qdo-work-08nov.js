/* Archive behavior, independent of the legacy vertical grid. */
(() => {
  'use strict';
  const viewport = document.querySelector('.archive-viewport');
  const track = document.querySelector('.archive-track');
  if (!viewport || !track) return;
  const cards = [...track.querySelectorAll('.project-card')];
  const collages = [...track.querySelectorAll('.paper-collage')];
  const mobile = matchMedia('(max-width: 767px)');
  const panel = document.querySelector('.archive-filter-panel');
  const filterToggles = [...document.querySelectorAll('.filter-toggle')];
  const firstSlots = [[72,138.333,876,393.833],[972,138.333,876,393.833],[72,556.167,426,369.833],[972,556.167,426,369.833],[1422,556.167,426,369.833],[1872,556.167,426,369.833],[2322,162.333,426,369.833],[2322,556.167,426,369.833],[2772,162.333,426,369.833],[2772,556.167,426,369.833],[3222,162.333,426,369.833],[3672,162.333,426,369.833],[3672,556.167,426,369.833],[4122,162.333,426,369.833],[4122,556.167,426,369.833],[4572,556.167,426,369.833],[5022,162.333,426,369.833],[5472,162.333,426,369.833],[5472,556.167,426,369.833],[5922,556.167,426,369.833],[6372,162.333,426,369.833],[6372,556.167,426,369.833],[6822,162.333,426,369.833]];
  const slots = [...firstSlots];
  const rhythm = [[0,1],[0,1],[0],[0,1],[0,1],[1],[0],[0,1],[1],[0,1],[0]];
  for (let col=0;slots.length<cards.length;col++) {
    const x=7272+450*col;
    rhythm[col%rhythm.length].forEach(row=>slots.push([x,row?556.167:162.333,426,369.833]));
  }
  // These intentional blank cells come from the revised mobile PDF, not missing projects.
  const mobileSlots = [[1,1],[2,1],[1,2],[2,3],[1,4],[2,4],[1,5],[1,6],[2,6],[2,7],[1,8],[2,8],[2,9],[1,10],[1,11],[2,11],[1,12],[2,12],[2,13],[1,14],[1,15],[2,15]];
  let active = new URLSearchParams(location.search).get('filter') || '';
  if (active==='all') active='';
  if (!['','interiors','architecture','landscape'].includes(active)) active='';
  const closePanel = () => {
    if (panel) panel.hidden=true;
    document.body.classList.remove('archive-filter-open');
    filterToggles.forEach(button=>button.setAttribute('aria-expanded','false'));
  };
  const layout = () => {
    const scale=Math.max(.15,Math.min(innerWidth/1920,(innerHeight-138.333-24)/787.667));
    viewport.style.setProperty('--archive-unit',`${scale}px`);
    viewport.style.setProperty('--archive-top-offset',`${138.333*(1-scale)}px`);
    let visibleIndex=0,maxX=0;
    cards.forEach(card=>{
      const visible=!active || (card.dataset.disciplines||'').split(' ').includes(active);
      card.hidden=!visible;
      if (!visible) return;
      const slot=slots[visibleIndex];
      ['x','y','w','h'].forEach((key,i)=>card.style.setProperty(`--archive-${key}`,slot[i]));
      const cycle=Math.floor(visibleIndex/mobileSlots.length);
      const ms=active?[visibleIndex%2+1,Math.floor(visibleIndex/2)+1]:mobileSlots[visibleIndex%mobileSlots.length];
      card.style.setProperty('--mobile-col',ms[0]);
      card.style.setProperty('--mobile-row',ms[1]+(active?0:cycle*15));
      maxX=Math.max(maxX,slot[0]+slot[2]);
      visibleIndex++;
    });
    track.style.setProperty('--archive-width',`${(maxX+72)*scale}px`);
    collages.forEach((collage,i)=>{
      const xy=[[522,556.167],[1872,162.333],[3222,556.167]][i];
      collage.hidden=!!active;
      collage.style.setProperty('--archive-x',xy[0]);
      collage.style.setProperty('--archive-y',xy[1]);
    });
    document.querySelectorAll('[data-filter]').forEach(button=>{
      const value=button.dataset.filter==='all'?'':button.dataset.filter;
      button.setAttribute('aria-pressed',String(value===active));
    });
    document.documentElement.dataset.archiveFilter=active||'all';
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-filter]');
    if (!button) return;
    event.preventDefault();
    const value=button.dataset.filter==='all'?'':button.dataset.filter;
    if (!['','interiors','architecture','landscape'].includes(value)) return;
    active=value;
    const url=new URL(location.href);
    active?url.searchParams.set('filter',active):url.searchParams.delete('filter');
    history.replaceState(null,'',url);
    viewport.scrollLeft=0;
    if (mobile.matches) window.scrollTo({top:0,behavior:'instant'});
    layout();closePanel();
  });
  filterToggles.forEach(button=>{
    button.setAttribute('aria-controls','archive-filter-panel');
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',()=>{
      if (!panel) return;
      const open=panel.hidden;
      panel.hidden=!open;
      document.body.classList.toggle('archive-filter-open',open);
      filterToggles.forEach(toggle=>toggle.setAttribute('aria-expanded',String(open)));
      if (open) panel.querySelector('button')?.focus({preventScroll:true});
    });
  });
  document.addEventListener('keydown',event=>{
    if (event.key==='Escape' && panel && !panel.hidden) closePanel();
    if (mobile.matches || document.querySelector('dialog[open]') || !panel?.hidden) return;
    if (!viewport.contains(document.activeElement)) return;
    if (event.key==='ArrowRight'||event.key==='ArrowLeft') {
      event.preventDefault();viewport.scrollBy({left:(event.key==='ArrowRight'?1:-1)*innerWidth*.55,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    }
  });
  viewport.addEventListener('wheel',event=>{
    if (mobile.matches || event.ctrlKey || event.metaKey || event.shiftKey || document.querySelector('dialog[open]')) return;
    const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
    if (!delta) return;
    event.preventDefault();
    viewport.scrollLeft+=delta*(event.deltaMode===1?18:event.deltaMode===2?innerWidth:1);
  },{passive:false});
  let drag=null,dragged=false;
  viewport.addEventListener('pointerdown',event=>{
    if (mobile.matches || event.pointerType==='touch' || event.button!==0 || event.target.closest('button,.paper')) return;
    drag={x:event.clientX,left:viewport.scrollLeft,id:event.pointerId};dragged=false;
  });
  viewport.addEventListener('pointermove',event=>{
    if (!drag) return;
    const dx=event.clientX-drag.x;
    if (Math.abs(dx)>7) dragged=true;
    if (dragged) {viewport.scrollLeft=drag.left-dx;event.preventDefault();}
  });
  const release=()=>{drag=null;};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  viewport.addEventListener('click',event=>{if(dragged){event.preventDefault();event.stopPropagation();dragged=false;}},true);
  let resizeFrame=0;
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(layout);});
  mobile.addEventListener('change',()=>{closePanel();layout();});
  layout();
  if(new URLSearchParams(location.search).get('filters')==='open')filterToggles[0]?.click();
  try {const saved=JSON.parse(sessionStorage.getItem('qdo-archive-position')||'null');if(saved&&saved.filter===active&&!mobile.matches)viewport.scrollLeft=saved.left;}catch{}
  window.addEventListener('pagehide',()=>{try{sessionStorage.setItem('qdo-archive-position',JSON.stringify({filter:active,left:viewport.scrollLeft}));}catch{}});
  window.QDOArchive={layout,get filter(){return active;},get visibleCount(){return cards.filter(card=>!card.hidden).length;}};
})();
