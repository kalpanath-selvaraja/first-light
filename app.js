/* First Light: vanilla JS, localStorage only. No backend, no accounts. */
(() => {
  'use strict';

  const KEY = 'firstlight.v1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };

  /* ---------- State ---------- */
  const seed = () => {
    const py = uid(), mern = uid(), proj = uid();
    return {
      v: 1, onboarded: false, lastVisit: null, leadTrack: py,
      tracks: [
        { id: py, name: 'Python', why: 'Python opens data, automation and AI work.', nextStep: 'Open VS Code and write one list comprehension', weeklyTarget: 4, reservesPerWeek: 2, status: 'exploring', resources: [], active: true },
        { id: mern, name: 'MERN (RAD)', why: 'RAD is this semester, and MERN is what employers ask for.', nextStep: 'Open the MERN repo and run npm run dev', weeklyTarget: 4, reservesPerWeek: 2, status: 'practicing', resources: [], active: true },
        { id: proj, name: 'Project', why: "A finished project shows what I can do better than any grade.", nextStep: 'Write the README for my next project in 3 lines', weeklyTarget: 2, reservesPerWeek: 1, status: 'not started', resources: [], active: true },
      ],
      sessions: [], lapses: [], reviews: [], reserves: {},
      plans: [
        { id: uid(), cue: 'I open Chrome and feel the pull to YouTube', action: 'click Start 2 minutes on my lead track', enabled: true },
        { id: uid(), cue: 'I get home from IJSE and open the laptop', action: 'open my MERN repo and run it, 2 minutes only', enabled: true },
        { id: uid(), cue: 'I catch myself drifting', action: 'press "I drifted" and restart', enabled: true },
      ],
      settings: { name: '', chronotype: 'evening', peakStart: '19:30', peakEnd: '22:30', themeMode: 'auto', earnedMinutes: 20, semesterStart: '' },
    };
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return seed();
      const s = JSON.parse(raw);
      if (!s || s.v !== 1 || !Array.isArray(s.tracks)) return seed();
      const base = seed();
      return { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) }, reserves: s.reserves || {} };
    } catch { return seed(); }
  };
  let S = load();
  const save = () => { try { const { _pick, _prevVisit, ...out } = S; localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { toast('Could not save: storage is full or blocked.'); } };

  /* ---------- Time helpers ---------- */
  const pad = n => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const weekStart = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; };
  const weekKey = (d = new Date()) => dayKey(weekStart(d));
  const toMin = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
  const inPeak = (d = new Date()) => {
    const n = d.getHours() * 60 + d.getMinutes(), a = toMin(S.settings.peakStart), b = toMin(S.settings.peakEnd);
    return a <= b ? n >= a && n < b : n >= a || n < b;
  };
  const phaseOf = h => h >= 5 && h < 10 ? 'dawn' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night';
  const fmtTime = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = d => d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  /* ---------- Theme & sky ---------- */
  const THEME_LABEL = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  function applyTheme() {
    const now = new Date(), h = now.getHours(), phase = phaseOf(h);
    const mode = S.settings.themeMode === 'auto' ? (phase === 'dawn' || phase === 'day' ? 'light' : 'dark') : S.settings.themeMode;
    const root = document.documentElement;
    root.dataset.phase = phase; root.dataset.mode = mode;
    $('#themeLabel').textContent = THEME_LABEL[S.settings.themeMode];
    requestAnimationFrame(() => {
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
      $('meta[name="theme-color"]').setAttribute('content', bg || '#f4efe6');
    });
    // Orb follows an arc: sun 06–18, moon 18–06
    const mins = h * 60 + now.getMinutes();
    const t = mins >= 360 && mins < 1080 ? (mins - 360) / 720 : ((mins - 1080 + 1440) % 1440) / 720;
    const x = 4 + t * 92, y = 8 + 60 * (1 - Math.sin(Math.PI * t)) * 0.9 + 6;
    const orb = $('#orb'); orb.style.left = x + 'vw'; orb.style.top = y + 'vh';
  }
  function makeStars() {
    const box = $('#stars'); if (box.childElementCount) return;
    let html = '';
    for (let i = 0; i < 70; i++) {
      html += `<i class="star" style="left:${Math.random() * 100}%;top:${Math.random() * 70}%;animation-delay:${(Math.random() * 4).toFixed(2)}s;transform:scale(${(0.5 + Math.random()).toFixed(2)})"></i>`;
    }
    box.innerHTML = html;
  }

  /* ---------- Derived data ---------- */
  const activeTracks = () => S.tracks.filter(t => t.active);
  const trackById = id => S.tracks.find(t => t.id === id);
  const sessionsThisWeek = (trackId) => { const ws = weekStart().getTime(); return S.sessions.filter(s => new Date(s.startedAt).getTime() >= ws && (!trackId || s.trackId === trackId)); };
  const reservesUsed = (trackId) => (S.reserves[weekKey()] || {})[trackId] || 0;
  const gap = t => t.weeklyTarget - sessionsThisWeek(t.id).length - reservesUsed(t.id);
  function suggested() {
    const act = activeTracks(); if (!act.length) return null;
    const lead = trackById(S.leadTrack);
    if (lead && lead.active && S._pick == null) {
      const maxGap = Math.max(...act.map(gap));
      if (gap(lead) >= maxGap || gap(lead) > 0) return lead;
    }
    if (S._pick != null) return act[S._pick % act.length];
    return [...act].sort((a, b) => gap(b) - gap(a))[0];
  }

  /* ---------- Rendering: Now ---------- */
  function greetingText(h) {
    const n = S.settings.name ? `, ${S.settings.name}` : '';
    if (h >= 5 && h < 12) return `Good morning${n}.`;
    if (h >= 12 && h < 17) return `Good afternoon${n}.`;
    if (h >= 17 && h < 22) return `Good evening${n}.`;
    return `Late night${n}.`;
  }
  function renderNow() {
    const now = new Date(), h = now.getHours();
    $('#clock').textContent = `${fmtDate(now)} · ${fmtTime(now)}`;
    $('#greeting').textContent = greetingText(h);

    let sub;
    const lv = S._prevVisit !== undefined ? S._prevVisit : S.lastVisit; const last = lv ? new Date(lv) : null;
    const daysAway = last ? Math.floor((now - last) / 864e5) : 0;
    if (daysAway >= 2) sub = 'Welcome back. Coming back counts. Start here.';
    else if (inPeak(now)) sub = 'This is your peak window. Good time for the hard thing.';
    else sub = "Off-peak. Just do the 2-minute version and see how it feels.";
    $('#subline').textContent = sub;

    // Fresh start banner
    const fb = $('#freshBanner');
    const isMonday = now.getDay() === 1, isFirst = now.getDate() === 1, isSem = S.settings.semesterStart === dayKey(now);
    if (isMonday || isFirst || isSem) {
      const why = isSem ? 'A new semester' : isFirst ? 'A new month' : 'A new week';
      fb.innerHTML = `<b>Fresh page.</b> ${why}. Reserves are reset and last week doesn't count against you. What's the first 2 minutes?`;
      fb.hidden = false;
    } else fb.hidden = true;

    const t = suggested();
    if (!t) {
      $('#launchTrack').textContent = 'No active tracks';
      $('#launchStep').textContent = 'Add a learning track to get started.';
      $('#launchWhy').textContent = '';
      $('#startBtn').disabled = true;
    } else {
      $('#startBtn').disabled = false;
      $('#launchTrack').textContent = t.name;
      $('#launchWhy').textContent = t.why || '';
      $('#launchStep').textContent = t.nextStep || 'Decide the smallest possible first step.';
      const lastUrl = (S.sessions.filter(s => s.trackId === t.id && s.artifactUrl).slice(-1)[0] || {}).artifactUrl || (t.resources[0] || {}).url;
      const u = safeUrl(lastUrl || '');
      const ow = $('#openWork'); if (u) { ow.href = u; ow.hidden = false; } else ow.hidden = true;
    }
    $('#smallerBox').hidden = true;

    // Plans
    const pl = S.plans.filter(p => p.enabled);
    $('#plansList').innerHTML = pl.length ? pl.map(p => `<li><b>If</b> ${esc(p.cue)}, <b>then</b> I ${esc(p.action)}.</li>`).join('') : '<li class="muted">No plans yet.</li>';

    // Week stats
    const reps = sessionsThisWeek().length;
    const mins = sessionsThisWeek().reduce((a, s) => a + (s.minutes || 0), 0);
    const total = S.sessions.length;
    const rows = activeTracks().map(tr => {
      const r = sessionsThisWeek(tr.id).length, rs = reservesUsed(tr.id), tg = Math.max(1, tr.weeklyTarget);
      const pct = Math.min(100, r / tg * 100), pctR = Math.min(100, (r + rs) / tg * 100);
      const on = r + rs >= tr.weeklyTarget ? ' · on track' : '';
      return `<div class="bar-row"><span>${esc(tr.name)}</span><span class="bar"><s style="width:${pctR}%"></s><i style="width:${pct}%"></i></span><span class="muted small">${r}/${tr.weeklyTarget}${rs ? ` +${rs}R` : ''}${on}</span></div>`;
    }).join('');
    $('#weekStats').innerHTML = `
      <div class="stat"><span class="n">${reps}</span><span class="l">reps this week</span></div>
      <div class="stat"><span class="n">${mins}</span><span class="l">minutes</span></div>
      <div class="stat"><span class="n">${total}</span><span class="l">total reps</span></div>
      <div class="week-tracks">${rows}</div>`;
  }

  /* ---------- Rendering: Tracks ---------- */
  const STATUSES = ['not started', 'exploring', 'practicing', 'applied'];
  function dotsFor(trackId) {
    // 12 weeks: level by reps per week
    const ws = weekStart();
    let out = '';
    for (let i = 11; i >= 0; i--) {
      const a = new Date(ws); a.setDate(a.getDate() - i * 7); const b = new Date(a); b.setDate(b.getDate() + 7);
      const n = S.sessions.filter(s => s.trackId === trackId && new Date(s.startedAt) >= a && new Date(s.startedAt) < b).length;
      const l = n === 0 ? 0 : n < 2 ? 1 : n < 4 ? 2 : 3;
      out += `<i data-l="${l}" title="Week of ${a.toLocaleDateString()}: ${n} reps"></i>`;
    }
    return out;
  }
  function renderTracks() {
    const today = dayKey();
    $('#tracksList').innerHTML = S.tracks.map(t => {
      const reps = sessionsThisWeek(t.id).length, rs = reservesUsed(t.id), left = t.reservesPerWeek - rs;
      const repToday = S.sessions.some(s => s.trackId === t.id && dayKey(new Date(s.startedAt)) === today);
      const ev = S.sessions.filter(s => s.trackId === t.id && s.evidence).slice(-4).reverse();
      return `<article class="card track" data-id="${t.id}" style="${t.active ? '' : 'opacity:.55'}">
        <div class="row between"><input class="track-name" data-f="name" value="${esc(t.name)}" aria-label="Track name">
          ${S.leadTrack === t.id ? '<span class="track-pill">Lead</span>' : `<button class="link" data-act="lead">Make lead</button>`}</div>
        <label class="field"><span>Why it matters</span><input data-f="why" value="${esc(t.why)}"></label>
        <label class="field"><span>Next tiny step</span><input data-f="nextStep" value="${esc(t.nextStep)}"></label>
        <div class="field"><span>Stage</span><div class="status">${STATUSES.map(s => `<button data-status="${s}" aria-pressed="${t.status === s}">${s}</button>`).join('')}</div></div>
        <div class="row gap"><label class="field" style="flex:1"><span>Reps / week</span><input type="number" min="1" max="14" data-f="weeklyTarget" value="${t.weeklyTarget}"></label>
          <label class="field" style="flex:1"><span>Reserve days</span><input type="number" min="0" max="5" data-f="reservesPerWeek" value="${t.reservesPerWeek}"></label></div>
        <div class="row between small"><span>This week: <b>${reps}</b>/${t.weeklyTarget} reps${rs ? ` · ${rs} reserve used` : ''}</span>
          ${!repToday && left > 0 ? `<button class="link" data-act="reserve">Use a reserve (${left} left)</button>` : `<span class="muted">${left} reserves left</span>`}</div>
        <div class="field"><span>Last 12 weeks</span><div class="dots">${dotsFor(t.id)}</div></div>
        <label class="field"><span>Main resource link</span><input type="url" data-f="resource" placeholder="https://…" value="${esc((t.resources[0] || {}).url || '')}"></label>
        ${ev.length ? `<div class="field"><span>Recent work</span><ul class="evidence">${ev.map(s => `<li>${esc(s.evidence)} <span class="muted">· ${new Date(s.startedAt).toLocaleDateString()}</span></li>`).join('')}</ul></div>` : ''}
        <div class="row between"><button class="link" data-act="toggle">${t.active ? 'Archive' : 'Restore'}</button><button class="btn" data-act="start">Start 2 minutes</button></div>
      </article>`;
    }).join('') || '<p class="empty">No tracks yet.</p>';

    $('#plansEditList').innerHTML = S.plans.map(p => `<li data-id="${p.id}"><span><b>If</b> ${esc(p.cue)}, <b>then</b> I ${esc(p.action)}.</span>
      <span class="row gap"><button class="link" data-pact="toggle">${p.enabled ? 'Hide' : 'Show'}</button><button class="link" data-pact="del">Delete</button></span></li>`).join('');
  }

  /* ---------- Rendering: Review ---------- */
  function renderReview() {
    const ws = weekStart(), we = new Date(ws); we.setDate(we.getDate() + 6);
    $('#reviewRange').textContent = `${ws.toLocaleDateString([], { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    const max = Math.max(1, ...activeTracks().map(t => t.weeklyTarget));
    $('#revTracks').innerHTML = activeTracks().map(t => {
      const r = sessionsThisWeek(t.id).length;
      return `<div class="bar-row"><span>${esc(t.name)}</span><span class="bar"><i style="width:${Math.min(100, r / max * 100)}%"></i></span><span class="small muted">${r}</span></div>`;
    }).join('') || '<p class="empty">No tracks.</p>';

    const lw = S.lapses.filter(l => new Date(l.at) >= ws);
    const counts = {}; lw.forEach(l => counts[l.trigger] = (counts[l.trigger] || 0) + 1);
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]); const lm = Math.max(1, ...entries.map(e => e[1]));
    $('#revLapses').innerHTML = entries.length ? entries.map(([k, v]) => `<div class="bar-row"><span>${esc(k)}</span><span class="bar"><i style="width:${v / lm * 100}%"></i></span><span class="small muted">${v}</span></div>`).join('')
      : '<p class="muted small">No drifts logged this week. If you did drift, pressing "I drifted" next time helps you spot the pattern.</p>';

    const hrs = Array(24).fill(0); S.sessions.filter(s => new Date(s.startedAt) >= new Date(Date.now() - 28 * 864e5)).forEach(s => hrs[new Date(s.startedAt).getHours()]++);
    const hm = Math.max(1, ...hrs);
    const peakH = h => { const d = new Date(); d.setHours(h, 30, 0, 0); return inPeak(d); };
    $('#revHours').innerHTML = hrs.map((n, h) => `<div class="hc ${peakH(h) ? 'peak' : ''}" title="${pad(h)}:00 · ${n} sessions"><div class="h" style="height:${n / hm * 100}%"></div></div>`).join('')
      + '';
    $('#revHours').insertAdjacentHTML('afterend', '');
    let lbl = $('#hoursLbl'); if (!lbl) { lbl = document.createElement('div'); lbl.id = 'hoursLbl'; lbl.className = 'hours-lbl'; $('#revHours').after(lbl); }
    lbl.innerHTML = hrs.map((_, h) => `<span>${h % 3 === 0 ? h : ''}</span>`).join('');

    const past = [...S.reviews].reverse().slice(0, 8);
    $('#pastReviews').innerHTML = past.length ? `<div class="card soft past"><h2 class="h-small">Past reviews</h2>${past.map(r => `<details><summary>Week of ${esc(r.weekStart)}</summary>
      <p><b>Easy:</b> ${esc(r.wins) || '-'}</p><p><b>Pulled away:</b> ${esc(r.stuck) || '-'}</p><p><b>Next:</b> ${esc(r.nextSteps) || '-'}</p></details>`).join('')}</div>` : '';
  }

  /* ---------- Rendering: Settings ---------- */
  function renderSettings() {
    const f = $('#settingsForm'), s = S.settings;
    f.name.value = s.name; f.peakStart.value = s.peakStart; f.peakEnd.value = s.peakEnd;
    f.earnedMinutes.value = s.earnedMinutes; f.semesterStart.value = s.semesterStart || '';
    $$('input[name="chronotype"]', f).forEach(i => i.checked = i.value === s.chronotype);
    $$('input[name="themeMode"]', f).forEach(i => i.checked = i.value === s.themeMode);
  }

  /* ---------- Views ---------- */
  let current = 'now';
  function show(view, opts = {}) {
    current = view; document.body.dataset.view = view;
    $$('.view').forEach(v => v.hidden = v.id !== `view-${view}`);
    $$('.nav-btn').forEach(b => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
    ({ now: renderNow, tracks: renderTracks, review: renderReview, settings: renderSettings })[view]();
    if (history.replaceState) history.replaceState(null, '', '#' + view);
    if (opts.focus === 'plans') setTimeout(() => $('#plansEdit').scrollIntoView({ behavior: 'smooth' }), 50);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Toast ---------- */
  let tt; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2600); }

  /* ---------- Focus session ---------- */
  const F = { track: null, start: 0, timer: null, done: false };
  const CIRC = 2 * Math.PI * 90;
  function startFocus(track) {
    if (!track) return;
    closeAll();
    F.track = track; F.start = Date.now(); F.done = false;
    $('#focusTrack').textContent = track.name;
    $('#focusStep').textContent = track.nextStep || 'Your first tiny step';
    $('#focusWhy').textContent = track.why ? `Why: ${track.why}` : '';
    $('#focusNote').textContent = 'Just two minutes. You can stop after that.';
    $('#keepGoing').hidden = true; $('#focusBtns').hidden = false; $('#logForm').hidden = true;
    $('#logForm').reset(); $('#logForm').next.value = '';
    const fg = $('#ringFg'); fg.style.strokeDasharray = CIRC; fg.style.strokeDashoffset = 0;
    $('#focus').hidden = false; document.title = '2:00 · First Light';
    clearInterval(F.timer); F.timer = setInterval(tickFocus, 250); tickFocus();
    $('#doneBtn').focus();
  }
  function tickFocus() {
    const el = (Date.now() - F.start) / 1000;
    const fg = $('#ringFg');
    if (el < 120) {
      const left = Math.ceil(120 - el);
      $('#ringTime').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
      fg.style.strokeDashoffset = CIRC * (el / 120);
    } else {
      if (!F.done) { F.done = true; $('#focusNote').textContent = "Two minutes done. You can stop, or keep going if it's flowing."; $('#keepGoing').hidden = false; fg.style.strokeDashoffset = CIRC; }
      const s = Math.floor(el);
      $('#ringTime').textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`;
    }
    document.title = `${$('#ringTime').textContent} · First Light`;
  }
  function finishFocus() {
    clearInterval(F.timer);
    $('#focusBtns').hidden = true; $('#logForm').hidden = false;
    $('#logForm').next.value = F.track.nextStep || '';
    $('#logForm').evidence.focus();
  }
  function logFocus(e) {
    e.preventDefault();
    const f = e.target, mins = Math.max(1, Math.round((Date.now() - F.start) / 60000));
    const url = safeUrl(f.url.value.trim());
    S.sessions.push({ id: uid(), trackId: F.track.id, startedAt: new Date(F.start).toISOString(), minutes: mins, kind: mins > 2 ? 'continued' : 'two-minute', evidence: f.evidence.value.trim().slice(0, 200), artifactUrl: url });
    const t = trackById(F.track.id); if (t && f.next.value.trim()) t.nextStep = f.next.value.trim().slice(0, 200);
    save(); $('#focus').hidden = true; document.title = 'First Light';
    S._pick = null;
    if (mins >= 20) openRefresh(mins); else toast(`Logged ${mins} min on ${F.track.name}. That's a rep.`);
    show(current);
  }
  function cancelFocus() { clearInterval(F.timer); $('#focus').hidden = true; document.title = 'First Light'; }

  /* ---------- Refresh break ---------- */
  let RT;
  function openRefresh(mins) {
    $('#refreshMins').textContent = mins;
    $('#earnedText').textContent = `${S.settings.earnedMinutes} minutes`;
    const end = Date.now() + 5 * 60000; $('#refresh').hidden = false;
    clearInterval(RT); RT = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      $('#refreshTime').textContent = l ? `${Math.floor(l / 60)}:${pad(l % 60)}` : 'Refreshed.';
      if (!l) clearInterval(RT);
    }, 500);
    $('#closeRefresh').focus();
  }

  /* ---------- Drift ---------- */
  const TRIGGERS = ['YouTube', 'Netflix', 'Random browsing', 'Tired', 'Task felt too hard', 'Phone', 'Other'];
  let BT;
  function openDrift() {
    closeAll();
    $('#driftStep1').hidden = false; $('#driftStep2').hidden = true;
    $('#driftChips').innerHTML = TRIGGERS.map(t => `<button class="chip" data-trigger="${esc(t)}">${esc(t)}</button>`).join('');
    $('#drift').hidden = false; $('.chip', $('#driftChips')).focus();
  }
  function pickTrigger(t) {
    S.lapses.push({ id: uid(), at: new Date().toISOString(), trigger: t }); save();
    $('#driftStep1').hidden = true; $('#driftStep2').hidden = false;
    let n = 30; $('#breathText').textContent = `Breathe in… and out. ${n} seconds.`;
    clearInterval(BT); BT = setInterval(() => { n--; $('#breathText').textContent = n > 0 ? `Breathe in… and out. ${n} seconds.` : 'Ready when you are.'; if (n <= 0) clearInterval(BT); }, 1000);
    $('#restartBtn').focus();
  }

  /* ---------- Generic dialog (onboarding, edit step) ---------- */
  function openDialog(html, onMount) { $('#dialogBody').innerHTML = html; $('#dialog').hidden = false; onMount && onMount($('#dialogBody')); }
  function closeAll() { ['#drift', '#dialog', '#refresh'].forEach(s => $(s).hidden = true); clearInterval(BT); }

  function onboarding() {
    const opts = S.tracks.map(t => `<label><input type="radio" name="lead" value="${t.id}" ${t.id === S.leadTrack ? 'checked' : ''}><span>${esc(t.name)}</span></label>`).join('');
    openDialog(`
      <p class="eyebrow">Welcome</p>
      <h2 class="title" id="dialogTitle">Let's set up your first screen</h2>
      <p class="muted small">30 seconds. You can change everything later. The idea: when you open the laptop, this page already knows the tiny thing you'll start with.</p>
      <form id="obForm" class="settings" style="margin:0">
        <label><span>What should I call you? (optional)</span><input name="name" maxlength="40"></label>
        <fieldset><legend>Lead track right now</legend><div class="seg">${opts}</div></fieldset>
        <label><span>Its next tiny step (something you can start in 2 minutes)</span><input name="step" value="${esc(trackById(S.leadTrack)?.nextStep || '')}" required></label>
        <fieldset><legend>When is your brain sharpest?</legend><div class="seg">
          <label><input type="radio" name="chrono" value="morning"><span>Morning</span></label>
          <label><input type="radio" name="chrono" value="neutral"><span>Neutral</span></label>
          <label><input type="radio" name="chrono" value="evening" checked><span>Evening</span></label></div></fieldset>
        <div class="row gap"><button class="btn primary" type="submit">Start using First Light</button><button class="btn ghost" type="button" id="obSkip">Skip</button></div>
      </form>`, body => {
      const f = $('#obForm', body);
      $$('input[name="lead"]', f).forEach(r => r.addEventListener('change', () => { f.step.value = trackById(r.value)?.nextStep || ''; }));
      f.addEventListener('submit', e => {
        e.preventDefault();
        S.settings.name = f.name.value.trim();
        const lead = f.lead.value || S.leadTrack; S.leadTrack = lead;
        const t = trackById(lead); if (t) t.nextStep = f.step.value.trim();
        const c = f.chrono.value; S.settings.chronotype = c;
        const win = { morning: ['06:30', '09:30'], neutral: ['09:30', '12:30'], evening: ['19:30', '22:30'] }[c];
        S.settings.peakStart = win[0]; S.settings.peakEnd = win[1];
        S.onboarded = true; save(); closeAll(); show('now');
      });
      $('#obSkip', body).addEventListener('click', () => { S.onboarded = true; save(); closeAll(); show('now'); });
      f.name.focus();
    });
  }

  function editStep() {
    const t = suggested(); if (!t) return;
    openDialog(`<h2 class="title" id="dialogTitle">Next tiny step for ${esc(t.name)}</h2>
      <p class="muted small">Make it physical and specific: a file to open, a line to write, a command to run.</p>
      <form id="stepForm" style="display:grid;gap:12px"><input name="step" value="${esc(t.nextStep)}" required maxlength="200">
      <div class="row gap"><button class="btn primary" type="submit">Save</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`, body => {
      const f = $('#stepForm', body); f.step.focus(); f.step.select();
      f.addEventListener('submit', e => { e.preventDefault(); t.nextStep = f.step.value.trim(); save(); closeAll(); renderNow(); });
    });
  }

  const SMALLER = ['Open the file you last worked on', 'Read one paragraph of the docs', 'Run the project once', 'Write one function signature', 'Reproduce one bug', 'Write a single comment: what to do next'];
  function makeSmaller() {
    const box = $('#smallerBox');
    if (!box.hidden) { box.hidden = true; return; }
    box.innerHTML = SMALLER.map(s => `<button class="chip" data-smaller="${esc(s)}">${esc(s)}</button>`).join('');
    box.hidden = false;
  }

  /* ---------- Export / Import ---------- */
  function exportData() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `first-light-backup-${dayKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Backup downloaded.');
  }
  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || d.v !== 1 || !Array.isArray(d.tracks) || !Array.isArray(d.sessions)) throw new Error('bad');
        if (!confirm(`Replace current data with this backup? (${d.tracks.length} tracks, ${d.sessions.length} sessions)`)) return;
        S = { ...seed(), ...d, settings: { ...seed().settings, ...d.settings } }; save(); applyTheme(); show(current); toast('Backup restored.');
      } catch { toast("That file isn't a valid First Light backup."); }
    };
    r.readAsText(file);
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-view]'); if (v) { e.preventDefault(); show(v.dataset.view, { focus: v.dataset.focus }); return; }
    if (e.target.closest('[data-close]')) { closeAll(); return; }
    const sm = e.target.closest('[data-smaller]');
    if (sm) { const t = suggested(); if (t) { t.nextStep = sm.dataset.smaller; save(); renderNow(); toast('Smaller step set.'); } return; }
    const tg = e.target.closest('[data-trigger]'); if (tg) { pickTrigger(tg.dataset.trigger); return; }

    const card = e.target.closest('.track');
    if (card) {
      const t = trackById(card.dataset.id); if (!t) return;
      const st = e.target.closest('[data-status]'); if (st) { t.status = st.dataset.status; save(); renderTracks(); return; }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'lead') { S.leadTrack = t.id; S._pick = null; save(); renderTracks(); }
      if (act === 'toggle') { t.active = !t.active; save(); renderTracks(); }
      if (act === 'start') startFocus(t);
      if (act === 'reserve') { const wk = weekKey(); S.reserves[wk] = S.reserves[wk] || {}; S.reserves[wk][t.id] = (S.reserves[wk][t.id] || 0) + 1; save(); renderTracks(); toast('Reserve used. Still on track.'); }
      return;
    }
    const pli = e.target.closest('#plansEditList [data-pact]');
    if (pli) { const id = pli.closest('li').dataset.id, p = S.plans.find(x => x.id === id); if (pli.dataset.pact === 'del') S.plans = S.plans.filter(x => x.id !== id); else p.enabled = !p.enabled; save(); renderTracks(); }
  });

  $('#tracksList').addEventListener('change', e => {
    const card = e.target.closest('.track'); const f = e.target.dataset.f; if (!card || !f) return;
    const t = trackById(card.dataset.id);
    if (f === 'weeklyTarget' || f === 'reservesPerWeek') t[f] = Math.max(0, Math.min(14, parseInt(e.target.value, 10) || 0));
    else if (f === 'resource') { const u = safeUrl(e.target.value.trim()); t.resources = u ? [{ title: 'Main resource', url: u }] : []; }
    else t[f] = e.target.value.trim().slice(0, 200);
    save(); toast('Saved.');
  });

  $('#addTrack').addEventListener('click', () => {
    S.tracks.push({ id: uid(), name: 'New track', why: '', nextStep: 'Decide the smallest first step', weeklyTarget: 3, reservesPerWeek: 1, status: 'not started', resources: [], active: true });
    save(); renderTracks(); const inputs = $$('.track-name'); inputs[inputs.length - 1].focus(); inputs[inputs.length - 1].select();
  });
  $('#planForm').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    S.plans.push({ id: uid(), cue: f.cue.value.trim().replace(/^if\s+/i, ''), action: f.action.value.trim().replace(/^(then\s+)?(i\s+)?/i, ''), enabled: true });
    save(); f.reset(); renderTracks(); toast('Plan added.');
  });

  $('#startBtn').addEventListener('click', () => startFocus(suggested()));
  $('#pickAnother').addEventListener('click', () => { const act = activeTracks(); const cur = suggested(); const i = act.indexOf(cur); S._pick = (i + 1) % act.length; renderNow(); });
  $('#makeSmaller').addEventListener('click', makeSmaller);
  $('#editStep').addEventListener('click', editStep);
  $('#driftBtn').addEventListener('click', openDrift);
  $('#restartBtn').addEventListener('click', () => { closeAll(); startFocus(suggested()); });
  $('#closeDrift').addEventListener('click', closeAll);
  $('#doneBtn').addEventListener('click', finishFocus);
  $('#keepGoing').addEventListener('click', () => { $('#keepGoing').hidden = true; $('#focusNote').textContent = 'Keep going. Press Done when you stop.'; });
  $('#cancelFocus').addEventListener('click', cancelFocus);
  $('#logForm').addEventListener('submit', logFocus);
  $('#closeRefresh').addEventListener('click', () => { clearInterval(RT); $('#refresh').hidden = true; });

  $('#themeToggle').addEventListener('click', () => {
    const order = ['auto', 'light', 'dark']; S.settings.themeMode = order[(order.indexOf(S.settings.themeMode) + 1) % 3]; save(); applyTheme();
    toast(`Theme: ${THEME_LABEL[S.settings.themeMode]}`); if (current === 'settings') renderSettings();
  });
  $('#settingsForm').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target, s = S.settings;
    s.name = f.name.value.trim().slice(0, 40); s.chronotype = f.chronotype.value || s.chronotype;
    s.peakStart = f.peakStart.value || s.peakStart; s.peakEnd = f.peakEnd.value || s.peakEnd;
    s.themeMode = f.themeMode.value || s.themeMode; s.earnedMinutes = Math.max(5, Math.min(60, parseInt(f.earnedMinutes.value, 10) || 20));
    s.semesterStart = f.semesterStart.value || '';
    save(); applyTheme(); toast('Settings saved.');
  });
  $('#exportBtn').addEventListener('click', exportData);
  $('#importFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) importData(f); e.target.value = ''; });
  $('#resetBtn').addEventListener('click', () => { if (confirm('Delete all First Light data in this browser? Export a backup first if you want to keep it.')) { localStorage.removeItem(KEY); S = seed(); save(); applyTheme(); onboarding(); } });

  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.key === 'Escape') { if (!$('#focus').hidden && $('#logForm').hidden) cancelFocus(); closeAll(); if (current !== 'now') show('now'); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const overlayOpen = $$('.overlay').some(o => !o.hidden);
    if (overlayOpen) return;
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); startFocus(suggested()); }
    if (e.key === 'd' || e.key === 'D') { e.preventDefault(); openDrift(); }
  });

  document.addEventListener('visibilitychange', () => { if (!document.hidden) { applyTheme(); if (current === 'now') renderNow(); } });
  setInterval(() => { applyTheme(); if (current === 'now' && $('#focus').hidden) { $('#clock').textContent = `${fmtDate(new Date())} · ${fmtTime(new Date())}`; } }, 30000);

  /* ---------- Boot ---------- */
  S._pick = null; S._prevVisit = S.lastVisit || null; makeStars(); applyTheme();
  const initial = (location.hash || '#now').slice(1);
  show(['now', 'tracks', 'review', 'settings'].includes(initial) ? initial : 'now');
  if (!S.onboarded) onboarding();
  S.lastVisit = new Date().toISOString(); save();

  if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost|^http:\/\/127\./.test(location.href)) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
