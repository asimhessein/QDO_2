(() => {
  'use strict';
  const ready = () => {
    if (!document.body.classList.contains('project-page')) return;
    const triggers = [...document.querySelectorAll('.gallery-photo button, button.gallery-open')];
    const unique = [...new Set(triggers)];
    const items = unique.map(button => {
      const img = button.querySelector('img');
      return {button, src:button.dataset.src || img?.getAttribute('src'), alt:img?.alt || button.getAttribute('aria-label') || ''};
    }).filter(item => item.src);
    if (!items.length) return;
    // Replace the old empty dialog rather than leaving duplicate modal controls in the page.
    document.querySelector('.gallery-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.className = 'qdo-gallery-dialog gallery-dialog';
    dialog.setAttribute('aria-label','Project photograph gallery');
    dialog.innerHTML = `<div class="qdo-gallery-canvas"><div class="qdo-gallery-stage" role="group" aria-label="Full photograph. Swipe left or right to browse, or swipe down to close." tabindex="0"><img class="qdo-gallery-image" alt="" draggable="false"></div><div class="qdo-gallery-thumbs" role="group" aria-label="Choose a project photograph"></div><button class="qdo-gallery-close" type="button" aria-label="Close gallery"><svg viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button><button class="qdo-gallery-rotate" type="button" aria-label="View gallery horizontally" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.2 6.6A8.5 8.5 0 112.8 13M5.2 6.6V2.4M5.2 6.6H1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><p class="qdo-gallery-announcement" aria-live="polite" role="status"></p></div>`;
    document.body.append(dialog);
    const canvas = dialog.querySelector('.qdo-gallery-canvas');
    const stage = dialog.querySelector('.qdo-gallery-stage');
    const image = dialog.querySelector('.qdo-gallery-image');
    const rail = dialog.querySelector('.qdo-gallery-thumbs');
    const closeButton = dialog.querySelector('.qdo-gallery-close');
    const rotateButton = dialog.querySelector('.qdo-gallery-rotate');
    closeButton.innerHTML='<img src="assets/08nov/icons/gallery-close.svg" width="22" height="22" alt="">';
    rotateButton.innerHTML='<img src="assets/08nov/icons/Asset%204.svg" width="22" height="22" alt="">';
    const announcement = dialog.querySelector('.qdo-gallery-announcement');
    const fitFullImage=()=>{if(!image.naturalWidth||!stage.clientWidth)return;const scale=Math.min(stage.clientWidth/image.naturalWidth,stage.clientHeight/image.naturalHeight);image.style.setProperty('width',`${image.naturalWidth*scale}px`,'important');image.style.setProperty('height',`${image.naturalHeight*scale}px`,'important');};
    image.addEventListener('load',fitFullImage);
    new ResizeObserver(fitFullImage).observe(stage);

    const reduced = matchMedia('(prefers-reduced-motion:reduce)');
    let current = 0, wanted = 0, opener = null, generation = 0, rotated = false;
    let wheelDelta = 0, lastWheel = -Infinity, lastWheelEvent = 0, blockClickUntil = 0;
    let scrollY = 0, previousOverflow = '';
    const wrap = n => (n % items.length + items.length) % items.length;
    const thumbs = items.map((item,index) => {
      const button = document.createElement('button');
      button.type='button'; button.className='qdo-gallery-thumb';
      button.setAttribute('aria-label',`View photograph ${index+1} of ${items.length}`);
      button.setAttribute('aria-current','false');
      const thumbnail = document.createElement('img');
      thumbnail.src=item.src; thumbnail.alt=''; thumbnail.loading='lazy'; thumbnail.decoding='async'; thumbnail.draggable=false;
      button.append(thumbnail); rail.append(button);
      button.addEventListener('click',event=>{ if(performance.now()<blockClickUntil){ event.preventDefault(); return; } show(index); });
      return button;
    });
    const preload = index => { const im=new Image(); im.src=items[wrap(index)].src; };
    function highlight(index) {
      thumbs.forEach((thumb,i)=>thumb.setAttribute('aria-current',String(i===index)));
      const active=thumbs[index];
      const horizontal=getComputedStyle(rail).flexDirection==='row';
      const options={behavior:reduced.matches?'instant':'smooth'};
      if(horizontal) options.left=Math.max(0,active.offsetLeft-(rail.clientWidth-active.offsetWidth)/2);
      else options.top=Math.max(0,active.offsetTop-(rail.clientHeight-active.offsetHeight)/2);
      rail.scrollTo(options);
    }
    async function show(index,immediate=false) {
      wanted=wrap(index);
      const token=++generation, item=items[wanted], target=wanted;
      highlight(target);
      dialog.dataset.requestedImage=String(target+1);
      if(!immediate) {
        const next=new Image(); next.src=item.src;
        try { await next.decode(); } catch (_) { if(!next.complete||!next.naturalWidth) return; }
      }
      if(token!==generation||!dialog.open) return;
      current=target;
      image.src=item.src; image.alt=item.alt;
      dialog.dataset.currentImage=String(current+1);
      announcement.textContent=`${current+1} / ${items.length}. ${item.alt}`;
      preload(current-1); preload(current+1);
    }
    function layout() {
      if(!dialog.open) return;
      const width=window.innerWidth,height=window.innerHeight;
      const mobile=width<=767 || (height<=540&&width<=1024);
      const portrait=height>width;
      const emulate=mobile&&portrait&&rotated;
      canvas.style.width=emulate?`${height}px`:'100%';
      canvas.style.height=emulate?`${width}px`:'100%';
      canvas.style.left=emulate?'50%':'0'; canvas.style.top=emulate?'50%':'0';
      canvas.style.transform=emulate?'translate(-50%,-50%) rotate(90deg)':'none';
      canvas.classList.toggle('is-landscape',mobile&&(!portrait||emulate));
      canvas.classList.toggle('is-emulated-landscape',emulate);
      rotateButton.setAttribute('aria-pressed',String(rotated));
      rotateButton.setAttribute('aria-label',rotated?'View gallery vertically':'View gallery horizontally');
      requestAnimationFrame(()=>highlight(current));
    }
    function open(index,button) {
      opener=button; scrollY=window.scrollY;
      wheelDelta=0;lastWheel=-Infinity;lastWheelEvent=0;
      previousOverflow=document.documentElement.style.overflow;
      document.documentElement.classList.add('qdo-gallery-is-open');
      document.documentElement.style.overflow='hidden';
      rotated=false;
      if(!dialog.open) dialog.showModal();
      show(index,true); layout(); closeButton.focus({preventScroll:true});
    }
    function close() { if(dialog.open) dialog.close(); }
    items.forEach((item,index)=>item.button.addEventListener('click',event=>{event.preventDefault();open(index,item.button);}));
    closeButton.addEventListener('click',close);
    rotateButton.addEventListener('click',()=>{rotated=!rotated;layout();});
    dialog.addEventListener('close',()=>{
      generation++;document.documentElement.classList.remove('qdo-gallery-is-open');
      document.documentElement.style.overflow=previousOverflow;
      image.style.transform=''; rotated=false;
      window.scrollTo({top:scrollY,behavior:'instant'});
      opener?.focus({preventScroll:true});
    });
    dialog.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight') {event.preventDefault();show(wanted+(event.key==='ArrowRight'?1:-1));}
      if(event.key==='Home') {event.preventDefault();show(0);}
      if(event.key==='End') {event.preventDefault();show(items.length-1);}
    });
    function wheel(event) {
      if(!dialog.open||event.ctrlKey) return;
      event.preventDefault();
      const now=performance.now();
      if(now-lastWheelEvent>220) wheelDelta=0;
      lastWheelEvent=now;
      const unit=event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1;
      wheelDelta+=(Math.abs(event.deltaY)>=Math.abs(event.deltaX)?event.deltaY:event.deltaX)*unit;
      if(Math.abs(wheelDelta)>=45&&now-lastWheel>550) {show(wanted+(wheelDelta>0?1:-1));lastWheel=now;wheelDelta=0;}
    }
    [stage,rail].forEach(surface=>surface.addEventListener('wheel',wheel,{passive:false}));
    // Gesture distances are measured on the screen. A downward gesture always closes,
    // including when the gallery canvas has been turned to the horizontal view.
    [stage,rail].forEach(surface=>{
      let press=null;
      const isRail=surface===rail;
      surface.addEventListener('pointerdown',event=>{
        if(event.button!==0) return;
        press={id:event.pointerId,x:event.clientX,y:event.clientY,index:wanted,moved:false};
      });
      surface.addEventListener('pointermove',event=>{
        if(!press||event.pointerId!==press.id)return;
        const dx=event.clientX-press.x,dy=event.clientY-press.y;
        if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;
        press.moved=true;
        if(!surface.hasPointerCapture(event.pointerId))surface.setPointerCapture(event.pointerId);
        if(!isRail&&!reduced.matches){
          const distance=Math.abs(dx)>Math.abs(dy)?dx:dy;
          image.style.transform=`translateX(${distance*.1}px)`;
        }
      });
      const release=event=>{
        if(!press||event.pointerId!==press.id)return;
        const dx=event.clientX-press.x,dy=event.clientY-press.y;
        const start=press.index,moved=press.moved;
        press=null;image.style.transform='';
        if(!moved)return;
        blockClickUntil=performance.now()+400;
        if(!isRail&&dy>75&&dy>Math.abs(dx)*1.25){close();return;}
        const horizontalRail=getComputedStyle(rail).flexDirection==='row';
        const emulated=canvas.classList.contains('is-emulated-landscape');
        const delta=emulated?dy:(isRail&&!horizontalRail?dy:dx);
        if(Math.abs(delta)>36)show(start+(delta<0?1:-1));
      };
      surface.addEventListener('pointerup',release);
      surface.addEventListener('pointercancel',()=>{press=null;image.style.transform='';});
      surface.addEventListener('lostpointercapture',()=>{press=null;image.style.transform='';});
    });
    window.addEventListener('resize',layout,{passive:true});
    window.visualViewport?.addEventListener('resize',layout,{passive:true});
    window.QDOGallery={open:index=>open(wrap(index),items[wrap(index)].button),close,next:()=>show(wanted+1),previous:()=>show(wanted-1),get current(){return current;},get count(){return items.length;}};
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
