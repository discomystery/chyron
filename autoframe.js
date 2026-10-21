// Follow the speaker: finds the boxes in a split-screen shot (remote guests side by side), works out
// which box is talking from moment to moment, and plans framing that zooms into that box.
// Everything works on small grayscale frames and the clip's sound, on this device, with no model to
// download: a box is live video separated from its neighbours by a still border or gap, and the talker
// is the box whose movement rises and falls with the speech.
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  function median(xs) {
    const s = Float64Array.from(xs).sort();
    return s.length ? s[s.length >> 1] : 0;
  }

  function quantile(xs, q) {
    const s = Float64Array.from(xs).sort();
    return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0;
  }

  // Centred moving average over ±r samples.
  function smoothed(xs, r) {
    const n = xs.length, out = new Float64Array(n), sum = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + xs[i];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - r), b = Math.min(n, i + r + 1);
      out[i] = (sum[b] - sum[a]) / (b - a);
    }
    return out;
  }

  /* ---------- shots ---------- */

  // A cut shows as a sudden change across the whole picture, compared on an 8×8 grid of averages.
  // Returns [from, to) frame ranges, none shorter than minLen frames.
  function shots(frames, w, h, minLen = 8) {
    const G = 8, grid = frames.map((f) => {
      const g = new Float64Array(G * G);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[((y * G / h) | 0) * G + ((x * G / w) | 0)] += f[y * w + x];
      return g.map((v) => v / ((w * h) / (G * G)));
    });
    const d = [0];
    for (let i = 1; i < grid.length; i++) {
      let s = 0;
      for (let j = 0; j < G * G; j++) s += Math.abs(grid[i][j] - grid[i - 1][j]);
      d.push(s / (G * G));
    }
    const typical = median(d.slice(1)) || 1;
    const out = [];
    let from = 0;
    for (let i = 1; i < frames.length; i++) {
      if (d[i] > 18 && d[i] > 5 * typical && i - from >= minLen) {
        out.push([from, i]);
        from = i;
      }
    }
    out.push([from, frames.length]);
    return out;
  }

  /* ---------- boxes ---------- */

  // Two maps over a shot: how much each pixel moves (live video moves, graphics and backdrops don't),
  // and how often it sits on a sharp edge (the borders between boxes stay put while the people move).
  function maps(frames, w, h) {
    const n = frames.length, act = new Float64Array(w * h), ex = new Float64Array(w * h), ey = new Float64Array(w * h);
    const step = Math.max(1, Math.floor(n / 40));
    let pairs = 0, looks = 0;
    for (let i = 0; i < n; i += step) {
      const f = frames[i], p = frames[i - step];
      if (p) {
        for (let j = 0; j < w * h; j++) act[j] += Math.abs(f[j] - p[j]);
        pairs++;
      }
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const j = y * w + x;
          if (Math.abs(f[j + 1] - f[j - 1]) > 24) ex[j]++;
          if (Math.abs(f[j + w] - f[j - w]) > 24) ey[j]++;
        }
      }
      looks++;
    }
    for (let j = 0; j < w * h; j++) {
      act[j] /= pairs || 1;
      ex[j] /= looks;
      ey[j] /= looks;
    }
    // Live: moving clearly more than a still picture's flicker. Counting pixels rather than adding up
    // movement keeps a busy ticker from drowning out a guest who sits still.
    const soft = blur(act, w, h), cut = clamp(0.1 * quantile(soft, 0.95), 0.6, 4);
    return { act: soft, live: soft.map((v) => (v > cut ? 1 : 0)), ex, ey };
  }

  function blur(m, w, h) {
    const out = new Float64Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, k = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          s += m[Y * w + X];
          k++;
        }
        out[y * w + x] = s / k;
      }
    }
    return out;
  }

  // Region r = { x0, y0, x1, y1 } in analysis pixels, ends exclusive.
  const liveShare = (M, w, r) => {
    let s = 0;
    for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) s += M.live[y * w + x];
    return s / Math.max(1, (r.x1 - r.x0) * (r.y1 - r.y0));
  };

  // How much of a line across the region sits on a lasting edge (within a pixel either side).
  function lineAt(M, w, r, pos, vertical) {
    let on = 0;
    const [a, b] = vertical ? [r.y0, r.y1] : [r.x0, r.x1];
    for (let i = a; i < b; i++) {
      let best = 0;
      for (let d = -1; d <= 1; d++) {
        const j = vertical ? i * w + pos + d : (pos + d) * w + i;
        best = Math.max(best, (vertical ? M.ex : M.ey)[j] || 0);
      }
      if (best > 0.7) on++;
    }
    return on / Math.max(1, b - a);
  }

  // The best place to split a region in two, with live video on both sides: a still gap right across
  // it, or failing that a lasting border line (lines inside a picture, like a desk, are commoner than
  // still gaps inside one). Returns null when the region looks like one picture.
  function bestCut(M, w, r) {
    const all = liveShare(M, w, r);
    if (all <= 0) return null;
    let best = null;
    for (const vertical of [true, false]) {
      const [a, b] = vertical ? [r.x0, r.x1] : [r.y0, r.y1];
      const span = b - a, margin = Math.max(3, Math.round(span * 0.15));
      const ok = [], line = [], still = [];
      for (let p = a + margin; p < b - margin; p++) {
        const side1 = vertical ? { ...r, x1: p } : { ...r, y1: p };
        const side2 = vertical ? { ...r, x0: p + 1 } : { ...r, y0: p + 1 };
        const band = vertical ? { ...r, x0: p - 1, x1: p + 2 } : { ...r, y0: p - 1, y1: p + 2 };
        ok[p] = Math.min(liveShare(M, w, side1), liveShare(M, w, side2)) >= 0.2 * all;
        line[p] = lineAt(M, w, r, p, vertical);
        still[p] = 1 - liveShare(M, w, band) / all >= 0.97;
      }
      // Each side remembers where to start looking for its border: at the cut, or for a gap, out at
      // the far side of the gap (the cut down its middle may be inside a box's still edge).
      const offer = (p, score, g0 = p, g1 = p) => {
        if (!ok[p] || (best && score <= best.score + 1e-9)) return;
        const k0 = vertical ? 'x0' : 'y0', k1 = vertical ? 'x1' : 'y1', from = reach(r);
        best = {
          score, vertical, p,
          side1: { ...r, [k1]: p, reach: { ...from, [k1]: Math.max(p - 1, g1 - 2) } },
          side2: { ...r, [k0]: p + 1, reach: { ...from, [k0]: Math.min(p + 1, g0 + 2) } },
        };
      };
      for (let p = a + margin; p < b - margin; p++) {
        if (line[p] >= 0.8) offer(p, 1 + line[p]);
        if (!still[p] || still[p - 1]) continue;
        // A still gap: cut down the middle, and let each side find its own border.
        let q = p;
        while (still[q + 1]) q++;
        offer(Math.round((p + q) / 2), 2 + (q - p + 1) / span, p, q);
      }
    }
    return best;
  }

  const reach = (r) => r.reach || { x0: r.x0, y0: r.y0, x1: r.x1 - 1, y1: r.y1 - 1 };

  // Straight runs of lasting edge: vertical ones { at: x, a: top, b: bottom } and horizontal ones
  // { at: y, a: left, b: right }, ends inclusive. The picture's own edges count as lines too.
  function segments(M, w, h) {
    const runs = (vertical) => {
      const out = [], [n, len] = vertical ? [w, h] : [h, w], min = Math.round(len * 0.12);
      for (let at = 1; at < n - 1; at++) {
        let start = -1, gap = 0;
        for (let i = 0; i <= len; i++) {
          let on = false;
          if (i < len) for (let d = -1; d <= 1 && !on; d++) on = (vertical ? M.ex[i * w + at + d] : M.ey[(at + d) * w + i]) > 0.7;
          if (on) {
            if (start < 0) start = i;
            gap = 0;
          } else if (start >= 0 && ++gap > 2) {
            if (i - gap - start + 1 >= min) out.push({ at, a: start, b: i - gap });
            start = -1;
          }
        }
      }
      out.push({ at: 0, a: 0, b: len - 1 }, { at: n - 1, a: 0, b: len - 1 });
      return out;
    };
    return { v: runs(true), h: runs(false) };
  }

  // Shrinks a region to its box: the rectangle of border lines around the moving part of the picture
  // that meet at the corners, the way a box's frame does. Stays as it is if none fits.
  function tighten(M, w, r, S) {
    let mx0 = r.x1, mx1 = r.x0, my0 = r.y1, my1 = r.y0;
    for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) {
      if (!M.live[y * w + x]) continue;
      mx0 = Math.min(mx0, x); mx1 = Math.max(mx1, x);
      my0 = Math.min(my0, y); my1 = Math.max(my1, y);
    }
    const plain = { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 };
    if (mx0 > mx1) return plain;
    const lim = reach(r), near = (a, b) => Math.abs(a - b) <= 3;
    // Lines on each side of the moving part, within reach, that run alongside most of it.
    const covers = (s, a, b) => s.a <= a + (b - a) * 0.2 && s.b >= b - (b - a) * 0.2;
    const L = S.v.filter((s) => s.at < mx0 && s.at >= lim.x0 - 1 && covers(s, my0, my1));
    const R = S.v.filter((s) => s.at > mx1 && s.at <= lim.x1 + 1 && covers(s, my0, my1));
    const T = S.h.filter((s) => s.at < my0 && s.at >= lim.y0 - 1 && covers(s, mx0, mx1));
    const B = S.h.filter((s) => s.at > my1 && s.at <= lim.y1 + 1 && covers(s, mx0, mx1));
    let best = null;
    // A corner holds when one line ends there and the other runs through it.
    const meets = (v, hz, top) => (near(top ? v.a : v.b, hz.at) && hz.a <= v.at + 3 && hz.b >= v.at - 3)
      || (near(v.at, hz.a) || near(v.at, hz.b)) && v.a <= hz.at + 3 && v.b >= hz.at - 3;
    for (const l of L) for (const rt of R) for (const t of T) for (const b of B) {
      const corners = [meets(l, t, true), meets(rt, t, true), meets(l, b, false), meets(rt, b, false)].filter(Boolean).length;
      // More corners win; then the bigger box, since a window or shelf behind someone, or a line
      // through the picture like a desk, can make a smaller frame of its own.
      const score = corners + ((rt.at - l.at) * (b.at - t.at)) / (w * w * 4);
      // A border shows on lines either side of it, so step in past the line it's found on.
      if (corners >= 3 && (!best || score > best.score)) best = { score, x0: l.at + 2, x1: rt.at - 1, y0: t.at + 2, y1: b.at - 1 };
    }
    return best ? { x0: best.x0, y0: best.y0, x1: best.x1, y1: best.y1 } : plain;
  }

  // The boxes in a shot, as fractions of the picture: { x, y, w, h }, left to right, top to bottom.
  // A shot that's one picture gives one box covering it.
  function findBoxes(frames, w, h) {
    const M = maps(frames, w, h), S = segments(M, w, h);
    const leaves = [];
    const split = (r, depth) => {
      const cut = depth < 4 && bestCut(M, w, r);
      if (!cut) return leaves.push(r);
      split(cut.side1, depth + 1);
      split(cut.side2, depth + 1);
    };
    split({ x0: 0, y0: 0, x1: w, y1: h }, 0);
    const boxes = leaves
      // Live pictures only, not still backdrops; the size and shape test below drops tickers.
      .filter((r) => liveShare(M, w, r) > 0.01)
      .map((r) => tighten(M, w, r, S))
      .filter((r) => {
        const bw = r.x1 - r.x0, bh = r.y1 - r.y0, aspect = bw / bh;
        return bw * bh >= 0.04 * w * h && aspect > 0.35 && aspect < 3;
      })
      .map((r) => ({ x: r.x0 / w, y: r.y0 / h, w: (r.x1 - r.x0) / w, h: (r.y1 - r.y0) / h }));
    boxes.sort((a, b) => (Math.abs(a.y - b.y) > 0.1 ? a.y - b.y : a.x - b.x));
    return boxes.length ? boxes : [{ x: 0, y: 0, w: 1, h: 1 }];
  }

  /* ---------- who's talking ---------- */

  // Loudness at each frame time, in decibels, from mono samples.
  function loudness(samples, rate, times, win = 0.05) {
    const half = Math.round(win * rate);
    return times.map((t) => {
      const c = Math.round(t * rate), a = Math.max(0, c - half), b = Math.min(samples.length, c + half);
      let s = 0;
      for (let i = a; i < b; i++) s += samples[i] * samples[i];
      return 10 * Math.log10(s / Math.max(1, b - a) + 1e-10);
    });
  }

  // How much the upper part of each box moves from frame to frame (faces, not hands or name bars),
  // measured from that box's own stillest moments and scaled by its own range, so a big box or a
  // noisy feed doesn't outweigh the others. A box that hardly moves at all borrows half the busiest
  // box's range, so its small jitters aren't blown up.
  function movement(frames, w, h, boxes) {
    const raw = boxes.map((b) => {
      const x0 = Math.round((b.x + b.w * 0.1) * w), x1 = Math.round((b.x + b.w * 0.9) * w);
      const y0 = Math.round((b.y + b.h * 0.08) * h), y1 = Math.round((b.y + b.h * 0.75) * h);
      const m = frames.map((f, i) => {
        const p = frames[i - 1] || f;
        let s = 0;
        // Counting clear changes ignores the grain and flicker every feed has.
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (Math.abs(f[y * w + x] - p[y * w + x]) > 10) s++;
        return (100 * s) / Math.max(1, (x1 - x0) * (y1 - y0));
      });
      m[0] = m[1] ?? 0;
      return m;
    });
    const spread = raw.map((m) => quantile(m, 0.9) - quantile(m, 0.1)), widest = Math.max(...spread);
    return raw.map((m, i) => {
      const rest = quantile(m, 0.1), scale = Math.max(spread[i], widest / 2) + 0.05;
      return m.map((v) => (v - rest) / scale);
    });
  }

  // Pearson correlation of a and b over ±r samples around each one.
  function windowedCorrelation(a, b, r) {
    const n = a.length, out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const lo = Math.max(0, i - r), hi = Math.min(n, i + r + 1);
      let sa = 0, sb = 0;
      for (let j = lo; j < hi; j++) { sa += a[j]; sb += b[j]; }
      const ma = sa / (hi - lo), mb = sb / (hi - lo);
      let ab = 0, aa = 0, bb = 0;
      for (let j = lo; j < hi; j++) {
        const da = a[j] - ma, db = b[j] - mb;
        ab += da * db; aa += da * da; bb += db * db;
      }
      out[i] = aa > 1e-9 && bb > 1e-9 ? ab / Math.sqrt(aa * bb) : 0;
    }
    return out;
  }

  // Picks one box (or the wide shot, -1) for each frame. Each box earns points while it moves more
  // than the others and in step with the speech; staying in the wide shot earns a small steady amount,
  // and every change costs, so the framing holds through pauses and doesn't flicker.
  function choose(scores, speech, fps, opts = {}) {
    const n = speech.length, k = scores.length;
    const switchCost = opts.switchCost ?? 2.5, wide = opts.wideBonus ?? 0.12;
    const gain = (s, t) => {
      if (s < 0) return wide;
      let other = -Infinity;
      for (let j = 0; j < k; j++) if (j !== s) other = Math.max(other, scores[j][t]);
      return speech[t] * (scores[s][t] - (k > 1 ? other : 0));
    };
    // Best total up to each frame for each choice, and where it came from.
    let total = Array.from({ length: k + 1 }, (_, s) => gain(s - 1, 0));
    const from = [];
    for (let t = 1; t < n; t++) {
      const prev = total, back = new Int8Array(k + 1);
      let top = 0;
      for (let s = 1; s <= k; s++) if (prev[s] > prev[top]) top = s;
      total = prev.map((_, s) => {
        const stay = prev[s], move = prev[top] - switchCost;
        back[s] = stay >= move ? s : top;
        return Math.max(stay, move) + gain(s - 1, t);
      });
      from.push(back);
    }
    let s = 0;
    for (let j = 1; j <= k; j++) if (total[j] > total[s]) s = j;
    const pick = new Int8Array(n);
    for (let t = n - 1; t >= 0; t--) {
      pick[t] = s - 1;
      if (t) s = from[t - 1][s];
    }
    return holdAtLeast(pick, Math.round((opts.minHold ?? 1.5) * fps));
  }

  // Folds runs shorter than min frames into the run before them (or after, at the start).
  function holdAtLeast(pick, min) {
    const runs = [];
    for (let i = 0; i < pick.length; i++) {
      if (runs.length && runs.at(-1).v === pick[i]) runs.at(-1).n++;
      else runs.push({ v: pick[i], n: 1 });
    }
    for (let i = 0; i < runs.length; i++) {
      if (runs[i].n >= min || runs.length < 2) continue;
      const into = i > 0 ? i - 1 : i + 1;
      runs[into].n += runs[i].n;
      runs.splice(i, 1);
      i = Math.max(-1, i - 2);
      // Neighbours that now match join up.
      for (let j = runs.length - 1; j > 0; j--) if (runs[j].v === runs[j - 1].v) { runs[j - 1].n += runs[j].n; runs.splice(j, 1); }
    }
    const out = new Int8Array(pick.length);
    let t = 0;
    for (const r of runs) for (let i = 0; i < r.n; i++) out[t++] = r.v;
    return out;
  }

  // Scores each box over a shot: how much it moves, plus how closely its movement rises and falls
  // with the sound over the couple of seconds around each moment (both taken over a few frames,
  // since lips move between syllables rather than with them).
  function speakerScores(frames, w, h, boxes, db, fps) {
    const z = movement(frames, w, h, boxes);
    const r = Math.max(2, Math.round(fps / 5)), sound = smoothed(db, r);
    return z.map((m) => {
      const level = smoothed(m, Math.round(fps / 2));
      const sync = windowedCorrelation(smoothed(m, r), sound, Math.round(fps * 1.5));
      return Array.from(level, (v, i) => 0.7 * Math.tanh(v) + 0.3 * sync[i]);
    });
  }

  // How sure each frame is that someone's talking, 0 to 1, from loudness above the quiet parts.
  function speechAmount(db) {
    const floor = quantile(db, 0.1);
    return smoothed(db.map((v) => clamp((v - floor - 4) / 10)), 2);
  }

  /* ---------- putting it together ---------- */

  // frames: grayscale Uint8Arrays (w×h) at `times` (seconds); samples: mono sound at `rate`, with
  // samples[0] at times[0]'s clock zero. Returns { segments: [{ from, to, box }], shots } where box
  // is { x, y, w, h } or null for the whole picture.
  function plan({ frames, w, h, times, samples, rate }, opts = {}) {
    const fps = times.length > 1 ? (times.length - 1) / (times.at(-1) - times[0]) : 10;
    const db = samples ? loudness(samples, rate, times) : times.map(() => 0);
    const speech = samples ? speechAmount(db) : times.map(() => 1);
    const segments = [], found = [];
    for (const [a, b] of shots(frames, w, h, Math.round(fps))) {
      const shotFrames = frames.slice(a, b);
      const boxes = findBoxes(shotFrames, w, h);
      found.push({ from: times[a], to: times[b - 1], boxes });
      const add = (from, to, box) => {
        const last = segments.at(-1);
        if (last && last.box === box) last.to = to;
        else segments.push({ from, to, box });
      };
      if (boxes.length < 2) {
        add(times[a], times[b - 1], null);
        continue;
      }
      const scores = speakerScores(shotFrames, w, h, boxes, db.slice(a, b), fps);
      const pick = choose(scores, speech.slice(a, b), fps, opts);
      for (let i = 0; i < pick.length; i++) add(times[a + i], times[Math.min(b - 1, a + i + 1)], pick[i] < 0 ? null : boxes[pick[i]]);
    }
    return { segments, shots: found };
  }

  const api = { plan, shots, findBoxes };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else window.Autoframe = api;
})();
