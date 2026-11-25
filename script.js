const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/JJH7BX742C';
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);

  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Шапка и бургер
  const header = $('#header');
  const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), nav = $('#nav');
  burger && burger.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  nav && nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('is-open'); nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false');
  }));

  // Плавный скролл по якорям
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const t = $(id); if (!t) return;
    e.preventDefault();
    const top = t.getBoundingClientRect().top + scrollY - 64;
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }));

  // ===== Сцена: группа под одной рамкой (скролл) =====
  const scene = $('#scene'), stage = $('#stage');
  const steps = [...document.querySelectorAll('#steps .step')];
  const dots = [...document.querySelectorAll('#dots i')];
  const ticks = $('#ticks');
  if (ticks) {
    const NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 12; i++) {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('class', 'tick'); r.setAttribute('x', 40 + i * 40); r.setAttribute('y', 408);
      r.setAttribute('width', 26); r.setAttribute('height', 24); r.setAttribute('rx', 2);
      ticks.appendChild(r);
    }
  }
  const setStep = n => {
    if (!stage || stage.dataset.step === String(n)) return;
    stage.dataset.step = n;
    steps.forEach((s, i) => s.classList.toggle('is-on', i === n));
    dots.forEach((d, i) => d.classList.toggle('on', i <= n));
  };
  if (scene && stage) {
    if (reduce) {
      stage.dataset.step = 3; steps.forEach(s => s.classList.add('is-on')); dots.forEach(d => d.classList.add('on'));
    } else {
      let ticking = false;
      const upd = () => {
        ticking = false;
        const r = scene.getBoundingClientRect();
        const total = r.height - innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
        setStep(Math.min(3, Math.floor(p * 4)));
      };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
      addEventListener('resize', upd); upd();
    }
  }

  // Открыть направление на странице услуг по якорю
  const openSd = () => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t && t.tagName === 'DETAILS') t.open = true; };
  openSd(); addEventListener('hashchange', openSd);

  // ===== Подбор: ваш случай =====
  const copy = {
    group: ['Индивидуально <small>от объёма и обстоятельств</small>', 'Договор об абонентском юридическом обслуживании группы юридических лиц с одним учредителем. Начинается с очной консультации, на которой разбирается ваша структура. Стоимость определяется индивидуально, от объёма и обстоятельств, и обсуждается на консультации.'],
    person: ['Индивидуально <small>от обстоятельств</small>', 'Помощь по семейным, трудовым, жилищным, гражданским, административным и уголовным делам. Стоимость зависит от обстоятельств и объёма работы и обсуждается на консультации. Исход дела заранее не обещается.'],
    one: ['Индивидуально', 'Стоимость договора определяется на очной консультации в офисе, после того как станет понятен объём работы. Заранее называть цифры без знания задачи было бы нечестно.'],
    cs: ['Индивидуально', 'Договор об оказании юридической помощи по конкретному делу. Цена зависит от сложности и объёма и определяется на очной консультации. Исход дела заранее не обещается.']
  };
  const price = $('#fpPrice'), text = $('#fpText');
  document.querySelectorAll('[data-pill-item][data-k]').forEach(b => b.addEventListener('click', () => {
    const c = copy[b.dataset.k === 'case' ? 'cs' : b.dataset.k];
    price.innerHTML = c[0]; text.textContent = c[1];
  }));

  // ===== Форма: заявка -> Worker -> Telegram =====
  const form = $('#leadForm'), btn = $('#submitBtn'), consent = $('#consent'), status = $('#formStatus');
  const sync = () => { if (btn) btn.disabled = !consent.checked; };
  consent && consent.addEventListener('change', sync); sync();

  form && form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {}; new FormData(form).forEach((v, k) => { payload[k] = v; });
    if (payload._gotcha) return;
    if (!consent.checked) { status.textContent = 'Поставьте галочку согласия на обработку данных.'; return; }
    if (!payload.name || !payload.contact) { status.textContent = 'Заполните имя и контакт, чтобы адвокат смог с вами связаться.'; return; }
    delete payload.consent;
    payload.consent = 'да';

    const label = btn.querySelector('span'); const orig = label.textContent;
    btn.disabled = true; label.textContent = 'Отправляем...'; status.innerHTML = '';
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: ctrl.signal
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      label.textContent = 'Заявка отправлена';
      status.textContent = 'Спасибо. Адвокат свяжется с вами, чтобы согласовать время консультации.';
      form.reset(); consent.checked = false;
    } catch (err) {
      console.error(err);
      label.textContent = 'Заявка не ушла автоматически';
      const msg = 'Заявка с сайта. Имя: ' + payload.name + '. Контакт: ' + payload.contact +
        '. Город: ' + (payload.city || '') + (payload.comment ? '. Ситуация: ' + payload.comment : '');
      status.innerHTML = 'Не получилось отправить заявку напрямую. Отправьте её в Telegram одним касанием: <a href="https://t.me/AdvAsiunkinDG?text=' +
        encodeURIComponent(msg) + '" target="_blank" rel="noopener">отправить заявку в Telegram</a>. Текст уже готов, останется нажать «Отправить».';
    } finally {
      clearTimeout(timer);
      setTimeout(() => { label.textContent = orig; sync(); }, 3000);
    }
  });
})();
