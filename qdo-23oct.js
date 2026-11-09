(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  if (G && ST && window.Draggable) G.registerPlugin(ST, Draggable);
  const status = $('.site-status');
  let highestPaper = 10;
  let selectedTrigger = null;
  let selectedScrollTween = null;
  const paperFloats = new WeakMap();
  window.QDO = { version: '08nov-2026', selectedTrigger: null, widgets: {}, ready: false };

  function translations() {
    $$('.language-line').forEach(node => {
      const ar = $('.language-ar', node), en = $('.language-en', node);
      let english = false;
      node.dataset.language = 'ar';
      const change = value => {
        if (value === english) return;
        english = value;
        const incoming = value ? en : ar, outgoing = value ? ar : en;
        if (!G || reduced.matches) {
          ar.style.visibility = value ? 'hidden' : 'visible';
          en.style.visibility = value ? 'visible' : 'hidden';
          en.style.transform = ar.style.transform = 'none';
        } else {
          G.killTweensOf([ar, en]);
          G.set(incoming, { visibility: 'visible', y: 0, yPercent: value ? 110 : -110 });
          G.to(outgoing, { y: 0, yPercent: value ? -110 : 110, duration: .6, ease: 'power3.inOut', onComplete: () => outgoing.style.visibility = 'hidden' });
          G.to(incoming, { yPercent: 0, duration: .6, ease: 'power3.inOut' });
        }
        node.dataset.language = value ? 'en' : 'ar';
      };
      const enter = () => change(true);
      const leave = () => change(false);
      const target = node.closest('a,button') || node;
      target.addEventListener('pointerenter', enter);
      target.addEventListener('pointerleave', leave);
      target.addEventListener('focusin', enter);
      target.addEventListener('focusout', leave);
    });
  }

  function introMotion() {
    const hero=$('.home-hero');
    if(!hero||!G)return;
    const contours=$$('.type-outline > *',hero),seeds=$$('.fill-seed',hero);
    contours.forEach(node=>{const length=node.getTotalLength()+2;node.dataset.length=String(length);G.set(node,{strokeDasharray:length,strokeDashoffset:length});});
    G.set(seeds,{attr:{r:0}});document.body.classList.add('intro-ready');
    if(reduced.matches){
      G.set(contours,{strokeDashoffset:0});G.set(seeds,{attr:{r:(_,node)=>Number(node.dataset.radius)}});hero.dataset.introPhase='filled';
    }else{
      const line=G.timeline({repeat:-1,repeatDelay:.5});
      line.call(()=>hero.dataset.introPhase='outline')
        .to(contours,{strokeDashoffset:0,duration:2.2,stagger:.012,ease:'power2.inOut'})
        .call(()=>hero.dataset.introPhase='fill')
        .to(seeds,{attr:{r:(_,node)=>Number(node.dataset.radius)},duration:1.35,stagger:.015,ease:'power2.inOut'},'-=.2')
        .call(()=>hero.dataset.introPhase='hold').to({},{duration:4.2})
        .call(()=>hero.dataset.introPhase='reverse')
        .to(seeds,{attr:{r:0},duration:1.25,ease:'power2.inOut'})
        .to(contours,{strokeDashoffset:(_,node)=>Number(node.dataset.length),duration:2.1,stagger:{each:.012,from:'end'},ease:'power2.inOut'},'-=.15');
      let visible=true;
      const sync=()=>line.paused(!visible||document.hidden);
      new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(hero);
      ST?.create({start:0,end:()=>hero.parentElement.offsetTop+hero.offsetHeight,
        onLeave:()=>{visible=false;sync();},onEnterBack:()=>{visible=true;sync();}});
      document.addEventListener('visibilitychange',sync);
    }
    const svg=$('.hero-rolling',hero),orb=$('.rolling-orb',svg),slash=$('.emblem-slash',svg),left=$('.arm-left',svg),right=$('.arm-right',svg);
    let width=370,x=352.76,angle=0,direction=-1,held=null,active=true,bounces=0;
    const radius=11,min=11.43;
    function paint(){
      orb.setAttribute('transform',`translate(${x-17.2367} 0)`);
      left.setAttribute('width',String(x));
      right.setAttribute('d',`M${x+9.0582} 25.6738 V28.2418 H${x+9.9192} V32.9998 H${width} V25.6738 Z`);
      slash.setAttribute('transform',`rotate(${angle} 134.9957 65.5)`);
      hero.dataset.logoX=x.toFixed(2);hero.dataset.logoWidth=width.toFixed(2);hero.dataset.logoBounces=String(bounces);
    }
    function move(value){const next=Math.max(min,Math.min(width-min,value));angle+=(next-x)/radius*180/Math.PI;x=next;paint();}
    function fit(){
      const ratio=x/width,box=svg.parentElement.getBoundingClientRect();
      width=Math.max(2*min+1,box.width/Math.max(1,box.height)*33);
      svg.setAttribute('viewBox',`0 0 ${width} 33`);move(width*ratio);
    }
    new ResizeObserver(fit).observe(svg.parentElement);fit();
    new IntersectionObserver(entries=>active=entries[0].isIntersecting).observe(svg);
    G.ticker.add(()=>{
      if(!active||held||document.hidden||reduced.matches||scrollY>hero.parentElement.offsetTop+hero.offsetHeight-72)return;
      let next=x+direction*29.04*Math.min(2,G.ticker.deltaRatio())/60;
      if(next>=width-min){next=width-min;direction=-1;bounces++;}
      if(next<=min){next=min;direction=1;bounces++;}
      move(next);
    });
    orb.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;event.preventDefault();
      held={x,clientX:event.clientX};orb.setPointerCapture(event.pointerId);orb.classList.add('is-dragging');
    });
    orb.addEventListener('pointermove',event=>{
      if(!held)return;
      const next=held.x+(event.clientX-held.clientX)*width/svg.getBoundingClientRect().width;
      direction=next>=x?1:-1;move(next);
      if(next<min||next>width-min){direction=next<min?1:-1;hero.dataset.logoBounces=String(++bounces);}
    });
    const release=()=>{held=null;orb.classList.remove('is-dragging');};
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>orb.addEventListener(type,release));
    orb.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();
      direction=event.key==='ArrowLeft'?-1:1;move(event.key==='Home'?width/2:x+direction*(event.shiftKey?16:6));
    });
  }

  function persistentNavigation() {
    const back=$('.back-top');
    if(back){
      document.body.append(back);
      const update=()=>{
        const hero=$('.home-hero');
        const threshold=hero?hero.parentElement.offsetTop+hero.offsetHeight-72:innerHeight-72;
        const visible=scrollY>=threshold-2;
        back.classList.toggle('is-visible',visible);back.tabIndex=visible?0:-1;back.setAttribute('aria-hidden',String(!visible));
      };
      window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);ST?.addEventListener('refresh',update);update();
    }
    const slash=$('.brand-svg .emblem-slash');
    if(slash&&G&&ST&&!reduced.matches){
      G.set(slash,{transformOrigin:'50% 50%'});
      ST.create({start:0,end:'max',onUpdate:()=>G.set(slash,{rotation:scrollY*.18})});
    }
  }

  function floatContactPapers() {
    if(!G||!ST||reduced.matches)return;
    $$('.contact-paper').forEach((paper,index)=>{
      const tween=G.to($('img',paper),{y:index%2?-3:3,rotation:index%2?-.35:.35,duration:2.6+index*.25,repeat:-1,yoyo:true,ease:'sine.inOut',paused:true});
      paperFloats.set(paper,tween);
      ST.create({trigger:paper,start:'top bottom',end:'bottom top',onToggle:self=>tween.paused(!self.isActive)});
    });
  }

  function sectionAnimations() {
    if (!G || !ST || reduced.matches) return;
    const hero = $('.home-hero');
    if (hero) {
      G.to('.hero-down .icon', { y: 5, duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut', scrollTrigger: { trigger: hero, start: 'top bottom', end: 'bottom top', toggleActions: 'play pause play pause' } });
    }
    $$('.office-section .media-reveal').forEach((node, i) => G.from(node, {
      clipPath: 'inset(0 0 12% 0)', y: 30, duration: 1.25, delay: i * .1, ease: 'power3.out',
      scrollTrigger: { trigger: node, start: 'top 85%', once: true }
    }));
    $$('.story-copy,.three-stories').forEach(node => G.from(node, { y: 35, opacity: 0, duration: 1,
      scrollTrigger: { trigger: node, start: 'top 88%', once: true } }));
    const experience = $('.experience-section');
    if (experience) {
      G.from('.experience-section h2', { y: 28, opacity: 0, duration: 1, scrollTrigger: { trigger: experience, start: 'top 82%', once: true } });
      G.from('.stat', { y: 35, opacity: 0, stagger: .12, duration: .9, scrollTrigger: { trigger: '.statistics', start: 'top 85%', once: true } });

    }
    const clients = $('.clients-section');
    if (clients) G.from(clients.querySelector('h2'), { y: 25, opacity: 0, duration: .9, scrollTrigger: { trigger: clients, start: 'top 82%', once: true } });
    $$('.action-strip').forEach(node => G.from(node.querySelector('.language-line'), { y: 24, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: node, start: 'top 88%', once: true } }));
    $$('.gallery-photo').forEach(node => G.from(node, { opacity: .3, y: 35, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: node, start: 'top 91%', once: true } }));
    $$('.project-introduction h1,.project-meta,.project-holding,.contact-center').forEach(node => G.from(node, { y: 25, opacity: 0, duration: 1, scrollTrigger: { trigger: node, start: 'top 86%', once: true } }));
    if ($('.contact-composition')) G.from('.stories-host,.music-host,.contact-paper', { y: 30, opacity: 0, stagger: .1, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.contact-composition', start: 'top 78%', once: true } });
    if ($('.projects-grid')) ST.batch('.projects-grid > .project-card', { start: 'top 96%', once: true,
      onEnter: batch => G.from(batch, { y: 28, opacity: .15, duration: 1, stagger: .07, ease: 'power3.out' }) });
  }

  function selectedWorks() {
    const section = $('.selected-works');
    if (!section) return;
    const pin = $('.selected-pin', section), track = $('.selected-track', section), viewport = $('.selected-window', section);
    const cards = $$('.selected-card', track);
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    const update = value => section.dataset.progress = value.toFixed(3);
    const step = () => cards[0].offsetWidth + parseFloat(getComputedStyle(track).gap);
    if (G && ST && !reduced.matches) {
      G.to(track, { x: () => -distance(), ease: 'none', scrollTrigger: {
        id: 'selected-horizontal', trigger: pin, start: 'top 72px', end: () => '+=' + distance(),
        pin: true, scrub: .4, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => update(self.progress), onRefresh: self => update(self.progress)
      }});
      selectedTrigger = ST.getById('selected-horizontal');
      window.QDO.selectedTrigger = selectedTrigger;
    } else {
      viewport.addEventListener('scroll', () => update(viewport.scrollLeft / Math.max(1, distance())), { passive: true });
    }
    function advance(delta) {
      if (selectedTrigger) {
        const desired = G.utils.clamp(selectedTrigger.start, selectedTrigger.end, selectedTrigger.scroll() + delta * step());
        selectedScrollTween?.kill();
        const state = { y: scrollY };
        selectedScrollTween = G.to(state, { y: desired, duration: .7, ease: 'power2.inOut', onUpdate: () => window.scrollTo(0, state.y) });
      } else viewport.scrollBy({ left: delta * step(), behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    viewport.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault(); advance(event.key === 'ArrowRight' ? 1 : -1);
    });
    if (G && window.Draggable) {
      let initial = 0, moved = false;
      Draggable.create(document.createElement('div'), { type: 'x', trigger: viewport,
        dragClickables: true, allowNativeTouchScrolling: true, minimumMovement: 5,
        onPress() {
          selectedScrollTween?.kill(); selectedTrigger?.getTween(true)?.kill?.();
          initial = selectedTrigger ? selectedTrigger.scroll() : viewport.scrollLeft;
          moved = false;
        },
        onDrag() {
          moved = true; viewport.classList.add('is-dragging');
          const target = initial - (this.x - this.startX);
          if (selectedTrigger) {
            const y = G.utils.clamp(selectedTrigger.start, selectedTrigger.end, target);
            selectedTrigger.scroll(y); selectedTrigger.update();
            selectedTrigger.getTween()?.progress?.(1);
          } else viewport.scrollLeft = target;
        },
        onRelease() { viewport.classList.remove('is-dragging'); },
        onDragEnd() { setTimeout(() => moved = false, 0); }
      });
      viewport.addEventListener('click', event => { if (moved) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    }
    window.addEventListener('wheel', () => selectedScrollTween?.kill(), { passive: true });
    cards.forEach((card, index) => card.addEventListener('focus', () => {
      if (!card.matches(':focus-visible')) return;
      if (selectedTrigger && index > 0) {
        const target = Math.min(distance(), card.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft));
        const state = { y: scrollY };
        G.to(state, { y: selectedTrigger.start + target, duration: reduced.matches ? 0 : .5, onUpdate: () => window.scrollTo(0, state.y) });
      }
    }));
    update(0);
  }

  function ribbon(viewport, track, period, speed = .55) {
    if (!G || !ST || reduced.matches) return;
    let x = 0, active = false, dragging = false;
    // The supplied build already used 1.69; increase that existing speed by 30%.
    const speedMultiplier = 1.3 * 1.3 * 1.3;
    const baseSpeed = speed * speedMultiplier;
    const state = { speed: baseSpeed }, setX = G.quickSetter(track, 'x', 'px');
    viewport.dataset.motionSpeed = String(baseSpeed);
    const wrap = value => { const width = period(); return width > 0 ? ((value % width) + width) % width - width : 0; };
    const tick = () => { if (!active || dragging || document.hidden) return; x = wrap(x - state.speed * G.ticker.deltaRatio()); setX(x); };
    G.ticker.add(tick);
    ST.create({ trigger: viewport, start: 'top bottom', end: 'bottom top', onToggle: self => active = self.isActive });
    if (window.Draggable) {
      const proxy = document.createElement('div');
      let start = 0;
      Draggable.create(proxy, { type: 'x', trigger: viewport, allowNativeTouchScrolling: true,
        onPress() { dragging = true; start = x; },
        onDrag() { x = wrap(start + this.x - this.startX); setX(x); },
        onRelease() { dragging = false; if (Math.abs(this.deltaX) > .2) G.to(state, { speed: baseSpeed, duration: .6, overwrite: true }); }
      });
    }
    viewport.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      x = wrap(x + (event.key === 'ArrowRight' ? -140 : 140));
      dragging = true;
      G.to(track, { x, duration: .5, overwrite: true, onComplete: () => { setX(x); dragging = false; } });
    });
    viewport.addEventListener('pointerenter', () => G.to(state, { speed: Math.sign(state.speed) * .18 * speedMultiplier, duration: .5, overwrite: true }));
    viewport.addEventListener('pointerleave', () => G.to(state, { speed: Math.sign(state.speed) * baseSpeed, duration: .5, overwrite: true }));

  }

  function draggablePaper(node, bounds) {
    if (!G || !window.Draggable) return;
    const originalRotation = G.getProperty(node, 'rotation');
    const original = { x: 0, y: 0 };
    const drag = Draggable.create(node, { type: 'x,y', bounds, edgeResistance: .85, dragClickables: true,
      onPress() {
        paperFloats.get(node)?.pause();G.killTweensOf(node);G.set(node,{opacity:1});
        node.style.zIndex=++highestPaper;node.closest('.paper-collage')?.style.setProperty('z-index',highestPaper);
        const olive=node.closest('.collage-cafe')?.querySelector('.note');
        if(olive&&olive!==node)olive.style.zIndex=++highestPaper;
        node.classList.add('is-dragging');
      },
      onDragEnd() { node.classList.remove('is-dragging'); node.dataset.moved = 'true'; G.to(node, { rotation: originalRotation, duration: .4, ease: 'power2.out' }); },
      onRelease() { node.classList.remove('is-dragging'); paperFloats.get(node)?.resume(); }
    })[0];
    node.addEventListener('keydown', event => {
      const step = event.shiftKey ? 40 : 15;
      const deltas = { ArrowLeft: [-step,0], ArrowRight: [step,0], ArrowUp: [0,-step], ArrowDown: [0,step] };
      if (event.key === 'Home') {
        event.preventDefault(); G.to(node, { ...original, duration: .3, onUpdate: () => drag.update() });
      } else if (deltas[event.key]) {
        event.preventDefault(); const [dx,dy] = deltas[event.key];
        G.to(node, { x: Number(G.getProperty(node,'x'))+dx, y: Number(G.getProperty(node,'y'))+dy, duration: reduced.matches ? 0 : .2, onUpdate: () => drag.update(true) });
        node.dataset.moved = 'true';
      }
    });
    return drag;
  }

  function projectsGrid() {
    const grid = $('.projects-grid');
    if (!grid) return;
    const cards = $$('.project-card',grid), papers = $$('.paper-collage',grid), all = [...cards,...papers];
    all.forEach(node => { node.dataset.col = node.style.getPropertyValue('--col'); node.dataset.row = node.style.getPropertyValue('--row'); });
    function mobilePositions() {
      all.filter(node => !node.hidden).sort((a,b) => Number(a.style.getPropertyValue('--row'))-Number(b.style.getPropertyValue('--row')) || Number(a.style.getPropertyValue('--col'))-Number(b.style.getPropertyValue('--col'))).forEach((node,i) => {
        node.style.order = String(i); node.style.setProperty('--mobile-col', i%2+1); node.style.setProperty('--mobile-row', Math.floor(i/2)+1);
      });
    }
    mobilePositions();
    let active = '';
    const pattern = [[1,3,4],[1,2,4],[2,3,4],[1,2,4],[1,3,4],[2,3]];
    $$('.project-categories button').forEach(button => button.addEventListener('click', () => {
      active = active === button.dataset.category ? '' : button.dataset.category;
      let index = 0;
      cards.forEach(card => {
        card.hidden = !!active && !card.dataset.disciplines.split(' ').includes(active);
        if (!active) {
          card.style.setProperty('--col',card.dataset.col);card.style.setProperty('--row',card.dataset.row);
        } else if (!card.hidden) {
          card.style.setProperty('--col',pattern[Math.floor(index/3)%pattern.length][index%3] || 4);
          card.style.setProperty('--row',Math.floor(index/3)+1);index++;
          G?.set(card,{opacity:1,y:0});
        }
      });
      papers.forEach(p => p.hidden = !!active);
      $$('.project-categories button').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.category === active)));
      mobilePositions();ST?.refresh();
      if (status) status.textContent = `${cards.filter(c=>!c.hidden).length} projects`;
    }));
  }

  function hoverPolaroids(config) {
    if (!G) return;
    let current = null, closeCall = null, serial = 0;
    function dismiss() {
      if (!current) return;
      const old = current; current = null;
      closeCall?.kill();old.drags.forEach(d=>d?.kill());
      G.killTweensOf(old.root.children);
      G.to(old.root, { autoAlpha: 0, duration: reduced.matches?0:.25, onComplete: () => old.root.remove() });
    }
    $$('.hover-surface[data-polaroids]').forEach(target => {
      let armed = true;
      const sourceActive=()=>target.matches(':hover')||target.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');
      function schedule(entry,afterDrag=false){
        closeCall?.kill();
        closeCall=G.delayedCall(afterDrag ? .28 : .65,()=>{
          if(current!==entry||entry.dragging||sourceActive())return;
          if(!afterDrag&&entry.photoHovered)return;
          dismiss();
        });
      }
      function reveal() {
        if (!armed) { closeCall?.kill(); return; }
        armed = false; closeCall?.kill(); dismiss();
        const pool = config.polaroids[target.dataset.polaroids] || [];
        if (!pool.length) return;
        const root = document.createElement('div'); root.className='hover-stack';root.setAttribute('aria-label','Collected QDO Polaroids');
        document.body.append(root);
        const entry={root,target,drags:[],dragging:false,photoHovered:false};current=entry;
        const photos = [...pool]; if (++serial%2===0) photos.reverse();
        const columns=innerWidth>=720?photos.length:Math.min(2,photos.length),rows=Math.ceil(photos.length/columns);
        const width=Math.min(185,(innerWidth-64-(columns-1)*48)/columns);
        const height=Math.min(260,(innerHeight-140-(rows-1)*42)/rows);
        photos.forEach((src,i) => {
          const card=document.createElement('button');card.type='button';card.className='hover-photo';card.setAttribute('aria-label','Move Polaroid photograph');
          const col=i%columns,row=Math.floor(i/columns),cell=innerWidth/columns;
          const left=cell*(col+.5)-width/2+(serial%2?1:-1)*(i%2?14:-14);
          const top=rows>1?72+row*(height+42):Math.max(90,innerHeight*(i%2 ? .42 : .19));
          card.style.cssText=`left:${Math.max(12,Math.min(innerWidth-width-12,left))}px;top:${Math.min(innerHeight-height-32,top)}px;width:${width}px;--photo-height:${height}px`;
          const image=document.createElement('img');image.src=src;image.alt='';image.draggable=false;card.append(image);root.append(card);
          G.fromTo(card,{y:14,rotation:0,opacity:0},{y:0,rotation:(i%2?1:-1)*(4+i),duration:reduced.matches?0:.65,delay:i*.08,opacity:1,ease:'power3.out'});
          card.addEventListener('pointerenter',()=>{entry.photoHovered=true;closeCall?.kill();});
          card.addEventListener('pointerleave',()=>{entry.photoHovered=false;schedule(entry);});
          if(window.Draggable)entry.drags.push(Draggable.create(card,{type:'x,y',dragClickables:true,
            onPressInit(){G.killTweensOf(card);G.set(card,{opacity:1});},
            onPress(){entry.dragging=true;closeCall?.kill();card.classList.add('is-dragging');card.style.zIndex=++highestPaper;target.dataset.polaroidDrags=String(Number(target.dataset.polaroidDrags||0)+1);},
            onRelease(){entry.dragging=false;card.classList.remove('is-dragging');schedule(entry,true);}
          })[0]);
        });
        G.set(root,{autoAlpha:1});
        target.dataset.shuffleCount=String(Number(target.dataset.shuffleCount||0)+1);
      }
      target.addEventListener('pointerenter',event=>{if(fine.matches&&event.pointerType==='mouse')reveal();});
      target.addEventListener('pointerleave',()=>{armed=true;if(current)schedule(current);});
      target.addEventListener('focusin',reveal);
      target.addEventListener('focusout',()=>{armed=true;if(current)schedule(current);});
    });
    window.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();});
    window.addEventListener('scroll',()=>{
      if(current&&!current.dragging&&!current.target.matches(':hover')&&!current.target.contains(document.activeElement))dismiss();
    },{passive:true});
  }

  function gallery() {
    const dialog=$('.gallery-dialog');if(!dialog)return;
    const buttons=$$('.gallery-open'),images=$$('.gallery-image',dialog),thumbs=$('.gallery-thumbs',dialog),stage=$('.gallery-stage',dialog),announcement=$('.gallery-status',dialog);
    let front=images[0],back=images[1],current=0,desired=0,opener=null,busy=false,generation=0,transition=null;
    let suppressClickUntil=0,wheelDelta=0,lastWheel=0,lastWheelEvent=0,stageDragging=false;
    const wrap=index=>(index%buttons.length+buttons.length)%buttons.length;
    const thumbnails=buttons.map((button,index)=>{
      const thumb=document.createElement('button');thumb.type='button';thumb.setAttribute('aria-label',`View photograph ${index+1}`);
      const im=document.createElement('img');im.src=button.dataset.src;im.alt='';im.loading='lazy';im.draggable=false;thumb.append(im);thumbs.append(thumb);
      thumb.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();return;}show(index);});return thumb;
    });
    function highlight(index){
      thumbnails.forEach((t,i)=>t.setAttribute('aria-current',String(i===index)));
      const active=thumbnails[index];
      thumbs.scrollTo({top:Math.max(0,active.offsetTop-thumbs.clientHeight*.35),behavior:reduced.matches?'instant':'smooth'});
    }
    function describe(index){
      dialog.dataset.currentImage=String(index+1);announcement.textContent=$('img',buttons[index]).alt;
    }
    async function render(){
      if(busy||stageDragging||desired===current)return;
      busy=true;const target=desired,token=generation,src=buttons[target].dataset.src;
      const preload=new Image();preload.src=src;
      try{await preload.decode();}catch(error){if(!preload.complete||!preload.naturalWidth){busy=false;return;}}
      if(token!==generation||!dialog.open)return;
      // The current image stays fully visible until its replacement has decoded.
      back.src=src;back.alt=$('img',buttons[target]).alt;
      back.setAttribute('aria-hidden','true');front.style.zIndex='1';back.style.zIndex='2';
      highlight(target);dialog.dataset.transitioning='true';
      const complete=()=>{
        front.style.opacity='0';front.setAttribute('aria-hidden','true');
        [front,back]=[back,front];front.removeAttribute('aria-hidden');front.classList.add('is-current');back.classList.remove('is-current');
        current=target;busy=false;dialog.dataset.transitioning='false';describe(current);
        if(desired!==current)render();
      };
      if(G&&!reduced.matches){
        G.set(back,{opacity:0,x:0,scale:1.012});
        transition=G.to(back,{opacity:1,scale:1,duration:.95,ease:'sine.inOut',overwrite:true,onComplete:complete});
      }else{back.style.opacity='1';complete();}
    }
    function show(index,immediate=false){
      desired=wrap(index);dialog.dataset.requestedImage=String(desired+1);
      if(immediate){
        wheelDelta=0;lastWheel=-Infinity;lastWheelEvent=0;
        generation++;transition?.kill();busy=false;stageDragging=false;current=desired;
        front.src=buttons[current].dataset.src;front.alt=$('img',buttons[current]).alt;front.removeAttribute('aria-hidden');
        if(G){G.set(front,{opacity:1,x:0,scale:1});G.set(back,{opacity:0,x:0,scale:1});}
        else{front.style.opacity='1';back.style.opacity='0';}
        front.style.zIndex='2';back.style.zIndex='1';back.setAttribute('aria-hidden','true');
        describe(current);highlight(current);dialog.dataset.transitioning='false';
      }else render();
    }
    buttons.forEach((button,index)=>button.addEventListener('click',()=>{opener=button;dialog.showModal();show(index,true);$('.gallery-close',dialog).focus();}));
    $('.gallery-close',dialog).addEventListener('click',()=>dialog.close());
    dialog.addEventListener('keydown',event=>{if(['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();show(desired+(event.key==='ArrowRight'?1:-1));}});
    dialog.addEventListener('close',()=>{generation++;transition?.kill();busy=false;opener?.focus({preventScroll:true});});
    function wheelImage(event){
      if(!dialog.open||event.ctrlKey||stageDragging)return;
      event.preventDefault();const now=performance.now();
      if(now-lastWheelEvent>220)wheelDelta=0;lastWheelEvent=now;
      const unit=event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1;
      wheelDelta+=(Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX)*unit;
      if(Math.abs(wheelDelta)>=45&&now-lastWheel>650){show(desired+(wheelDelta>0?1:-1));lastWheel=now;wheelDelta=0;}
    }
    [stage,thumbs].forEach(surface=>surface.addEventListener('wheel',wheelImage,{passive:false}));
    [stage,thumbs].forEach(surface=>{
      const rail=surface===thumbs;let press=null;
      surface.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        press={x:event.clientX,y:event.clientY,id:event.pointerId,start:desired,steps:0,axis:null};
      });
      surface.addEventListener('pointermove',event=>{
        if(!press||event.pointerId!==press.id)return;
        const dx=event.clientX-press.x,dy=event.clientY-press.y;
        if(!press.axis&&Math.max(Math.abs(dx),rail?Math.abs(dy):0)>8){
          if(!rail&&Math.abs(dy)>Math.abs(dx))return;
          press.axis=rail&&Math.abs(dy)>Math.abs(dx)?'y':'x';
          surface.setPointerCapture(event.pointerId);surface.classList.add('is-dragging');
          if(!rail)stageDragging=true;
        }
        if(!press.axis)return;
        if(rail){
          const delta=press.axis==='y'?dy:dx,steps=Math.trunc(delta/(press.axis==='y'?72:100));
          if(steps!==press.steps){press.steps=steps;show(press.start-steps);}
        }else if(G)G.set(images,{x:dx*.18});
      });
      const release=event=>{
        if(!press)return;const dx=event.clientX-press.x,dy=event.clientY-press.y;
        stageDragging=false;
        if(press.axis){
          suppressClickUntil=performance.now()+450;
          const delta=press.axis==='y'?dy:dx;
          if(!rail&&Math.abs(delta)>36)show(press.start+(delta<0?1:-1));
          else if(rail&&press.steps===0&&Math.abs(delta)>36)show(press.start+(delta<0?1:-1));
          if(G)G.to(images,{x:0,duration:reduced.matches?0:.45,ease:'power2.out'});
        }
        surface.classList.remove('is-dragging');press=null;render();
      };
      surface.addEventListener('pointerup',release);
      surface.addEventListener('pointercancel',()=>{press=null;stageDragging=false;surface.classList.remove('is-dragging');G?.to(images,{x:0,duration:.3});render();});
      surface.addEventListener('lostpointercapture',()=>{press=null;stageDragging=false;surface.classList.remove('is-dragging');});
    });
  }

  function imageParallax() {
    if (!G || !ST || reduced.matches) return;
    // Photographs move inside their crop; identity marks and draggable paper stay intact.
    $$('.project-picture > img,.gallery-open > img,.office-stills .media-reveal > img,.office-film > video').forEach(image => {
      const frame=image.parentElement;
      frame.classList.add('parallax-frame');image.classList.add('parallax-image');
      const trigger=frame.closest('.selected-works')||frame;
      G.fromTo(image,{yPercent:-6},{yPercent:6,ease:'none',scrollTrigger:{
        trigger,start:'top bottom',end:'bottom top',scrub:.65,invalidateOnRefresh:true
      }});
    });
  }

  function normalSections() {
    // Vertical sections use document flow. Selected works owns the only pin.
    document.body.dataset.snapMode = 'none';
    window.QDO.sectionPins = 0;
  }

  function customCursor() {
    if (!fine.matches) return;
    const cursor=document.createElement('div');cursor.className='qdo-cursor';cursor.setAttribute('aria-hidden','true');cursor.dataset.mode='default';cursor.innerHTML='<span class="cursor-dot"></span>';document.body.append(cursor);document.body.classList.add('has-custom-cursor');
    const dot=cursor.firstElementChild;
    document.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse')return;
      const host=document.querySelector('.gallery-dialog[open]')||document.body;if(cursor.parentElement!==host)host.append(cursor);
      cursor.style.transform=`translate3d(${event.clientX}px,${event.clientY}px,0)`;cursor.style.opacity='1';cursor.style.visibility='visible';
      const link=event.target.closest('a,button,[role="button"],[role="option"],[role="combobox"]');cursor.dataset.mode=link?'link':'default';dot.style.backgroundColor=link?'#161615':'#d1d1cb';
    },{passive:true});
    const hide=()=>{cursor.style.opacity='0';cursor.style.visibility='hidden'};document.addEventListener('mouseleave',hide);window.addEventListener('blur',hide);document.querySelector('.gallery-dialog')?.addEventListener('close',()=>{document.body.append(cursor);hide()});
  }

  function widgets(config) {
    if (!window.QDOWidgets) return;
    const bounds=$('.contact-composition'),stories=$('.stories-host'),music=$('.music-host');
    const shufflePool=pool=>{const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;};
    const makeStories=(host,items)=>QDOWidgets.createStories(host,{title:'QDO / Collected moments',items,duration:5500,bounds,cleanChrome:true,shuffle:true});
    if(stories)window.QDO.widgets.stories=makeStories(stories,shufflePool(config.stories));
    const secondary=$('.stories-host-secondary'),compactStories=matchMedia('(max-width:767px)');
    const syncStoryLayout=()=>{
      if(!secondary)return;
      if(compactStories.matches){window.QDO.widgets.storiesSecondary?.destroy();delete window.QDO.widgets.storiesSecondary;}
      else if(!window.QDO.widgets.storiesSecondary){const pool=shufflePool(config.stories);if(pool.length>1&&pool[0].src===window.QDO.widgets.stories?.currentItem.src?.replace(location.origin+'/', ''))pool.push(pool.shift());window.QDO.widgets.storiesSecondary=makeStories(secondary,pool);}
    };
    syncStoryLayout();compactStories.addEventListener('change',syncStoryLayout);
    window.QDO.storyPool=config.stories.map(item=>({...item}));
    if(music)window.QDO.widgets.music=QDOWidgets.createSpotify(music,{title:config.music.title,subtitle:'Studio sounds',artwork:config.music.artwork,artworkAlt:'Riff - Se7r album artwork',songUrl:config.music.anghamiUrl,linkLabel:'Play On Anghami',spinDuration:16,bounds,cleanChrome:true});
    function reopen(){if(location.hash==='#stories')window.QDO.widgets.stories?.show();if(location.hash==='#music')window.QDO.widgets.music?.show();}
    window.addEventListener('hashchange',reopen);reopen();
    $$('a[href="contact.html#stories"],a[href="contact.html#music"]').forEach(link=>link.addEventListener('click',()=>{if(location.pathname.endsWith('contact.html')){const key=link.hash==='#stories'?'stories':'music';window.QDO.widgets[key]?.show();}}));
  }

  function media() {
    const video=$('.office-film video'),button=$('.film-toggle');if(!video||!button)return;
    if(reduced.matches)video.pause();
    let userPaused=reduced.matches;
    const paint=()=>{button.setAttribute('aria-label',video.paused?'Play studio film':'Pause studio film');button.innerHTML=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${video.paused?'M8 5l11 7-11 7Z':'M8 6v12M16 6v12'}" fill="${video.paused?'currentColor':'none'}" stroke="currentColor" stroke-width="1.5"/></svg>`;};
    button.addEventListener('click',()=>{userPaused=!video.paused;if(video.paused)video.play().catch(()=>{});else video.pause();});
    video.addEventListener('play',paint);video.addEventListener('pause',paint);paint();
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)video.pause();else if(!userPaused&&!reduced.matches)video.play().catch(()=>{});},{threshold:.1}).observe(video);
  }

  async function init() {
    let config=window.QDO_CONTENT;
    if(!config&&location.protocol!=='file:'){
      try {const response=await fetch('content-23oct.json');if(!response.ok)throw new Error('Content unavailable');config=await response.json();}
      catch(error){console.error('QDO content:',error);}
    }
    config ||= {polaroids:{},stories:[],music:{}};
    await document.fonts.ready;
    document.documentElement.style.setProperty('--scrollbar',`${innerWidth-document.documentElement.clientWidth}px`);
    widgets(config);media();
    $$('.paper').forEach(node=>draggablePaper(node,node.closest('.projects-grid,.contact-composition')));
    hoverPolaroids(config);
    introMotion();normalSections();customCursor();persistentNavigation();floatContactPapers();
    const clients=$('.clients-window');
    if(clients)ribbon(clients,$('.clients-track',clients),()=>$('.client-repeat',clients).offsetLeft,.6);
    const footer=$('.footer-marquee');
    if(footer)ribbon(footer,$('.footer-wordmarks',footer),()=>$('.footer-wordmarks img',footer).getBoundingClientRect().width+parseFloat(getComputedStyle($('.footer-wordmarks',footer)).gap),.35);
    $$('a[href^="#"]').filter(a=>!a.classList.contains('skip-link')).forEach(link=>link.addEventListener('click',event=>{
      const target=$(link.getAttribute('href'));if(!target)return;event.preventDefault();
      const y=target.getBoundingClientRect().top+scrollY-90;
      if(G&&!reduced.matches){const state={y:scrollY};G.to(state,{y:Math.max(0,y),duration:1,ease:'power3.inOut',onUpdate:()=>scrollTo(0,state.y)});}else scrollTo(0,y);
      history.replaceState(null,'',link.getAttribute('href'));
    }));
    let refreshTimer;
    const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{
      if($('.gallery-dialog[open]'))return;
      document.documentElement.style.setProperty('--scrollbar',`${innerWidth-document.documentElement.clientWidth}px`);
      ST?.refresh();
    },160);};
    $$('img').forEach(image=>{if(!image.complete)image.addEventListener('load',refresh,{once:true});});
    window.addEventListener('resize',refresh);window.addEventListener('load',refresh,{once:true});
    $('.gallery-dialog')?.addEventListener('close',refresh);
    reduced.addEventListener('change',()=>location.reload());
    ST?.refresh();window.QDO.ready=true;document.documentElement.dataset.qdoReady='true';
  }
  init();
})();
