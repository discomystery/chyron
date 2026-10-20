// Turns speech into timed words, on this device. Runs Whisper through transformers.js in a worker so the
// page stays responsive. The model downloads once from Hugging Face and the browser keeps it, so later
// runs (and offline use) skip the download. Audio never leaves the device.
// The library itself comes from jsDelivr, pinned to one version; the service worker keeps a copy.
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js';

env.allowLocalModels = false;

let asr = null;
let loadedKey = '';

async function hasWebGPU() {
  try {
    return !!(navigator.gpu && (await navigator.gpu.requestAdapter()));
  } catch {
    return false;
  }
}

async function load(model) {
  const gpu = await hasWebGPU();
  const key = `${model}|${gpu}`;
  if (asr && loadedKey === key) return;
  asr = null;
  // Report download progress across all the model's files together.
  const files = new Map();
  const progress_callback = (p) => {
    if (p.status === 'progress' && p.total) files.set(p.file, [p.loaded, p.total]);
    else if (p.status === 'done' && files.has(p.file)) files.set(p.file, [files.get(p.file)[1], files.get(p.file)[1]]);
    else return;
    let loaded = 0, total = 0;
    for (const [l, t] of files.values()) {
      loaded += l;
      total += t;
    }
    postMessage({ type: 'download', loaded, total });
  };
  const options = gpu
    ? { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, progress_callback }
    : { device: 'wasm', dtype: 'q8', progress_callback };
  try {
    asr = await pipeline('automatic-speech-recognition', model, options);
  } catch (err) {
    if (!gpu) throw err;
    // Some graphics chips can't run it; the processor can.
    asr = await pipeline('automatic-speech-recognition', model, { device: 'wasm', dtype: 'q8', progress_callback });
  }
  loadedKey = key;
}

self.onmessage = async ({ data }) => {
  const { audio, model, language } = data;
  try {
    await load(model);
    postMessage({ type: 'listening' });
    const options = { chunk_length_s: 30, stride_length_s: 5, task: 'transcribe', language: language || null };
    let out, words = true;
    try {
      out = await asr(audio, { ...options, return_timestamps: 'word' });
    } catch (err) {
      // Word timing isn't available everywhere; fall back to timing per phrase.
      console.warn('Word timestamps failed, using phrase timestamps:', err);
      words = false;
      out = await asr(audio, { ...options, return_timestamps: true });
    }
    const chunks = (out.chunks || []).map((c) => ({ text: c.text, start: c.timestamp[0], end: c.timestamp[1] }));
    postMessage({ type: 'done', words, chunks });
  } catch (err) {
    postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};
