/**
 * PlantScan — app.js (v6 — March 2026)
 * Uses OpenRouter API — key saved locally, retries on provider errors
 */

const uploadZone     = document.getElementById('uploadZone');
const uploadInner    = document.getElementById('uploadInner');
const previewWrap    = document.getElementById('previewWrap');
const fileInput      = document.getElementById('fileInput');
const browseBtn      = document.getElementById('browseBtn');
const preview        = document.getElementById('preview');
const changeBtn      = document.getElementById('changeBtn');
const removeBtn      = document.getElementById('removeBtn');
const apiKeyInput    = document.getElementById('apiKey');
const toggleKeyBtn   = document.getElementById('toggleKeyBtn');
const scanBtn        = document.getElementById('scanBtn');
const resultArea     = document.getElementById('resultArea');
const loadingArea    = document.getElementById('loadingArea');
const loadingSubText = document.getElementById('loadingSubText');
const errorArea      = document.getElementById('errorArea');
const errorMsg       = document.getElementById('errorMsg');
const errorDismiss   = document.getElementById('errorDismiss');
const resetBtn       = document.getElementById('resetBtn');
const copyResultBtn  = document.getElementById('copyResultBtn');
const historySection = document.getElementById('historySection');
const historyList    = document.getElementById('historyList');

let imageBase64 = null;
let imageMime   = 'image/jpeg';
let lastResult  = null;
let scanHistory = [];

const STORAGE_KEY = 'plantscan_api_key';

const loadingMessages = [
  'Examining leaf texture…',
  'Checking for discoloration…',
  'Scanning for lesions…',
  'Analysing pigmentation…',
  'Finding available model…',
  'Almost there…',
];

// Free vision models — fastest first
const MODELS = [
  'google/gemma-3-4b-it:free',                       // Gemma 3 4B — smallest, fastest
  'google/gemma-3-12b-it:free',                      // Gemma 3 12B — fast
  'qwen/qwen2.5-vl-3b-instruct:free',                // Qwen VL 3B — fast
  'meta-llama/llama-4-scout:free',                   // Llama 4 Scout — fast multimodal
  'google/gemma-3-27b-it:free',                      // Gemma 3 27B
  'meta-llama/llama-4-maverick:free',                // Llama 4 Maverick
  'qwen/qwen2.5-vl-32b-instruct:free',               // Qwen VL 32B
  'mistralai/mistral-small-3.1-24b-instruct:free',   // Mistral Small
  'moonshotai/kimi-vl-a3b-thinking:free',            // Kimi VL
  'qwen/qwen2.5-vl-72b-instruct:free',               // Qwen VL 72B — slowest
  'openrouter/quasar-alpha',                         // OpenRouter fallback
  'openrouter/optimus-alpha',                        // OpenRouter fallback
];

// ── Load saved API key ─────────────────────────────────
function loadSavedKey() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { apiKeyInput.value = saved; showKeySavedBadge(); }
}

function saveKey(key) { localStorage.setItem(STORAGE_KEY, key); }

function showKeySavedBadge() {
  const hint = document.querySelector('.api-hint');
  if (!hint) return;
  hint.innerHTML = '✅ Key saved — won\'t ask again · <a href="#" id="forgetKeyBtn">Forget key</a>';
  document.getElementById('forgetKeyBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem(STORAGE_KEY);
    apiKeyInput.value = '';
    hint.innerHTML = 'Free key from <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai</a> · Saved in your browser only';
    updateScanBtn();
  });
}

// ── Step indicators ────────────────────────────────────
function setStep(step) {
  [1,2,3].forEach(n => {
    const dot = document.getElementById('dot'+n);
    if (!dot) return;
    dot.classList.remove('active','done');
    if (n < step) dot.classList.add('done');
    else if (n === step) dot.classList.add('active');
  });
  [1,2].forEach(n => {
    document.getElementById('line'+n)?.classList.toggle('done', n < step);
  });
}

// ── Scan button ────────────────────────────────────────
function updateScanBtn() {
  scanBtn.disabled = !(apiKeyInput.value.trim().length > 10 && imageBase64);
  setStep(imageBase64 ? 2 : 1);
}
apiKeyInput.addEventListener('input', updateScanBtn);

// ── Show/hide key ──────────────────────────────────────
toggleKeyBtn.addEventListener('click', () => {
  const isPass = apiKeyInput.type === 'password';
  apiKeyInput.type = isPass ? 'text' : 'password';
  toggleKeyBtn.textContent = isPass ? '🙈' : '👁';
});

// ── File browsing ──────────────────────────────────────
browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
changeBtn.addEventListener('click',  (e) => { e.stopPropagation(); fileInput.click(); });
uploadZone.addEventListener('click', ()  => { if (!imageBase64) fileInput.click(); });
fileInput.addEventListener('change', ()  => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

// ── Remove photo ───────────────────────────────────────
removeBtn.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

function clearImage() {
  imageBase64 = null; preview.src = '';
  previewWrap.hidden = true; uploadInner.style.display = '';
  uploadZone.classList.remove('has-image'); fileInput.value = '';
  hideResult(); hideError(); updateScanBtn(); setStep(1);
}

// ── Drag & Drop ────────────────────────────────────────
uploadZone.addEventListener('dragover',  (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', ()  => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f?.type.startsWith('image/')) handleFile(f);
});

// ── Handle file ────────────────────────────────────────
function handleFile(file) {
  if (file.size > 10*1024*1024) { alert('File too large. Please use an image under 10 MB.'); return; }
  imageMime = file.type || 'image/jpeg';
  const reader = new FileReader();
  reader.onload = (e) => {
    imageBase64 = e.target.result.split(',')[1];
    preview.src = e.target.result;
    previewWrap.hidden = false;
    uploadInner.style.display = 'none';
    uploadZone.classList.add('has-image');
    hideError(); hideResult(); updateScanBtn();
  };
  reader.readAsDataURL(file);
}

// ── Scan ───────────────────────────────────────────────
scanBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!imageBase64 || !apiKey) return;

  saveKey(apiKey);
  showKeySavedBadge();
  setLoading(true); hideResult(); hideError();

  let idx = 0;
  const msgTimer = setInterval(() => {
    loadingSubText.textContent = loadingMessages[idx++ % loadingMessages.length];
  }, 1800);

  try {
    const result = await analyzeWithOpenRouter(imageBase64, imageMime, apiKey);
    if (result) {
      lastResult = result;
      showResult(result);
      addToHistory(result, preview.src);
      setStep(3);
    }
    // If result is null, all models failed silently — just stop loading, no popup
  } catch (err) {
    // Only show popup for real errors like wrong API key
    if (err.message?.includes('Invalid API key') || err.message?.includes('API key')) {
      showError(err.message);
    }
    setStep(2);
  } finally {
    clearInterval(msgTimer);
    setLoading(false);
  }
});

// ── Small delay helper ─────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── OpenRouter API — tries every model, retries provider errors ────
async function analyzeWithOpenRouter(base64, mediaType, apiKey) {
  const prompt = {
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
      { type: 'text', text: `You are a plant disease expert. Look at this leaf photo carefully.
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "status": "healthy" or "diseased" or "unknown",
  "confidence": "high" or "medium" or "low",
  "verdict": "one clear sentence under 15 words",
  "details": "3 to 5 sentences describing what you see, the disease name if any, and what action to take"
}` }
    ]
  };

  let lastErr = 'All models are busy right now. Please wait a moment and try again.';

  for (const model of MODELS) {
    // Try each model up to 2 times before moving on
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        loadingSubText.textContent = `Trying model ${MODELS.indexOf(model)+1} of ${MODELS.length}…`;

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'PlantScan',
          },
          body: JSON.stringify({ model, messages: [prompt] }),
        });

        const data = await res.json();

        // Auth error — stop everything
        if (res.status === 401) throw new Error('Invalid API key. Please check your OpenRouter key.');

        if (!res.ok) {
          lastErr = data?.error?.message || `Error ${res.status}`;
          // Auth error — stop everything immediately
          if (res.status === 401) throw new Error('Invalid API key. Please check your OpenRouter key.');
          // Anything else — wait once then silently move to next model
          if (attempt === 1) { await sleep(500); continue; }
          break;
        }

        const raw = data.choices?.[0]?.message?.content || '';
        if (!raw) { lastErr = 'Empty response.'; break; }

        // Extract JSON from response
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) { lastErr = 'Could not read response format.'; break; }

        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          lastErr = 'Response was not valid JSON.';
          break;
        }

      } catch (err) {
        if (err.message?.includes('Invalid API key')) throw err;
        lastErr = err.message || 'Network error';
        if (attempt === 1) { await sleep(500); continue; }
        break;
      }
    }
  }

  // All models failed silently — only throw for auth errors
  const isAuthError = lastErr.includes('Invalid API key') || lastErr.includes('401');
  if (isAuthError) throw new Error(lastErr);
  // Otherwise fail silently — no popup shown
  return null;
}

// ── Show result ────────────────────────────────────────
function showResult(r) {
  const icons = { healthy:'✅', diseased:'🔴', unknown:'❓' };
  document.getElementById('resultIcon').textContent       = icons[r.status] ?? '❓';
  document.getElementById('resultVerdict').textContent    = r.verdict  || 'Analysis complete';
  document.getElementById('resultConfidence').textContent = r.confidence ? `Confidence: ${r.confidence.toUpperCase()}` : '';
  document.getElementById('resultBody').textContent       = r.details  || '';
  resultArea.className = 'result-area ' + (r.status || 'unknown');
  resultArea.hidden = false;
}

// ── History ────────────────────────────────────────────
function addToHistory(result, imgSrc) {
  scanHistory.unshift({ result, imgSrc, time: new Date() });
  if (scanHistory.length > 5) scanHistory.pop();
  renderHistory();
  historySection.hidden = false;
}

function renderHistory() {
  const icons = { healthy:'✅', diseased:'🔴', unknown:'❓' };
  historyList.innerHTML = '';
  scanHistory.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <img class="history-thumb" src="${item.imgSrc}" alt="scan ${i+1}" />
      <div class="history-info">
        <div class="history-verdict">${item.result.verdict || 'Scan result'}</div>
        <div class="history-time">Today at ${item.time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <span class="history-status">${icons[item.result.status] ?? '❓'}</span>`;
    el.addEventListener('click', () => showResult(item.result));
    historyList.appendChild(el);
  });
}

// ── Copy result ────────────────────────────────────────
copyResultBtn.addEventListener('click', () => {
  if (!lastResult) return;
  const t = `PlantScan Result\n\nStatus: ${lastResult.status?.toUpperCase()}\nVerdict: ${lastResult.verdict}\nConfidence: ${lastResult.confidence}\n\n${lastResult.details}`;
  navigator.clipboard.writeText(t).then(() => {
    copyResultBtn.textContent = '✓ Copied!';
    copyResultBtn.classList.add('copied');
    setTimeout(() => { copyResultBtn.textContent = '📋 Copy result'; copyResultBtn.classList.remove('copied'); }, 2000);
  });
});

// ── Reset & dismiss ────────────────────────────────────
resetBtn.addEventListener('click', clearImage);
errorDismiss.addEventListener('click', hideError);

// ── Helpers ────────────────────────────────────────────
function setLoading(on) { loadingArea.hidden = !on; scanBtn.disabled = on; if (on) loadingSubText.textContent = loadingMessages[0]; }
function hideResult() { resultArea.hidden = true; }
function showError(msg) { console.warn('PlantScan:', msg); }
function hideError() { errorArea.hidden = true; }

// ── Init ───────────────────────────────────────────────
setStep(1);
loadSavedKey();
updateScanBtn();
