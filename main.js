/* 안명숙 포트폴리오 — 라이트 미니멀 */

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
  /**
   * 구글 시트 연결 (추천) — 구글 시트의 Apps Script를 '웹 앱'으로 배포한 주소(…/exec)를 넣으면
   * 사이트 문의 창에서 보낸 내용이 시트에 한 줄씩 쌓입니다. (google-sheet-apps-script.gs 참고)
   */
  SHEET_URL: 'https://script.google.com/macros/s/AKfycbz6F7cwKfh5dRny6YmBHuSfBoTnV0YXhPV0Si__dhylTiFR1b3pgry4vrpvDiR4zJXf/exec',
  /**
   * 구글 폼 연결 — 사이트 문의 창은 그대로 두고, 보낸 내용이 구글 폼 응답으로 들어갑니다.
   * entry 번호는 구글 폼의 '미리 채워진 링크 가져오기'로 만든 링크에서 확인합니다.
   */
  GOOGLE_FORM: {
    ACTION: 'https://docs.google.com/forms/d/e/1FAIpQLScFpSB2m1jnWy4E1xhJDZr_OvQB1yMXDva3SPnKrU0vN3EMWg/formResponse',
    ENTRY: {
      name: '',      // 성함 · 담당자
      org: '',       // 기관명
      phone: '',     // 연락처
      email: '',     // 이메일
      topics: '',    // 교육 분야 (체크박스)
      schedule: '',  // 희망 일정 · 인원
      message: '',   // 문의 내용
    },
  },
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
      const msg = firstBad.value.trim() && firstBad.type === 'email' ? '이메일 주소 형식을 확인해 주세요. (예: name@example.com)'
        : firstBad.value.trim() && firstBad.type === 'tel' ? '연락처 형식을 확인해 주세요.'
        : '필수 항목(*)을 입력해 주세요.';
      showError(msg);
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
    const gf = CONFIG.GOOGLE_FORM, gfReady = gf && gf.ACTION && Object.values(gf.ENTRY).every((v) => /^entry\.\d+$/.test(v));

    const sheetUrl = (CONFIG.SHEET_URL || '').trim();
    if (sheetUrl) {
      // 구글 시트로 전송: Apps Script는 다른 사이트에 결과를 알려주지 않으므로(no-cors), 네트워크 오류가 없으면 접수된 것으로 봅니다.
      const body = new URLSearchParams();
      Object.entries(data).forEach(([k, v]) => body.append(k, v));
      submitBtn.disabled = true;
      submitBtn.textContent = '보내는 중…';
      try {
        await fetch(sheetUrl, { method: 'POST', mode: 'no-cors', body });
        markSent();
      } catch (err) {
        showError(`전송에 실패했습니다. 잠시 후 다시 시도하거나 <a href="${CONFIG.CAFE_URL}" target="_blank" rel="noopener">카페</a>로 문의해 주세요.`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '문의 보내기';
      }
      return;
    }

    if (gfReady) {
      // 구글 폼으로 전송: 구글은 다른 사이트에 응답 결과를 알려주지 않으므로(no-cors), 네트워크 오류가 없으면 접수된 것으로 봅니다.
      const fd = new FormData(form), body = new URLSearchParams();
      const E = gf.ENTRY;
      for (const k of ['name', 'org', 'phone', 'email', 'schedule', 'message']) body.append(E[k], String(fd.get(k) || '').trim());
      chips.forEach((c) => { if (c.getAttribute('aria-pressed') === 'true') body.append(E.topics, c.textContent.trim()); });
      submitBtn.disabled = true;
      submitBtn.textContent = '보내는 중…';
      try {
        await fetch(gf.ACTION, { method: 'POST', mode: 'no-cors', body });
        markSent();
      } catch (err) {
        showError(`전송에 실패했습니다. 잠시 후 다시 시도하거나 <a href="${CONFIG.CAFE_URL}" target="_blank" rel="noopener">카페</a>로 문의해 주세요.`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '문의 보내기';
      }
      return;
    }

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
