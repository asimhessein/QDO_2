/*
 * QDO interaction components. No auto-mounting and no changes to existing pages.
 * Load widgets.css, GSAP, then this file. Pass a DOM element to each factory.
 *
 * createSpotify(host, { title, subtitle, artwork, artworkAlt, spotifyUrl, bounds })
 * createStories(host, { title, items: [{ src, alt, caption, url }], duration, bounds })
 * createPolaroidTrail(stage, { photos: [{ src, caption }], gap, poolSize })
 *
 * Each instance has destroy(). Cards also expose show(), hide(), resetPosition().
 * Stories expose next(), previous(), goTo(index), pause(), play().
 * Trail exposes reveal() for an accessible button/touch alternative.
 * The music card opens the configured music link; it never starts audio itself.
 *
 * Visual/interaction references (independently implemented):
 * https://www.sarah-bassett.com/about
 * https://codepen.io/GreenSock/pen/WbbEGmp
 */
(() => {
  "use strict";
  const instances = new WeakMap();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const mobileLayout = window.matchMedia("(max-width: 600px)");
  const icons = {
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>'
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function url(value) {
    if (!value) return "";
    try {
      const parsed = new URL(value, document.baseURI);
      return ["http:", "https:", "file:"].includes(parsed.protocol) ? parsed.href : "";
    } catch { return ""; }
  }
  function externalLink(link, href) {
    const valid = url(href);
    if (valid) {
      link.href = valid;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.removeAttribute("aria-disabled");
    } else {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.setAttribute("aria-disabled", "true");
    }
  }
  function setIcon(button, name, label) {
    // Only constant artwork goes through innerHTML. All content uses textContent.
    // Preserve the pressed target when focus/hover pauses a story mid-click.
    if (button.dataset.icon !== name) {
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
      button.dataset.icon = name;
    }
    button.setAttribute("aria-label", label);
    button.title = label;
  }
  function iconButton(name, label) {
    const button = element("button", "qw-icon");
    button.type = "button";
    setIcon(button, name, label);
    return button;
  }
  function lifecycle(host) {
    if (!(host instanceof HTMLElement)) throw new TypeError("Supply a host element.");
    instances.get(host)?.destroy();
    const cleanups = [];
    let disposed = false;
    return {
      on(target, event, listener, options) {
        target.addEventListener(event, listener, options);
        cleanups.push(() => target.removeEventListener(event, listener, options));
      },
      add(cleanup) { cleanups.push(cleanup); },
      save(api) { instances.set(host, api); return api; },
      destroy() {
        if (disposed) return;
        disposed = true;
        cleanups.splice(0).reverse().forEach(cleanup => cleanup());
        instances.delete(host);
      }
    };
  }

  // Drag only from the header, preserving story taps, links and normal scrolling.
  // The same handle supports Arrow keys (Shift = larger steps) and Home to reset.
  function draggable(root, handle, bounds, life, onDrag = () => {}) {
    let x = 0, y = 0, gesture = null;
    handle.tabIndex = 0;
    handle.setAttribute("role", "group");
    handle.setAttribute("aria-label", "Move card. Drag or use arrow keys; Home resets position.");
    const paint = () => { root.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
    function move(dx, dy) {
      const box = root.getBoundingClientRect();
      const area = bounds?.getBoundingClientRect() || { left: 8, top: 8, right: innerWidth - 8, bottom: innerHeight - 8 };
      // Keep the full card inside a sufficiently large container.
      x += Math.max(area.left - box.left, Math.min(area.right - box.right, dx));
      y += Math.max(area.top - box.top, Math.min(area.bottom - box.bottom, dy));
      paint();
    }
    function finish() {
      if (!gesture) return;
      const id = gesture.id;
      gesture = null;
      if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
      root.classList.remove("qw-dragging");
      onDrag(false);
    }
    life.on(handle, "pointerdown", event => {
      if (mobileLayout.matches || event.button !== 0 || event.target.closest("button, a")) return;
      const area = bounds?.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      if (area && (area.width < box.width || area.height < box.height)) return;
      event.preventDefault();
      gesture = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY };
      handle.setPointerCapture(event.pointerId);
      root.classList.add("qw-dragging");
      onDrag(true);
    });
    life.on(handle, "pointermove", event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      move(event.clientX - gesture.clientX, event.clientY - gesture.clientY);
      gesture.clientX = event.clientX;
      gesture.clientY = event.clientY;
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => life.on(handle, type, finish));
    function reset() { finish(); x = y = 0; paint(); }
    life.on(handle, "keydown", event => {
      if (event.target !== handle || mobileLayout.matches) return;
      const step = event.shiftKey ? 30 : 10;
      const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (event.key === "Home") { event.preventDefault(); reset(); }
      if (directions[event.key]) { event.preventDefault(); move(...directions[event.key]); }
    });
    life.on(window, "resize", reset);
    life.add(finish);
    return reset;
  }

  function observeVisibility(root, life, callback) {
    let intersecting = true;
    const update = () => callback(intersecting && !document.hidden && !root.hidden);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        intersecting = entries[0].isIntersecting;
        update();
      });
      observer.observe(root);
      life.add(() => observer.disconnect());
    }
    life.on(document, "visibilitychange", update);
    update();
  }

  function createSpotify(host, options = {}) {
    const life = lifecycle(host);
    const root = element("article", "qdo-widget qw-spotify");
    root.setAttribute("aria-label", "Studio music artwork");
    const header = element("div", "qw-header");
    header.dataset.dragHandle = "";
    const heading = element("div", "qw-heading");
    const title = element("h3", "qw-title", options.title || "Studio sounds");
    const subtitle = element("p", "qw-subtitle", options.subtitle || "Qahira Design Office");
    heading.append(title, subtitle);
    const close = iconButton("close", "Close music card");
    header.append(heading);
    if (!options.cleanChrome) header.append(close);
    const disc = element("div", "qw-disc");
    disc.setAttribute("aria-hidden", "true");
    const image = element("img");
    image.alt = options.artworkAlt || "";
    image.draggable = false;
    if (url(options.artwork)) image.src = url(options.artwork);
    disc.append(image);
    const spinDuration = Number(options.spinDuration);
    if (Number.isFinite(spinDuration) && spinDuration > 0) disc.style.setProperty("--qw-spin-duration", `${spinDuration}s`);
    const footer = element("div", "qw-music-footer");
    const link = element("a", "qw-spotify-link", "Listen on Spotify ↗");
    const toggle = iconButton("pause", "Pause disc rotation");
    footer.append(link);
    if (!options.cleanChrome) footer.append(toggle);
    const note = element("p", "qw-connection");
    root.append(header, disc, footer, note);
    host.append(root);
    life.add(() => root.remove());
    let paused = false, visible = true;
    function update() {
      disc.classList.toggle("qw-paused", paused || !visible || reducedMotion.matches);
      setIcon(toggle, paused ? "play" : "pause", paused ? "Resume disc rotation" : "Pause disc rotation");
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.disabled = reducedMotion.matches;
      if (reducedMotion.matches) toggle.title = "Rotation is off because reduced motion is enabled";
    }
    function setPlaylist(value) {
      const href = url(value);
      const spotify = href && new URL(href).hostname === "open.spotify.com" && new URL(href).protocol === "https:";
      externalLink(link, options.songUrl || options.artworkLink || (spotify ? href : ""));
      link.textContent = options.linkLabel || "View artwork ↗";
      note.textContent = "";
      note.hidden = true;
    }
    setPlaylist(options.spotifyUrl);
    life.on(toggle, "click", () => { paused = !paused; update(); });
    life.on(reducedMotion, "change", update);
    observeVisibility(root, life, value => { visible = value; update(); });
    const resetPosition = draggable(root, header, options.bounds, life);
    const api = {
      element: root, resetPosition, setPlaylist,
      hide() { root.hidden = true; visible = false; update(); },
      show() { root.hidden = false; visible = true; resetPosition(); update(); },
      destroy() { life.destroy(); }
    };
    life.on(close, "click", () => api.hide());
    return life.save(api);
  }

  function createStories(host, options = {}) {
    const items = (options.items || []).map(item => ({ ...item, src: url(item.src) })).filter(item => item.src);
    if (!items.length) throw new TypeError("Stories need at least one photo or video.");
    const videoItem = item => item.type === 'video' || /\.mp4(?:$|\?)/i.test(item.src);
    const life = lifecycle(host);
    const root = element("article", "qdo-widget qw-stories");
    root.setAttribute("aria-label", options.title || "QDO photo stories");
    const image = element("img", "qw-story-image");
    image.draggable = false;
    const video = element('video', 'qw-story-video');
    video.muted = true; video.playsInline = true; video.preload = 'metadata'; video.hidden = true;
    video.setAttribute('playsinline',''); video.setAttribute('muted','');
    const header = element("div", "qw-header");
    header.dataset.dragHandle = "";
    const heading = element("div", "qw-heading");
    heading.append(element("h3", "qw-title", options.title || "Collected moments"));
    const count = element("p", "qw-subtitle");
    heading.append(count);
    const toolbar = element("div", "qw-toolbar");
    const toggle = iconButton("pause", "Pause stories");
    const close = iconButton("close", "Close story card");
    toolbar.append(toggle, close);
    if (!options.cleanChrome) header.append(heading, toolbar);
    const progress = element("div", "qw-progress");
    progress.setAttribute("role", "group");
    progress.setAttribute("aria-label", "Choose a story");
    const bars = items.map((item, index) => {
      const button = element("button");
      button.type = "button";
      button.setAttribute("aria-label", `View story ${index + 1}`);
      const fill = element("span", "qw-progress-fill");
      button.append(fill);
      progress.append(button);
      life.on(button, "click", () => goTo(index, true));
      return { button, fill };
    });
    const previous = element("button", "qw-story-navigation qw-prev");
    const next = element("button", "qw-story-navigation qw-next");
    previous.type = next.type = "button";
    previous.setAttribute("aria-label", "Previous story");
    next.setAttribute("aria-label", "Next story");
    const footer = element("div", "qw-story-footer");
    const caption = element("p", "qw-story-caption");
    const link = element("a", "qw-story-link", "View on Instagram ↗");
    footer.append(caption, link);
    const error = element("p", "qw-image-error", "This story is unavailable.");
    error.hidden = true;
    const status = element("span", "qw-sr-only");
    status.setAttribute("role", "status");
    root.append(image, video, header, progress, previous, next);
    if (!options.cleanChrome) root.append(footer);
    root.append(error, status);
    host.append(root);
    life.add(() => root.remove());
    let index = 0, elapsed = 0, frame = 0, lastTime = null, destroyed = false;
    const duration = Math.max(1500, Number(options.duration) || 5000);
    let currentVideo = false, itemDuration = duration;
    const pauses = new Set(["loading"]);
    let manualPause = reducedMotion.matches;
    function paint() {
      bars.forEach((bar, i) => {
        bar.fill.style.transform = `scaleX(${i < index ? 1 : i === index ? Math.min(elapsed / itemDuration, 1) : 0})`;
        if (i === index) bar.button.setAttribute("aria-current", "true");
        else bar.button.removeAttribute("aria-current");
      });
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
      setIcon(toggle, manualPause ? "play" : "pause", manualPause ? "Play stories" : "Pause stories");
      toggle.setAttribute("aria-pressed", String(manualPause));
      if (!destroyed && !manualPause && !pauses.size) frame = requestAnimationFrame(tick);
      if (currentVideo && !destroyed) {
        if (manualPause || pauses.size) video.pause();
        else if (video.paused) video.play().catch(error => {
          if (error.name === 'NotAllowedError') { manualPause = true; sync(); }
        });
      }
    }
    function reason(name, active) {
      if (active === pauses.has(name)) return;
      if (active) pauses.add(name); else pauses.delete(name);
      sync();
    }
    function tick(time) {
      frame = 0;
      if (destroyed || manualPause || pauses.size) return;
      if (currentVideo) elapsed = video.currentTime * 1000;
      else if (lastTime != null) elapsed += Math.min(time - lastTime, 100);
      lastTime = time;
      if (elapsed >= itemDuration) { goTo(index + 1); return; }
      paint();
      frame = requestAnimationFrame(tick);
    }
    function imageReady() {
      if (destroyed || currentVideo) return;
      const failed = image.naturalWidth === 0;
      error.hidden = !failed;
      reason("image-error", failed);
      reason("loading", false);
    }
    function goTo(value, announce = false) {
      if (destroyed || !Number.isFinite(value)) return;
      if (options.shuffle && value >= items.length && !announce) {
        const previous = items[index].src;
        for (let i=items.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; }
        if (items[0].src === previous && items.length>1) items.push(items.shift());
      }
      video.pause();
      index = ((Math.trunc(value) % items.length) + items.length) % items.length;
      elapsed = 0; itemDuration = duration;
      reason("loading", true);
      reason("image-error", false);
      error.hidden = true;
      const item = items[index];
      const alt = item.alt || item.caption || `QDO story ${index + 1}`;
      currentVideo = videoItem(item); image.hidden = currentVideo; video.hidden = !currentVideo;
      root.dataset.mediaType = currentVideo ? 'video' : 'image'; root.dataset.storyIndex = String(index);
      if (currentVideo) {
        image.removeAttribute('src'); video.setAttribute('aria-label',alt); video.style.objectPosition=item.position||'center';
        video.src=item.src; video.load();
      } else {
        video.removeAttribute('src'); video.load(); image.alt=alt; image.style.objectPosition=item.position||'center'; image.src=item.src;
      }
      caption.textContent = item.caption || "";
      count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
      externalLink(link, item.url || options.profileUrl);
      link.hidden = !link.hasAttribute("href");
      if (announce) status.textContent = `Story ${index + 1} of ${items.length}. ${alt}`;
      paint();
      sync();
      if (!currentVideo && image.complete) imageReady();
      // Warm only the next photograph, not an entire remote feed.
      if (items.length > 1 && !videoItem(items[(index+1)%items.length])) { const preload = new Image(); preload.src = items[(index + 1) % items.length].src; }
    }
    life.on(video, 'loadedmetadata', () => { if(currentVideo && Number.isFinite(video.duration) && video.duration>0) itemDuration=video.duration*1000; });
    life.on(video, 'loadeddata', () => { if(!destroyed&&currentVideo){ error.hidden=true;reason('image-error',false);reason('loading',false); } });
    life.on(video, 'canplay', () => { if(!destroyed&&currentVideo){reason('loading',false);sync();} });
    life.on(video, 'ended', () => { if(!destroyed&&currentVideo) goTo(index+1); });
    life.on(video, 'error', () => { if(!destroyed&&currentVideo){error.hidden=false;reason('image-error',true);reason('loading',false);} });
    life.on(image, "load", imageReady);
    life.on(image, "error", imageReady);
    life.on(previous, "click", () => goTo(index - 1, true));
    life.on(next, "click", () => goTo(index + 1, true));
    function play() {
      manualPause = false;
      // An explicit Play action resumes even while its button has focus/hover.
      pauses.delete("focus");
      pauses.delete("hover");
      sync();
    }
    life.on(toggle, "click", () => {
      if (manualPause) play();
      else { manualPause = true; sync(); }
    });
    life.on(root, "pointerenter", event => { if (event.pointerType === "mouse") reason("hover", true); });
    life.on(root, "pointerleave", () => reason("hover", false));
    life.on(root, "focusin", () => reason("focus", true));
    life.on(root, "focusout", event => { if (!root.contains(event.relatedTarget)) reason("focus", false); });
    life.on(root, "keydown", event => {
      if (event.target === header || event.altKey || event.ctrlKey || event.metaKey) return;
      if(event.key===' ' && !event.target.closest('button,a')) {event.preventDefault();manualPause=!manualPause;sync();return;}
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index + (event.key === "ArrowRight" ? 1 : -1), true);
      }
    });
    life.on(reducedMotion, "change", () => { manualPause = reducedMotion.matches; sync(); });
    observeVisibility(root, life, visible => reason("invisible", !visible));
    const resetPosition = draggable(root, header, options.bounds, life, active => reason("drag", active));
    life.add(() => { destroyed = true; cancelAnimationFrame(frame); video.pause();video.removeAttribute('src');video.load(); });
    const api = {
      element: root, resetPosition,
      get index() { return index; },
      get count() { return items.length; },
      get currentItem() { return {...items[index]}; },
      get items() { return items.map(item=>({...item})); },
      next() { goTo(index + 1, true); },
      previous() { goTo(index - 1, true); },
      goTo(value) { goTo(value, true); },
      pause() { manualPause = true; sync(); },
      play,
      hide() { root.hidden = true; reason("closed", true); },
      show() { root.hidden = false; resetPosition(); reason("closed", false); },
      destroy() { life.destroy(); }
    };
    life.on(close, "click", () => api.hide());
    goTo(0);
    return life.save(api);
  }

  window.QDOWidgets = Object.freeze({ createSpotify, createStories });
})();
