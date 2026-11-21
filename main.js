/* 안지담 포트폴리오 — 라이트 미니멀 */

/**
 * 교육 문의 수신 설정 — 둘 중 하나를 채우면 문의 폼이 동작합니다.
 *
 * FORM_ENDPOINT (추천): Formspree 등 폼 수신 주소.
 *   formspree.io 가입 → 새 폼 생성 → 'https://formspree.io/f/xxxxxxx' 주소를 붙여넣기.
 *   문의가 올 때마다 메일로 받고 Formspree 대시보드에서도 목록으로 볼 수 있습니다.
 *
 * INQUIRY_EMAIL: 이메일 주소만 넣으면 방문자의 메일 앱이 열리고 내용이 미리 채워집니다.
 *   (방문자가 메일을 직접 보내야 하므로 중간에 닫으면 문의가 오지 않습니다.)
 */
const CONFIG = {
  FORM_ENDPOINT: '',
  INQUIRY_EMAIL: '',
  CAFE_URL: 'https://cafe.daum.net/anms1209',
};

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- nav blur, hero fade, parallax ---------- */
  const nav = document.querySelector('[data-nav]');
  const heroFade = document.querySelector('[data-hero-fade]');
  const cue = document.querySelector('[data-cue]');
  const parallax = document.querySelectorAll('[data-parallax]');
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    nav.classList.toggle('is-scrolled', y > 40);
    if (reduceMotion) return;
    if (heroFade) {
      const p = Math.min(1, y / (vh * 0.85));
      heroFade.style.opacity = String(1 - p);
      heroFade.style.transform = `translateY(${y * 0.18}px) scale(${1 - p * 0.06})`;
    }
    if (cue) cue.style.opacity = String(Math.max(0, 1 - y / 300));
    parallax.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.08;
      const r = el.getBoundingClientRect();
      const off = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translateY(${-off * speed}px)`;
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  /* ---------- inquiry modal ---------- */
  const modal = document.querySelector('[data-modal]');
  const form = modal.querySelector('[data-form]');
  const formView = modal.querySelector('[data-view="form"]');
  const doneView = modal.querySelector('[data-view="done"]');
  const errorBox = modal.querySelector('[data-error]');
  const submitBtn = modal.querySelector('[data-submit]');
  const chips = modal.querySelectorAll('.chip');
  let lastFocus = null;
  let sent = false;

  const showError = (html) => {
    errorBox.innerHTML = html;
    errorBox.hidden = !html;
  };

  const resetForm = () => {
    form.reset();
    chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    formView.hidden = false;
    doneView.hidden = true;
    sent = false;
  };

  const openForm = (e) => {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    showError('');
    modal.hidden = false;
    document.body.classList.add('modal-open');
    (sent ? doneView.querySelector('button') : form.querySelector('input')).focus();
  };

  const closeForm = () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (sent) resetForm(); // keep a half-written inquiry, clear a sent one
    if (lastFocus) lastFocus.focus();
  };

  document.querySelectorAll('[data-open-form]').forEach((a) => a.addEventListener('click', openForm));
  modal.querySelectorAll('[data-close-form]').forEach((b) => b.addEventListener('click', closeForm));
  modal.addEventListener('click', (e) => { if (e.target === modal) closeForm(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeForm(); });
  if (location.hash === '#inquiry') openForm();

  chips.forEach((chip) => chip.addEventListener('click', () => {
    chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  }));

  const collect = () => {
    const fd = new FormData(form);
    const v = (k) => String(fd.get(k) || '').trim();
    return {
      성함: v('name'),
      기관명: v('org'),
      연락처: v('phone'),
      이메일: v('email'),
      교육분야: [...chips].filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.textContent).join(', '),
      희망일정: v('schedule'),
      문의내용: v('message'),
    };
  };

  const validate = () => {
    let firstBad = null;
    form.querySelectorAll('input, textarea').forEach((el) => {
      const bad = !el.checkValidity() || (el.required && !el.value.trim());
      el.classList.toggle('is-invalid', bad);
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) {
      showError('필수 항목(*)을 확인해 주세요.');
      firstBad.focus();
      return false;
    }
    return true;
  };

  const markSent = () => {
    sent = true;
    formView.hidden = true;
    doneView.hidden = false;
    doneView.querySelector('button').focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    if (!validate()) return;

    const data = collect();
    const subject = '[교육 문의] ' + (data.기관명 || data.성함);
    const endpoint = CONFIG.FORM_ENDPOINT.trim();
    const mail = CONFIG.INQUIRY_EMAIL.trim();

    if (endpoint) {
      submitBtn.disabled = true;
      submitBtn.textContent = '보내는 중…';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ _subject: subject, ...data }),
        });
        if (!res.ok) throw new Error(String(res.status));
        markSent();
      } catch (err) {
        showError('전송에 실패했습니다. 잠시 후 다시 시도하거나 카페로 문의해 주세요.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '문의 보내기';
      }
      return;
    }

    if (mail) {
      const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
      window.location.href = `mailto:${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      markSent();
      return;
    }

    console.warn('[inquiry] CONFIG.FORM_ENDPOINT 또는 CONFIG.INQUIRY_EMAIL을 main.js에 설정하세요.');
    showError(`온라인 접수를 준비 중입니다. <a href="${CONFIG.CAFE_URL}" target="_blank" rel="noopener">카페</a>로 문의해 주세요.`);
  });
})();
