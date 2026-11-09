/* Purpose selector and progressive form delivery. No success is claimed until an endpoint confirms delivery. */
(() => {
 'use strict';
 const form = document.querySelector('.contact-form');
 if (!form) return;
 const select = form.querySelector('.contact-purpose');
 const list = form.querySelector('.contact-purpose-options');
 const choices = [...list.querySelectorAll('[role=option]')];
 const purpose = form.elements.purpose;
 const label = select.querySelector('.purpose-label');
 const status = form.querySelector('.contact-form-status');
 const draft = form.querySelector('.contact-draft-link');
 const submit = form.querySelector('[type=submit]');
 const isEnglish = () => true;
 const say = (en, ar) => { status.textContent = isEnglish() ? en : ar; };
 let current = -1;
 function toggle(open, focus = false) {
  list.hidden = !open;
  select.setAttribute('aria-expanded', String(open));
  if (open && focus) choices[Math.max(0,current)].focus();
 }
 function choose(option) {
  purpose.value = option.dataset.value;
  current = choices.indexOf(option);
  choices.forEach(node => node.setAttribute('aria-selected', String(node === option)));
  select.removeAttribute('aria-invalid');
  paintLanguage();
  toggle(false); select.focus();
 }
 function paintLanguage() {
  const english = isEnglish();
  choices.forEach(node => { node.textContent = english ? node.dataset.value : node.dataset.ar; });
  label.textContent = current < 0 ? (english ? 'How can we help?' : 'كيف يمكننا مساعدتك؟') : (english ? choices[current].dataset.value : choices[current].dataset.ar);
  form.querySelectorAll('[data-placeholder-en]').forEach(node => { node.placeholder = node.dataset[english ? 'placeholderEn' : 'placeholderAr']; });
  submit.setAttribute('aria-label', english ? 'Prepare your email' : 'تجهيز رسالتك');
  draft.textContent = english ? 'Open email draft' : 'فتح مسودة البريد';
 }
 select.addEventListener('click', () => toggle(list.hidden));
 select.addEventListener('keydown', event => {
  if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); toggle(true, true); }
  if (event.key === 'Escape') toggle(false);
 });
 choices.forEach(option => {
  option.addEventListener('click', () => choose(option));
  option.addEventListener('keydown', event => {
   const index = choices.indexOf(option);
   if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); choices[(index + (event.key === 'ArrowDown' ? 1 : choices.length - 1)) % choices.length].focus(); }
   else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(option); }
   else if (event.key === 'Escape') { toggle(false); select.focus(); }
   else if (event.key === 'Tab') toggle(false);
  });
 });
 document.addEventListener('pointerdown', event => { if (!event.target.closest('.contact-purpose-wrap')) toggle(false); });
 document.addEventListener('keydown', event => { if (event.key === 'Escape') toggle(false); });
 form.addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); });
 function emailDraft(data) {
  const subject = `QDO — ${data.purpose}`;
  const body = `Purpose: ${data.purpose}\nName: ${data.name}\nEmail: ${data.email}\n\n${data.message}`;
  return `mailto:hello@weareqdo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
 }
 form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = ''; draft.hidden = true;
  if (!purpose.value) { select.setAttribute('aria-invalid','true'); say('Please choose the purpose of your message.','يرجى اختيار الغرض من رسالتك.'); select.focus(); toggle(true); return; }
  if (!form.checkValidity()) {
   [...form.elements].filter(node => node.validity && !node.validity.valid).forEach(node => node.setAttribute('aria-invalid','true'));
   say('Please complete your name, a valid email and your message.','يرجى إكمال الاسم وبريد إلكتروني صحيح ورسالتك.');
   form.reportValidity(); return;
  }
  const data = Object.fromEntries(new FormData(form));
  Object.keys(data).forEach(key => { data[key] = String(data[key]).trim(); });
  draft.href = emailDraft(data);
  const endpoint = form.dataset.contactEndpoint;
  if (!endpoint) {
   draft.hidden = false;
   say('Your email draft is ready. Send it from your mail app.','مسودة رسالتك جاهزة. أرسلها من تطبيق البريد لديك.');
   window.location.href = draft.href;
   return;
  }
  submit.disabled = true;
  form.setAttribute('aria-busy','true');
  say('Sending your message…','جارٍ إرسال رسالتك…');
  try {
   const response = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify(data) });
   if (!response.ok) throw new Error('Delivery unavailable');
   say('Thank you. Your message has been sent.','شكراً لك. تم إرسال رسالتك.');
   form.reset(); current = -1; choices.forEach(node=>node.setAttribute('aria-selected','false')); paintLanguage();
  } catch {
   draft.hidden = false;
   say('Your message could not be sent here. You can send the same draft from your mail app.','تعذّر إرسال رسالتك هنا. يمكنك إرسال المسودة نفسها من تطبيق البريد.');
  } finally { submit.disabled = false; form.removeAttribute('aria-busy'); }
 });
 new MutationObserver(paintLanguage).observe(document.documentElement, { attributes:true, attributeFilter:['lang','data-language'] });
 paintLanguage();
})();
