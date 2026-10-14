const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const ctx = canvas.getContext('2d');
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d');
const MB = window.Mediabunny;

const FORMATS = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080] };
const FONTS = [
  { name: 'Anton', weight: 400 },
  { name: 'Archivo', weight: 800 },
  { name: 'Oswald', weight: 700 },
  { name: 'Barlow Condensed', weight: 700 },
  { name: 'Newsreader', weight: 600 },
];
const DEFAULT_BRAND = { dark: '#111111', light: '#ffffff', main: '#1740e0', accent: '#ffd400', head: 'Anton', body: 'Archivo', logo: null };
// Values starting with $ are filled in from the brand kit when a graphic is made.
const BASE = {
  text: '', sub: '', width: 0.84, x: 0.08, y: 0.5, size: 56, align: 'left', upper: false, track: 0,
  font: '$body', color: '$light', bg: '$dark', accent: '$accent', bgAlpha: 1, radius: 0, alpha: 1,
  anim: 'fade', out: 'fade', speed: 0.45, start: 0, end: 5, toEnd: true,
};
const PRESETS = {
  headline: { name: 'Headline', kind: 'lines', text: 'Your headline goes here', font: '$head', size: 88, y: 0.62, upper: true, anim: 'wipe' },
  label: { name: 'Label', kind: 'lines', text: 'Breaking', size: 38, y: 0.565, bg: '$main', upper: true, track: 0.06 },
  lower: { name: 'Name bar', kind: 'lower', text: 'Maria Alvarez', sub: 'City council member, District 4', size: 54, y: 0.78, color: '$dark', bg: '$light', accent: '$main', anim: 'rise' },
  quote: { name: 'Quote', kind: 'quote', text: 'We heard from hundreds of renters, and tonight we acted.', sub: 'Maria Alvarez', font: 'Newsreader', size: 60, y: 0.4 },
  credit: { name: 'Source credit', kind: 'text', text: 'Source: City Clerk’s Office', size: 30, y: 0.93 },
  text: { name: 'Plain text', kind: 'text', text: 'Add your text', y: 0.3 },
  image: { name: 'Image', kind: 'image', width: 0.4, x: 0.3, y: 0.3 },
  subtitles: { name: 'Subtitles', kind: 'lines', size: 50, y: 0.72, align: 'center', anim: 'none', out: 'none', offset: 0 },
  logo: { name: 'Logo', kind: 'image', width: 0.2, x: 0.74, y: 0.04, anim: 'none', out: 'none' },
};

let state = { format: '9:16', fit: 'cover', clips: [], overlays: [], brand: { ...DEFAULT_BRAND }, styles: [], layouts: [], fonts: [], assets: {} };
let selectedId = null;
let selectedClipId = null;
let nextId = 1;

// Video files live only in memory, keyed by file name; clips in the project point at them by name.
const media = new Map();
let segs = [];
let hasVideo = false;
let duration = 15;
let T = 0;
let playing = false;
let active = -1;
let muted = false;
let exporting = false;
let exportMode = null;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const uid = () => nextId++;
const selected = () => state.overlays.find((o) => o.id === selectedId) || null;
const selectedClip = () => state.clips.find((c) => c.id === selectedClipId) || null;
const endOf = (o) => (o.toEnd ? duration : Math.min(o.end, duration));
const strip = (k, v) => (k[0] === '_' ? undefined : v);

function fmt(t) {
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(1).padStart(4, '0')}`;
}

/* ---------- graphics: creating ---------- */

function resolveBrand(o) {
  for (const k of ['font', 'color', 'bg', 'accent']) {
    if (typeof o[k] === 'string' && o[k][0] === '$') o[k] = state.brand[o[k].slice(1)];
  }
  return o;
}

function makeOverlay(type, extra = {}) {
  return resolveBrand({ ...BASE, ...PRESETS[type], type, id: uid(), ...extra });
}

function setEnd(o, v) {
  o.end = clamp(v, o.start + 0.1, duration);
  o.toEnd = o.end >= duration - 0.02;
}

/* ---------- subtitles ---------- */

// Reads SRT (and WebVTT) into a list of { start, end, text } in seconds.
function parseSubtitles(src) {
  const time = String.raw`(?:(\d+):)?(\d+):(\d+)[,.](\d+)`;
  const timing = new RegExp(`${time}\\s*-->\\s*${time}`);
  const secs = (h, m, s, ms) => (+h || 0) * 3600 + +m * 60 + +s + +ms.padEnd(3, '0').slice(0, 3) / 1000;
  const cues = [];
  for (const block of src.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n');
    const at = lines.findIndex((l) => timing.test(l));
    if (at < 0) continue;
    const m = lines[at].match(timing);
    const text = lines.slice(at + 1).join('\n').replace(/<[^>]+>|\{\\[^}]*\}/g, '').trim();
    if (text) cues.push({ start: secs(...m.slice(1, 5)), end: secs(...m.slice(5, 9)), text });
  }
  return cues.sort((a, b) => a.start - b.start);
}

const cueAt = (o, t) => o.cues.find((c) => t >= c.start + o.offset && t < c.end + o.offset) || null;

async function addSubtitleFile(file) {
  const cues = parseSubtitles(await file.text());
  if (!cues.length) return toast(`No subtitles were found in ${file.name}. It should be an SRT or VTT file.`);
  let o = state.overlays.find((x) => x.type === 'subtitles');
  if (o) o.cues = cues; // keep the styling already chosen
  else state.overlays.push((o = makeOverlay('subtitles', { cues })));
  renderTimeline();
  select(o.id);
  if (!cueAt(o, T)) setTime(cues[0].start + o.offset);
  fillInspector();
  save();
  toast(`${cues.length} subtitles added from ${file.name}.`);
}

/* ---------- saving, undo, project files ---------- */

const db = new Promise((resolve, reject) => {
  const req = indexedDB.open('chyron', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('kv');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
const idb = (mode, fn) => db.then((d) => new Promise((resolve, reject) => {
  const req = fn(d.transaction('kv', mode).objectStore('kv'));
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
}));

let history = [];
let hIndex = -1;
let saveTimer;
const snapshot = () => JSON.stringify(state, (k, v) => (k === 'assets' || k[0] === '_' ? undefined : v));

function commit() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const snap = snapshot();
  if (snap !== history[hIndex]) {
    history.splice(hIndex + 1);
    history.push(snap);
    if (history.length > 150) history.shift();
    hIndex = history.length - 1;
  }
  $('#undo').disabled = hIndex <= 0;
  $('#redo').disabled = hIndex >= history.length - 1;
  idb('readwrite', (s) => s.put(JSON.stringify(state, strip), 'state')).catch(() => {});
}

// Call after any change. Rapid changes (dragging, typing) become one undo step.
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(commit, 350);
}

function stepHistory(dir) {
  if (saveTimer) commit();
  if (!history[hIndex + dir]) return;
  hIndex += dir;
  const assets = state.assets;
  state = JSON.parse(history[hIndex]);
  state.assets = assets;
  applyState();
  commit();
}

function normalise(s) {
  const out = { format: '9:16', fit: 'cover', clips: [], overlays: [], styles: [], layouts: [], fonts: [], assets: {}, ...s };
  out.brand = { ...DEFAULT_BRAND, ...s.brand };
  state = out;
  out.overlays = out.overlays.map((o) => resolveBrand({ ...BASE, out: 'fade', ...o, toEnd: o.toEnd ?? o.end >= 14.99 }));
  const ids = [...out.overlays, ...out.clips, ...out.styles, ...out.layouts].map((x) => x.id || 0);
  nextId = Math.max(0, ...ids) + 1;
}

// Bring every part of the screen in line with `state` (after load, undo, or opening a project).
function applyState() {
  if (!selected()) selectedId = null;
  if (!selectedClip()) selectedClipId = null;
  state.fonts.forEach(loadCustomFont);
  setFormat(state.format);
  $('#format').value = state.format;
  $('#fit').value = state.fit;
  recalc();
  renderFontOptions();
  renderLooks();
  renderLibrary();
  renderBrand();
  fillInspector();
  renderTimeline();
}

async function load() {
  let saved = null;
  try {
    saved = JSON.parse(await idb('readonly', (s) => s.get('state')));
  } catch {}
  if (!saved) {
    try {
      saved = JSON.parse(localStorage.getItem('chyron.v1')); // first version stored graphics here
    } catch {}
  }
  if (saved && Array.isArray(saved.overlays)) normalise(saved);
  else {
    state.overlays = [
      makeOverlay('label'),
      makeOverlay('headline', { text: 'City council votes to cap rent increases at *3%*' }),
      makeOverlay('credit'),
    ];
  }
  applyState();
  commit();
}

// Trim handles are wider on touch screens, matching the handles drawn in style.css.
const touch = matchMedia('(pointer: coarse)').matches;
const GRIP = touch ? 18 : 10;

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

const projectName = () => (segs[0] ? segs[0].m.name.replace(/\.[^.]+$/, '') : 'chyron');

$('#saveProject').onclick = () => {
  download(new Blob([JSON.stringify({ app: 'chyron', version: 2, state }, strip)], { type: 'application/json' }), `${projectName()}.chyron.json`);
  toast('Project file saved. It holds your graphics and settings, but not the video itself.');
};
$('#openProject').onclick = () => $('#projFile').click();
$('#newProject').onclick = () => {
  pause();
  state.overlays = [];
  state.clips = [];
  T = 0;
  applyState();
  save();
  toast('Started a new project. Your brand kit, styles and layouts are kept.');
};

async function openProject(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'chyron' || !data.state) throw new Error();
    pause();
    normalise(data.state);
    applyState();
    save();
    const missing = [...new Set(state.clips.map((c) => c.name))].filter((n) => !media.has(n));
    toast(missing.length ? `Project opened. Add ${missing.join(', ')} again to continue.` : 'Project opened.');
  } catch {
    toast('That file is not a Chyron project.');
  }
}

/* ---------- assets: images and fonts ---------- */

const readDataURL = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(file);
});

async function addImageAsset(file) {
  let url;
  if (file.type === 'image/svg+xml') url = await readDataURL(file);
  else {
    // Shrink big photos so the project stays small.
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    url = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/webp', 0.92);
  }
  const id = `a${Date.now().toString(36)}${uid()}`;
  state.assets[id] = url;
  return id;
}

const imgCache = new Map();
function getImage(id) {
  let img = imgCache.get(id);
  if (!img && state.assets[id]) {
    img = new Image();
    img.src = state.assets[id];
    imgCache.set(id, img);
  }
  return img && img.complete && img.naturalWidth ? img : null;
}

const loadedFonts = new Set();
const googleCss = (name, weight) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@${weight}&display=swap`;
const adobeCss = (kit) => `https://use.typekit.net/${kit}.css`;

// Fonts come from an uploaded file, Google Fonts, or an Adobe Fonts web project.
function loadCustomFont(f) {
  if (loadedFonts.has(f.name)) return;
  const failed = () => toast(`The font ${f.name} could not be loaded.`);
  if (f.source) {
    loadedFonts.add(f.name);
    const href = f.source === 'google' ? googleCss(f.name, f.weight) : adobeCss(f.kit);
    if (![...document.styleSheets].some((sheet) => sheet.href === href)) {
      document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href, onerror: failed }));
    }
    // Ask for the font now so it is ready for the canvas, not just for page text.
    const want = () => document.fonts.load(`${f.weight} 40px "${f.name}"`);
    want().then((faces) => faces.length || setTimeout(want, 1500));
  } else if (state.assets[f.asset]) {
    loadedFonts.add(f.name);
    const face = new FontFace(f.name, `url(${state.assets[f.asset]})`);
    face.load().then(() => document.fonts.add(face), failed);
  }
}

function fontsChanged(added) {
  added.forEach(loadCustomFont);
  renderFontOptions();
  renderBrand();
  fillInspector();
  save();
}

async function addGoogleFont(typed) {
  const typedName = typed.trim().replace(/\s+/g, ' ');
  if (!typedName) return toast('Type the name of a Google font, for example Bebas Neue.');
  // Google is fussy about capitals, so also try the name with each word capitalised.
  const names = new Set([typedName, typedName.replace(/(^|\s)\S/g, (c) => c.toUpperCase())]);
  // Prefer a bold cut, which suits news graphics; fall back to whatever the family has.
  for (const name of names) for (const weight of [800, 700, 900, 600, 500, 400, 300]) {
    let css;
    try {
      // Google answers with an error for a weight the family lacks, which the browser reports as a failed request.
      const res = await fetch(googleCss(name, weight));
      if (!res.ok) continue;
      css = await res.text();
    } catch {
      continue;
    }
    const family = (css.match(/font-family:\s*'([^']+)'/) || [])[1] || name;
    if (allFonts().some((f) => f.name === family)) return toast(`${family} is already in your fonts.`);
    state.fonts.push({ name: family, weight, source: 'google' });
    fontsChanged([state.fonts.at(-1)]);
    return toast(`${family} added from Google Fonts.`);
  }
  toast(navigator.onLine ? `Google Fonts has no font called “${typedName}”. Check the spelling on fonts.google.com.` : 'Google Fonts could not be reached. Check your internet connection.');
}

async function addAdobeKit(typed) {
  const kit = (typed.match(/typekit\.net\/([a-z0-9]+)\.(?:css|js)/i) || typed.trim().match(/^([a-z0-9]{5,10})$/i) || [])[1];
  if (!kit) return toast('Paste the project ID from Adobe Fonts (seven letters and numbers), or its embed link.');
  let css;
  try {
    const res = await fetch(adobeCss(kit));
    if (!res.ok) throw new Error();
    css = await res.text();
  } catch {
    return toast('Adobe Fonts did not recognise that project ID. Check it under “Web projects” on fonts.adobe.com.');
  }
  // A project lists each family in several weights; keep one upright weight per family, as bold as available.
  const best = new Map();
  for (const block of css.match(/@font-face\s*{[^}]*}/g) || []) {
    const name = (block.match(/font-family:\s*["']?([^;"']+)/) || [])[1];
    const weight = +(block.match(/font-weight:\s*(\d+)/) || [0, 400])[1];
    if (!name || /font-style:\s*italic/.test(block)) continue;
    const score = (w) => Math.abs(w - 700);
    if (!best.has(name) || score(weight) < score(best.get(name))) best.set(name, weight);
  }
  const added = [];
  for (const [name, weight] of best) {
    if (allFonts().some((f) => f.name === name)) continue;
    state.fonts.push({ name, weight, source: 'adobe', kit });
    added.push(state.fonts.at(-1));
  }
  if (!added.length) return toast(best.size ? 'Those fonts are already added.' : 'That Adobe Fonts project has no fonts in it yet.');
  fontsChanged(added);
  toast(`Added from Adobe Fonts: ${added.map((f) => f.name).join(', ')}.`);
}

async function addFontFile(file) {
  const name = file.name.replace(/\.[^.]+$/, '').replace(/["\\]/g, '');
  if (allFonts().some((f) => f.name === name)) return toast(`${name} is already in your fonts.`);
  const asset = `f${Date.now().toString(36)}${uid()}`;
  state.assets[asset] = await readDataURL(file);
  state.fonts.push({ name, asset });
  fontsChanged([state.fonts.at(-1)]);
}

const allFonts = () => [...FONTS, ...state.fonts.map((f) => ({ name: f.name, weight: f.weight || 400 }))];

/* ---------- video clips and playback ---------- */

// Work out where each clip sits on the timeline.
function recalc() {
  segs = [];
  let t = 0;
  for (const c of state.clips) {
    const m = media.get(c.name);
    if (!m) continue;
    c.out = clamp(c.out, 0.1, m.duration);
    c.in = clamp(c.in, 0, c.out - 0.1);
    segs.push({ c, m, start: t, len: c.out - c.in });
    t += c.out - c.in;
  }
  hasVideo = segs.length > 0;
  duration = hasVideo ? t : 15;
  T = clamp(T, 0, duration);
  if (hasVideo && !playing) {
    active = segIndexAt(T);
    cue(active, T);
  }
  const missing = [...new Set(state.clips.map((c) => c.name))].filter((n) => !media.has(n));
  $('#empty').hidden = hasVideo;
  $('#emptyMsg').textContent = missing.length ? `Add ${missing.join(', ')} again to pick up where you left off.` : (touch ? 'Tap Add video to start.' : 'Drop a video here to start.');
}

function segIndexAt(t) {
  let i = segs.length - 1;
  while (i > 0 && segs[i].start > t) i--;
  return i;
}

function cue(i, t) {
  const s = segs[i];
  if (!s) return;
  const want = clamp(s.c.in + (t - s.start), s.c.in, s.c.out);
  if (Math.abs(s.m.el.currentTime - want) > 0.04) s.m.el.currentTime = want;
}

function startSeg() {
  const s = segs[active];
  s.m.el.muted = muted || s.c.muted;
  s.m.el.play().catch(() => {});
  const next = segs[active + 1];
  if (next && next.m !== s.m) next.m.el.currentTime = next.c.in; // get the next file ready
}

function play() {
  if (T >= duration - 0.03) T = 0;
  playing = true;
  if (!hasVideo) return;
  active = segIndexAt(T);
  cue(active, T);
  startSeg();
}

function pause() {
  playing = false;
  for (const m of media.values()) m.el.pause();
}

function setTime(t) {
  if (playing) pause();
  T = clamp(t, 0, duration);
  if (hasVideo) {
    active = segIndexAt(T);
    cue(active, T);
  }
}

// While playing, the video element is the clock; hop to the next clip when one runs out.
function advance(dt) {
  if (!hasVideo) {
    T += dt;
    if (T >= duration) {
      T = duration;
      playing = false;
    }
    return;
  }
  const s = segs[active];
  if (!s) return pause();
  const el = s.m.el;
  if (el.currentTime >= s.c.out - 0.01 || el.ended) {
    const next = segs[active + 1];
    if (!next) {
      pause();
      T = duration;
      return;
    }
    if (next.m !== s.m) el.pause();
    if (next.m !== s.m || Math.abs(el.currentTime - next.c.in) > 0.08) next.m.el.currentTime = next.c.in;
    active++;
    T = next.start;
    startSeg();
  } else T = clamp(s.start + el.currentTime - s.c.in, s.start, s.start + s.len);
}

function togglePlay() {
  if (exporting) return;
  playing ? pause() : play();
}

async function addVideoFile(file) {
  if (!media.has(file.name)) {
    const el = document.createElement('video');
    el.className = 'src';
    el.playsInline = true;
    el.preload = 'auto';
    el.src = URL.createObjectURL(file);
    document.body.append(el);
    try {
      await new Promise((resolve, reject) => {
        el.onloadedmetadata = resolve;
        el.onerror = reject;
      });
      if (!Number.isFinite(el.duration)) throw new Error();
    } catch {
      el.remove();
      return toast(`${file.name} could not be opened. Try an MP4 or MOV file.`);
    }
    media.set(file.name, { name: file.name, file, el, duration: el.duration });
    // A project that already lists this file (reopened, or restored) just needed the video back.
    if (state.clips.some((c) => c.name === file.name)) return;
  }
  state.clips.push({ id: uid(), name: file.name, in: 0, out: media.get(file.name).duration, muted: false });
}

/* ---------- drawing ---------- */

function setFont(o, px) {
  const f = allFonts().find((f) => f.name === o.font) || FONTS[1];
  ctx.font = `${f.weight} ${px}px "${f.name}", "Arial Narrow", sans-serif`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(o.track || 0) * px}px`;
}

// Split text into lines that fit, keeping track of which pieces sit between *asterisks*.
function wrapRich(text, maxW) {
  const space = ctx.measureText(' ').width;
  const rows = [];
  let hl = false;
  for (const para of text.split('\n')) {
    const words = [];
    let word = null, tok = null;
    for (const ch of para) {
      if (ch === '*') {
        hl = !hl;
        tok = null;
      } else if (/\s/.test(ch)) {
        word = tok = null;
      } else {
        if (!word) words.push((word = []));
        if (!tok) word.push((tok = { t: '', hl }));
        tok.t += ch;
      }
    }
    let row = { toks: [], w: 0 };
    for (const w of words) {
      let ww = 0;
      for (const t of w) ww += t.w = ctx.measureText(t.t).width;
      if (row.toks.length && row.w + space + ww > maxW) {
        rows.push(row);
        row = { toks: [], w: 0 };
      }
      w[0].gap = row.toks.length ? space : 0;
      row.w += w[0].gap + ww;
      row.toks.push(...w);
    }
    rows.push(row);
  }
  return rows;
}

function paintRow(row, x, y, o) {
  for (const t of row.toks) {
    x += t.gap || 0;
    ctx.fillStyle = t.hl ? o.accent : o.color;
    ctx.fillText(t.t, x, y);
    x += t.w;
  }
}

function fillBox(o, x, y, w, h, r) {
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * o.bgAlpha;
  ctx.fillStyle = o.bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.globalAlpha = a;
}

function readable(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#111111' : '#ffffff';
}

const alignX = (o, bx, bw, w) => (o.align === 'left' ? bx : o.align === 'center' ? bx + (bw - w) / 2 : bx + bw - w);
const capHeight = () => ctx.measureText('H').actualBoundingBoxAscent;

// Each layout returns the box it occupies (x, y, w, h), the tight extent of what
// is drawn (ix, iw), and a paint(p) function where p is wipe progress 0..1.
const LAYOUTS = {
  // One box per line of text, hugging the words.
  lines(o, text, bx, by, bw, u) {
    const fs = o.size * u;
    const padX = fs * 0.28;
    const lh = fs * 1.24;
    setFont(o, fs);
    const cap = capHeight();
    const trail = (o.track || 0) * fs;
    const rows = wrapRich(text, bw - 2 * padX).map((row, i) => {
      const w = row.w - trail + 2 * padX;
      return { row, w, x: alignX(o, bx, bw, w), y: by + i * lh };
    });
    const live = rows.filter((r) => r.row.toks.length);
    const ix = Math.min(bx + bw, ...live.map((r) => r.x));
    const iw = Math.max(0, Math.max(ix, ...live.map((r) => r.x + r.w)) - ix);
    // Solid square boxes overlap by a pixel so no seam shows between lines.
    const overlap = o.bgAlpha === 1 && !o.radius ? 1 : 0;
    return {
      x: bx, y: by, w: bw, h: rows.length * lh, ix, iw, staggered: true,
      paint(p) {
        setFont(o, fs);
        live.forEach((r, i) => {
          const rp = clamp(p * (1 + 0.3 * (live.length - 1)) - 0.3 * i);
          if (rp <= 0) return;
          ctx.save();
          ctx.beginPath();
          ctx.rect(r.x, r.y, r.w * rp, lh + 1);
          ctx.clip();
          fillBox(o, r.x, r.y, r.w, lh + overlap, (o.radius * lh) / 2);
          paintRow(r.row, r.x + padX, r.y + (lh + cap) / 2, o);
          ctx.restore();
        });
      },
    };
  },

  // Name on one box, title on an accent strip underneath.
  lower(o, text, bx, by, bw, u) {
    text = text.replace(/\*/g, '');
    const sub = o.upper ? o.sub.toUpperCase() : o.sub;
    const measure = (fs) => {
      const padX = fs * 0.34, bar = fs * 0.16, subFs = fs * 0.54;
      setFont(o, fs);
      const w1 = ctx.measureText(text).width + 2 * padX;
      const cap1 = capHeight();
      setFont(o, subFs);
      const w2 = sub ? ctx.measureText(sub).width + 2 * padX : 0;
      const cap2 = capHeight();
      return { fs, padX, bar, subFs, w1, w2, cap1, cap2, w: Math.max(w1, w2) + bar };
    };
    let m = measure(o.size * u);
    if (m.w > bw) m = measure((o.size * u * bw) / m.w);
    const h1 = m.fs * 1.36, h2 = sub ? m.subFs * 1.9 : 0;
    const x = alignX(o, bx, bw, m.w);
    const flip = o.align === 'right';
    return {
      x: bx, y: by, w: bw, h: h1 + h2, ix: x, iw: m.w,
      paint() {
        const left = (w) => (flip ? x + m.w - m.bar - w : x + m.bar);
        ctx.fillStyle = o.accent;
        ctx.fillRect(flip ? x + m.w - m.bar : x, by, m.bar, h1 + h2);
        fillBox(o, left(m.w1), by, m.w1, h1, 0);
        setFont(o, m.fs);
        ctx.fillStyle = o.color;
        ctx.fillText(text, left(m.w1) + m.padX, by + (h1 + m.cap1) / 2);
        if (!sub) return;
        ctx.fillStyle = o.accent;
        ctx.fillRect(left(m.w2), by + h1 - 1, m.w2, h2 + 1);
        setFont(o, m.subFs);
        ctx.fillStyle = readable(o.accent);
        ctx.fillText(sub, left(m.w2) + m.padX, by + h1 + (h2 + m.cap2) / 2);
      },
    };
  },

  // A full-width panel with an accent rule, the quote, and who said it.
  quote(o, text, bx, by, bw, u) {
    const fs = o.size * u;
    const pad = fs * 0.62, bar = fs * 0.16, lh = fs * 1.26, subFs = fs * 0.5;
    const inner = bw - bar - 2 * pad;
    setFont(o, fs);
    const rows = wrapRich(`“${text.replace(/^["“]|["”]$/g, '')}”`, inner);
    const subH = o.sub ? subFs * 2.2 : 0;
    const h = pad * 0.8 + rows.length * lh + subH + pad * 0.8;
    const r = o.radius * fs * 0.6;
    return {
      x: bx, y: by, w: bw, h, ix: bx, iw: bw,
      paint() {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, h, r);
        ctx.clip();
        fillBox(o, bx, by, bw, h, 0);
        ctx.fillStyle = o.accent;
        ctx.fillRect(bx, by, bar, h);
        ctx.restore();
        setFont(o, fs);
        const tx = bx + bar + pad;
        rows.forEach((row, i) => paintRow(row, alignX(o, tx, inner, row.w), by + pad * 0.8 + i * lh + fs * 0.92, o));
        if (!o.sub) return;
        setFont({ font: state.brand.body }, subFs);
        ctx.fillStyle = o.accent;
        const who = `— ${o.sub}`;
        ctx.fillText(who, alignX(o, tx, inner, ctx.measureText(who).width), by + h - pad * 0.8 - subFs * 0.3);
      },
    };
  },

  // Text straight on the video, with a soft shadow so it stays readable.
  text(o, text, bx, by, bw, u) {
    const fs = o.size * u;
    const lh = fs * 1.25;
    setFont(o, fs);
    const rows = wrapRich(text, bw).map((row, i) => ({ row, w: row.w, x: alignX(o, bx, bw, row.w), y: by + i * lh }));
    const ix = Math.min(bx + bw, ...rows.filter((r) => r.w).map((r) => r.x));
    const iw = Math.max(0, Math.max(ix, ...rows.map((r) => r.x + r.w)) - ix);
    return {
      x: bx, y: by, w: bw, h: rows.length * lh, ix, iw,
      paint() {
        setFont(o, fs);
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = fs * 0.28;
        ctx.shadowOffsetY = fs * 0.04;
        for (const r of rows) paintRow(r.row, r.x, r.y + fs * 0.95, o);
      },
    };
  },

  // A picture or logo.
  image(o, text, bx, by, bw) {
    const img = getImage(o.asset);
    const h = img ? (bw * img.naturalHeight) / img.naturalWidth : bw * 0.5;
    return {
      x: bx, y: by, w: bw, h, ix: bx, iw: bw,
      paint() {
        if (!img) return;
        ctx.globalAlpha *= o.alpha;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, h, (o.radius * Math.min(bw, h)) / 2);
        ctx.clip();
        ctx.drawImage(img, bx, by, bw, h);
      },
    };
  },
};

// Entrance and exit effects; p runs 0 (hidden) to 1 (fully shown).
function applyEffect(type, p, L, u) {
  if (p >= 1) return;
  if (type === 'fade' || type === 'rise') ctx.globalAlpha *= p;
  if (type === 'rise') ctx.translate(0, (1 - p) * 44 * u);
  if (type === 'slide') ctx.translate(-(1 - p) * (L.ix + L.iw + 4), 0);
  if (type === 'wipe' && !L.staggered) {
    ctx.beginPath();
    ctx.rect(L.ix, L.y, L.iw * p, L.h);
    ctx.clip();
  }
}

function drawCover(c, sw, sh, draw) {
  const W = canvas.width, H = canvas.height;
  const k = (state.fit === 'cover' ? Math.max : Math.min)(W / sw, H / sh);
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  draw((W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k);
}

// The preview keeps the last good video frame so seeking never flashes or smears.
function refreshBackground() {
  const s = segs[playing ? active : segIndexAt(T)];
  if (s) {
    const el = s.m.el;
    if (el.readyState >= 2 && el.videoWidth) drawCover(bgCtx, el.videoWidth, el.videoHeight, (x, y, w, h) => bgCtx.drawImage(el, x, y, w, h));
  } else {
    const g = bgCtx.createLinearGradient(0, 0, bgCanvas.width, bgCanvas.height);
    g.addColorStop(0, '#8693a0');
    g.addColorStop(1, '#3d4852');
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  }
}

function drawFrame(t, animate, paintBackground) {
  const W = canvas.width, H = canvas.height;
  const u = Math.min(W, H) / 1080;
  paintBackground();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  for (const o of state.overlays) {
    o._box = null;
    const end = endOf(o);
    if (t < o.start || t > end) continue;
    const text = o.cues ? cueAt(o, t)?.text || '' : o.text;
    const L = LAYOUTS[o.kind](o, o.upper ? text.toUpperCase() : text, o.x * W, o.y * H, o.width * W, u);
    o._box = L;
    let pin = 1, pout = 1;
    if (animate) {
      if (o.anim !== 'none') pin = 1 - (1 - clamp((t - o.start) / o.speed)) ** 3;
      if (o.out !== 'none' && end < duration - 0.05) pout = 1 - (1 - clamp((end - t) / (o.speed * 0.6))) ** 3;
    }
    ctx.save();
    applyEffect(o.anim, pin, L, u);
    applyEffect(o.out, pout, L, u);
    L.paint(Math.min(o.anim === 'wipe' ? pin : 1, o.out === 'wipe' ? pout : 1));
    ctx.restore();
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

/* ---------- stage sizing and direct manipulation ---------- */

const wrap = $('#wrap');
const sel = $('#sel');
const guide = $('#guide');

function fitStage() {
  const area = $('#stageArea');
  const pad = area.clientWidth < 700 ? 16 : 40;
  const rails = [...area.querySelectorAll('.rail')].reduce((w, r) => w + r.offsetWidth, 0);
  const k = Math.min((area.clientWidth - rails - pad) / canvas.width, (area.clientHeight - pad) / canvas.height);
  wrap.style.width = `${Math.max(80, canvas.width * k)}px`;
  wrap.style.height = `${Math.max(80, canvas.height * k)}px`;
}

function setFormat(f) {
  state.format = FORMATS[f] ? f : '9:16';
  const [w, h] = FORMATS[state.format];
  if (bgCanvas.width !== w || bgCanvas.height !== h) {
    canvas.width = bgCanvas.width = w;
    canvas.height = bgCanvas.height = h;
  }
  fitStage();
}

function updateSel() {
  const o = selected();
  const b = o && o._box;
  sel.hidden = !b || exporting;
  if (sel.hidden) return;
  const k = wrap.clientWidth / canvas.width;
  sel.style.left = `${b.x * k - 4}px`;
  sel.style.top = `${b.y * k - 4}px`;
  sel.style.width = `${b.w * k + 8}px`;
  sel.style.height = `${b.h * k + 8}px`;
}

function hitTest(e) {
  const r = canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * canvas.width, py = ((e.clientY - r.top) / r.height) * canvas.height;
  for (let i = state.overlays.length - 1; i >= 0; i--) {
    const o = state.overlays[i], b = o._box;
    if (!b) continue;
    const [x, w] = o.id === selectedId ? [b.x, b.w] : [b.ix, b.iw];
    if (px >= x && px <= x + w && py >= b.y && py <= b.y + b.h) return o;
  }
  return null;
}

// Follow a press-and-drag anywhere on the page, reporting how far the pointer has moved.
function dragging(e, onMove, onEnd) {
  e.preventDefault();
  const move = (ev) => onMove(ev.clientX - e.clientX, ev.clientY - e.clientY);
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    if (onEnd) onEnd();
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}

wrap.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.empty') || exporting) return;
  const resize = e.target.classList.contains('grip');
  const o = resize ? selected() : hitTest(e);
  if (!resize) select(o ? o.id : null);
  if (!o) return;
  const k = canvas.getBoundingClientRect().width;
  const kh = canvas.getBoundingClientRect().height;
  const { x: ox, y: oy, width: ow } = o;
  dragging(e, (dx, dy) => {
    if (resize) {
      o.width = clamp(ow + dx / k, 0.05, 1);
      fillInspector();
    } else {
      o.x = clamp(ox + dx / k, -0.5, 1);
      o.y = clamp(oy + dy / kh, -0.1, 0.98);
      const snap = Math.abs(o.x + o.width / 2 - 0.5) < 0.012;
      if (snap) o.x = 0.5 - o.width / 2;
      guide.hidden = !snap;
    }
  }, () => {
    guide.hidden = true;
    save();
  });
});

/* ---------- inspector ---------- */

const props = $('#props');
const clipProps = $('#clipProps');

function select(id) {
  selectedId = id;
  selectedClipId = null;
  if (id) showAddSheet(false);
  const o = selected();
  // Jump to a moment when the graphic is on screen so it can be seen and edited.
  if (o && (T < o.start || T > endOf(o))) setTime(o.start);
  fillInspector();
  markSelection();
}

function selectClip(id) {
  selectedClipId = id;
  selectedId = null;
  fillInspector();
  markSelection();
}

function fillInspector() {
  const o = selected(), c = selectedClip();
  props.hidden = !o;
  clipProps.hidden = !c;
  $('#noSel').hidden = !!(o || c);
  if (c) {
    $('#clipTitle').textContent = c.name;
    clipProps.querySelectorAll('[data-c]').forEach((el) => {
      if (el.type === 'checkbox') el.checked = c[el.dataset.c];
      else if (el !== document.activeElement) el.value = +c[el.dataset.c].toFixed(2);
    });
    const i = state.clips.indexOf(c);
    $('#earlier').disabled = i === 0;
    $('#later').disabled = i === state.clips.length - 1;
  }
  syncRails();
  if (!o) return;
  $('#propTitle').textContent = PRESETS[o.type].name;
  $('#subLabel').textContent = o.kind === 'quote' ? 'Who said it' : 'Title or role';
  $('#accentLabel').textContent = o.kind === 'lower' ? 'Accent' : 'Highlight';
  const subs = o.type === 'subtitles';
  props.querySelectorAll('[data-for]').forEach((el) => (el.hidden = !el.dataset.for.split(' ').includes(o.kind)));
  props.querySelectorAll('[data-subs]').forEach((el) => (el.hidden = (el.dataset.subs === 'only') !== subs));
  const cue = subs ? cueAt(o, T) : null;
  $('#textLabel').textContent = subs ? 'Subtitle at the playhead' : 'Text';
  props.querySelector('[data-k="text"]').disabled = subs && !cue;
  props.querySelectorAll('[data-k]').forEach((el) => {
    if (el === document.activeElement && el.type !== 'range') return;
    const k = el.dataset.k, v = k === 'end' ? endOf(o) : subs && k === 'text' ? (cue ? cue.text : '') : o[k];
    if (v == null) return; // a setting this kind of graphic does not have
    if (el.type === 'checkbox') el.checked = v;
    else if (el.dataset.scale) el.value = Math.round(v * el.dataset.scale);
    else el.value = el.type === 'number' ? +v.toFixed(2) : v;
  });
  $('#align').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === o.align));
}

props.addEventListener('input', (e) => {
  const el = e.target, k = el.dataset.k, o = selected();
  if (!k || !o) return;
  if (el.type === 'checkbox') o[k] = el.checked;
  else if (el.type === 'range' || 'num' in el.dataset) o[k] = parseFloat(el.value);
  else if (el.type === 'number') {
    const v = parseFloat(el.value);
    if (Number.isNaN(v)) return;
    if (el.dataset.scale) {
      // Wait for a value in range, so typing "4" on the way to "48" doesn't shrink the graphic.
      if (v < +el.min || v > +el.max) return;
      o[k] = v / el.dataset.scale;
    } else if (k === 'size') {
      if (v < +el.min || v > +el.max) return;
      o.size = v;
    } else if (k === 'start') o.start = clamp(v, 0, endOf(o) - 0.1);
    else if (k === 'end') setEnd(o, v);
    else o[k] = v;
  } else if (o.cues && k === 'text') {
    const cue = cueAt(o, T);
    if (cue) cue.text = el.value;
  } else o[k] = el.value;
  if (['text', 'start', 'end', 'offset'].includes(k)) renderTimeline();
  if (k === 'kind') fillInspector();
  save();
});

// Out-of-range numbers are pulled into range once the field is left.
props.addEventListener('change', (e) => {
  const el = e.target;
  if (el.type !== 'number' || !el.min || !el.max || !el.value) return;
  const v = clamp(parseFloat(el.value), +el.min, +el.max);
  if (v !== parseFloat(el.value)) {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
// The − and + buttons beside number fields.
props.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-step]');
  if (!btn) return;
  const input = btn.parentElement.querySelector('input');
  input.value = clamp((parseFloat(input.value) || 0) + +btn.dataset.step, +input.min, +input.max);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
// Timing is mostly done with the timeline handles on a phone, so it starts folded away there.
$('#timing').open = !matchMedia('(max-width: 900px)').matches;

$('#align').addEventListener('click', (e) => {
  const o = selected();
  if (!o || !e.target.dataset.v) return;
  o.align = e.target.dataset.v;
  fillInspector();
  save();
});

$('#whole').onclick = () => {
  const o = selected();
  o.start = 0;
  o.toEnd = true;
  fillInspector();
  renderTimeline();
  save();
};
$('#dup').onclick = () => {
  const o = selected();
  const copy = { ...o, _box: null, id: uid(), y: Math.min(o.y + 0.05, 0.95) };
  state.overlays.push(copy);
  renderTimeline();
  select(copy.id);
  save();
};
$('#front').onclick = () => {
  const o = selected();
  state.overlays = state.overlays.filter((x) => x !== o).concat(o);
  renderTimeline();
  save();
};
function removeSelected() {
  if (selectedClipId) {
    state.clips = state.clips.filter((c) => c.id !== selectedClipId);
    pause();
    recalc();
  } else state.overlays = state.overlays.filter((o) => o.id !== selectedId);
  select(null);
  renderTimeline();
  save();
}
$('#del').onclick = $('#delClip').onclick = removeSelected;

function addOverlay(o) {
  o.start = T >= duration - 0.5 ? 0 : T;
  setEnd(o, o.start + 5);
  state.overlays.push(o);
  renderTimeline();
  select(o.id);
  save();
}
document.querySelectorAll('[data-add]').forEach((btn) => (btn.onclick = () => addOverlay(makeOverlay(btn.dataset.add))));

$('#addImage').onclick = () => {
  $('#imgFile').dataset.replace = '';
  $('#imgFile').click();
};
$('#replaceImage').onclick = () => {
  $('#imgFile').dataset.replace = selectedId;
  $('#imgFile').click();
};
async function addImageFile(file, replaceId) {
  let asset;
  try {
    asset = await addImageAsset(file);
  } catch {
    return toast(`${file.name} could not be read as an image.`);
  }
  const target = state.overlays.find((o) => o.id === +replaceId);
  if (target) {
    target.asset = asset;
    save();
  } else addOverlay(makeOverlay('image', { asset }));
}
$('#addLogo').onclick = () => {
  if (!state.brand.logo) {
    $('#brand').showModal();
    return toast('Choose your logo in the brand kit first.');
  }
  const o = makeOverlay('logo', { asset: state.brand.logo });
  state.overlays.push(o);
  renderTimeline();
  select(o.id);
  save();
};

/* clip controls */

clipProps.addEventListener('input', (e) => {
  const el = e.target, k = el.dataset.c, c = selectedClip();
  if (!k || !c) return;
  if (k === 'muted') c.muted = el.checked;
  else {
    const v = parseFloat(el.value);
    if (Number.isNaN(v)) return;
    if (k === 'in') c.in = clamp(v, 0, c.out - 0.1);
    else c.out = clamp(v, c.in + 0.1, media.get(c.name).duration);
    pause();
    recalc();
    const s = segs.find((s) => s.c === c);
    setTime(k === 'in' ? s.start : s.start + s.len - 0.04);
    renderTimeline();
  }
  save();
});
$('#split').onclick = () => {
  const s = segs[segIndexAt(T)];
  if (!s || T - s.start < 0.1 || s.start + s.len - T < 0.1) return toast('Move the playhead to where you want to cut, then split.');
  const cut = s.c.in + (T - s.start);
  const second = { ...s.c, id: uid(), in: cut };
  s.c.out = cut;
  state.clips.splice(state.clips.indexOf(s.c) + 1, 0, second);
  pause();
  recalc();
  renderTimeline();
  selectClip(second.id);
  save();
};
function moveClip(dir) {
  const c = selectedClip(), i = state.clips.indexOf(c);
  if (!state.clips[i + dir]) return;
  state.clips.splice(i, 1);
  state.clips.splice(i + dir, 0, c);
  pause();
  recalc();
  renderTimeline();
  fillInspector();
  save();
}
$('#earlier').onclick = () => moveClip(-1);
$('#later').onclick = () => moveClip(1);

/* ---------- brand kit, styles, layouts ---------- */

function brandLooks() {
  const b = state.brand;
  return [
    { color: b.light, bg: b.dark, accent: b.accent },
    { color: b.dark, bg: b.light, accent: b.main },
    { color: readable(b.main), bg: b.main, accent: b.accent },
    { color: readable(b.accent), bg: b.accent, accent: b.main },
  ];
}

function renderLooks() {
  $('#looks').replaceChildren(...brandLooks().map((look) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Aa';
    b.title = 'Use these colors';
    b.style.background = look.bg;
    b.style.color = look.color;
    b.onclick = () => {
      Object.assign(selected(), look);
      fillInspector();
      save();
    };
    return b;
  }));
}

function renderFontOptions() {
  const html = allFonts().map((f) => `<option>${f.name}</option>`).join('');
  document.querySelectorAll('[data-k="font"], [data-b="head"], [data-b="body"]').forEach((el) => (el.innerHTML = html));
}

function libRow(label, actions) {
  const row = document.createElement('div');
  row.className = 'lib-row';
  row.append(label, ...actions.map(([text, title, fn]) => {
    const b = document.createElement('button');
    b.type = 'button';
    if (text === '×') {
      b.innerHTML = icon('x');
      b.className = 'icon';
      b.setAttribute('aria-label', title);
    } else b.textContent = text;
    b.title = title;
    b.onclick = fn;
    return b;
  }));
  return row;
}

function nameInput(item) {
  const input = document.createElement('input');
  input.value = item.name;
  input.setAttribute('aria-label', 'Name');
  input.oninput = () => {
    item.name = input.value;
    save();
  };
  return input;
}

function renderLibrary() {
  const empty = (text) => Object.assign(document.createElement('p'), { textContent: text });
  const removeFrom = (key, item) => () => {
    state[key] = state[key].filter((x) => x !== item);
    renderLibrary();
    save();
  };
  $('#styles').replaceChildren(...(state.styles.length ? state.styles.map((s) => libRow(nameInput(s), [
    ['Add', 'Add a graphic in this style', () => addOverlay({ ...BASE, ...s.o, id: uid() })],
    ['×', 'Remove this style', removeFrom('styles', s)],
  ])) : [empty('Select a graphic and choose “Save as a style” to reuse its look.')]));
  $('#layouts').replaceChildren(...state.layouts.map((l) => libRow(nameInput(l), [
    ['Use', 'Replace the graphics with this layout', () => {
      state.overlays = l.overlays.map((o) => ({ ...BASE, ...o, id: uid() }));
      select(null);
      renderTimeline();
      save();
      toast('Layout applied. Use Undo to go back.');
    }],
    ['×', 'Remove this layout', removeFrom('layouts', l)],
  ])));
}

const cleanCopy = (o) => JSON.parse(JSON.stringify(o, strip));
$('#saveStyle').onclick = () => {
  const o = selected();
  state.styles.push({ id: uid(), name: `${PRESETS[o.type].name} ${state.styles.length + 1}`, o: cleanCopy(o) });
  renderLibrary();
  save();
  toast('Style saved. Find it under “Saved styles” on the left.');
};
$('#saveLayout').onclick = () => {
  if (!state.overlays.length) return toast('Add some graphics first, then save them as a layout.');
  state.layouts.push({ id: uid(), name: `Layout ${state.layouts.length + 1}`, overlays: state.overlays.map(cleanCopy) });
  renderLibrary();
  save();
};

function renderBrand() {
  const b = state.brand;
  document.querySelectorAll('[data-b]').forEach((el) => (el.value = b[el.dataset.b]));
  $('#logoPreview').hidden = $('#removeLogo').hidden = !b.logo;
  if (b.logo) $('#logoPreview').src = state.assets[b.logo] || '';
  $('#fontList').replaceChildren(...state.fonts.map((f) => libRow(Object.assign(document.createElement('span'), { textContent: `${f.name}${f.source === 'google' ? ', Google' : f.source === 'adobe' ? ', Adobe' : ''}` }), [
    ['×', 'Remove this font', () => {
      state.fonts = state.fonts.filter((x) => x !== f);
      renderFontOptions();
      renderBrand();
      fillInspector();
      save();
    }],
  ])));
}

$('#brand').addEventListener('input', (e) => {
  const k = e.target.dataset.b;
  if (!k) return;
  const old = state.brand[k], val = e.target.value;
  state.brand[k] = val;
  // Graphics that were using the old brand value follow the change.
  for (const o of state.overlays) {
    for (const f of k === 'head' || k === 'body' ? ['font'] : ['color', 'bg', 'accent']) if (o[f] === old) o[f] = val;
  }
  renderLooks();
  fillInspector();
  save();
});
$('#brandBtn').onclick = () => $('#brand').showModal();
$('#brandDone').onclick = () => $('#brand').close();
$('#addFont').onclick = () => $('#fontFile').click();
$('#googleForm').onsubmit = (e) => {
  e.preventDefault();
  addGoogleFont($('#googleName').value).then(() => ($('#googleName').value = ''));
};
$('#adobeForm').onsubmit = (e) => {
  e.preventDefault();
  addAdobeKit($('#adobeId').value).then(() => ($('#adobeId').value = ''));
};
$('#chooseLogo').onclick = () => $('#logoFile').click();
$('#removeLogo').onclick = () => {
  state.brand.logo = null;
  renderBrand();
  save();
};

/* ---------- timeline ---------- */

const rowsEl = $('#rows');
const TYPE_ICONS = { headline: 'headline', label: 'label', lower: 'lower', quote: 'quote', credit: 'credit', text: 'text', image: 'image', logo: 'logo', subtitles: 'subs' };
const ruler = $('#ruler');
const pct = (t) => `${(t / duration) * 100}%`;

function markSelection() {
  rowsEl.querySelectorAll('.row[data-id]').forEach((el) => el.classList.toggle('on', +el.dataset.id === selectedId));
  rowsEl.querySelectorAll('.vclip').forEach((el) => el.classList.toggle('on', +el.dataset.id === selectedClipId));
}

function renderTimeline() {
  const step = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((s) => duration / s <= 12) || 600;
  ruler.innerHTML = '';
  for (let t = 0; t < duration; t += step) {
    const tick = document.createElement('i');
    tick.style.left = pct(t);
    tick.textContent = step < 1 ? fmt(t) : fmt(t).slice(0, -2);
    ruler.append(tick);
  }
  rowsEl.innerHTML = '';

  if (hasVideo) {
    const row = document.createElement('div');
    row.className = 'row video';
    const lane = document.createElement('div');
    lane.className = 'lane';
    for (const s of segs) {
      const el = document.createElement('div');
      el.className = 'vclip';
      el.dataset.id = s.c.id;
      el.style.left = pct(s.start);
      el.style.width = pct(s.len);
      el.textContent = s.c.name;
      el.title = 'Drag either end to trim';
      el.onpointerdown = (e) => startTrim(e, s, el, lane);
      lane.append(el);
    }
    const label = Object.assign(document.createElement('span'), { textContent: 'Video' });
    label.prepend(iconEl('video'));
    row.append(label, lane);
    rowsEl.append(row);
  }

  if (!state.overlays.length) {
    rowsEl.insertAdjacentHTML('beforeend', '<p class="no-rows">No graphics yet. Add one from the panel on the left.</p>');
  }
  // Topmost graphic first, like layers.
  for (const o of [...state.overlays].reverse()) {
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.id = o.id;
    const name = document.createElement('span');
    name.textContent = o.text.split('\n')[0].replace(/\*/g, '') || PRESETS[o.type].name;
    if (o.cues) name.textContent += ` (${o.cues.length})`;
    name.prepend(iconEl(TYPE_ICONS[o.type]));
    name.onclick = () => select(o.id);
    const lane = document.createElement('div');
    lane.className = 'lane';
    if (o.cues) {
      // Subtitles show every line as its own block; click one to jump to it.
      for (const c of o.cues) {
        if (c.start + o.offset >= duration) break;
        const cue = document.createElement('div');
        cue.className = 'cue';
        cue.style.left = pct(c.start + o.offset);
        cue.style.width = pct(c.end - c.start);
        cue.title = c.text;
        cue.onpointerdown = () => {
          select(o.id);
          setTime(c.start + o.offset + 0.01);
          fillInspector();
        };
        lane.append(cue);
      }
    } else {
      const clip = document.createElement('div');
      clip.className = 'clip';
      clip.style.left = pct(o.start);
      clip.style.width = pct(endOf(o) - o.start);
      clip.onpointerdown = (e) => startBarDrag(e, o, clip, lane);
      lane.append(clip);
    }
    row.append(name, lane);
    rowsEl.append(row);
  }
  markSelection();
}

function startBarDrag(e, o, clip, lane) {
  select(o.id);
  const px = e.clientX - clip.getBoundingClientRect().left;
  const grip = Math.min(GRIP, clip.offsetWidth / 3);
  const edge = px < grip ? 'start' : px > clip.offsetWidth - grip ? 'end' : 'move';
  const s0 = o.start, e0 = endOf(o), len = e0 - s0, w = lane.clientWidth;
  dragging(e, (dx) => {
    const dt = (dx / w) * duration;
    if (edge === 'start') o.start = clamp(s0 + dt, 0, e0 - 0.2);
    else if (edge === 'end') setEnd(o, Math.max(e0 + dt, s0 + 0.2));
    else {
      o.start = clamp(s0 + dt, 0, duration - len);
      setEnd(o, o.start + len);
    }
    renderTimeline();
    fillInspector();
  }, save);
}

// Dragging either end of a clip trims it; everything after shuffles along.
function startTrim(e, s, el, lane) {
  const c = s.c;
  selectClip(c.id);
  const px = e.clientX - el.getBoundingClientRect().left;
  const grip = Math.min(GRIP, el.offsetWidth / 3);
  const edge = px < grip ? 'in' : px > el.offsetWidth - grip ? 'out' : null;
  if (!edge) return;
  pause();
  const in0 = c.in, out0 = c.out;
  const pxPerSec = lane.clientWidth / duration;
  dragging(e, (dx) => {
    const dt = dx / pxPerSec;
    if (edge === 'in') c.in = clamp(in0 + dt, 0, c.out - 0.1);
    else c.out = clamp(out0 + dt, c.in + 0.1, s.m.duration);
    recalc();
    const now = segs.find((x) => x.c === c);
    setTime(edge === 'in' ? now.start : now.start + now.len - 0.04);
    renderTimeline();
    fillInspector();
  }, save);
}

ruler.addEventListener('pointerdown', (e) => {
  if (exporting) return;
  const r = ruler.getBoundingClientRect();
  const x0 = e.clientX - r.left;
  setTime((x0 / r.width) * duration);
  dragging(e, (dx) => setTime(((x0 + dx) / r.width) * duration));
});

$('#play').onclick = togglePlay;
$('#mute').onclick = () => {
  muted = !muted;
  for (const m of media.values()) m.el.muted = muted;
  showMute();
};
function showMute() {
  $('#mute').innerHTML = icon(muted ? 'muted' : 'sound');
  $('#mute').title = muted ? 'Unmute' : 'Mute';
  $('#mute').setAttribute('aria-label', $('#mute').title);
  $('#mute').classList.toggle('active', muted);
}
showMute();

/* ---------- opening files ---------- */

async function handleFiles(files, replaceId) {
  let videos = 0;
  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (file.type.startsWith('video/') || ['mp4', 'mov', 'm4v', 'webm', 'mkv'].includes(ext)) {
      await addVideoFile(file);
      videos++;
    } else if (file.type.startsWith('image/')) await addImageFile(file, replaceId);
    else if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) await addFontFile(file);
    else if (ext === 'srt' || ext === 'vtt') await addSubtitleFile(file);
    else if (ext === 'json') await openProject(file);
    else toast(`${file.name} is not a video, image, subtitle, font or project file.`);
  }
  if (videos) {
    recalc();
    renderTimeline();
    fillInspector();
    save();
  }
}

$('#open').onclick = $('#open2').onclick = () => $('#file').click();
$('#addSubs').onclick = () => $('#srtFile').click();
for (const id of ['file', 'imgFile', 'fontFile', 'projFile', 'srtFile']) {
  $(`#${id}`).onchange = (e) => {
    handleFiles([...e.target.files], e.target.dataset.replace);
    e.target.value = '';
  };
}
$('#logoFile').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    state.brand.logo = await addImageAsset(file);
  } catch {
    return toast(`${file.name} could not be read as an image.`);
  }
  renderBrand();
  save();
};
addEventListener('dragover', (e) => {
  e.preventDefault();
  document.body.classList.add('dropping');
});
addEventListener('dragleave', () => document.body.classList.remove('dropping'));
addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dropping');
  handleFiles([...e.dataTransfer.files]);
});

/* ---------- export ---------- */

let cancelled = false;
let stopRealtime = null;
let exportProgress = 0;
const breathe = () => new Promise((r) => setTimeout(r));

// Decode every frame, draw the graphics on it, and encode straight to an MP4.
// Faster than playback on most computers, and never drops or doubles a frame.
async function exportFast() {
  const W = canvas.width, H = canvas.height;
  const format = new MB.Mp4OutputFormat();
  const videoCodec = await MB.getFirstEncodableVideoCodec(format.getSupportedVideoCodecs(), { width: W, height: H });
  if (!videoCodec) throw new Error('No video encoder available');

  const inputs = new Map();
  try {
    for (const s of segs) {
      if (inputs.has(s.m.name)) continue;
      const input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(s.m.file) });
      inputs.set(s.m.name, { input });
      const video = await input.getPrimaryVideoTrack();
      if (!video || !(await video.canDecode())) throw new Error(`Cannot decode ${s.m.name}`);
      const audio = await input.getPrimaryAudioTrack();
      Object.assign(inputs.get(s.m.name), { video, audio: audio && (await audio.canDecode()) ? audio : null });
    }
    const stats = await inputs.get(segs[0].m.name).video.computePacketStats(120);
    const fps = clamp(Math.round(stats.averagePacketRate) || 30, 24, 60);

    const output = new MB.Output({ format, target: new MB.BufferTarget() });
    const videoOut = new MB.CanvasSource(canvas, { codec: videoCodec, bitrate: MB.QUALITY_HIGH, keyFrameInterval: 2 });
    output.addVideoTrack(videoOut, { frameRate: fps });
    let audioOut = null;
    if (segs.some((s) => inputs.get(s.m.name).audio && !s.c.muted)) {
      const audioCodec = await MB.getFirstEncodableAudioCodec(format.getSupportedAudioCodecs());
      if (audioCodec) {
        audioOut = new MB.AudioBufferSource({ codec: audioCodec, bitrate: MB.QUALITY_HIGH });
        output.addAudioTrack(audioOut);
      }
    }
    await output.start();

    if (audioOut) {
      // Lay each clip's sound onto one soundtrack at the right moment.
      const rate = 48000;
      const mix = new OfflineAudioContext(2, Math.ceil(duration * rate), rate);
      for (const s of segs) {
        const track = inputs.get(s.m.name).audio;
        if (!track || s.c.muted) continue;
        const parts = [];
        for await (const part of new MB.AudioBufferSink(track).buffers(s.c.in, s.c.out)) {
          if (cancelled) break;
          parts.push(part);
        }
        if (!parts.length) continue;
        const first = parts[0].buffer;
        const whole = new AudioBuffer({ length: parts.reduce((n, p) => n + p.buffer.length, 0), numberOfChannels: first.numberOfChannels, sampleRate: first.sampleRate });
        let at = 0;
        for (const { buffer } of parts) {
          for (let ch = 0; ch < whole.numberOfChannels; ch++) whole.copyToChannel(buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1)), ch, at);
          at += buffer.length;
        }
        const node = mix.createBufferSource();
        node.buffer = whole;
        node.connect(mix.destination);
        const skip = Math.max(0, s.c.in - parts[0].timestamp);
        node.start(s.start + Math.max(0, parts[0].timestamp - s.c.in), skip, s.len);
      }
      if (!cancelled) await audioOut.add(await mix.startRendering());
    }

    const total = Math.max(1, Math.round(duration * fps));
    for (const s of segs) {
      if (cancelled) break;
      const first = Math.ceil(s.start * fps - 1e-6), last = Math.ceil((s.start + s.len) * fps - 1e-6);
      const times = [];
      for (let n = first; n < last; n++) times.push(s.c.in + (n / fps - s.start));
      let n = first;
      for await (const sample of new MB.VideoSampleSink(inputs.get(s.m.name).video).samplesAtTimestamps(times)) {
        if (cancelled) {
          if (sample) sample.close();
          break;
        }
        T = n / fps;
        drawFrame(T, true, () => {
          if (sample) drawCover(ctx, sample.displayWidth, sample.displayHeight, (x, y, w, h) => sample.draw(ctx, x, y, w, h));
        });
        if (sample) sample.close();
        await videoOut.add(T, 1 / fps);
        exportProgress = ++n / total;
        if (n % 10 === 0) await breathe();
      }
    }
    if (cancelled) {
      await output.cancel();
      return null;
    }
    await output.finalize();
    return new Blob([output.target.buffer], { type: 'video/mp4' });
  } finally {
    for (const { input } of inputs.values()) input.dispose();
  }
}

// Fallback for browsers or files the fast path cannot handle: record the preview as it plays.
let audioCtx;
async function exportRealtime() {
  const mime = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
    .find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('This browser cannot record video. Open Chyron in Chrome and try again.');
  audioCtx ??= new AudioContext();
  await audioCtx.resume();
  const audioOut = audioCtx.createMediaStreamDestination();
  for (const m of media.values()) {
    if (!m.node) {
      m.node = audioCtx.createMediaElementSource(m.el);
      m.node.connect(audioCtx.destination);
    }
    m.node.connect(audioOut);
  }
  const stream = canvas.captureStream(30);
  audioOut.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6, audioBitsPerSecond: 192e3 });
  const chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => (recorder.onstop = r));

  const wasMuted = muted;
  muted = false;
  setTime(0);
  await new Promise((r) => setTimeout(r, 400));
  recorder.start(1000);
  const finished = new Promise((r) => (stopRealtime = r));
  play();
  await finished;
  pause();
  recorder.stop();
  await stopped;
  for (const m of media.values()) m.node.disconnect(audioOut);
  stream.getTracks().forEach((t) => t.stop());
  muted = wasMuted;
  for (const m of media.values()) m.el.muted = muted;
  stopRealtime = null;
  return new Blob(chunks, { type: mime.split(';')[0] });
}

async function exportVideo() {
  if (exporting) return;
  if (!hasVideo) return toast('Add a video first, then export.');
  pause();
  const resumeAt = T;
  cancelled = false;
  exporting = true;
  exportProgress = 0;
  $('#exporting').hidden = false;
  let blob = null, problem = null;
  try {
    if (MB && window.VideoEncoder) {
      exportMode = 'fast';
      $('#exportMsg').textContent = 'Every frame is being drawn and saved. You can leave this tab in the background, but it finishes fastest in front.';
      try {
        blob = await exportFast();
      } catch (err) {
        console.warn('Fast export failed, recording instead:', err);
      }
    }
    if (!blob && !cancelled) {
      exportMode = 'realtime';
      $('#exportMsg').textContent = 'This video has to be recorded while it plays through once at normal speed. Keep this tab open and in front until it finishes.';
      blob = await exportRealtime();
    }
  } catch (err) {
    problem = err;
  }
  exporting = false;
  exportMode = null;
  $('#exporting').hidden = true;
  setTime(resumeAt);
  if (problem) return toast(`Export stopped: ${problem.message}`);
  if (cancelled || !blob) return toast('Export cancelled.');
  const name = `${projectName()}-graphics.${blob.type === 'video/mp4' ? 'mp4' : 'webm'}`;
  deliver(blob, name, `Video exported as ${name}`);
}

// On a phone, offer the share sheet so the file can go straight to Photos or another app.
// Sharing needs a fresh tap, so it waits behind a button rather than running when export ends.
function deliver(blob, name, msg) {
  const file = new File([blob], name, { type: blob.type });
  if (!touch || !navigator.canShare || !navigator.canShare({ files: [file] })) {
    download(blob, name);
    return toast(msg);
  }
  const image = blob.type.startsWith('image/');
  $('#doneTitle').textContent = image ? 'Your image is ready' : 'Your video is ready';
  $('#doneMsg').textContent = `Choose Save ${image ? 'Image' : 'Video'} in the share sheet to put it in Photos, or send it straight to an app.`;
  $('#done').hidden = false;
  $('#shareFile').onclick = () => navigator.share({ files: [file] }).then(() => ($('#done').hidden = true), () => {});
  $('#downloadFile').onclick = () => {
    download(blob, name);
    $('#done').hidden = true;
  };
}
$('#closeDone').onclick = () => ($('#done').hidden = true);

$('#export').onclick = exportVideo;
$('#cancel').onclick = () => {
  cancelled = true;
  if (stopRealtime) stopRealtime();
};
$('#still').onclick = () => {
  drawFrame(T, false, () => ctx.drawImage(bgCanvas, 0, 0));
  canvas.toBlob((blob) => deliver(blob, `${projectName()}-frame.png`, 'Frame saved as an image.'), 'image/png');
};

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  ($('#brand').open ? $('#brand') : document.body).append(el); // stay visible above an open dialog
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 5000);
}

/* ---------- keyboard and top bar ---------- */

$('#undo').onclick = () => stepHistory(-1);
$('#redo').onclick = () => stepHistory(1);
$('#format').onchange = (e) => {
  setFormat(e.target.value);
  save();
};
$('#fit').onchange = (e) => {
  state.fit = e.target.value;
  save();
};
addEventListener('click', (e) => {
  const menu = $('#projectMenu');
  if (menu.open && (!menu.contains(e.target) || e.target.closest('.menu button'))) menu.open = false;
});

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select') || exporting || $('#brand').open) return;
  const o = selected();
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    stepHistory(e.shiftKey ? 1 : -1);
  } else if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if ((o || selectedClipId) && (e.key === 'Delete' || e.key === 'Backspace')) {
    removeSelected();
  } else if (o && mod && e.key === 'd') {
    e.preventDefault();
    $('#dup').click();
  } else if (o && e.key.startsWith('Arrow')) {
    e.preventDefault();
    const step = e.shiftKey ? 0.02 : 0.004;
    if (e.key === 'ArrowLeft') o.x -= step;
    if (e.key === 'ArrowRight') o.x += step;
    if (e.key === 'ArrowUp') o.y -= step;
    if (e.key === 'ArrowDown') o.y += step;
    save();
  }
});

/* ---------- main loop ---------- */

let lastTick = performance.now();
let shownCue = null;
let shownPlaying = null;
function tick(ts) {
  const dt = (ts - lastTick) / 1000;
  lastTick = ts;
  if (exportMode !== 'fast') {
    if (playing) advance(dt);
    if (exportMode === 'realtime') {
      exportProgress = T / duration;
      if (!playing && stopRealtime) stopRealtime();
    }
    refreshBackground();
    drawFrame(T, playing, () => ctx.drawImage(bgCanvas, 0, 0));
  }
  updateSel();
  // Keep the subtitle text box showing the line under the playhead.
  const subs = selected();
  const cue = subs && subs.cues ? cueAt(subs, T) : null;
  if (cue !== shownCue) {
    shownCue = cue;
    fillInspector();
  }
  $('#playhead').style.left = pct(T);
  $('#time').textContent = fmt(T);
  $('#total').textContent = fmt(duration);
  if (playing !== shownPlaying) {
    shownPlaying = playing;
    $('#play').innerHTML = icon(playing ? 'pause' : 'play');
    $('#play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  if (exporting) {
    $('#progress').style.width = `${exportProgress * 100}%`;
    $('#exportTime').textContent = `${Math.round(exportProgress * 100)}% done`;
  }
  requestAnimationFrame(tick);
}

/* ---------- phone layout ---------- */

const more = $('#more');
function toggleMore(open) {
  more.classList.toggle('open', open);
  $('#moreBtn').setAttribute('aria-expanded', open);
}
$('#moreBtn').onclick = (e) => {
  e.stopPropagation();
  toggleMore(!more.classList.contains('open'));
};
// Close the menu after picking something in it, or tapping anywhere else.
more.addEventListener('click', (e) => {
  if (e.target.closest('button:not(#install)')) toggleMore(false);
});
addEventListener('pointerdown', (e) => {
  if (!e.target.closest('#more, #moreBtn')) toggleMore(false);
});

// The side rails repeat buttons from the panels; each one presses the button it names.
document.querySelectorAll('[data-proxy]').forEach((b) => (b.onclick = () => $(`#${b.dataset.proxy}`).click()));
function syncRails() {
  $('#railNone').hidden = !!(selected() || selectedClip());
  $('#railGraphic').hidden = !selected();
  $('#railClip').hidden = !selectedClip();
  document.querySelectorAll('[data-proxy]').forEach((b) => (b.disabled = $(`#${b.dataset.proxy}`).disabled));
}

// On a phone, the full Add panel (images, subtitles, saved styles, layouts) opens as a sheet.
function showAddSheet(open) {
  document.body.classList.toggle('sheet-add', open);
}
$('#moreAdd').onclick = () => showAddSheet(true);
$('#closeAdd').onclick = () => showAddSheet(false);
addEventListener('pointerdown', (e) => {
  if (document.body.classList.contains('sheet-add') && !e.target.closest('#addPanel, #moreAdd, dialog')) showAddSheet(false);
});

/* ---------- installing as an app ---------- */

// The service worker keeps the app working offline; browsers only allow it on a real web address.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// Only Chrome and Edge offer their own install prompt; other browsers get instructions instead.
let installPrompt = null;
const runningAsApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
$('#install').hidden = runningAsApp || !location.protocol.startsWith('http');
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
});
function installSteps() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'To install, tap the Share button, then Add to Home Screen.';
  if (/Firefox/.test(ua)) return 'Firefox can’t install web apps. Open this page in Chrome, Edge or Safari to install Chyron.';
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return 'To install, choose File → Add to Dock in Safari’s menu bar.';
  return 'To install, click the install icon at the right end of the address bar, or open the browser menu and choose Install Chyron.';
}
$('#install').onclick = async () => {
  if (!installPrompt) return toast(installSteps());
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  installPrompt = null;
  if (outcome === 'accepted') $('#install').hidden = true;
};
addEventListener('appinstalled', () => {
  $('#install').hidden = true;
  toast('Chyron is installed. Open it from your Applications folder or Dock.');
});
// Once installed, videos and SRT files can be opened with Chyron from Finder.
if ('launchQueue' in window) {
  launchQueue.setConsumer(async (params) => {
    if (params.files && params.files.length) handleFiles(await Promise.all(params.files.map((h) => h.getFile())));
  });
}

new ResizeObserver(fitStage).observe($('#stageArea'));
FONTS.forEach((f) => document.fonts.load(`${f.weight} 40px "${f.name}"`));
load().then(() => requestAnimationFrame(tick));
