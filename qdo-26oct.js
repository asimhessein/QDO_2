(() => {
  'use strict';
  document.addEventListener('contextmenu', event => event.preventDefault());
  const G = window.gsap, ST = window.ScrollTrigger;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const introDone = Promise.resolve();

  function splitWords(node) {
    if (!node || node.dataset.textReveal) return [];
    node.dataset.textReveal = 'true';
    const text = node.textContent;
    node.setAttribute('aria-label', text.trim());
    const fragment = document.createDocumentFragment();
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { fragment.append(document.createTextNode(part)); continue; }
      const mask = document.createElement('span'), word = document.createElement('span');
      mask.className = 'text-mask'; word.className = 'text-word';
      mask.setAttribute('aria-hidden', 'true'); word.textContent = part;
      mask.append(word); fragment.append(mask);
    }
    node.replaceChildren(fragment);
    return [...node.querySelectorAll('.text-word')];
  }

  function statistics() {
    if (!G || !ST || reduced.matches || !$('.statistics')) return;
    const reels = [], pluses = [];
    $$('.stat-value').forEach((value, statIndex) => {
      const digits = value.querySelector('.stat-digits');
      digits.replaceChildren(); digits.setAttribute('aria-hidden', 'true');
      value.dataset.numberAnimation = 'rolling-arabic';
      [...value.dataset.value].forEach((digit, digitIndex) => {
        const wheel = document.createElement('span'), reel = document.createElement('span');
        wheel.className = 'stat-wheel'; reel.className = 'stat-reel';
        const end = 20 + Number(digit);
        for (let index = 0; index <= end; index++) {
          const row = document.createElement('span'); row.textContent = '٠١٢٣٤٥٦٧٨٩'[index % 10]; reel.append(row);
        }
        wheel.append(reel); digits.append(wheel);
        reels.push({ reel, end, delay: statIndex * .12 + digitIndex * .065 });
      });
      pluses.push(value.firstElementChild);
    });
    const line = G.timeline({ scrollTrigger: { trigger: '.statistics', start: 'top 88%', once: true } });
    line.from(pluses, { yPercent: 100, autoAlpha: 0, duration: .65, stagger: .12, ease: 'power3.out' }, 0);
    reels.forEach(({ reel, end, delay }) => line.to(reel, { y: `${-end}em`, duration: 2.15, ease: 'power4.out' }, delay));
    line.call(() => $('.statistics').dataset.animationComplete = 'true');
  }

  function textReveals() {
    if (!G || !ST || reduced.matches) return;
    const heroItems = $$('.hero-details > *');
    const heroWords = heroItems.flatMap(node => splitWords(node.querySelector('a')));
    if (heroWords.length) {
      G.set(heroWords, { yPercent: 115, autoAlpha: 0 });
      introDone.then(() => {
        G.to(heroWords, { yPercent: 0, autoAlpha: 1, duration: .9, stagger: .025, ease: 'power4.out', clearProps: 'transform,opacity,visibility' });
        const down = $('.hero-down');
        if (down) G.fromTo(down, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .8, delay: .2 });
      });
    }
    const footer = $('.site-footer');
    if (footer) {
      const words = $$('.footer-details .hover-surface > a, .footer-details > p').flatMap(splitWords);
      const marquee = $('.footer-marquee');
      const reveal = G.timeline({ scrollTrigger: { trigger: footer, start: 'top 94%', once: true } });
      reveal.from(marquee, { clipPath: 'inset(100% 0 0 0)', y: 28, duration: 1.2, ease: 'power4.out', clearProps: 'clipPath,transform' }, 0)
        .from(words, { yPercent: 115, autoAlpha: 0, duration: .9, stagger: .024, ease: 'power4.out', clearProps: 'transform,opacity,visibility' }, .18)
        .from('.footer-details .social-links > a', { y: 16, autoAlpha: 0, duration: .7, stagger: .09 }, .35);
    }
    statistics();
  }

  window.QDO26 = { introDone, textReveals };
})();
