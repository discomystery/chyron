const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const ctx = canvas.getContext('2d');
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d');
const MB = window.Mediabunny;

// Chyron Sports (sports.html) is this same app with sports graphics, templates and brand, and its own saved work.
const SPORTS = document.documentElement.dataset.edition === 'sports';
const APP_NAME = SPORTS ? 'Chyron Sports' : 'Chyron';
const FORMATS = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080] };
const FONTS = [
  { name: 'Anton', weight: 400 },
  { name: 'Archivo', weight: 800 },
  { name: 'Oswald', weight: 700 },
  { name: 'Barlow Condensed', weight: 700 },
  { name: 'Newsreader', weight: 600 },
  { name: 'Inter Tight', weight: 800 },
  { name: 'Space Mono', weight: 700 },
  // Chyron Sports' own typefaces.
  ...(SPORTS ? [{ name: 'Big Shoulders Display', weight: 900 }, { name: 'Saira Condensed', weight: 700 }, { name: 'Doto', weight: 900 }, { name: 'JetBrains Mono', weight: 800 }] : []),
];
// Chyron Sports looks. Each is a whole visual system: the brand's colors and typefaces, and how each sports
// graphic is drawn. Accents always belong to a box (an edge band, a tag, a strip), so nothing floats loose.
const SPORT_TYPES = new Set(['score', 'stat', 'scoop', 'deal', 'stamp', 'breaking', 'caption', 'take', 'situation', 'status', 'player', 'host', 'poll', 'via', 'quote']);
const LOOKS = {
  // Flat square panels with a red edge, set upright in capitals, like a TV scorebug.
  broadcast: {
    name: 'Broadcast', hint: 'Flat panels, red edge, like a TV scorebug',
    brand: { dark: '#0e1a2b', light: '#ffffff', main: '#2a5bd7', accent: '#e31837', extra: '#e31837', head: 'Oswald', body: 'Saira Condensed' },
    all: { slant: 0, sheen: true, radius: 0, bgAlpha: 1, edge: 'left', edgeColor: '$accent', upper: true, hl: 'box', color: '$light', bg: '$dark', accent: '$accent' },
    kinds: {
      score: { edge: '' },
      stat: { edge: '' },
      stamp: { edge: '', tilt: 0, ring: false, bg: '$accent' },
      breaking: { edge: '', bg: '$accent' },
      status: { edge: '', bg: '$accent' },
      caption: { color: '$dark', bg: '$light' },
      poll: { color: '$dark', bg: '$light' },
      via: { edge: '', sheen: false, bgAlpha: 0.75 },
      player: { edge: '', look: 'classic' },
      host: { edge: '', look: 'classic', bg: '$main', accent: '$light' },
      quote: { edge: '', look: 'classic' },
    },
  },
  // Everything leans forward with a gloss, in ice blue and goal-light red.
  slapshot: {
    name: 'Slapshot', hint: 'Leaning, glossy, ice blue and red',
    brand: { dark: '#0b1a33', light: '#ffffff', main: '#1e63ff', accent: '#5fd0ff', extra: '#e4002b', head: 'Big Shoulders Display', body: 'Saira Condensed' },
    all: { slant: 0.2, sheen: true, radius: 0, bgAlpha: 1, edge: 'left', edgeColor: '$extra', upper: true, hl: 'box', color: '$light', bg: '$dark', accent: '$accent' },
    kinds: {
      score: { edge: '' },
      stat: { edge: '' },
      scoop: { accent: '$extra' },
      stamp: { edge: '', slant: 0, tilt: -6, ring: true, bg: '$extra' },
      breaking: { edge: '', bg: '$extra' },
      status: { edge: '', bg: '$extra' },
      caption: { color: '$dark', bg: '$light', upper: false },
      poll: { edge: '', color: '$dark', bg: '$accent' },
      via: { edge: '', sheen: false, bgAlpha: 0.75 },
      player: { edge: '', look: 'classic' },
      host: { edge: '', look: 'classic', bg: '$main', accent: '$light' },
      quote: { edge: '', look: 'classic' },
    },
  },
  // Light frosted panels in sentence case, with red only where it means something.
  ice: {
    name: 'Ice', hint: 'Light panels, sentence case, calm',
    brand: { dark: '#0b1a33', light: '#f3f7fb', main: '#1e63ff', accent: '#e4002b', extra: '#e4002b', head: 'Archivo', body: 'Saira Condensed' },
    all: { slant: 0, sheen: false, radius: 0.2, bgAlpha: 0.95, edge: '', upper: false, hl: 'color', color: '$dark', bg: '$light', accent: '$accent' },
    kinds: {
      scoop: { edge: 'top', radius: 0.1 },
      deal: { edge: 'top', radius: 0.1 },
      stat: { radius: 0.1 },
      score: { upper: true },
      situation: { upper: true },
      stamp: { tilt: 0, ring: true, color: '$accent', bg: '$light' },
      breaking: { upper: true, color: '#ffffff', bg: '$accent' },
      status: { upper: true, color: '#ffffff', bg: '$accent' },
      poll: { color: '#ffffff', bg: '$accent' },
      via: { bgAlpha: 0.8 },
      player: { look: 'classic' },
      host: { look: 'classic' },
      quote: { look: 'classic', radius: 0.1 },
    },
  },
  // The arena scoreboard, crossed with a stats terminal. Big numbers are lit LED type on dotted panels, where
  // dot-matrix reads at a glance; everything smaller is set in a code-style mono face, flat and sharp.
  jumbotron: {
    name: 'Scoreboard', hint: 'LED numbers, code-style mono type',
    brand: { dark: '#050505', light: '#ffffff', main: '#ffb000', accent: '#ffb000', extra: '#ff2d2d', head: 'JetBrains Mono', body: 'JetBrains Mono' },
    all: { slant: 0, sheen: false, radius: 0, bgAlpha: 1, edge: '', led: false, glow: false, upper: false, hl: 'color', color: '$light', bg: '$dark', accent: '$accent' },
    kinds: {
      score: { font: 'Doto', upper: true, led: true, glow: true },
      stat: { font: 'Doto', upper: true, led: true, glow: true },
      stamp: { font: 'Doto', upper: true, led: true, glow: true, tilt: 0, ring: false, color: '$extra', bg: '$dark' },
      breaking: { upper: true, color: '$extra' },
      status: { upper: true, color: '$accent' },
      situation: { upper: true, color: '$accent' },
      scoop: { edge: 'top', edgeColor: '$extra', accent: '$extra' },
      deal: { edge: 'top', edgeColor: '$accent', upper: true },
      poll: { color: '$dark', bg: '$accent' },
      via: { bgAlpha: 0.75 },
      player: { look: 'classic', upper: true },
      host: { look: 'classic', upper: true, accent: '$accent' },
      quote: { look: 'classic' },
    },
  },
};
const DEFAULT_BRAND = SPORTS
  ? { ...LOOKS.broadcast.brand, look: 'broadcast', logo: null, v: 2 }
  : { dark: '#111111', light: '#ffffff', main: '#1740e0', accent: '#ffd400', extra: '#e4262c', head: 'Inter Tight', body: 'Space Mono', logo: null, v: 2 };
// Values starting with $ are filled in from the brand kit when a graphic is made.
const BASE = {
  text: '', sub: '', width: 0.84, x: 0.08, y: 0.5, size: 56, align: 'left', upper: false, track: 0,
  font: '$body', color: '$light', bg: '$dark', accent: '$accent', bgAlpha: 1, radius: 0, alpha: 1, look: 'classic', hl: 'color', dot: false,
  anim: 'fade', out: 'fade', speed: 0.45, start: 0, end: 5, toEnd: true,
};
const PRESETS = {
  // The marker look: black on yellow highlighter strips, with tags in the brand's typewriter face.
  headline: { name: 'Headline', kind: 'lines', look: 'marker', hl: 'box', text: 'Your headline goes here', font: '$head', size: 84, y: 0.6, track: -0.02, color: '$dark', bg: '$accent', accent: '$dark', anim: 'marker' },
  label: { name: 'Label', kind: 'lines', look: 'marker', hl: 'box', text: '[ Update ]', size: 32, y: 0.579, upper: true, track: 0.04, anim: 'type' },
  lower: { name: 'Name bar', kind: 'lower', look: 'marker', text: 'Maria Alvarez', sub: 'City council member, District 4', font: '$head', subFont: '$body', size: 54, y: 0.78, track: -0.01, color: '$dark', bg: '$accent', accent: '$dark', anim: 'marker' },
  quote: { name: 'Quote', kind: 'quote', look: 'marker', hl: 'box', text: 'We heard from hundreds of renters, and tonight we *acted*.', sub: 'Maria Alvarez', font: '$head', subFont: '$body', size: 58, y: 0.4, track: -0.01, anim: 'pop' },
  credit: { name: 'Source credit', kind: 'lines', look: 'marker', hl: 'box', text: 'Source: City Clerk’s Office', size: 28, y: 0.93, anim: 'type' },
  text: { name: 'Plain text', kind: 'text', text: 'Add your text', font: '$head', y: 0.3 },
  image: { name: 'Image', kind: 'image', width: 0.4, x: 0.3, y: 0.3 },
  subtitles: { name: 'Subtitles', kind: 'lines', look: 'marker', hl: 'box', font: '$head', size: 54, y: 0.72, align: 'center', color: '$dark', bg: '$accent', accent: '$dark', anim: 'none', out: 'none', offset: 0 },
  logo: { name: 'Logo', kind: 'image', width: 0.2, x: 0.74, y: 0.04, anim: 'none', out: 'none' },
  // Covers hide part of the video, such as another channel's captions.
  cover: { name: 'Cover', kind: 'solid', width: 1, x: 0, y: 0.72, h: 0.28, bg: '$dark', edges: 'top', feather: 0.55, blur: 0.5 },

  // Sports graphics, offered in Chyron Sports, with hockey samples. Both apps can show them, so project files open in either.
  score: { name: 'Score bug', kind: 'score', text: 'EDM 3\nFLA 2', sub: 'P3 · 4:12', font: '$head', subFont: '$body', size: 50, y: 0.05, upper: true, team1: '#ff4c00', team2: '#c8102e', color: '$light', bg: '$dark', accent: '$accent', anim: 'wipe' },
  stat: { name: 'Stat card', kind: 'stat', text: '3 G\n1 A\n7 SOG', sub: 'Hat trick', font: '$head', subFont: '$body', size: 120, y: 0.6, align: 'center', upper: true, color: '$light', bg: '$dark', accent: '$accent', anim: 'pop' },
  scoop: { name: 'Scoop card', kind: 'scoop', tag: 'Breaking', text: 'The Oilers are acquiring a *top-four defenceman*', sub: 'per @FriedgeHNIC', font: '$head', subFont: '$body', size: 70, y: 0.07, upper: true, hl: 'box', color: '$light', bg: '$dark', accent: '$extra', anim: 'rise' },
  deal: { name: 'Trade card', kind: 'deal', tag: 'Trade', text: 'Mikko Rantanen', sub: 'Avalanche > Hurricanes', note: '50% retained · Three-team deal', font: '$head', subFont: '$body', size: 84, y: 0.6, upper: true, hl: 'color', color: '$light', bg: '$dark', accent: '$accent', anim: 'pop' },
  stamp: { name: 'Stamp', kind: 'stamp', text: 'Goal', font: '$head', size: 96, x: 0.1, width: 0.8, y: 0.3, align: 'center', upper: true, tilt: -6, sheen: true, color: '$light', bg: '$extra', radius: 0.12, anim: 'pop' },
  breaking: { name: 'Breaking tag', kind: 'lines', text: 'Breaking', font: '$head', size: 44, y: 0.1, upper: true, track: 0.03, color: '$light', bg: '$extra', accent: '$accent', anim: 'wipe' },
  caption: { name: 'Top caption', kind: 'lines', text: 'McDavid went *coast to coast*', size: 60, x: 0.06, width: 0.88, y: 0.17, align: 'center', color: '$dark', bg: '$light', hl: 'box', accent: '$accent', anim: 'slide' },
  take: { name: 'Hot take', kind: 'lines', text: 'The shootout should be *banned*', font: '$head', size: 84, y: 0.08, align: 'center', upper: true, hl: 'box', color: '$light', bg: '$dark', accent: '$accent', anim: 'wipe' },
  situation: { name: 'Game situation', kind: 'lines', text: 'P3 · 0:48 · Empty net', size: 36, y: 0.69, upper: true, track: 0.04, dot: true, color: '$light', bg: '$dark', accent: '$accent', anim: 'slide' },
  status: { name: 'Status tag', kind: 'lines', text: 'Out · Upper body', font: '$head', size: 40, y: 0.2, upper: true, track: 0.03, color: '$light', bg: '$extra', accent: '$accent', anim: 'wipe' },
  player: { name: 'Player name bar', kind: 'lower', text: '#97 Connor McDavid', sub: 'Oilers · Center', font: '$head', subFont: '$body', size: 58, y: 0.76, upper: true, color: '$light', bg: '$dark', accent: '$accent', anim: 'slide' },
  host: { name: 'Show name bar', kind: 'lower', text: 'Elliotte Friedman', sub: '32 Thoughts', font: '$head', subFont: '$body', size: 54, y: 0.74, upper: true, color: '$light', bg: '$main', accent: '$light', anim: 'slide' },
  poll: { name: 'Poll prompt', kind: 'lines', text: 'Agree or disagree?', font: '$head', size: 50, y: 0.86, align: 'center', upper: true, color: '$dark', bg: '$accent', accent: '$extra', anim: 'pop' },
  via: { name: 'Clip credit', kind: 'lines', text: 'via @NHL', size: 30, y: 0.93, bgAlpha: 0.7, anim: 'fade' },
};
const COVERS = new Set(['solid', 'gradient', 'blur']);
const COVER_NAMES = { solid: 'Solid cover', blur: 'Blur' };

// Gradient covers became solid covers with one soft edge: the edge opposite the old solid side.
function upgradeCover(o) {
  if (o.kind !== 'gradient') return o;
  o.kind = 'solid';
  o.edges = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' }[o.dir] || 'top';
  o.feather = o.fade ?? 0.55;
  return o;
}

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

// Reads a typed time: plain seconds ("6.04") or minutes and seconds ("0:06.04", "1:02").
function parseTime(text) {
  const m = String(text).trim().match(/^(?:(\d+):)?(\d+(?:\.\d*)?|\.\d+)$/);
  return m ? (+m[1] || 0) * 60 + parseFloat(m[2]) : NaN;
}
// Times in fields: like the timecode, with hundredths when they matter.
function fmtField(t) {
  const m = Math.floor(t / 60), sec = t - m * 60;
  const digits = Math.abs(sec * 10 - Math.round(sec * 10)) > 0.001 ? 2 : 1;
  return `${m}:${sec.toFixed(digits).padStart(digits + 3, '0')}`;
}

function fmt(t) {
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(1).padStart(4, '0')}`;
}

/* ---------- graphics: creating ---------- */

function resolveBrand(o) {
  for (const k of ['font', 'subFont', 'color', 'bg', 'accent', 'team1', 'team2', 'edgeColor']) {
    if (typeof o[k] === 'string' && o[k][0] === '$') o[k] = state.brand[o[k].slice(1)];
  }
  return o;
}

// How the brand's chosen look draws this kind of graphic (Chyron Sports only).
function lookFor(type) {
  const look = SPORTS && SPORT_TYPES.has(type) && LOOKS[state.brand.look];
  return look ? { ...look.all, ...look.kinds[type] } : {};
}

function makeOverlay(type, extra = {}) {
  return resolveBrand({ ...BASE, ...PRESETS[type], ...lookFor(type), type, id: uid(), ...extra });
}

// Switches to another look: the brand takes its colors and typefaces, and the sports graphics are redrawn in it.
function applyLook(name) {
  if (!LOOKS[name] || state.brand.look === name) return;
  Object.assign(state.brand, LOOKS[name].brand, { look: name });
  for (const o of state.overlays) {
    if (!SPORT_TYPES.has(o.type)) continue;
    const p = PRESETS[o.type];
    Object.assign(o, resolveBrand({ font: p.font || BASE.font, subFont: p.subFont, ...lookFor(o.type) }));
  }
  renderLooks();
  renderBrand();
  fillInspector();
  commit();
  toast(`Switched to the ${LOOKS[name].name} look.`, true);
}

// A highlight needs a color that shows: against the text for colored or underlined words, against the
// box for boxed ones. If it doesn't, the first brand color that does takes over.
function fitHighlight(o) {
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  const clash = o.hl === 'box' ? o.bg : o.color;
  if (!same(o.accent, clash)) return;
  const b = state.brand;
  o.accent = [b.main, b.extra, b.accent, b.dark, b.light].find((c) => !same(c, clash) && (o.hl === 'box' || !same(c, o.bg))) || o.accent;
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

// Subtitles made for a video file follow that file's footage, so trimming, splitting and reordering
// clips keeps them in sync. Older subtitles, or ones set to follow the timeline, use timeline time.
const followsFootage = (o) => o.follow !== 'timeline' && o.source && segs.some((s) => s.m.name === o.source);

// The line on screen at timeline time t, and the time on that line's own clock (footage or timeline).
function cueHit(o, t) {
  let at = t;
  if (followsFootage(o)) {
    const s = segs[segIndexAt(t)];
    if (!s || s.m.name !== o.source || t < s.start || t >= s.start + s.len) return null;
    at = s.c.in + (t - s.start);
  }
  at -= o.offset;
  const cue = o.cues.find((c) => at >= c.start && at < c.end);
  return cue ? { cue, at } : null;
}
const cueAt = (o, t) => cueHit(o, t)?.cue || null;

// Word by word: the word being spoken is wrapped in *stars*, so it shows in the highlight color.
// Lines whose words no longer match their timings (after editing) just show plainly.
function cueText(o, t) {
  const hit = cueHit(o, t);
  if (!hit) return '';
  const { cue, at } = hit;
  if (!o.karaoke || !cue.words) return cue.text;
  const words = cue.text.replace(/\*/g, '').split(/\s+/).filter(Boolean);
  if (words.length !== cue.words.length) return cue.text;
  let i = cue.words.findIndex(([, end]) => at < end);
  if (i < 0) i = words.length - 1;
  if (i > 0 && at < cue.words[i][0]) i--; // between words, keep the last one lit
  return words.map((w, j) => (j === i ? `*${w}*` : w)).join(' ');
}

// Where each subtitle line lands on the timeline (a line can appear more than once, or not at all).
function cuePlacements(o) {
  if (!followsFootage(o)) return o.cues.map((c) => ({ c, start: c.start + o.offset, end: c.end + o.offset }));
  const out = [];
  for (const s of segs) {
    if (s.m.name !== o.source) continue;
    for (const c of o.cues) {
      const a = Math.max(c.start + o.offset, s.c.in), b = Math.min(c.end + o.offset, s.c.out);
      if (b > a) out.push({ c, start: s.start + (a - s.c.in), end: s.start + (b - s.c.in) });
    }
  }
  return out.sort((x, y) => x.start - y.start);
}

async function addSubtitleFile(file) {
  const cues = parseSubtitles(await file.text());
  if (!cues.length) return toast(`No subtitles were found in ${file.name}. It should be an SRT or VTT file.`);
  // Assume the file was made for the video under the playhead (or the selected clip's video).
  const seg = segs.find((s) => s.c === selectedClip()) || segs[segIndexAt(T)];
  const source = seg ? seg.m.name : null;
  let o = state.overlays.find((x) => x.type === 'subtitles');
  if (o) Object.assign(o, { cues, source, follow: 'footage' }); // keep the styling already chosen
  else state.overlays.push((o = makeOverlay('subtitles', { cues, source, follow: 'footage' })));
  renderTimeline();
  select(o.id);
  const first = cuePlacements(o)[0];
  if (!cueAt(o, T) && first) setTime(first.start + 0.01);
  fillInspector();
  save();
  toast(source ? `${cues.length} subtitles added. They follow ${source}, so they stay in sync when you trim or move it.` : `${cues.length} subtitles added from ${file.name}.`);
}

/* ---------- saving, undo, project files ---------- */

const db = new Promise((resolve, reject) => {
  const req = indexedDB.open(SPORTS ? 'chyron-sports' : 'chyron', 1);
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
  // Projects from before the marker look still on the old default typefaces move to the new ones.
  if (!(s.brand && s.brand.v >= 2)) {
    if (out.brand.head === 'Anton' && out.brand.body === 'Archivo') {
      // Quotes that took their attribution typeface from the brand keep the one they had.
      for (const o of s.overlays || []) if (o.kind === 'quote' && !o.subFont) o.subFont = 'Archivo';
      Object.assign(out.brand, { head: DEFAULT_BRAND.head, body: DEFAULT_BRAND.body });
    }
    out.brand.v = 2;
  }
  state = out;
  out.overlays = out.overlays.map((o) => upgradeCover(resolveBrand({ ...BASE, out: 'fade', ...o, hl: o.hl || (o.look === 'marker' ? 'box' : 'color'), toEnd: o.toEnd ?? o.end >= 14.99 })));
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
  if (transcript.open) renderTranscript();
}

async function load() {
  let saved = null;
  try {
    saved = JSON.parse(await idb('readonly', (s) => s.get('state')));
  } catch {}
  if (!saved && !SPORTS) {
    try {
      saved = JSON.parse(localStorage.getItem('chyron.v1')); // first version stored graphics here
    } catch {}
  }
  if (saved && Array.isArray(saved.overlays)) normalise(saved);
  else if (SPORTS) state.overlays = templateGraphics(TEMPLATES[0]);
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
  commit();
  toast('Started a new project. Your brand kit, styles and layouts are kept.', true);
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

// The second line of a name bar or quote can have its own typeface. Until one is picked, a name bar's
// title uses the name's typeface and a quote's attribution uses the brand's text typeface.
const subFontName = (o) => o.subFont || (o.kind === 'quote' ? state.brand.body : o.font);
const subFontOf = (o) => ({ font: subFontName(o), track: o.kind === 'quote' || o.look === 'marker' ? 0 : o.track });

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

// Paints a row of words from x on baseline y, and returns where it ended. Highlighted words show in the
// highlight color (hl 'color'), get underlined in it ('underline'), or sit on their own box of it spanning
// the row (top, h) with the text in black or white ('box'). `limit` stops after that many characters
// (for typing on); `dry` only measures.
function paintRow(row, x, y, o, top, h, limit = Infinity, dry = false) {
  let joined = false; // the last word was highlighted, so a highlighted word next joins up with it
  for (const t of row.toks) {
    if (limit <= 0) break;
    const gap = t.gap || 0;
    x += gap;
    const s = limit < t.t.length ? t.t.slice(0, limit) : t.t;
    const w = s === t.t ? t.w : ctx.measureText(s).width;
    limit -= s.length;
    if (!dry) {
      ctx.fillStyle = t.hl && o.hl === 'color' ? o.accent : o.color;
      const join = t.hl && joined ? gap : 0;
      if (t.hl && o.hl === 'box' && top != null) {
        const pad = h * 0.08;
        ctx.fillStyle = o.accent;
        ctx.fillRect(x - (join || pad), top, w + pad + (join || pad), h); // joined: from where the last box's word ended
        ctx.fillStyle = readable(o.accent);
      }
      if (t.hl && o.hl === 'underline' && h) {
        const fill = ctx.fillStyle;
        ctx.fillStyle = o.accent;
        ctx.fillRect(x - join, y + h * 0.1, w + join, h * 0.07);
        ctx.fillStyle = fill;
      }
      ctx.fillText(s, x, y);
    }
    joined = t.hl;
    x += w;
  }
  return x;
}

const rowChars = (row) => row.toks.reduce((n, t) => n + t.t.length, 0);
const easeOut = (p) => 1 - (1 - p) ** 3;
const backOut = (p) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;

// Text graphics are made of strips: a box with text on it (one per line, or a name bar's two bars).
// Each strip has a place (x, y, w, h), box(w) to paint its box cut to width w, text(limit, dry) to paint
// its text and return where it ended, and chars, its length. The fancier entrances work strip by strip:
//  wipe: each strip is uncovered from the left, one after another;
//  marker: each box sweeps across like a highlighter, and the text follows it;
//  type: the text types on with a cursor, its box growing to fit;
//  pop: each strip springs up from small.
// Exits run the same in reverse; a marker exit clears the text, then pulls the box away to the right.
function paintStrips(S, fx, o, fs) {
  const n = S.length;
  const type = fx && fx.type;
  const stagger = (p, i) => clamp(p * (1 + 0.3 * (n - 1)) - 0.3 * i);
  const cut = (s, w, fromRight) => {
    ctx.beginPath();
    ctx.rect(fromRight ? s.x + s.w - w : s.x, s.y, w, s.h + 1);
    ctx.clip();
  };
  let left = type === 'type' ? Math.round(fx.p * S.reduce((a, s) => a + s.chars, 0)) : 0;
  let cursorPlaced = false;
  S.forEach((s, i) => {
    ctx.save();
    if (!fx) {
      s.box(s.w);
      s.text();
    } else if (type === 'wipe') {
      const p = stagger(easeOut(fx.p), i);
      if (p > 0) {
        cut(s, s.w * p);
        s.box(s.w);
        s.text();
      }
    } else if (type === 'marker') {
      const p = stagger(fx.p, i);
      const bp = easeOut(clamp(p / 0.65)), tp = easeOut(clamp((p - 0.35) / 0.65));
      if (bp > 0) {
        ctx.save();
        cut(s, s.w * bp, fx.out);
        s.box(s.w);
        ctx.restore();
        if (tp > 0) {
          cut(s, s.w * tp, fx.out);
          s.text();
        }
      }
    } else if (type === 'pop') {
      const p = stagger(fx.p, i);
      if (p > 0) {
        const k = 0.4 + 0.6 * backOut(p), cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        ctx.globalAlpha *= clamp(p * 2.5);
        ctx.translate(cx, cy);
        ctx.scale(k, k);
        ctx.translate(-cx, -cy);
        s.box(s.w);
        s.text();
      }
    } else if (type === 'type') {
      const k = Math.min(left, s.chars);
      left -= k;
      const full = k >= s.chars;
      const cursor = !cursorPlaced && (!full || i === n - 1);
      if (cursor) cursorPlaced = true;
      if (k > 0 || cursor) {
        const end = s.text(k, true);
        const cw = fs * 0.42;
        const w = Math.min(s.w, end - s.x + s.padR) + (cursor ? cw + fs * 0.12 : 0);
        s.box(full && !cursor ? s.w : w);
        s.text(k);
        if (cursor) {
          ctx.fillStyle = s.cursor || o.accent;
          ctx.fillRect(end + fs * 0.06, s.y + (s.h - fs * 0.8) / 2, cw, fs * 0.8);
        }
      }
    }
    ctx.restore();
  });
}
const STRIP_FX = new Set(['wipe', 'marker', 'type', 'pop']);

function fillBox(o, x, y, w, h, r) {
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * o.bgAlpha;
  ctx.fillStyle = o.bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  // Sheen: a broadcast-style gloss, lighter at the top and shaded at the bottom.
  if (o.sheen) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  // LED: the panel is a grid of unlit bulbs. They're faint, so the lit type in front stays sharp.
  if (o.led) {
    ctx.fillStyle = ledDots(Math.max(3, Math.round((7 * Math.min(canvas.width, canvas.height)) / 1080)));
    ctx.fill();
  }
  ctx.globalAlpha = a;
  // Edge: a band of color along the box's leading side or its top, inside the box so it moves with it.
  if (o.edge === 'left' || o.edge === 'top') {
    const band = Math.min((o.edge === 'top' ? 0.08 : 0.14) * h, (10 * Math.min(canvas.width, canvas.height)) / 1080);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = o.edgeColor || o.accent;
    if (o.edge === 'top') ctx.fillRect(x, y, w, band);
    else ctx.fillRect(x, y, band, h);
    ctx.restore();
  }
}

const ledCache = new Map();
function ledDots(pitch) {
  if (!ledCache.has(pitch)) {
    const c = Object.assign(document.createElement('canvas'), { width: pitch, height: pitch });
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.09)';
    g.beginPath();
    g.arc(pitch / 2, pitch / 2, pitch * 0.3, 0, Math.PI * 2);
    g.fill();
    ledCache.set(pitch, ctx.createPattern(c, 'repeat'));
  }
  return ledCache.get(pitch);
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
    // An optional dot (in the brand's extra color) leads the first line, like a live marker.
    const lead = o.dot ? fs * 0.62 : 0;
    setFont(o, fs);
    const cap = capHeight();
    const trail = (o.track || 0) * fs;
    const rows = wrapRich(text, bw - 2 * padX - lead).map((row, i) => {
      const w = row.w - trail + 2 * padX + (i ? 0 : lead);
      return { row, w, x: alignX(o, bx, bw, w), y: by + i * lh, lead: i ? 0 : lead };
    });
    const live = rows.filter((r) => r.row.toks.length);
    const ix = Math.min(bx + bw, ...live.map((r) => r.x));
    const iw = Math.max(0, Math.max(ix, ...live.map((r) => r.x + r.w)) - ix);
    // Solid square boxes overlap by a pixel so no seam shows between lines.
    const overlap = o.bgAlpha === 1 && !o.radius ? 1 : 0;
    const strips = live.map((r) => ({
      x: r.x, y: r.y, w: r.w, h: lh, padR: padX - trail, chars: rowChars(r.row),
      box: (w) => fillBox(o, r.x, r.y, w, lh + overlap, (o.radius * lh) / 2),
      text(limit, dry) {
        if (r.lead && !dry) {
          ctx.fillStyle = state.brand.extra;
          ctx.beginPath();
          ctx.arc(r.x + padX + fs * 0.2, r.y + lh / 2, fs * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        return paintRow(r.row, r.x + padX + r.lead, r.y + (lh + cap) / 2, o, r.y, lh + overlap, limit, dry);
      },
    }));
    return {
      x: bx, y: by, w: bw, h: rows.length * lh, ix, iw, handles: STRIP_FX,
      paint(fx) {
        setFont(o, fs);
        paintStrips(strips, fx, o, fs);
      },
    };
  },

  // Name on one box, title on an accent strip underneath.
  lower(o, text, bx, by, bw, u) {
    text = text.replace(/\*/g, '');
    // The marker look has no side bar, and starts the title with // in the name bar's color.
    const marker = o.look === 'marker';
    const pre = marker && o.sub ? '// ' : '';
    const sub = pre + (o.upper ? o.sub.toUpperCase() : o.sub);
    const measure = (fs) => {
      const padX = fs * 0.34, bar = marker ? 0 : fs * 0.16, subFs = fs * 0.54;
      setFont(o, fs);
      const w1 = ctx.measureText(text).width + 2 * padX;
      const cap1 = capHeight();
      setFont(subFontOf(o), subFs);
      const w2 = sub ? ctx.measureText(sub).width + 2 * padX : 0;
      const cap2 = capHeight();
      return { fs, padX, bar, subFs, w1, w2, cap1, cap2, w: Math.max(w1, w2) + bar };
    };
    let m = measure(o.size * u);
    if (m.w > bw) m = measure((o.size * u * bw) / m.w);
    const h1 = m.fs * 1.36, h2 = sub ? m.subFs * 1.9 : 0;
    const x = alignX(o, bx, bw, m.w);
    const flip = o.align === 'right';
    const left = (w) => (flip ? x + m.w - m.bar - w : x + m.bar);
    const barX = flip ? x + m.w - m.bar : x;
    // Each bar's strip takes in its stretch of the side bar, and its box is cut to the width asked for.
    const strip = (y, h, w, paintBox, font, color, line, at) => {
      const sx = Math.min(barX, left(w)), sw = w + m.bar;
      return {
        x: sx, y, w: sw, h, padR: m.padX, chars: line.length, cursor: font === o ? o.accent : o.bg,
        box(cw) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(sx, y - 1, cw, h + 2);
          ctx.clip();
          ctx.fillStyle = o.accent;
          ctx.fillRect(barX, y, m.bar, h);
          paintBox(left(w), y, w, h);
          ctx.restore();
        },
        text(limit = Infinity, dry) {
          setFont(font, font === o ? m.fs : m.subFs);
          const s = line.slice(0, limit), tx = left(w) + m.padX;
          if (!dry) {
            const p = Math.min(pre.length, s.length);
            ctx.fillStyle = o.bg;
            if (font !== o && p) ctx.fillText(s.slice(0, p), tx, at);
            ctx.fillStyle = color;
            ctx.fillText(s.slice(font !== o ? p : 0), tx + (font !== o && p ? ctx.measureText(s.slice(0, p)).width : 0), at);
          }
          return tx + ctx.measureText(s).width;
        },
      };
    };
    const strips = [strip(by, h1, m.w1, (bx2, y, w, h) => fillBox(o, bx2, y, w, h, 0), o, o.color, text, by + (h1 + m.cap1) / 2)];
    if (sub) {
      const paintSub = (bx2, y, w, h) => {
        ctx.fillStyle = o.accent;
        ctx.fillRect(bx2, y - 1, w, h + 1);
      };
      strips.push(strip(by + h1, h2, m.w2, paintSub, subFontOf(o), readable(o.accent), sub, by + h1 + (h2 + m.cap2) / 2));
    }
    return {
      x: bx, y: by, w: bw, h: h1 + h2, ix: x, iw: m.w, handles: STRIP_FX,
      paint(fx) {
        paintStrips(strips, fx, o, m.fs);
      },
    };
  },

  // A full-width panel with an accent rule, the quote, and who said it.
  quote(o, text, bx, by, bw, u) {
    // The marker look puts the accent rule along the top and who said it above the quote, as a tag.
    const marker = o.look === 'marker';
    const fs = o.size * u;
    const pad = fs * 0.62, bar = fs * 0.16, lh = fs * 1.26, subFs = fs * 0.5;
    const inner = bw - (marker ? 0 : bar) - 2 * pad;
    setFont(o, fs);
    const rows = wrapRich(`“${text.replace(/^["“]|["”]$/g, '')}”`, inner);
    const tag = marker && o.sub ? subFs * 2 : 0;
    const subH = o.sub && !marker ? subFs * 2.2 : 0;
    const top = (marker ? bar : 0) + pad * 0.8 + tag;
    const h = top + rows.length * lh + subH + pad * 0.8;
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
        if (marker) ctx.fillRect(bx, by, bw, bar);
        else ctx.fillRect(bx, by, bar, h);
        ctx.restore();
        const tx = bx + (marker ? 0 : bar) + pad;
        if (tag) {
          setFont(subFontOf(o), subFs);
          ctx.fillStyle = o.accent;
          ctx.fillText(`> ${o.sub}`.toUpperCase(), tx, by + bar + pad * 0.8 + subFs * 0.95);
        }
        setFont(o, fs);
        rows.forEach((row, i) => {
          const y = by + top + i * lh;
          paintRow(row, alignX(o, tx, inner, row.w), y + fs * 0.92, o, y + fs * 0.02, fs * 1.12);
        });
        if (!o.sub || marker) return;
        setFont(subFontOf(o), subFs);
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
        for (const r of rows) paintRow(r.row, r.x, r.y + fs * 0.95, o, r.y, lh);
      },
    };
  },

  // A score bug: a color chip, name and score for each team (one per line), then the game's status on the accent.
  score(o, text, bx, by, bw, u) {
    const teams = text.replace(/\*/g, '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/^(.*\S)\s+(\S+)$/);
      return m ? { name: m[1], pts: m[2] } : { name: l, pts: '' };
    });
    const status = o.upper ? o.sub.toUpperCase() : o.sub;
    const measure = (fs) => {
      const pad = fs * 0.36, chip = fs * 0.2, gap = fs * 0.42, subFs = fs * 0.62;
      setFont(o, fs);
      const cells = teams.map((t) => {
        const nw = ctx.measureText(t.name).width, pw = t.pts ? ctx.measureText(t.pts).width : 0;
        return { ...t, nw, w: chip + pad + nw + (t.pts ? gap + pw : 0) + pad };
      });
      setFont(subFontOf(o), subFs);
      const sw = status ? ctx.measureText(status).width + 2 * pad : 0;
      return { fs, pad, chip, gap, subFs, cells, sw, w: cells.reduce((a, c) => a + c.w, 0) + sw };
    };
    let m = measure(o.size * u);
    if (m.w > bw) m = measure((o.size * u * bw) / m.w);
    const h = m.fs * 1.5, x0 = alignX(o, bx, bw, m.w);
    return {
      x: bx, y: by, w: bw, h, ix: x0, iw: m.w,
      paint() {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x0, by, m.w, h, (o.radius * h) / 2);
        ctx.clip();
        fillBox(o, x0, by, m.w, h, 0);
        setFont(o, m.fs);
        const at = by + (h + capHeight()) / 2;
        let x = x0;
        m.cells.forEach((c, i) => {
          ctx.fillStyle = (i % 2 ? o.team2 : o.team1) || o.accent;
          ctx.fillRect(x, by, m.chip, h);
          ctx.fillStyle = o.color;
          ctx.fillText(c.name, x + m.chip + m.pad, at);
          if (c.pts) ctx.fillText(c.pts, x + m.chip + m.pad + c.nw + m.gap, at);
          x += c.w;
        });
        if (status) {
          ctx.fillStyle = o.accent;
          ctx.fillRect(x, by, m.sw, h);
          setFont(subFontOf(o), m.subFs);
          ctx.fillStyle = readable(o.accent);
          ctx.fillText(status, x + m.pad, by + (h + capHeight()) / 2);
        }
        ctx.restore();
      },
    };
  },

  // Big numbers side by side, each with its label under it ("50 PTS" on a line), and a context line above.
  stat(o, text, bx, by, bw, u) {
    const up = (s) => (o.upper ? s.toUpperCase() : s);
    const stats = text.replace(/\*/g, '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/^([-+]?[$£€]?[\d.,:/]+[%KMB+]?)\s+(.*)$/i);
      return m ? { val: m[1], lab: m[2] } : { val: l, lab: '' };
    });
    const note = up(o.sub);
    const measure = (fs) => {
      const labFs = fs * 0.26, gap = fs * 0.5, pad = fs * 0.34;
      const cols = stats.map((s) => {
        setFont(o, fs);
        const vw = ctx.measureText(s.val).width;
        setFont(subFontOf(o), labFs);
        const lw = ctx.measureText(up(s.lab)).width;
        return { ...s, vw, lw, w: Math.max(vw, lw) };
      });
      setFont(subFontOf(o), labFs * 1.1);
      const nw = note ? ctx.measureText(note).width + 2 * pad : 0;
      const inner = cols.reduce((a, c) => a + c.w, 0) + gap * Math.max(0, cols.length - 1);
      return { fs, labFs, gap, pad, cols, inner, w: Math.max(inner + 2 * pad, nw) };
    };
    let m = measure(o.size * u);
    if (m.w > bw) m = measure((o.size * u * bw) / m.w);
    setFont(o, m.fs);
    const cap = capHeight();
    const noteH = note ? m.labFs * 2.3 : 0, labH = stats.some((s) => s.lab) ? m.labFs * 2 : 0;
    const h = noteH + m.pad * 1.1 + cap + labH + m.pad;
    const x0 = alignX(o, bx, bw, m.w);
    return {
      x: bx, y: by, w: bw, h, ix: x0, iw: m.w,
      paint() {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x0, by, m.w, h, o.radius * m.fs * 0.3);
        ctx.clip();
        fillBox(o, x0, by, m.w, h, 0);
        if (note) {
          ctx.fillStyle = o.accent;
          ctx.fillRect(x0, by, m.w, noteH);
          setFont(subFontOf(o), m.labFs * 1.1);
          ctx.fillStyle = readable(o.accent);
          ctx.fillText(note, x0 + (m.w - ctx.measureText(note).width) / 2, by + (noteH + capHeight()) / 2);
        }
        ctx.restore();
        const top = by + noteH + m.pad * 1.1;
        let x = x0 + (m.w - m.inner) / 2;
        m.cols.forEach((c, i) => {
          if (i) {
            ctx.fillStyle = o.color;
            ctx.globalAlpha *= 0.25;
            ctx.fillRect(x - m.gap / 2 - 1, top, 2, cap + labH * 0.8);
            ctx.globalAlpha /= 0.25;
          }
          setFont(o, m.fs);
          ctx.fillStyle = o.color;
          ctx.fillText(c.val, x + (c.w - c.vw) / 2, top + cap);
          if (c.lab) {
            setFont(subFontOf(o), m.labFs);
            ctx.fillStyle = o.accent;
            ctx.fillText(up(c.lab), x + (c.w - c.lw) / 2, top + cap + m.labFs * 1.6);
          }
          x += c.w + m.gap;
        });
      },
    };
  },

  // A breaking-news card: a tag with a live dot, the headline, and who reported it.
  scoop(o, text, bx, by, bw, u) {
    const fs = o.size * u, pad = fs * 0.42, lh = fs * 1.14, tagFs = fs * 0.4, subFs = fs * 0.4;
    const tag = (o.tag || '').trim().toUpperCase();
    const sub = o.upper ? o.sub.toUpperCase() : o.sub;
    const inner = bw - 2 * pad;
    setFont(o, fs);
    const cap = capHeight();
    const rows = wrapRich(text, inner);
    setFont(subFontOf(o), tagFs);
    const tagCap = capHeight(), dot = tagFs * 0.32;
    const tagW = tag ? ctx.measureText(tag).width + tagFs * 0.7 + dot * 2 + tagFs * 0.45 : 0, tagH = tag ? tagFs * 1.8 : 0;
    const top = pad + (tag ? tagH + pad * 0.55 : 0);
    const subH = sub ? subFs * 1.9 : 0;
    const h = top + rows.length * lh + subH + pad * 0.8;
    return {
      x: bx, y: by, w: bw, h, ix: bx, iw: bw,
      paint() {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, h, o.radius * fs * 0.6);
        ctx.clip();
        fillBox(o, bx, by, bw, h, 0);
        ctx.restore();
        if (tag) {
          const tx = alignX(o, bx + pad, inner, tagW), ty = by + pad;
          ctx.fillStyle = o.accent;
          ctx.fillRect(tx, ty, tagW, tagH);
          ctx.fillStyle = readable(o.accent);
          ctx.beginPath();
          ctx.arc(tx + tagFs * 0.35 + dot, ty + tagH / 2, dot, 0, Math.PI * 2);
          ctx.fill();
          setFont(subFontOf(o), tagFs);
          ctx.fillText(tag, tx + tagFs * 0.35 + dot * 2 + tagFs * 0.3, ty + (tagH + tagCap) / 2);
        }
        setFont(o, fs);
        rows.forEach((row, i) => {
          const y = by + top + i * lh;
          paintRow(row, alignX(o, bx + pad, inner, row.w), y + (lh + cap) / 2, o, y, lh);
        });
        if (!sub) return;
        setFont(subFontOf(o), subFs);
        ctx.fillStyle = o.color;
        ctx.globalAlpha *= 0.75;
        ctx.fillText(sub, alignX(o, bx + pad, inner, ctx.measureText(sub).width), by + h - pad * 0.8 - subFs * 0.45);
      },
    };
  },

  // A trade or transfer: a tag, the player, where they're going from and to ("PSG > Real Madrid"), and the terms.
  deal(o, text, bx, by, bw, u) {
    const up = (s) => (o.upper ? s.toUpperCase() : s);
    const fs = o.size * u, pad = fs * 0.4, lh = fs * 1.08, tagFs = fs * 0.36, subFs = fs * 0.46, noteFs = fs * 0.32;
    const tag = (o.tag || '').trim().toUpperCase();
    const [from, to] = up(o.sub).split(/\s*(?:->|→|>)\s*/);
    const note = up(o.note || '');
    const inner = bw - 2 * pad;
    setFont(o, fs);
    const cap = capHeight();
    const rows = wrapRich(text, inner);
    setFont(subFontOf(o), subFs);
    const arrow = subFs * 1.7, fromW = from ? ctx.measureText(from).width : 0, toW = to ? ctx.measureText(to).width : 0;
    const teamsW = fromW + (to ? arrow + toW : 0);
    setFont(subFontOf(o), tagFs);
    const tagW = tag ? ctx.measureText(tag).width + tagFs * 1.1 : 0, tagH = tag ? tagFs * 1.8 : 0;
    const top = pad + (tag ? tagH + pad * 0.5 : 0);
    const teamsH = from ? subFs * 1.7 : 0, noteH = note ? noteFs * 1.9 : 0;
    const h = top + rows.length * lh + teamsH + noteH + pad * 0.8;
    return {
      x: bx, y: by, w: bw, h, ix: bx, iw: bw,
      paint() {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, h, o.radius * fs * 0.6);
        ctx.clip();
        fillBox(o, bx, by, bw, h, 0);
        if (!o.edge) {
          ctx.fillStyle = o.accent;
          ctx.fillRect(bx, by + h - fs * 0.07, bw, fs * 0.07);
        }
        ctx.restore();
        if (tag) {
          const tx = alignX(o, bx + pad, inner, tagW), ty = by + pad;
          ctx.fillStyle = o.accent;
          ctx.fillRect(tx, ty, tagW, tagH);
          setFont(subFontOf(o), tagFs);
          ctx.fillStyle = readable(o.accent);
          ctx.fillText(tag, tx + tagFs * 0.55, ty + (tagH + capHeight()) / 2);
        }
        setFont(o, fs);
        rows.forEach((row, i) => {
          const y = by + top + i * lh;
          paintRow(row, alignX(o, bx + pad, inner, row.w), y + (lh + cap) / 2, o, y, lh);
        });
        let y = by + top + rows.length * lh;
        setFont(subFontOf(o), subFs);
        if (from) {
          const at = y + subFs * 1.15;
          let x = alignX(o, bx + pad, inner, teamsW);
          ctx.fillStyle = o.color;
          ctx.globalAlpha *= 0.7;
          ctx.fillText(from, x, at);
          ctx.globalAlpha /= 0.7;
          if (to) {
            x += fromW;
            const mid = at - capHeight() / 2, a0 = x + subFs * 0.35, a1 = x + arrow - subFs * 0.35;
            ctx.fillStyle = o.accent;
            ctx.fillRect(a0, mid - subFs * 0.05, a1 - a0 - subFs * 0.2, subFs * 0.1);
            ctx.beginPath();
            ctx.moveTo(a1, mid);
            ctx.lineTo(a1 - subFs * 0.32, mid - subFs * 0.24);
            ctx.lineTo(a1 - subFs * 0.32, mid + subFs * 0.24);
            ctx.fill();
            ctx.fillStyle = o.color;
            ctx.fillText(to, x + arrow, at);
          }
          y += teamsH;
        }
        if (!note) return;
        setFont(subFontOf(o), noteFs);
        ctx.fillStyle = o.accent;
        ctx.fillText(note, alignX(o, bx + pad, inner, ctx.measureText(note).width), y + noteFs * 1.25);
      },
    };
  },

  // A tilted rubber stamp, like HERE WE GO or FINAL.
  stamp(o, text, bx, by, bw, u) {
    text = text.replace(/\*/g, '');
    let fs = o.size * u;
    setFont(o, fs);
    const fit = ctx.measureText(text).width + fs * 0.76;
    if (fit > bw) fs *= bw / fit;
    setFont(o, fs);
    const tw = ctx.measureText(text).width - (o.track || 0) * fs, padX = fs * 0.38;
    const w = tw + 2 * padX, h = fs * 1.42, x = alignX(o, bx, bw, w), cap = capHeight();
    return {
      x: bx, y: by, w: bw, h, ix: x, iw: w,
      paint() {
        const cx = x + w / 2, cy = by + h / 2, r = (o.radius * h) / 2, line = fs * 0.07;
        ctx.translate(cx, cy);
        ctx.rotate(((o.tilt || 0) * Math.PI) / 180);
        ctx.translate(-cx, -cy);
        fillBox(o, x, by, w, h, r);
        if (o.ring === false) return paintText();
        ctx.strokeStyle = o.color;
        ctx.lineWidth = line;
        ctx.beginPath();
        ctx.roundRect(x + line / 2, by + line / 2, w - line, h - line, r);
        ctx.stroke();
        ctx.lineWidth = line * 0.4;
        ctx.beginPath();
        ctx.roundRect(x + line * 2, by + line * 2, w - line * 4, h - line * 4, Math.max(0, r - line * 2));
        ctx.stroke();
        paintText();
        function paintText() {
          setFont(o, fs);
          ctx.fillStyle = o.color;
          ctx.fillText(text, x + padX, by + (h + cap) / 2);
        }
      },
    };
  },

  solid: coverLayout,
  gradient: coverLayout,
  blur: coverLayout,

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

// A box that hides part of the video: a solid color or a blur of what's underneath.
// Soft edges fade it out towards all its sides, or from just one side like a gradient.
function coverLayout(o, text, bx, by, bw, u) {
  upgradeCover(o);
  const bh = o.h * canvas.height;
  return {
    x: bx, y: by, w: bw, h: bh, ix: bx, iw: bw,
    paint() {
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, (o.radius * Math.min(bw, bh)) / 2);
      ctx.clip();
      const box = coverBox(bw, bh);
      const b = box.getContext('2d');
      if (o.kind === 'blur') blurInto(b, bx, by, bw, bh, (3 + o.blur * 45) * u);
      else {
        b.fillStyle = o.bg;
        b.fillRect(0, 0, box.width, box.height);
        ctx.globalAlpha *= o.bgAlpha;
      }
      softenEdges(b, box.width, box.height, o.feather || 0, o.edges || 'all');
      ctx.drawImage(box, bx, by);
    },
  };
}

let coverCanvas, padCanvas, smallCanvas;
function coverBox(w, h) {
  coverCanvas = coverCanvas || document.createElement('canvas');
  coverCanvas.width = Math.max(1, Math.ceil(w));
  coverCanvas.height = Math.max(1, Math.ceil(h));
  return coverCanvas;
}

// Blurs what has been drawn so far under a box, into `b`. Where the box meets the edge of the frame,
// the frame's edge pixels are stretched outward first, so the blur doesn't fade into empty space.
// Browsers without canvas filters (older Safari) get a soft blur from shrinking the area and stretching it back.
function blurInto(b, x, y, w, h, r) {
  const W = canvas.width, H = canvas.height, m = Math.ceil(r * 3);
  const px = Math.floor(x) - m, py = Math.floor(y) - m, pw = Math.ceil(w) + 2 * m + 1, ph = Math.ceil(h) + 2 * m + 1;
  const sx = clamp(px, 0, W), sy = clamp(py, 0, H), ex = clamp(px + pw, 0, W), ey = clamp(py + ph, 0, H);
  if (ex - sx < 1 || ey - sy < 1) return;
  padCanvas = padCanvas || document.createElement('canvas');
  padCanvas.width = pw;
  padCanvas.height = ph;
  const p = padCanvas.getContext('2d');
  p.drawImage(ctx.canvas, sx, sy, ex - sx, ey - sy, sx - px, sy - py, ex - sx, ey - sy);
  const l = sx - px, t = sy - py, r2 = ex - px, b2 = ey - py;
  if (l > 0) p.drawImage(padCanvas, l, t, 1, b2 - t, 0, t, l, b2 - t);
  if (r2 < pw) p.drawImage(padCanvas, r2 - 1, t, 1, b2 - t, r2, t, pw - r2, b2 - t);
  if (t > 0) p.drawImage(padCanvas, 0, t, pw, 1, 0, 0, pw, t);
  if (b2 < ph) p.drawImage(padCanvas, 0, b2 - 1, pw, 1, 0, b2, pw, ph - b2);
  if ('filter' in b) {
    b.filter = `blur(${r}px)`;
    b.drawImage(padCanvas, px - x, py - y);
    b.filter = 'none';
    return;
  }
  const k = 1 / Math.max(2, r / 2);
  smallCanvas = smallCanvas || document.createElement('canvas');
  smallCanvas.width = Math.max(1, Math.round(pw * k));
  smallCanvas.height = Math.max(1, Math.round(ph * k));
  smallCanvas.getContext('2d').drawImage(padCanvas, 0, 0, smallCanvas.width, smallCanvas.height);
  b.imageSmoothingQuality = 'high';
  b.drawImage(smallCanvas, px - x, py - y, pw, ph);
}

// Fades a box to clear at its edges: all four, or one ('top', 'bottom', 'left', 'right').
// `soft` is how far in the fade reaches: across half the box for all sides, the whole box for one.
function softenEdges(b, w, h, soft, edges) {
  if (soft <= 0) return;
  b.globalCompositeOperation = 'destination-in';
  const clear = 'rgba(0,0,0,0)', solid = 'rgba(0,0,0,1)';
  const ramps = edges === 'all'
    ? [[0, 0, w, 0, true], [0, 0, 0, h, true]]
    : [{ top: [0, 0, 0, h], bottom: [0, h, 0, 0], left: [0, 0, w, 0], right: [w, 0, 0, 0] }[edges] || [0, 0, 0, h]];
  for (const [x0, y0, x1, y1, both] of ramps) {
    const f = both ? Math.min(0.5, soft / 2) : Math.min(1, soft);
    const g = b.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, clear);
    g.addColorStop(f, solid);
    if (both) {
      g.addColorStop(1 - f, solid);
      g.addColorStop(1, clear);
    } else g.addColorStop(1, solid);
    b.fillStyle = g;
    b.fillRect(0, 0, w, h);
  }
  b.globalCompositeOperation = 'source-over';
}

// Entrance and exit effects; p runs 0 (hidden) to 1 (fully shown).
// Graphics drawn in strips do wipe, marker, type and pop themselves (see paintStrips); for the
// others, those uncover the whole graphic from the left or spring it up.
function applyEffect(type, p, L, u, out) {
  if (p >= 1) return;
  const e = easeOut(p);
  if (type === 'fade' || type === 'rise') ctx.globalAlpha *= e;
  if (type === 'rise') ctx.translate(0, (1 - e) * 44 * u);
  if (type === 'slide') ctx.translate(-(1 - e) * (L.ix + L.iw + 4), 0);
  if (type === 'wipe' || type === 'marker' || type === 'type') {
    ctx.beginPath();
    ctx.rect(out && type === 'marker' ? L.ix + L.iw * (1 - e) : L.ix, L.y, L.iw * e, L.h);
    ctx.clip();
  }
  if (type === 'pop') {
    const k = 0.4 + 0.6 * backOut(p), cx = L.ix + L.iw / 2, cy = L.y + L.h / 2;
    ctx.globalAlpha *= clamp(p * 2.5);
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.translate(-cx, -cy);
  }
}

// How long an entrance or exit takes. Typing goes at a steady pace, so it depends on the length.
function effectTime(o, type, text, out) {
  if (type === 'type') return Math.max(o.speed, text.replace(/[\s*]/g, '').length * 0.035 * (o.speed / 0.45)) * (out ? 0.5 : 1);
  return o.speed * (out ? 0.6 : 1) * (type === 'marker' ? 1.5 : type === 'pop' ? 1.3 : 1);
}

/* ---------- framing: where each clip sits in the frame ---------- */

// A clip's framing is a focus point (0-1 across the source video) and a zoom on top of fill or fit.
// Keyframes are stored in the clip's own video time, so trimming doesn't move them.
const NO_FRAMING = { x: 0.5, y: 0.5, zoom: 1 };
const smooth = (p) => p * p * (3 - 2 * p);

// A keyframe either jumps (holds the framing before it, then cuts) or glides there from the keyframe before.
function framingAt(c, t) {
  const ks = c && c.keys;
  if (!ks || !ks.length) return NO_FRAMING;
  let i = ks.length - 1;
  while (i > 0 && ks[i].t > t) i--;
  const a = ks[i], b = ks[i + 1];
  if (t <= a.t || !b || b.move !== 'glide') return a;
  const p = smooth((t - a.t) / (b.t - a.t));
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, zoom: a.zoom + (b.zoom - a.zoom) * p };
}

const baseScale = (sw, sh) => (state.fit === 'cover' ? Math.max : Math.min)(canvas.width / sw, canvas.height / sh);

// Keeps the focus point where the picture still covers the frame, so no black edges appear.
function keepInFrame(f, sw, sh) {
  const W = canvas.width, H = canvas.height, k = baseScale(sw, sh) * f.zoom;
  const w = sw * k, h = sh * k;
  f.x = w > W ? clamp(f.x, W / (2 * w), 1 - W / (2 * w)) : 0.5;
  f.y = h > H ? clamp(f.y, H / (2 * h), 1 - H / (2 * h)) : 0.5;
}

// Where a video of size sw×sh lands in the frame, in frame pixels.
function coverRect(sw, sh, f = NO_FRAMING) {
  const W = canvas.width, H = canvas.height;
  const k = baseScale(sw, sh) * f.zoom, w = sw * k, h = sh * k;
  const x = w > W ? clamp(W / 2 - f.x * w, W - w, 0) : (W - w) / 2;
  const y = h > H ? clamp(H / 2 - f.y * h, H - h, 0) : (H - h) / 2;
  return { x, y, w, h };
}

function drawCover(c, sw, sh, draw, f = NO_FRAMING) {
  const { x, y, w, h } = coverRect(sw, sh, f);
  c.fillStyle = '#000';
  c.fillRect(0, 0, canvas.width, canvas.height);
  draw(x, y, w, h);
}

let shownVideo = null;

// While a clip is selected, the rest of its picture shows dimmed around the frame, so you can see
// what's outside the crop while reframing. It's only on screen, never in the export.
function updateGhost() {
  const g = $('#ghost');
  const show = !!(selectedClipId && shownVideo && !exporting);
  g.hidden = !show;
  if (!show) return;
  const area = $('#stageArea').getBoundingClientRect(), wr = canvas.getBoundingClientRect();
  const k = wr.width / canvas.width, r = shownVideo.rect;
  const w = r.w * k, h = r.h * k;
  Object.assign(g.style, { left: `${wr.left - area.left + r.x * k}px`, top: `${wr.top - area.top + r.y * k}px`, width: `${w}px`, height: `${h}px` });
  const dpr = Math.min(devicePixelRatio || 1, 2), cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr));
  if (g.width !== cw || g.height !== ch) {
    g.width = cw;
    g.height = ch;
  }
  g.getContext('2d').drawImage(shownVideo.el, 0, 0, cw, ch);
}

// The preview keeps the last good video frame so seeking never flashes or smears.
function refreshBackground() {
  const s = segs[playing ? active : segIndexAt(T)];
  if (s) {
    const el = s.m.el;
    if (el.readyState >= 2 && el.videoWidth) {
      const f = framingAt(s.c, el.currentTime);
      drawCover(bgCtx, el.videoWidth, el.videoHeight, (x, y, w, h) => bgCtx.drawImage(el, x, y, w, h), f);
      shownVideo = { el, rect: coverRect(el.videoWidth, el.videoHeight, f) };
    }
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
    const text = o.cues ? cueText(o, t) : o.text;
    const L = LAYOUTS[o.kind](o, o.upper ? text.toUpperCase() : text, o.x * W, o.y * H, o.width * W, u);
    o._box = L;
    let pin = 1, pout = 1;
    if (animate) {
      const all = o.kind === 'lower' ? text + o.sub : text;
      if (o.anim !== 'none') pin = clamp((t - o.start) / effectTime(o, o.anim, all, false));
      if (o.out !== 'none' && end < duration - 0.05) pout = clamp((end - t) / effectTime(o, o.out, all, true));
    }
    ctx.save();
    // Slant leans the whole graphic forward, boxes and letters alike, about its middle.
    if (o.slant) ctx.transform(1, 0, -o.slant, 1, o.slant * (L.y + L.h / 2), 0);
    let fx = null;
    for (const [type, p, out] of [[o.anim, pin, false], [o.out, pout, true]]) {
      if (p >= 1) continue;
      if (L.handles && L.handles.has(type)) fx = fx || { type, p, out };
      else applyEffect(type, p, L, u, out);
    }
    // Glow: lit letters bleed a little light in their own color. Only the letters glow, never the boxes.
    if (o.glow) {
      const fillText = ctx.fillText;
      ctx.fillText = function (...args) {
        this.save();
        this.shadowColor = this.fillStyle;
        this.shadowBlur = 12 * u;
        fillText.apply(this, args);
        this.restore();
      };
      L.paint(fx);
      delete ctx.fillText;
    } else L.paint(fx);
    ctx.restore();
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

/* ---------- stage sizing and direct manipulation ---------- */

const wrap = $('#wrap');
const sel = $('#sel');
const guideV = $('#guideV'), guideH = $('#guideH');

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
  if ($('#safe')) setTimeout(showSafeZones);
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
  sel.classList.toggle('tall', COVERS.has(o.kind));
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
  if (e.target.closest('.empty, .place-over') || exporting) return;
  const resize = e.target.classList.contains('grip'), resizeH = e.target.classList.contains('vgrip');
  const o = resize || resizeH ? selected() : hitTest(e);
  if (!o && !resize && !resizeH && (selectedClip() || gesture)) return reframe(e);
  if (!resize && !resizeH) select(o ? o.id : null);
  if (!o) return;
  const k = canvas.getBoundingClientRect().width;
  const kh = canvas.getBoundingClientRect().height;
  const { x: ox, y: oy, width: ow, h: oh } = o;
  const box0 = o._box && { x: o._box.ix, w: o._box.iw, y: o._box.y, h: o._box.h };
  const lines = snapLines(o);
  dragging(e, (dx, dy) => {
    if (resizeH) {
      o.h = clamp(oh + dy / kh, 0.02, 1);
      fillInspector();
    } else if (resize) {
      o.width = clamp(ow + dx / k, 0.05, 1);
      fillInspector();
    } else {
      o.x = clamp(ox + dx / k, -0.5, 1);
      o.y = clamp(oy + dy / kh, -0.1, 0.98);
      if (box0) snapDrag(o, ox, oy, box0, lines, canvas.width / k);
    }
  }, () => {
    guideV.hidden = guideH.hidden = true;
    save();
  });
});

/* ---------- alignment ---------- */

// The area graphics are placed in: a small margin, kept clear of the chosen app's buttons and captions
// when safe zones are on. Covers go right to the edges, since they hide things in the video itself.
function safeArea(o) {
  if (COVERS.has(o.kind)) return { l: 0, t: 0, r: 1, b: 1 };
  const a = { l: 0.05, t: 0.04, r: 0.95, b: 0.96 };
  const zones = state.format === '9:16' && SAFE_ZONES[safeZone];
  for (const [x, y, w, h] of zones || []) {
    if (w > 0.99 && y < 0.01) a.t = Math.max(a.t, y + h + 0.015);
    else if (w > 0.99) a.b = Math.min(a.b, y - 0.015);
    else if (x > 0.5) a.r = Math.min(a.r, x - 0.015);
  }
  return a;
}

// Lines a dragged graphic snaps to, in frame pixels: the frame's centre lines, the safe area's edges,
// and the edges and centres of the other graphics on screen.
function snapLines(o) {
  const W = canvas.width, H = canvas.height, a = safeArea(o);
  const xs = [W / 2, a.l * W, a.r * W], ys = [H / 2, a.t * H, a.b * H];
  for (const g of state.overlays) {
    const b = g._box;
    if (g === o || !b) continue;
    xs.push(b.ix, b.ix + b.iw / 2, b.ix + b.iw);
    ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  return { xs, ys };
}

// Nudges a dragged graphic onto the nearest line within a few screen pixels (left, centre or right
// edge; top, middle or bottom) and shows a guide where it snapped.
function snapDrag(o, ox, oy, box0, lines, pxPerScreen) {
  const W = canvas.width, H = canvas.height, reach = 7 * pxPerScreen;
  const nearest = (edges, targets) => {
    let best = null;
    for (const e of edges) for (const t of targets) if (Math.abs(t - e) < reach && (!best || Math.abs(t - e) < Math.abs(best.d))) best = { d: t - e, at: t };
    return best;
  };
  const left = box0.x + (o.x - ox) * W, top = box0.y + (o.y - oy) * H;
  const sx = nearest([left, left + box0.w / 2, left + box0.w], lines.xs);
  const sy = nearest([top, top + box0.h / 2, top + box0.h], lines.ys);
  if (sx) o.x += sx.d / W;
  if (sy) o.y += sy.d / H;
  guideV.hidden = !sx;
  guideH.hidden = !sy;
  if (sx) guideV.style.left = `${(sx.at / W) * 100}%`;
  if (sy) guideH.style.top = `${(sy.at / H) * 100}%`;
}

// Puts a graphic in one of nine spots in the safe area. Text lines up with the side it's placed on.
const ALIGNS = new Set(['lines', 'lower', 'quote', 'text', 'score', 'stat', 'scoop', 'deal', 'stamp']);
function placeAt(o, row, col) {
  if (!o) return;
  const a = safeArea(o), w = Math.min(o.width, a.r - a.l);
  if (ALIGNS.has(o.kind)) o.align = col;
  o.width = w;
  // Measure after any narrowing, since text can wrap onto more lines.
  drawFrame(T, false, () => ctx.drawImage(bgCanvas, 0, 0));
  const h = o._box ? o._box.h / canvas.height : 0.1;
  o.x = col === 'left' ? a.l : col === 'center' ? 0.5 - w / 2 : a.r - w;
  o.y = row === 'top' ? a.t : row === 'middle' ? (a.t + a.b) / 2 - h / 2 : a.b - h;
  fillInspector();
  save();
}

function placeButtons(box, onPick) {
  box.replaceChildren(...['top', 'middle', 'bottom'].flatMap((row) => ['left', 'center', 'right'].map((col) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `p-${row} p-${col}`;
    const name = row === 'middle' && col === 'center' ? 'centre' : `${row === 'middle' ? 'middle' : row} ${col === 'center' ? 'centre' : col}`;
    b.title = `Place ${name}`;
    b.setAttribute('aria-label', `Place ${name}`);
    b.append(document.createElement('i'));
    b.onclick = () => onPick(row, col);
    return b;
  })));
}
placeButtons($('#place'), (row, col) => placeAt(selected(), row, col));
// On a phone, the nine spots appear right on the video.
placeButtons($('#placeOver'), (row, col) => {
  placeAt(selected(), row, col);
  $('#placeOver').hidden = true;
});
$('#railPlace').onclick = () => ($('#placeOver').hidden = !$('#placeOver').hidden || !selected());

// With a clip selected, dragging the video moves it in the frame and pinching zooms.
// The change lands on a keyframe at the playhead, made there if needed.
let gesture = null;
const spread = (pts) => {
  const [a, b] = [...pts.values()];
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
};

function clipAtPlayhead() {
  const c = selectedClip(), s = segs.find((x) => x.c === c);
  if (!s) return null;
  if (T < s.start || T > s.start + s.len - 0.01) setTime(s.start);
  return { c, s, src: clamp(c.in + (T - s.start), c.in, c.out) };
}

function keyHere(c, src) {
  c.keys = c.keys || [];
  let k = c.keys.find((k) => Math.abs(k.t - src) < 0.02);
  if (!k) {
    const { x, y, zoom } = framingAt(c, src);
    k = { t: src, x, y, zoom, move: 'jump' };
    c.keys.push(k);
    c.keys.sort((a, b) => a.t - b.t);
  }
  return k;
}

function reframe(e) {
  e.preventDefault();
  if (gesture) {
    gesture.pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (gesture.pts.size === 2) gesture.pinch = { d: spread(gesture.pts), zoom: gesture.key ? gesture.key.zoom : framingAt(gesture.c, gesture.src).zoom };
    return;
  }
  const at = clipAtPlayhead();
  if (!at) return;
  pause();
  const { c, s, src } = at;
  const el = s.m.el, sw = el.videoWidth || 1920, sh = el.videoHeight || 1080;
  const g = gesture = { c, src, pts: new Map([[e.pointerId, [e.clientX, e.clientY]]]), last: [e.clientX, e.clientY], from: [e.clientX, e.clientY], key: null, pinch: null };
  const move = (ev) => {
    if (!g.pts.has(ev.pointerId)) return;
    g.pts.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (!g.key) {
      if (!g.pinch && Math.hypot(ev.clientX - g.from[0], ev.clientY - g.from[1]) < 5) return;
      g.key = keyHere(c, src);
    }
    if (g.pinch && g.pts.size > 1) {
      g.key.zoom = clamp(g.pinch.zoom * spread(g.pts) / g.pinch.d, 1, 5);
    } else if (g.pts.size === 1) {
      const shown = sw * baseScale(sw, sh) * g.key.zoom * (canvas.getBoundingClientRect().width / canvas.width);
      const shownH = shown * (sh / sw);
      g.key.x -= (ev.clientX - g.last[0]) / shown;
      g.key.y -= (ev.clientY - g.last[1]) / shownH;
    }
    g.last = [ev.clientX, ev.clientY];
    keepInFrame(g.key, sw, sh);
    syncFraming();
  };
  const up = (ev) => {
    g.pts.delete(ev.pointerId);
    if (g.pts.size === 1) {
      g.pinch = null;
      g.last = [...g.pts.values()][0];
    }
    if (g.pts.size) return;
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    gesture = null;
    if (!g.key) return select(null); // a tap on the video, not a drag
    renderTimeline();
    syncFraming();
    save();
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}

wrap.addEventListener('wheel', (e) => {
  if (!selectedClip() || exporting) return;
  e.preventDefault();
  const at = clipAtPlayhead();
  if (!at) return;
  pause();
  const k = keyHere(at.c, at.src), el = at.s.m.el;
  k.zoom = clamp(k.zoom * Math.exp(-e.deltaY * 0.0015), 1, 5);
  keepInFrame(k, el.videoWidth || 1920, el.videoHeight || 1080);
  renderTimeline();
  syncFraming();
  save();
}, { passive: false });

// The framing controls in the clip panel follow the keyframe under the playhead.
let shownKey;
function syncFraming() {
  const c = selectedClip(), s = c && segs.find((x) => x.c === c);
  if (!s) return;
  const src = clamp(c.in + (T - s.start), c.in, c.out);
  const inClip = T >= s.start && T <= s.start + s.len;
  const k = inClip && c.keys ? c.keys.find((k) => Math.abs(k.t - src) < 0.02) : null;
  shownKey = k;
  const f = inClip ? framingAt(c, src) : framingAt(c, c.in);
  const zoom = $('#clipZoom');
  if (zoom !== document.activeElement) zoom.value = Math.round(f.zoom * 100);
  $('#keyHere').setAttribute('aria-pressed', !!k);
  $('#keyHere').classList.toggle('on', !!k);
  const visible = (c.keys || []).filter((x) => x.t >= c.in && x.t <= c.out);
  $('#prevKey').disabled = !visible.some((x) => x.t < src - 0.02);
  $('#nextKey').disabled = !visible.some((x) => x.t > src + 0.02);
  $('#keyMove').querySelectorAll('button').forEach((b) => {
    b.disabled = !k || c.keys.indexOf(k) === 0;
    b.setAttribute('aria-pressed', !!k && k.move === b.dataset.v);
  });
  $('#resetFrame').disabled = !(c.keys && c.keys.length);
  rowsEl.querySelectorAll('.kf').forEach((d) => d.classList.toggle('on', d._key === k));
}

function jumpToKey(dir) {
  const at = clipAtPlayhead();
  if (!at) return;
  const { c, s, src } = at;
  const ks = (c.keys || []).filter((x) => x.t >= c.in && x.t <= c.out && (dir < 0 ? x.t < src - 0.02 : x.t > src + 0.02));
  const k = dir < 0 ? ks[ks.length - 1] : ks[0];
  if (k) setTime(s.start + (k.t - c.in));
  syncFraming();
}
$('#prevKey').onclick = () => jumpToKey(-1);
$('#nextKey').onclick = () => jumpToKey(1);
$('#keyHere').onclick = () => {
  const at = clipAtPlayhead();
  if (!at) return;
  const { c, src } = at;
  const k = c.keys && c.keys.find((k) => Math.abs(k.t - src) < 0.02);
  if (k) c.keys.splice(c.keys.indexOf(k), 1);
  else keyHere(c, src);
  renderTimeline();
  syncFraming();
  save();
};
$('#keyMove').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !shownKey) return;
  shownKey.move = b.dataset.v;
  syncFraming();
  save();
});
$('#clipZoom').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  if (Number.isNaN(v) || v < 100 || v > 500) return;
  const at = clipAtPlayhead();
  if (!at) return;
  const k = keyHere(at.c, at.src), el = at.s.m.el;
  k.zoom = v / 100;
  keepInFrame(k, el.videoWidth || 1920, el.videoHeight || 1080);
  renderTimeline();
  syncFraming();
  save();
});
$('#resetFrame').onclick = () => {
  const c = selectedClip();
  if (!c) return;
  delete c.keys;
  renderTimeline();
  syncFraming();
  save();
};

/* ---------- inspector ---------- */

const props = $('#props');
// What the text fields mean for each kind of graphic.
const TEXT_LABELS = { score: 'Teams and scores, one per line', stat: 'Stats, one per line', deal: 'Player', stamp: 'Stamp' };
const SUB_LABELS = { quote: 'Who said it', score: 'Game status', stat: 'Context', scoop: 'Reported by', deal: 'From > to' };
const ACCENT_LABELS = { lower: 'Accent', score: 'Status', stat: 'Accent', scoop: 'Tag', deal: 'Accent' };
const clipProps = $('#clipProps');

function select(id) {
  $('#placeOver').hidden = true;
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
  $('#editTabs').hidden = !o;
  clipProps.hidden = !c;
  $('#noSel').hidden = !!(o || c);
  if (c) {
    $('#clipTitle').textContent = c.name;
    clipProps.querySelectorAll('[data-c]').forEach((el) => {
      if (el.type === 'checkbox') el.checked = c[el.dataset.c];
      else if (el !== document.activeElement) el.value = 'time' in el.dataset ? fmtField(c[el.dataset.c]) : +c[el.dataset.c].toFixed(2);
    });
    const i = state.clips.indexOf(c);
    $('#earlier').disabled = i === 0;
    $('#later').disabled = i === state.clips.length - 1;
    syncFraming();
  }
  syncRails();
  if (!o) return;
  $('#propTitle').textContent = PRESETS[o.type].name;
  $('#subLabel').textContent = SUB_LABELS[o.kind] || 'Title or role';
  $('#accentLabel').textContent = ACCENT_LABELS[o.kind] || 'Highlight';
  const subs = o.type === 'subtitles';
  props.querySelectorAll('[data-for]').forEach((el) => (el.hidden = !el.dataset.for.split(' ').includes(o.kind)));
  props.querySelectorAll('[data-subs]').forEach((el) => (el.hidden = (el.dataset.subs === 'only') !== subs));
  const cue = subs ? cueAt(o, T) : null;
  $('#textLabel').textContent = subs ? 'Subtitle at the playhead' : TEXT_LABELS[o.kind] || 'Text';
  props.querySelector('[data-k="text"]').disabled = subs && !cue;
  props.querySelectorAll('[data-k]').forEach((el) => {
    if (el === document.activeElement && el.type !== 'range') return;
    const k = el.dataset.k, v = k === 'end' ? endOf(o) : subs && k === 'text' ? (cue ? cue.text : '') : o[k];
    if (v == null) return; // a setting this kind of graphic does not have
    if (el.type === 'checkbox') el.checked = v;
    else if ('time' in el.dataset) el.value = fmtField(v);
    else if (el.dataset.scale) el.value = Math.round(v * el.dataset.scale);
    else el.value = el.type === 'number' ? +v.toFixed(2) : v;
  });
  $('#align').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === o.align));
  props.querySelector('[data-k="subFont"]').value = subFontName(o);
  if (o.cues) props.querySelector('[data-k="follow"]').value = followsFootage(o) ? 'footage' : 'timeline';
  if (o.cues) props.querySelector('[data-k="karaoke"]').closest('label').hidden = !o.cues.some((c) => c.words);
  $('#subFontLabel').textContent = o.kind === 'quote' ? 'Attribution typeface' : o.kind === 'lower' ? 'Title typeface' : 'Small text typeface';
  syncChips();
  syncTabs();
  syncColorTarget();
}

props.addEventListener('input', (e) => {
  const el = e.target, k = el.dataset.k, o = selected();
  if (!k || !o) return;
  if (el.type === 'checkbox') o[k] = el.checked;
  else if ('time' in el.dataset) {
    const v = parseTime(el.value);
    if (Number.isNaN(v)) return;
    if (k === 'start') o.start = clamp(v, 0, endOf(o) - 0.1);
    else setEnd(o, v);
  } else if (el.type === 'range' || 'num' in el.dataset) o[k] = parseFloat(el.value);
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
  } else if (k === 'follow') {
    // Following footage needs to know which video; take the one under the playhead.
    if (el.value === 'footage' && !o.source) o.source = segs[segIndexAt(T)]?.m.name;
    o.follow = el.value;
  } else if (o.cues && k === 'text') {
    const cue = cueAt(o, T);
    if (cue) cue.text = el.value;
  } else o[k] = el.value;
  if (['text', 'start', 'end', 'offset', 'follow'].includes(k)) renderTimeline();
  if (k === 'hl') fitHighlight(o);
  if (k === 'kind' || k === 'hl') {
    fillInspector();
    renderTimeline();
  }
  save();
});

// Typed times are tidied into the usual format once the field is left.
for (const form of [props, clipProps]) {
  form.addEventListener('change', (e) => {
    if ('time' in e.target.dataset) fillInspector();
  });
}

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
const stepNumber = (e) => {
  const btn = e.target.closest('[data-step]');
  if (!btn) return;
  const input = btn.parentElement.querySelector('input');
  input.value = clamp((parseFloat(input.value) || 0) + +btn.dataset.step, +input.min, +input.max);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
props.addEventListener('click', stepNumber);
clipProps.addEventListener('click', stepNumber);
$('#align').addEventListener('click', (e) => {
  const o = selected(), b = e.target.closest('button');
  if (!o || !b) return;
  o.align = b.dataset.v;
  fillInspector();
  save();
});

$('#startHere').onclick = () => {
  const o = selected();
  if (!o) return;
  const len = endOf(o) - o.start;
  o.start = clamp(T, 0, duration - 0.1);
  setEnd(o, Math.min(o.start + len, duration));
  fillInspector();
  renderTimeline();
  commit();
};
$('#endHere').onclick = () => {
  const o = selected();
  if (!o) return;
  if (T <= o.start + 0.1) return toast('Move the playhead after the graphic’s start, then tap End here.');
  setEnd(o, T);
  fillInspector();
  renderTimeline();
  commit();
};
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
  const wasClip = !!selectedClipId;
  if (selectedClipId) {
    state.clips = state.clips.filter((c) => c.id !== selectedClipId);
    pause();
    recalc();
  } else state.overlays = state.overlays.filter((o) => o.id !== selectedId);
  select(null);
  renderTimeline();
  commit();
  toast(wasClip ? 'Clip removed.' : 'Deleted.', true);
}
$('#del').onclick = $('#delClip').onclick = removeSelected;

function addOverlay(o) {
  o.start = T >= duration - 0.5 ? 0 : T;
  setEnd(o, o.start + 5);
  state.overlays.push(o);
  renderTimeline();
  select(o.id);
  commit();
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
    const v = parseTime(el.value);
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
  const second = { ...s.c, id: uid(), in: cut, keys: s.c.keys && s.c.keys.map((k) => ({ ...k })) };
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
    { color: readable(b.extra), bg: b.extra, accent: b.light },
  ];
}

function renderLooks() {
  renderBrandDots();
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
  document.querySelectorAll('[data-k="font"], [data-k="subFont"], [data-b="head"], [data-b="body"]').forEach((el) => (el.innerHTML = html));
  buildChips(props.querySelector('[data-k="font"]'));
  buildChips(props.querySelector('[data-k="subFont"]'));
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
      commit();
      toast('Layout applied.', true);
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
  const root = document.documentElement.style;
  for (const k of ['dark', 'light', 'main', 'accent', 'extra']) root.setProperty(`--b-${k}`, b[k]);
  if (SPORTS) document.documentElement.dataset.look = b.look;
  renderLookPick();
  root.setProperty('--b-head', `"${b.head}"`);
  root.setProperty('--b-body', `"${b.body}"`);
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

// Chyron Sports: the looks, each shown as a little graphic in its own colors and typeface.
function renderLookPick() {
  const box = $('#lookPick');
  if (!box) return;
  box.replaceChildren(...Object.entries(LOOKS).map(([key, look]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `look-${key}`;
    b.setAttribute('aria-pressed', state.brand.look === key);
    const swatch = Object.assign(document.createElement('b'), { textContent: key === 'ice' ? 'Goal' : 'GOAL' });
    const ink = key === 'ice' ? look.brand.dark : key === 'jumbotron' ? look.brand.accent : look.brand.light;
    Object.assign(swatch.style, { fontFamily: `"${look.kinds.stamp.font || look.brand.head}"`, background: key === 'ice' ? look.brand.light : look.brand.dark, color: ink, borderColor: look.brand.extra });
    b.append(swatch, Object.assign(document.createElement('span'), { textContent: look.name }), Object.assign(document.createElement('small'), { textContent: look.hint }));
    b.onclick = () => applyLook(key);
    return b;
  }));
}

$('#brand').addEventListener('input', (e) => {
  const k = e.target.dataset.b;
  if (!k) return;
  const old = state.brand[k], val = e.target.value;
  state.brand[k] = val;
  // Graphics that were using the old brand value follow the change.
  for (const o of state.overlays) {
    for (const f of k === 'head' || k === 'body' ? ['font', 'subFont'] : ['color', 'bg', 'accent']) if (o[f] === old) o[f] = val;
  }
  renderLooks();
  fillInspector();
  save();
});
$('#brandBtn').onclick = () => $('#brand').showModal();
$('#brandDone').onclick = $('#brandClose').onclick = () => $('#brand').close();
$('#keysBtn').onclick = () => $('#keys').showModal();
$('#keysDone').onclick = () => $('#keys').close();
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

/* ---------- templates (Chyron Sports) ---------- */

// Each template swaps the graphics for a ready-made set for one kind of sports video, placed for 9:16.
const TEMPLATES = [
  { name: 'Scoop', hint: 'Insider news over footage', graphics: [['scoop'], ['via']] },
  { name: 'Trade deadline', hint: 'Trade stamp, from and to, retained', graphics: [['stamp', { text: 'Trade', y: 0.14 }], ['deal']] },
  {
    name: 'Goal', hint: 'Clip with a caption above', fit: 'contain',
    graphics: [['caption', { y: 0.17 }], ['situation', { text: 'P2 · 12:04 · Power play', y: 0.29 }], ['via', { y: 0.675, bgAlpha: 0 }]],
  },
  {
    name: 'Hat trick', hint: 'The line over the reel',
    graphics: [['take', { text: 'Matthews with *three* tonight' }], ['stat'], ['via']],
  },
  {
    name: 'Goalie night', hint: 'Saves and save percentage',
    graphics: [['take', { text: 'Bobrovsky stood on his *head*' }], ['stat', { text: '41 SV\n.976 SV%\n1 GA', sub: 'Shutout bid' }], ['via']],
  },
  {
    name: 'Final score', hint: 'Score bug and a caption',
    graphics: [['score', { text: 'FLA 4\nEDM 3', sub: 'Final/OT', size: 64, y: 0.07, align: 'center', team1: '#c8102e', team2: '#ff4c00' }], ['caption', { text: 'The Panthers win it in *overtime*', y: 0.14 }], ['via']],
  },
  {
    name: 'Fight', hint: 'Fight stamp and the penalties',
    graphics: [['stamp', { text: 'Fight', color: '$extra', bg: '$light', y: 0.12 }], ['situation', { text: 'P1 · 8:31 · Five for fighting', y: 0.25 }], ['via']],
  },
  { name: 'Hot take', hint: 'The take, who said it, a poll', tip: 'Add Captions for word-by-word captions.', graphics: [['take'], ['host'], ['poll']] },
  {
    name: 'Postgame', hint: 'Quote and name bar', tip: 'Add Captions to write out what’s said.',
    graphics: [['quote', { text: 'We have to be *better* in our own end.', sub: 'Kris Knoblauch', look: 'classic', y: 0.08 }], ['player', { text: 'Kris Knoblauch', sub: 'Oilers · Head coach' }], ['via', { text: 'via @EdmontonOilers' }]],
  },
  {
    name: 'Reaction', hint: 'Caption and the score',
    graphics: [['caption', { text: 'The bench reaction to the *OT winner*', y: 0.07 }], ['score', { y: 0.16, align: 'center', sub: 'Final/OT' }]],
  },
];

const templateGraphics = (t) => t.graphics.map(([type, extra]) => makeOverlay(type, extra));

function useTemplate(t) {
  state.overlays = templateGraphics(t);
  if (t.fit) $('#fit').value = state.fit = t.fit;
  select(null);
  renderTimeline();
  commit();
  toast(`${t.name} template applied.${t.tip ? ` ${t.tip}` : ''}`, true);
}

function renderTemplates() {
  const box = $('#templates');
  if (!box) return;
  box.replaceChildren(...TEMPLATES.map((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tpl';
    b.title = 'Replace the graphics with this template';
    b.append(Object.assign(document.createElement('b'), { textContent: t.name }), Object.assign(document.createElement('span'), { textContent: t.hint }));
    b.onclick = () => useTemplate(t);
    return b;
  }));
}
renderTemplates();

/* ---------- timeline ---------- */

const rowsEl = $('#rows');
const TYPE_ICONS = {
  headline: 'headline', label: 'label', lower: 'lower', quote: 'quote', credit: 'credit', text: 'text', image: 'image', logo: 'logo', subtitles: 'subs', cover: 'cover',
  score: 'score', stat: 'stat', scoop: 'scoop', deal: 'deal', stamp: 'stamp', breaking: 'label', caption: 'headline', take: 'take',
  situation: 'label', status: 'label', player: 'lower', host: 'lower', poll: 'quote', via: 'credit',
};
const ruler = $('#ruler');
const pct = (t) => `${(t / duration) * 100}%`;

function markSelection() {
  rowsEl.querySelectorAll('.row[data-id]').forEach((el) => el.classList.toggle('on', +el.dataset.id === selectedId));
  rowsEl.querySelectorAll('.vclip').forEach((el) => el.classList.toggle('on', +el.dataset.id === selectedClipId));
}

// Time marks along the top; finer as the timeline is zoomed in.
function renderRuler() {
  const span = duration / tlZoom;
  const step = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((s) => span / s <= 10) || 600;
  ruler.innerHTML = '';
  for (let n = 0; n * step < duration; n++) {
    const t = n * step, tick = document.createElement('i');
    tick.style.left = pct(t);
    tick.textContent = step < 1 ? fmt(t) : fmt(t).slice(0, -2);
    ruler.append(tick);
  }
  if (state.coverTime != null && state.coverTime <= duration) {
    const mark = document.createElement('b');
    mark.className = 'cover-mark';
    mark.style.left = pct(state.coverTime);
    mark.title = 'Cover image';
    ruler.append(mark);
  }
}

function renderTimeline() {
  layoutZoom();
  renderRuler();
  rowsEl.innerHTML = '';

  if (hasVideo) {
    const row = document.createElement('div');
    row.className = 'row video';
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.onpointerdown = (e) => seekFromLane(e, lane);
    for (const s of segs) {
      const el = document.createElement('div');
      el.className = 'vclip';
      el.dataset.id = s.c.id;
      el.style.left = pct(s.start);
      el.style.width = pct(s.len);
      el.textContent = s.c.name;
      el.title = 'Drag either end to trim';
      el.onpointerdown = (e) => startTrim(e, s, el, lane);
      // Framing keyframes show as diamonds; tap one to go to it.
      for (const k of s.c.keys || []) {
        if (k.t < s.c.in || k.t > s.c.out) continue;
        const d = document.createElement('i');
        d.className = `kf${k.move === 'glide' ? ' glide' : ''}`;
        d._key = k;
        d.style.left = `clamp(6px, ${((k.t - s.c.in) / s.len) * 100}%, calc(100% - 6px))`;
        d.title = k.move === 'glide' ? 'Keyframe (glide)' : 'Keyframe (jump)';
        d.onpointerdown = (e) => dragKey(e, s, k, d, el);
        el.append(d);
      }
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
    name.textContent = COVERS.has(o.kind) ? COVER_NAMES[o.kind] : o.auto ? 'Captions' : o.text.split('\n')[0].replace(/\*/g, '') || PRESETS[o.type].name;
    if (o.cues) name.textContent += ` (${o.cues.length})`;
    name.prepend(iconEl(TYPE_ICONS[o.type]));
    name.title = 'Tap to select, drag up or down to reorder';
    name.onpointerdown = (e) => dragLayer(e, row, o);
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.onpointerdown = (e) => seekFromLane(e, lane);
    if (o.cues) {
      // Subtitles show every line as its own block; click one to jump to it.
      for (const { c, start, end } of cuePlacements(o)) {
        if (start >= duration) break;
        const cue = document.createElement('div');
        cue.className = 'cue';
        cue.style.left = pct(start);
        cue.style.width = pct(end - start);
        cue.title = c.text;
        cue.onpointerdown = (e) => dragCue(e, o, c, start, cue, lane);
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

// Drag a layer's name up or down to change what sits in front; a tap just selects it.
// The row slides with the pointer and a line marks where it will land; rows only move on release,
// since moving the touched row mid-drag makes phones cancel the touch.
function dragLayer(e, row, o) {
  if (exporting) return;
  // On a touch screen a swipe scrolls the timeline; holding still for a moment picks the row up.
  if (e.pointerType === 'touch') {
    const hold = setTimeout(() => {
      cleanup();
      if (navigator.vibrate) navigator.vibrate(10);
      dragLayer({ ...e, pointerType: 'held', preventDefault() {}, clientY: e.clientY }, row, o);
    }, 320);
    const moved = (ev) => Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 8 && cleanup();
    const ended = (ev) => {
      cleanup();
      if (ev.type === 'pointerup') select(o.id);
    };
    const cleanup = () => {
      clearTimeout(hold);
      removeEventListener('pointermove', moved);
      removeEventListener('pointerup', ended);
      removeEventListener('pointercancel', ended);
      return true;
    };
    addEventListener('pointermove', moved);
    addEventListener('pointerup', ended);
    addEventListener('pointercancel', ended);
    return;
  }
  e.preventDefault();
  // Once a held row is picked up, stop the finger's movement from scrolling the timeline instead.
  const noScroll = (ev) => ev.preventDefault();
  if (e.pointerType === 'held') addEventListener('touchmove', noScroll, { passive: false });
  const rows = [...rowsEl.querySelectorAll('.row[data-id]')], from = rows.indexOf(row);
  const others = rows.filter((r) => r !== row);
  const mids = rows.map((r) => {
    const b = r.getBoundingClientRect();
    return b.top + b.height / 2;
  });
  const y0 = e.clientY;
  let moving = false, to = from;
  const move = (ev) => {
    const dy = ev.clientY - y0;
    if (!moving && Math.abs(dy) < 6) return;
    moving = true;
    row.classList.add('dragging');
    row.style.transform = `translateY(${dy}px)`;
    to = mids.filter((m, i) => i !== from && m < mids[from] + dy).length;
    others.forEach((r, i) => {
      r.classList.toggle('drop-before', i === to);
      r.classList.toggle('drop-after', to === others.length && i === others.length - 1);
    });
  };
  const up = () => {
    removeEventListener('touchmove', noScroll);
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    if (!moving) return select(o.id);
    // Rows run front to back; graphics are drawn back to front.
    others.splice(to, 0, row);
    const order = others.map((r) => +r.dataset.id).reverse();
    state.overlays.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    select(o.id);
    renderTimeline();
    save();
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
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
    // Keep the graphic on screen while it's moved, showing the edge being dragged.
    setTime(edge === 'end' ? endOf(o) - 0.02 : o.start + 0.01);
    renderTimeline();
    fillInspector();
  }, save);
}

// A press on empty lane space moves the playhead there, and dragging scrubs, like the ruler.
function seekFromLane(e, lane) {
  if (e.target !== lane || exporting) return;
  const r = lane.getBoundingClientRect();
  const x0 = e.clientX - r.left;
  setTime((x0 / r.width) * duration);
  dragging(e, (dx) => setTime(((x0 + dx) / r.width) * duration));
}

// Dragging either end of a clip trims it; everything after shuffles along.
// Tap a keyframe diamond to go to it; drag it to retime it. Option/Alt-drag moves a copy instead.
// It stays inside the clip and between its neighbours, and snaps to the clip's ends and to where
// graphics start or end. The diamond moves in place (re-rendering mid-drag cancels touches on phones).
const keyTip = Object.assign(document.createElement('div'), { className: 'key-tip', hidden: true });
document.body.append(keyTip);

function dragKey(e, s, k, diamond, bar) {
  e.stopPropagation();
  e.preventDefault();
  if (exporting) return;
  const c = s.c, t0 = k.t, x0 = e.clientX, FRAME = 1 / 30;
  selectClip(c.id);
  pause();
  const pxPerSec = bar.offsetWidth / s.len;
  // Snap targets in the clip's own time, with a name for the tip.
  const toSrc = (T) => c.in + (T - s.start);
  const targets = [[c.in, 'clip start'], [c.out, 'clip end']];
  for (const o of state.overlays) {
    const name = COVERS.has(o.kind) ? COVER_NAMES[o.kind] : (o.text.split('\n')[0].replace(/\*/g, '') || PRESETS[o.type].name).slice(0, 24);
    targets.push([toSrc(o.start), `${name} starts`], [toSrc(endOf(o)), `${name} ends`]);
  }
  let moving = false, key = k, el = diamond;
  const move = (ev) => {
    const dx = ev.clientX - x0;
    if (!moving && Math.abs(dx) < 5) return;
    if (!moving) {
      moving = true;
      if (e.altKey) {
        key = { ...k };
        c.keys.push(key);
        el = diamond.cloneNode();
        el._key = key;
        bar.append(el);
      }
      el.classList.add('dragging');
    }
    let t = t0 + dx / pxPerSec, snapped = '';
    for (const [at, label] of targets) {
      if (Math.abs(at - t) * pxPerSec < 8 && (!snapped || Math.abs(at - t) < Math.abs(snapped[0] - t))) snapped = [at, label];
    }
    if (snapped) t = snapped[0];
    // Neighbours: the keyframes either side of where it started. A copy treats the original as a neighbour.
    const others = c.keys.filter((x) => x !== key && x !== k);
    let lo = Math.max(c.in, ...others.filter((x) => x.t < t0).map((x) => x.t + FRAME));
    let hi = Math.min(c.out, ...others.filter((x) => x.t > t0).map((x) => x.t - FRAME));
    if (key !== k) {
      if (dx > 0) lo = Math.max(lo, t0 + FRAME);
      else hi = Math.min(hi, t0 - FRAME);
    }
    const clamped = clamp(t, lo, hi);
    if (clamped !== t) snapped = '';
    key.t = clamped;
    c.keys.sort((a, b) => a.t - b.t);
    el.style.left = `clamp(6px, ${((key.t - c.in) / s.len) * 100}%, calc(100% - 6px))`;
    setTime(s.start + (key.t - c.in));
    keyTip.hidden = false;
    keyTip.textContent = `${key !== k ? 'Copy · ' : ''}${fmt(s.start + (key.t - c.in))}${snapped ? ` · ${snapped[1]}` : ''}`;
    keyTip.style.left = `${ev.clientX}px`;
    keyTip.style.top = `${bar.getBoundingClientRect().top}px`;
  };
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    keyTip.hidden = true;
    if (!moving) setTime(s.start + (k.t - c.in));
    else {
      renderTimeline();
      save();
    }
    syncFraming();
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}

// Caption and subtitle lines: tap to go to one; drag an end to change when it starts or stops,
// or the middle to move it. Lines can't overlap their neighbours. Word timings stretch to fit.
function dragCue(e, o, c, start, el, lane) {
  e.preventDefault();
  if (exporting) return;
  select(o.id);
  const px = e.clientX - el.getBoundingClientRect().left;
  const grip = Math.min(GRIP, el.offsetWidth / 3);
  const edge = px < grip ? 'start' : px > el.offsetWidth - grip ? 'end' : 'move';
  const s0 = c.start, e0 = c.end, w0 = c.words && c.words.map((w) => [...w]);
  const sorted = [...o.cues].sort((a, b) => a.start - b.start), i = sorted.indexOf(c);
  const lo = sorted[i - 1] ? sorted[i - 1].end : -Infinity, hi = sorted[i + 1] ? sorted[i + 1].start : Infinity;
  const pxPerSec = lane.clientWidth / duration;
  let moved = false;
  dragging(e, (dx) => {
    if (!moved && Math.abs(dx) < 4) return;
    moved = true;
    const dt = dx / pxPerSec;
    if (edge === 'start') c.start = clamp(s0 + dt, lo, c.end - 0.1);
    else if (edge === 'end') c.end = clamp(e0 + dt, c.start + 0.1, hi);
    else {
      const d = clamp(dt, lo - s0, hi - e0);
      c.start = s0 + d;
      c.end = e0 + d;
    }
    if (w0) {
      const k = (c.end - c.start) / (e0 - s0);
      c.words = w0.map(([a, b]) => [c.start + (a - s0) * k, c.start + (b - s0) * k]);
    }
    el.style.left = pct(start + (c.start - s0));
    el.style.width = pct(c.end - c.start);
    const at = edge === 'end' ? start + (c.end - s0) - 0.02 : start + (c.start - s0) + 0.01;
    setTime(at);
    keyTip.hidden = false;
    keyTip.textContent = `${edge === 'end' ? 'Ends' : 'Starts'} ${fmt(at)}`;
    keyTip.style.left = `${e.clientX + dx}px`;
    keyTip.style.top = `${lane.getBoundingClientRect().top}px`;
  }, () => {
    keyTip.hidden = true;
    if (!moved) setTime(start + 0.01);
    else {
      renderTimeline();
      save();
    }
    fillInspector();
  });
}

/* ---------- timeline zoom ---------- */

// Zooming widens every lane together; the timeline scrolls sideways and the layer names stay put.
const tracksEl = $('#tracks');
let tlZoom = 1;
const maxZoom = () => clamp(duration / 1.5, 1, 100);
const laneStart = () => parseFloat(getComputedStyle(tracksEl).paddingLeft) + parseFloat(getComputedStyle(tracksEl).getPropertyValue('--label-w'));

function layoutZoom() {
  tlZoom = clamp(tlZoom, 1, maxZoom());
  const cs = getComputedStyle(tracksEl);
  const room = tracksEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.getPropertyValue('--label-w'));
  tracksEl.style.setProperty('--lane-w', `${Math.max(40, room * tlZoom)}px`);
  const slider = $('#tlZoom');
  if (slider !== document.activeElement) slider.value = maxZoom() > 1 ? Math.log(tlZoom) / Math.log(maxZoom()) : 0;
  $('#tlOut').disabled = tlZoom <= 1;
  $('#tlIn').disabled = tlZoom >= maxZoom();
}

// Zooms while keeping one moment fixed under the pointer, or the playhead centred.
function setZoom(z, clientX) {
  const r = tracksEl.getBoundingClientRect();
  const w0 = ruler.offsetWidth;
  const offset = clientX != null ? clientX - r.left : laneStart() + (tracksEl.clientWidth - laneStart()) / 2;
  const t = clientX != null ? ((tracksEl.scrollLeft + offset - laneStart()) / w0) * duration : T;
  tlZoom = clamp(z, 1, maxZoom());
  layoutZoom();
  renderRuler();
  tracksEl.scrollLeft = laneStart() + (t / duration) * ruler.offsetWidth - offset;
}

$('#tlZoom').oninput = (e) => setZoom(maxZoom() ** +e.target.value);
$('#tlIn').onclick = () => setZoom(tlZoom * 1.6);
$('#tlOut').onclick = () => setZoom(tlZoom / 1.6);
// Trackpad pinch (and Ctrl/⌘-scroll) on the timeline zooms it.
tracksEl.addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  setZoom(tlZoom * Math.exp(-e.deltaY * 0.01), e.clientX);
}, { passive: false });
// Safari sends pinches on Mac trackpads and iPhone screens as gestures.
let pinchFrom = 1;
tracksEl.addEventListener('gesturestart', (e) => {
  e.preventDefault();
  pinchFrom = tlZoom;
});
tracksEl.addEventListener('gesturechange', (e) => {
  e.preventDefault();
  setZoom(pinchFrom * e.scale, e.clientX);
});
new ResizeObserver(() => layoutZoom()).observe(tracksEl);

// While playing zoomed in, the view pages along to keep the playhead in sight.
function followPlayhead() {
  if (!playing || tlZoom <= 1) return;
  const x = laneStart() + (T / duration) * ruler.offsetWidth;
  const left = tracksEl.scrollLeft + laneStart(), right = tracksEl.scrollLeft + tracksEl.clientWidth - 24;
  if (x < left || x > right) tracksEl.scrollLeft = x - laneStart() - 24;
}

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
        const f = framingAt(s.c, times[n - first]);
        drawFrame(T, true, () => {
          if (sample) drawCover(ctx, sample.displayWidth, sample.displayHeight, (x, y, w, h) => sample.draw(ctx, x, y, w, h), f);
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

const SHAPE_NAMES = { '9:16': 'Vertical 9:16', '4:5': 'Portrait 4:5', '1:1': 'Square 1:1', '16:9': 'Wide 16:9' };
const shapeTag = (f) => f.replace(':', 'x');

// A row of shape tiles to tick, each drawn at its own proportions.
function shapePicker(box, chosen, onChange) {
  box.replaceChildren(...Object.keys(FORMATS).map((f) => {
    const [w, h] = FORMATS[f];
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', chosen.has(f));
    const frame = document.createElement('i');
    const k = 44 / Math.max(w, h);
    Object.assign(frame.style, { width: `${Math.round(w * k)}px`, height: `${Math.round(h * k)}px` });
    b.append(frame, SHAPE_NAMES[f]);
    b.onclick = () => {
      if (chosen.has(f) && chosen.size > 1) chosen.delete(f);
      else chosen.add(f);
      b.setAttribute('aria-pressed', chosen.has(f));
      onChange();
    };
    return b;
  }));
  onChange();
}

// Draws and encodes the whole video once at the current shape.
async function exportOnce() {
  let blob = null;
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
  return blob;
}

let exportChoice;
function openExport() {
  if (exporting) return;
  if (!hasVideo) return toast('Add a video first, then export.');
  exportChoice = new Set((state.exportShapes || [state.format]).filter((f) => FORMATS[f]));
  if (!exportChoice.size) exportChoice.add(state.format);
  shapePicker($('#exportShapes'), exportChoice, () => {
    const n = exportChoice.size;
    $('#exportGo').textContent = n > 1 ? `Export ${n} videos` : 'Export video';
  });
  $('#exportDlg').showModal();
}
$('#exportCancel').onclick = () => $('#exportDlg').close();
$('#exportGo').onclick = () => {
  $('#exportDlg').close();
  state.exportShapes = Object.keys(FORMATS).filter((f) => exportChoice.has(f));
  save();
  exportVideo(state.exportShapes);
};

// Exports each chosen shape in turn, then hands over all the files together.
async function exportVideo(shapes = [state.format]) {
  if (exporting) return;
  if (!hasVideo) return toast('Add a video first, then export.');
  pause();
  const resumeAt = T, shapeBefore = state.format;
  cancelled = false;
  exporting = true;
  $('#exporting').hidden = false;
  const files = [];
  let problem = null;
  try {
    for (const [i, f] of shapes.entries()) {
      if (cancelled) break;
      setFormat(f);
      exportProgress = 0;
      $('#exportTitle').textContent = shapes.length > 1 ? `Exporting ${i + 1} of ${shapes.length}: ${SHAPE_NAMES[f]}` : 'Exporting your video';
      const blob = await exportOnce();
      if (!blob) break;
      const ext = blob.type === 'video/mp4' ? 'mp4' : 'webm';
      files.push({ blob, name: `${projectName()}-graphics${shapes.length > 1 ? `-${shapeTag(f)}` : ''}.${ext}` });
    }
  } catch (err) {
    problem = err;
  }
  exporting = false;
  exportMode = null;
  $('#exporting').hidden = true;
  setFormat(shapeBefore);
  setTime(resumeAt);
  if (problem) return toast(`Export stopped: ${problem.message}`);
  if (cancelled || !files.length) return toast('Export cancelled.');
  deliver(files, files.length > 1 ? `${files.length} videos exported.` : `Video exported as ${files[0].name}`);
}

// On a phone, offer the share sheet so files can go straight to Photos or another app.
// Sharing needs a fresh tap, so it waits behind a button rather than running when export ends.
function deliver(items, msg) {
  const files = items.map(({ blob, name }) => new File([blob], name, { type: blob.type }));
  const downloadAll = () => items.forEach(({ blob, name }, i) => setTimeout(() => download(blob, name), i * 400));
  if (!touch || !navigator.canShare || !navigator.canShare({ files })) {
    downloadAll();
    return toast(msg);
  }
  const image = items[0].blob.type.startsWith('image/'), many = items.length > 1;
  const what = image ? (many ? 'images are' : 'image is') : many ? 'videos are' : 'video is';
  $('#doneTitle').textContent = `Your ${what} ready`;
  $('#doneMsg').textContent = `Choose Save ${image ? 'Image' : 'Video'} in the share sheet to put ${many ? 'them' : 'it'} in Photos, or send ${many ? 'them' : 'it'} straight to an app.`;
  $('#done').hidden = false;
  $('#shareFile').onclick = () => navigator.share({ files }).then(() => ($('#done').hidden = true), () => {});
  $('#downloadFile').onclick = () => {
    downloadAll();
    $('#done').hidden = true;
  };
}
$('#closeDone').onclick = () => ($('#done').hidden = true);

$('#export').onclick = openExport;
$('#cancel').onclick = () => {
  cancelled = true;
  if (stopRealtime) stopRealtime();
};

/* ---------- cover image ---------- */

// Pick a frame to save as the post's cover image, with or without the graphics, in any shapes.
const coverDlg = $('#coverDlg');
let coverChoice;

$('#still').onclick = () => {
  if (!hasVideo) return toast('Add a video first, then pick a cover image.');
  pause();
  const t = state.coverTime != null ? clamp(state.coverTime, 0, duration) : T;
  setTime(t);
  Object.assign($('#coverTime'), { max: duration, value: t });
  coverChoice = new Set([state.format]);
  shapePicker($('#coverShapes'), coverChoice, () => {
    $('#coverSave').textContent = coverChoice.size > 1 ? `Save ${coverChoice.size} images` : 'Save image';
  });
  coverDlg.showModal();
  coverThumbs();
};
$('#coverTime').oninput = (e) => {
  setTime(+e.target.value);
  state.coverTime = T;
  renderTimeline();
  save();
};
$('#coverClose').onclick = () => coverDlg.close();

// The preview copies the main picture each frame, with or without graphics.
function updateCoverPreview() {
  if (!coverDlg.open) return;
  const c = $('#coverPreview');
  const h = Math.round((c.width * canvas.height) / canvas.width);
  if (c.height !== h) c.height = h;
  c.getContext('2d').drawImage($('#coverGraphics').checked ? canvas : bgCanvas, 0, 0, c.width, c.height);
}

// A strip of frames across the whole video to jump between.
async function coverThumbs() {
  const strip = $('#coverStrip');
  strip.replaceChildren();
  if (!MB) return;
  const n = 8, tw = 90, k = tw / canvas.width;
  const times = Array.from({ length: n }, (_, i) => (duration * (i + 0.5)) / n);
  const cells = times.map((t) => {
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = Math.round(canvas.height * k);
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Go to ${fmt(t)}`);
    b.append(c);
    b.onclick = () => {
      setTime(t);
      $('#coverTime').value = t;
      state.coverTime = t;
      renderTimeline();
      save();
    };
    strip.append(b);
    return c;
  });
  const inputs = new Map();
  try {
    for (const s of segs) {
      const mine = times.map((t, i) => [t, i]).filter(([t]) => t >= s.start && t < s.start + s.len);
      if (!mine.length) continue;
      if (!inputs.has(s.m.name)) inputs.set(s.m.name, new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(s.m.file) }));
      const track = await inputs.get(s.m.name).getPrimaryVideoTrack();
      const src = mine.map(([t]) => s.c.in + (t - s.start));
      let j = 0;
      for await (const sample of new MB.VideoSampleSink(track).samplesAtTimestamps(src)) {
        const [, i] = mine[j];
        if (sample) {
          const g = cells[i].getContext('2d');
          g.setTransform(k, 0, 0, k, 0, 0);
          drawCover(g, sample.displayWidth, sample.displayHeight, (x, y, w, h) => sample.draw(g, x, y, w, h), framingAt(s.c, src[j]));
          sample.close();
        }
        j++;
      }
    }
  } catch (err) {
    console.warn('Could not make cover thumbnails:', err);
  } finally {
    for (const input of inputs.values()) input.dispose();
  }
}

// Draws the chosen moment at each chosen shape and saves them as JPEGs.
$('#coverSave').onclick = async () => {
  const shapeBefore = state.format, graphics = $('#coverGraphics').checked;
  const files = [];
  for (const f of Object.keys(FORMATS).filter((f) => coverChoice.has(f))) {
    setFormat(f);
    refreshBackground();
    if (graphics) drawFrame(T, false, () => ctx.drawImage(bgCanvas, 0, 0));
    const blob = await new Promise((done) => (graphics ? canvas : bgCanvas).toBlob(done, 'image/jpeg', 0.92));
    files.push({ blob, name: `${projectName()}-cover${coverChoice.size > 1 ? `-${shapeTag(f)}` : ''}.jpg` });
  }
  setFormat(shapeBefore);
  coverDlg.close();
  deliver(files, files.length > 1 ? `${files.length} cover images saved.` : 'Cover image saved.');
};

let toastTimer;
// A short message. With `undo`, it carries an Undo button and stays a little longer.
function toast(msg, undo = false) {
  const el = $('#toast');
  ($('#brand').open ? $('#brand') : document.body).append(el); // stay visible above an open dialog
  el.textContent = msg;
  if (undo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Undo';
    b.onclick = () => {
      el.hidden = true;
      stepHistory(-1);
    };
    el.append(b);
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), undo ? 8000 : 5000);
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
  if (e.target.closest('input, textarea, select') || exporting || document.querySelector('dialog[open]:not(.transcript)')) return;
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
  } else if (e.key === '?') {
    e.preventDefault();
    $('#keys').showModal();
  } else if (!mod && (e.key === 's' || e.key === 'S') && hasVideo) {
    e.preventDefault();
    $('#split').click();
  } else if (o && (e.key === '[' || e.key === ']')) {
    e.preventDefault();
    $(e.key === '[' ? '#startHere' : '#endHere').click();
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault();
    setTime(e.key === 'Home' ? 0 : duration - 0.02);
  } else if (',.<>'.includes(e.key) || (!o && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) {
    // Step the playhead: a tenth of a second, or a second with Shift.
    e.preventDefault();
    const back = e.key === ',' || e.key === 'ArrowLeft' || e.key === '<';
    setTime(T + (back ? -1 : 1) * (e.shiftKey ? 1 : 0.1));
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
  updateGhost();
  updateCoverPreview();
  updateTranscript();
  if (selectedClipId && !gesture) syncFraming();
  // Keep the subtitle text box showing the line under the playhead.
  const subs = selected();
  const cue = subs && subs.cues ? cueAt(subs, T) : null;
  if (cue !== shownCue) {
    shownCue = cue;
    fillInspector();
  }
  $('#playhead').style.left = pct(T);
  followPlayhead();
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

/* ---------- auto captions ---------- */

// Speech becomes captions on this device: each video's audio is decoded here, Whisper runs in a worker,
// and the timed words become a captions layer that follows its footage like uploaded subtitles.
const captionDlg = $('#captionDlg');
let captionPrefs = { quality: 'accurate', look: 'lines', words: 6 };
try {
  const kept = JSON.parse(localStorage.getItem('chyron-captions') || '{}');
  captionPrefs = { ...captionPrefs, look: kept.look || captionPrefs.look, words: kept.words || captionPrefs.words, quality: kept.v2 ? kept.quality : 'accurate' };
} catch {}
let captionWorker = null;
let captioning = false;
// Tests can swap in their own worker.
window.makeCaptionWorker = () => new Worker('caption-worker.js', { type: 'module' });

function showCaptionPrefs() {
  $('#capWords').value = captionPrefs.words;
  for (const [id, k] of [['#capQuality', 'quality'], ['#capLook', 'look']]) {
    $(id).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === captionPrefs[k]));
  }
}
function keepCaptionPrefs() {
  try {
    localStorage.setItem('chyron-captions', JSON.stringify({ ...captionPrefs, v2: true }));
  } catch {}
}
for (const [id, k] of [['#capQuality', 'quality'], ['#capLook', 'look']]) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || captioning) return;
    captionPrefs[k] = b.dataset.v;
    if (k === 'look') captionPrefs.words = b.dataset.v === 'words' ? 3 : 6;
    showCaptionPrefs();
    keepCaptionPrefs();
  });
}
$('#capWords').oninput = (e) => {
  const v = parseInt(e.target.value, 10);
  if (v >= 1 && v <= 12) captionPrefs.words = v;
  keepCaptionPrefs();
};
$('#capWords').closest('.num').addEventListener('click', stepNumber);

$('#addCaptions').onclick = () => {
  if (!hasVideo) return toast('Add a video first, then make captions.');
  showAddSheet(false);
  showCaptionPrefs();
  captionStatus('');
  showModelStore();
  captionDlg.showModal();
};

// The speech model lives in the browser's own storage: transformers.js keeps it in 'transformers-cache',
// and the service worker keeps the speech library from jsDelivr alongside the app's files.
const MODEL_CACHE = 'transformers-cache';
const isEngineFile = (url) => url.includes('cdn.jsdelivr.net/npm/@huggingface/') || url.includes('cdn.jsdelivr.net/npm/onnxruntime-web');

async function modelBytes() {
  let bytes = 0, found = false;
  for (const name of await caches.keys()) {
    if (name !== MODEL_CACHE && !name.startsWith('chyron-')) continue;
    const cache = await caches.open(name);
    for (const req of await cache.keys()) {
      if (name !== MODEL_CACHE && !isEngineFile(req.url)) continue;
      found = true;
      const res = await cache.match(req);
      bytes += +(res && res.headers.get('content-length')) || 0;
    }
  }
  return found ? bytes : null;
}

async function showModelStore() {
  const box = $('#modelStore');
  box.hidden = true;
  if (!('caches' in window)) return;
  try {
    const bytes = await modelBytes();
    if (bytes === null) return;
    const kept = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    const size = bytes ? ` (${Math.round(bytes / 1e6)} MB)` : '';
    $('#modelInfo').textContent = `Speech model saved on this device${size}${kept ? ', protected from automatic clean-up' : ''}.`;
    box.hidden = false;
  } catch (err) {
    console.warn('Could not read the speech model cache:', err);
  }
}

$('#modelRemove').onclick = async () => {
  if (captioning) return;
  if (captionWorker) captionWorker.terminate();
  captionWorker = null;
  await caches.delete(MODEL_CACHE);
  for (const name of await caches.keys()) {
    if (!name.startsWith('chyron-')) continue;
    const cache = await caches.open(name);
    for (const req of await cache.keys()) if (isEngineFile(req.url)) await cache.delete(req);
  }
  $('#modelStore').hidden = true;
  toast('Speech model removed. It downloads again the next time you make captions.');
};

// Asks the browser not to clear Chyron's storage (saved work, speech model) when space runs low.
// Firefox asks the person, so there it only happens when making captions.
function keepStorage() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
if (!/Firefox/.test(navigator.userAgent)) keepStorage();
$('#capCancel').onclick = () => {
  if (captioning) stopCaptions();
  captionDlg.close();
};

function captionStatus(msg, progress = null) {
  $('#capStatus').hidden = !msg;
  $('#capMsg').textContent = msg;
  $('#capBar').hidden = progress === null;
  $('#capBar').classList.toggle('busy', progress === -1);
  $('#capBar i').style.width = progress > 0 ? `${progress * 100}%` : '';
}

function stopCaptions() {
  if (captionWorker) captionWorker.terminate();
  captionWorker = null;
  captioning = false;
  lockCaptionOptions(false);
}
function lockCaptionOptions(on) {
  $('#capGo').disabled = on;
  captionDlg.querySelectorAll('.seg button, .num button, #capWords').forEach((el) => (el.disabled = on));
}

// A video's sound between two times, as 16 kHz mono, the way Whisper wants it.
async function speechAudio(file, from, to) {
  const input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(file) });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) return null;
    const rate = 16000, mix = new OfflineAudioContext(1, Math.max(1, Math.ceil((to - from) * rate)), rate);
    for await (const part of new MB.AudioBufferSink(track).buffers(from, to)) {
      const src = mix.createBufferSource();
      src.buffer = part.buffer;
      src.connect(mix.destination);
      const at = part.timestamp - from;
      if (at >= 0) src.start(at);
      else src.start(0, -at);
    }
    return (await mix.startRendering()).getChannelData(0);
  } finally {
    input.dispose();
  }
}

// Runs one video's audio through the worker; resolves with { words, chunks } in that audio's time.
function transcribe(audio, onMessage) {
  return new Promise((resolve, reject) => {
    captionWorker = captionWorker || window.makeCaptionWorker();
    captionWorker.onmessage = ({ data }) => {
      if (data.type === 'done') resolve(data);
      else if (data.type === 'error') reject(new Error(data.message));
      else onMessage(data);
    };
    // A worker that fails to start usually couldn't fetch the speech library.
    captionWorker.onerror = (e) => reject(new Error(e.message || 'Failed to load the speech library'));
    captionWorker.postMessage({ audio, quality: captionPrefs.quality }, [audio.buffer]);
  });
}

// Whisper's words (or phrases, spread evenly over their words) → [{ text, start, end }].
function timedWords({ words, chunks }, shift) {
  const out = [];
  for (const c of chunks) {
    const start = c.start + shift, end = (c.end ?? c.start + 0.5) + shift;
    const parts = c.text.trim().split(/\s+/).filter(Boolean);
    if (words || parts.length < 2) {
      if (parts.length) out.push({ text: parts.join(' '), start, end: Math.max(end, start + 0.05) });
      continue;
    }
    const total = parts.reduce((n, w) => n + w.length + 1, 0);
    let t = start;
    for (const w of parts) {
      const d = ((end - start) * (w.length + 1)) / total;
      out.push({ text: w, start: t, end: t + d });
      t += d;
    }
  }
  return out;
}

// Groups words into caption lines: up to `max` words, breaking at pauses and sentence ends.
function captionCues(words, max) {
  const cues = [];
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const text = group.map((w) => w.text).join(' ');
    cues.push({ start: group[0].start, end: group[group.length - 1].end, text, words: group.map((w) => [w.start, w.end]) });
    group = [];
  };
  for (const w of words) {
    const last = group[group.length - 1];
    if (last && (group.length >= max || w.start - last.end > 0.7 || /[.?!]$/.test(last.text))) flush();
    group.push(w);
  }
  flush();
  // Keep each line up long enough to read, without running into the next.
  cues.forEach((c, i) => {
    const next = cues[i + 1];
    c.end = Math.max(c.end, c.start + 0.6);
    if (next) c.end = Math.min(c.end, next.start);
  });
  return cues.filter((c) => c.end > c.start);
}

$('#capGo').onclick = async () => {
  if (captioning) return;
  if (!MB) return captionStatus('Captions need a newer browser.');
  keepStorage();
  captioning = true;
  lockCaptionOptions(true);
  const made = [];
  try {
    // Each video file is heard once, over the stretch its clips use.
    const files = new Map();
    for (const s of segs) {
      const r = files.get(s.m.name) || { m: s.m, from: Infinity, to: 0 };
      r.from = Math.min(r.from, s.c.in);
      r.to = Math.max(r.to, s.c.out);
      files.set(s.m.name, r);
    }
    let n = 0;
    for (const { m, from, to } of files.values()) {
      n++;
      const which = files.size > 1 ? ` (${n} of ${files.size})` : '';
      captionStatus(`Getting the sound${which}…`, -1);
      const audio = await speechAudio(m.file, from, to);
      if (!captioning) return;
      if (!audio) continue;
      const started = performance.now();
      const result = await transcribe(audio, (msg) => {
        if (msg.type === 'download') {
          const mb = (x) => Math.round(x / 1e6);
          captionStatus(`Downloading the speech model, first time only: ${mb(msg.loaded)} of ${mb(msg.total)} MB`, msg.total ? msg.loaded / msg.total : -1);
        } else if (msg.type === 'listening') {
          captionStatus(`Listening${which}… this can take about as long as the video.`, -1);
        }
      });
      if (!captioning) return;
      const cues = captionCues(timedWords(result, from), captionPrefs.words);
      if (!cues.length) continue;
      made.push(addCaptionLayer(m.name, cues));
      console.info(`Captions for ${m.name} took ${((performance.now() - started) / 1000).toFixed(1)} s`);
    }
  } catch (err) {
    console.warn('Captions failed:', err);
    const offline = /fetch|network|load/i.test(err.message);
    captionStatus(offline ? 'Couldn’t download the speech model. Check the internet connection and try again; after the first time it works offline.' : `Captions stopped: ${err.message}`);
    stopCaptions();
    return;
  }
  stopCaptions();
  if (!made.length) return captionStatus('No speech was found in this video.');
  captionDlg.close();
  renderTimeline();
  select(made[0].id);
  save();
  const lines = made.reduce((n, o) => n + o.cues.length, 0);
  toast(`${lines} captions added. Check them over with Edit as transcript in the captions settings.`);
};

function addCaptionLayer(source, cues) {
  const words = captionPrefs.look === 'words';
  const look = words
    ? { size: 64, y: 0.6, karaoke: true }
    : { karaoke: false };
  const o = makeOverlay('subtitles', { cues, source, follow: 'footage', auto: true, ...look });
  state.overlays.push(o);
  return o;
}

/* ---------- transcript ---------- */

// Every line of a captions or subtitles layer, to read, edit, split, join or delete in one list.
// It sits beside the video (not over it), so lines can be played while editing.
const transcript = $('#transcript');
let trId = null, playUntil = null;
// Looked up by id each time, since undo swaps in fresh copies of every layer.
const trLayer = () => state.overlays.find((x) => x.id === trId && x.cues) || null;

$('#openTranscript').onclick = () => {
  const o = selected();
  if (!o || !o.cues) return;
  trId = o.id;
  renderTranscript();
  transcript.show();
  placeTranscript();
};

// On a computer the panel stops above the timeline, so lines can still be dragged there.
function placeTranscript() {
  transcript.style.bottom = phone() ? '' : `${innerHeight - $('.timeline').getBoundingClientRect().top + 8}px`;
}
addEventListener('resize', () => transcript.open && placeTranscript());
$('#trClose').onclick = () => transcript.close();

// Where each line first shows on the timeline (lines cut out of the edit have none).
function lineTimes(o) {
  const at = new Map();
  for (const p of cuePlacements(o)) if (!at.has(p.c)) at.set(p.c, p);
  return at;
}

function renderTranscript() {
  const o = trLayer();
  if (!o) return transcript.close();
  o.cues.sort((a, b) => a.start - b.start);
  const at = lineTimes(o);
  $('#trCount').textContent = `${o.cues.length} line${o.cues.length === 1 ? '' : 's'}`;
  $('#trLines').replaceChildren(...o.cues.map((c, i) => {
    const row = document.createElement('div');
    row.className = 'tr-line';
    row._cue = c;
    const p = at.get(c);
    const time = document.createElement('button');
    time.type = 'button';
    time.className = 'tr-time';
    time.textContent = p ? fmt(p.start) : 'cut';
    time.disabled = !p;
    time.title = p ? 'Play this line' : 'This line falls in a part of the video that was cut';
    time.onclick = () => {
      setTime(p.start + 0.01);
      playUntil = p.end;
      play();
    };
    const text = document.createElement('textarea');
    text.rows = 1;
    text.value = c.text;
    text.setAttribute('aria-label', `Line ${i + 1}`);
    text.oninput = () => {
      c.text = text.value.replace(/\n/g, ' ');
      fitLine(text);
      renderTimeline();
      save();
    };
    text.onchange = () => retimeWords(c);
    const tools = document.createElement('div');
    tools.className = 'tr-tools';
    tools.append(
      trButton('split', 'Split this line at the cursor', () => splitLine(o, c, text)),
      trButton('join', 'Join with the next line', () => joinLine(o, c), i === o.cues.length - 1),
      trButton('trash', 'Delete this line', () => deleteLine(o, c), false, 'danger'),
    );
    row.append(time, text, tools);
    return row;
  }));
  requestAnimationFrame(() => $('#trLines').querySelectorAll('textarea').forEach(fitLine));
}

function trButton(name, label, onclick, disabled = false, cls = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `icon ${cls}`;
  b.title = label;
  b.setAttribute('aria-label', label);
  b.disabled = disabled;
  b.append(iconEl(name));
  // Keep the text box's cursor (and focus) when tapping Split.
  b.onpointerdown = (e) => e.preventDefault();
  b.onclick = onclick;
  return b;
}

function fitLine(t) {
  t.style.height = 'auto';
  t.style.height = `${t.scrollHeight}px`;
}

// After the words of a timed caption change, spread its word timings evenly so highlighting still works.
function retimeWords(c) {
  if (!c.words) return;
  const words = c.text.replace(/\*/g, '').split(/\s+/).filter(Boolean);
  if (words.length === c.words.length) return;
  const total = words.reduce((n, w) => n + w.length + 1, 0);
  let t = c.start;
  c.words = words.map((w) => {
    const d = ((c.end - c.start) * (w.length + 1)) / total;
    return [t, (t += d)];
  });
  save();
}

// Splits at the cursor (or the middle word). Timed captions split exactly between words;
// others split in proportion to how much text falls on each side.
function splitLine(o, c, box) {
  retimeWords(c);
  const words = c.text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return toast('A line needs at least two words to split.');
  let cut = Math.round(words.length / 2);
  if (document.activeElement === box && box.selectionStart > 0 && box.selectionStart < box.value.length) {
    const before = box.value.slice(0, box.selectionStart).trim().split(/\s+/).filter(Boolean).length;
    cut = clamp(before, 1, words.length - 1);
  }
  const first = words.slice(0, cut).join(' '), second = words.slice(cut).join(' ');
  let at;
  if (c.words && c.words.length === words.length) at = (c.words[cut - 1][1] + c.words[cut][0]) / 2;
  else at = c.start + ((c.end - c.start) * first.length) / (first.length + second.length);
  const next = { start: at, end: c.end, text: second };
  if (c.words && c.words.length === words.length) {
    next.words = c.words.slice(cut);
    c.words = c.words.slice(0, cut);
  }
  c.end = at;
  c.text = first;
  o.cues.splice(o.cues.indexOf(c) + 1, 0, next);
  afterLineChange();
  const boxes = $('#trLines').querySelectorAll('textarea'), i = o.cues.indexOf(next);
  if (boxes[i]) {
    boxes[i].focus();
    boxes[i].setSelectionRange(0, 0);
  }
}

function joinLine(o, c) {
  const i = o.cues.indexOf(c), n = o.cues[i + 1];
  if (!n) return;
  retimeWords(c);
  retimeWords(n);
  c.words = c.words && n.words ? [...c.words, ...n.words] : undefined;
  if (!c.words) delete c.words;
  c.text = `${c.text} ${n.text}`.trim();
  c.end = n.end;
  o.cues.splice(i + 1, 1);
  afterLineChange();
}

function deleteLine(o, c) {
  o.cues.splice(o.cues.indexOf(c), 1);
  afterLineChange();
}

function afterLineChange() {
  renderTranscript();
  renderTimeline();
  fillInspector();
  save();
}

// The line under the playhead stays highlighted, and in view while playing.
let trShown = null;
function updateTranscript() {
  if (playUntil != null && (!playing || T >= playUntil - 0.02)) {
    if (playing) pause();
    playUntil = null;
  }
  const o = transcript.open && trLayer();
  if (!o) return;
  const cue = cueAt(o, T);
  if (cue === trShown) return;
  trShown = cue;
  for (const row of $('#trLines').children) {
    const on = row._cue === cue;
    row.classList.toggle('now', on);
    if (on && playing) row.scrollIntoView({ block: 'nearest' });
  }
}

/* ---------- platform safe zones ---------- */

// Roughly where each app's buttons and captions sit over a vertical video, as fractions of the frame
// [x, y, width, height]. They are approximate and only drawn on screen, never exported.
const SAFE_ZONES = {
  tiktok: [[0, 0, 1, 0.07, 'Top tabs'], [0, 0.75, 1, 0.25, 'Caption, sound and account'], [0.86, 0.36, 0.14, 0.39, 'Buttons']],
  reels: [[0, 0, 1, 0.11, 'Reels header'], [0, 0.7, 1, 0.3, 'Caption and account'], [0.86, 0.42, 0.14, 0.28, 'Buttons']],
  shorts: [[0, 0, 1, 0.08, 'Search and menu'], [0, 0.72, 1, 0.28, 'Title, channel and subscribe'], [0.84, 0.38, 0.16, 0.34, 'Buttons']],
};
let safeZone = '';
try {
  safeZone = localStorage.getItem('chyron-safe-zone') || '';
} catch {}
function showSafeZones() {
  const box = $('#safe'), zones = SAFE_ZONES[safeZone];
  $('#safeZones').value = safeZone;
  box.hidden = !zones || state.format !== '9:16';
  if (box.hidden) return;
  box.replaceChildren(...zones.map(([x, y, w, h, label]) => {
    const z = document.createElement('div');
    Object.assign(z.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
    z.dataset.label = label;
    return z;
  }));
}
$('#safeZones').onchange = (e) => {
  safeZone = e.target.value;
  try {
    localStorage.setItem('chyron-safe-zone', safeZone);
  } catch {}
  if (safeZone && state.format !== '9:16') toast('Safe zones are for vertical 9:16 video. Switch Shape to Vertical to see them.');
  showSafeZones();
};

/* ---------- phone editing panel ---------- */

const phone = () => matchMedia('(max-width: 900px)').matches;
const inspector = $('.inspector');

// The tab strip shows one group of settings at a time; tabs with nothing to show for this graphic are hidden.
function showEditTab(tab) {
  inspector.dataset.tab = tab;
  $('#editTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
}
function syncTabs() {
  let first = null;
  $('#editTabs').querySelectorAll('button').forEach((b) => {
    const any = [...props.querySelectorAll(`[data-group="${b.dataset.tab}"]`)].some((el) => !el.closest('[hidden]'));
    b.hidden = !any;
    if (any && !first) first = b.dataset.tab;
  });
  const cur = $(`#editTabs [data-tab="${inspector.dataset.tab}"]`);
  showEditTab(cur && !cur.hidden ? inspector.dataset.tab : first);
}
$('#editTabs').querySelectorAll('button').forEach((b) => (b.onclick = () => showEditTab(b.dataset.tab)));
showEditTab('text');

// On a phone, menus for typeface, animation and speed become rows of tappable chips.
const SPEED_MARKS = ['»', '›', '·'];
function buildChips(select) {
  if (!select) return;
  let row = select.nextElementSibling;
  if (!row || !row.classList.contains('chips')) {
    row = document.createElement('div');
    row.className = 'chips';
    select.after(row);
  }
  const kind = select.dataset.chips;
  row.replaceChildren(...[...select.options].map((opt, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = opt.value;
    b.title = opt.textContent;
    b.setAttribute('aria-label', `${select.getAttribute('aria-label') || ''} ${opt.textContent}`.trim());
    if (kind === 'font') {
      b.textContent = opt.textContent;
      b.style.fontFamily = `"${opt.textContent}"`;
    } else if (kind === 'anim' || kind === 'fill' || kind === 'edges') {
      const name = kind !== 'anim' ? `${kind}-${opt.value}` : select.dataset.k === 'out' && opt.value === 'rise' ? 'a-drop' : `a-${opt.value}`;
      b.append(iconEl(name));
      b.className = 'icon';
    } else b.textContent = SPEED_MARKS[i] || opt.textContent;
    b.onclick = () => {
      select.value = opt.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      syncChips();
    };
    return b;
  }));
}
// Under icon rows (not typefaces, which show their names), a caption names the current choice.
const CHIP_NAMES = { anim: 'In', out: 'Out', speed: 'Speed', kind: 'Style', edges: 'Soft edges' };
function syncChips() {
  props.querySelectorAll('.chips').forEach((row) => {
    const select = row.previousElementSibling, v = select.value;
    row.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    const name = CHIP_NAMES[select.dataset.k];
    if (!name || select.dataset.chips === 'font') return;
    let cap = row.nextElementSibling;
    if (!cap || !cap.classList.contains('chip-name')) {
      cap = Object.assign(document.createElement('small'), { className: 'chip-name' });
      row.after(cap);
    }
    const opt = [...select.options].find((o) => o.value === v);
    cap.textContent = `${name}: ${opt ? opt.textContent : ''}`;
  });
}
props.querySelectorAll('[data-chips]').forEach(buildChips);

// Colors on a phone: tap Text, Box or Highlight, then a brand color dot (or the rainbow dot for any color).
let colorTarget = 'color';
const colorInput = (k) => props.querySelector(`.colors [data-k="${k}"]`);
props.querySelector('.colors').addEventListener('click', (e) => {
  const label = e.target.closest('label');
  if (!label || !phone()) return;
  e.preventDefault();
  colorTarget = label.querySelector('input').dataset.k;
  syncColorTarget();
});
function syncColorTarget() {
  if (colorInput(colorTarget).closest('[hidden]')) colorTarget = ['color', 'bg', 'accent'].find((k) => !colorInput(k).closest('[hidden]')) || 'color';
  props.querySelectorAll('.colors label').forEach((l) => l.classList.toggle('on', l.querySelector('input').dataset.k === colorTarget));
  const o = selected(), now = o && String(o[colorTarget]).toLowerCase();
  $('#brandDots').querySelectorAll('button[data-c]').forEach((b) => b.classList.toggle('on', b.dataset.c.toLowerCase() === now));
}
function renderBrandDots() {
  const b = state.brand;
  const dots = [b.dark, b.light, b.main, b.accent, b.extra].map((c) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.dataset.c = c;
    d.style.background = c;
    d.setAttribute('aria-label', `Use brand color ${c}`);
    d.onclick = () => {
      const o = selected();
      if (!o) return;
      o[colorTarget] = c;
      fillInspector();
      save();
    };
    return d;
  });
  const any = document.createElement('button');
  any.type = 'button';
  any.className = 'any';
  any.setAttribute('aria-label', 'Pick any color');
  any.onclick = () => {
    const input = colorInput(colorTarget);
    if (input.showPicker) input.showPicker();
    else input.click();
  };
  $('#brandDots').replaceChildren(...dots, any);
  syncColorTarget();
}

// Wraps the selected words in *stars*, which highlights them.
$('#markWord').onclick = () => {
  const ta = props.querySelector('[data-k="text"]');
  const { selectionStart: a, selectionEnd: z, value: v } = ta;
  if (a === z) return toast('Select a word in the text first, then tap the marker.');
  ta.value = `${v.slice(0, a)}*${v.slice(a, z)}*${v.slice(z)}`;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
};

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
  if (/Firefox/.test(ua)) return `Firefox can’t install web apps. Open this page in Chrome, Edge or Safari to install ${APP_NAME}.`;
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return 'To install, choose File → Add to Dock in Safari’s menu bar.';
  return `To install, click the install icon at the right end of the address bar, or open the browser menu and choose Install ${APP_NAME}.`;
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
  toast(`${APP_NAME} is installed. Open it from your Applications folder or Dock.`);
});
// Once installed, videos and SRT files can be opened with the app from Finder.
if ('launchQueue' in window) {
  launchQueue.setConsumer(async (params) => {
    if (params.files && params.files.length) handleFiles(await Promise.all(params.files.map((h) => h.getFile())));
  });
}

new ResizeObserver(fitStage).observe($('#stageArea'));
// The built-in typefaces come from the stylesheet in index.html. A page still holding an older copy of it
// fetches any it's missing, so new typefaces show up without waiting for that copy to expire.
for (const f of FONTS) {
  if (!document.querySelector(`link[href*="family=${f.name.replace(/ /g, '+')}"]`)) {
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: googleCss(f.name, f.weight) }));
  }
  document.fonts.load(`${f.weight} 40px "${f.name}"`);
}
load().then(() => requestAnimationFrame(tick));
