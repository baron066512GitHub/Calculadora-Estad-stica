// Variables de control global de simulación
let resultados = [];
let paramsGlobales = {};
let currentDist = 'normal';
let activeTab = 'formulas';

// --- LÓGICA DE TEMAS (CLARO / OSCURO) ---
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  if (resultados.length > 0) {
    reDrawChart();
    reDrawCLTChart();
  }
}

// --- MANEJO DE PESTAÑAS (FÓRMULAS / SIMULACIÓN) ---
function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-btn-formulas').classList.toggle('active', tab === 'formulas');
  document.getElementById('tab-btn-sim').classList.toggle('active', tab === 'sim');
  document.getElementById('view-formulas').style.display = tab === 'formulas' ? 'block' : 'none';
  document.getElementById('view-sim').style.display = tab === 'sim' ? 'block' : 'none';
}

// --- SELECTOR DE DISTRIBUCIÓN ---
function changeDistribution() {
  currentDist = document.getElementById('dist-selector').value;
  
  const icon = document.getElementById('dist-icon');
  const title = document.getElementById('main-title');
  const subtitle = document.getElementById('main-subtitle');
  
  if (currentDist === 'normal') {
    icon.textContent = '𝒩'; title.textContent = 'Simulación Distribución Normal'; subtitle.textContent = 'Transformada Inversa — Método Tabla Z';
  } else if (currentDist === 'exponencial') {
    icon.textContent = 'ℰ'; title.textContent = 'Simulación Distribución Exponencial'; subtitle.textContent = 'Transformada Inversa — Logarítmica';
  } else if (currentDist === 'poisson') {
    icon.textContent = '𝒫'; title.textContent = 'Simulación Distribución Poisson'; subtitle.textContent = 'Método de Producto Acumulado Uniforme';
  }

  document.querySelectorAll('.dist-section').forEach(el => el.classList.remove('active-dist'));
  document.getElementById(`formulas-${currentDist}`).classList.add('active-dist');
  document.getElementById(`inputs-${currentDist}`).classList.add('active-dist');

  ['results-card', 'stats-card', 'hist-card', 'clt-card', 'freq-card', 'export-card'].forEach(id => document.getElementById(id).style.display = 'none');
  resultados = [];

  updateCalculatedValues();
  updateBtnText();
}

function updateBtnText() {
  const n = parseInt(document.getElementById('n-vals').value) || 10;
  document.getElementById('btn-simular').textContent = `▶ Generar ${n} valores`;
}

function updateCalculatedValues() {
  const display = document.getElementById('calculated-display');
  if (currentDist === 'normal') {
    const v = parseFloat(document.getElementById('norm-var').value) || 1;
    display.innerHTML = `σ = √σ² = <span style="color:#f59e0b;font-family:monospace;">${Math.sqrt(Math.max(0.0001, v)).toFixed(4)}</span>`;
  } else if (currentDist === 'exponencial') {
    const l = parseFloat(document.getElementById('exp-lambda').value) || 2;
    display.innerHTML = `Media Teórica (1/λ) = <span style="color:#0ea5e9;font-family:monospace;">${(1 / l).toFixed(4)}</span>`;
  } else {
    display.innerHTML = '';
  }
}

// --- OPERACIONES MATEMÁTICAS ---
function invNormalCDF(p) {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pL = 0.02425, pH = 1 - pL; let z;
  if (p < pL) { 
    const q = Math.sqrt(-2 * Math.log(p)); 
    z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)); 
  } else if (p <= pH) { 
    const q = p - 0.5, r = q * q; 
    z = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); 
  } else { 
    const q = Math.sqrt(-2 * Math.log(1 - p)); 
    z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)); 
  }
  return z;
}

function zToTableCoords(z) {
  const zr = Math.round(z * 100) / 100;
  const sign = zr < 0 ? '-' : '';
  const absZ = Math.abs(zr);
  const fila = sign + absZ.toFixed(1);
  const colNum = Math.round((absZ - Math.floor(absZ * 10) / 10) * 100) / 100;
  return { fila, col: colNum.toFixed(2) };
}

function normalPDF(x, mu, sigma) { return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2); }
function expPDF(x, lambda) { return x < 0 ? 0 : lambda * Math.exp(-lambda * x); }
function poissonPMF(k, lambda) {
  if (k < 0) return 0;
  let fact = 1;
  for (let i = 1; i <= k; i++) fact *= i;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
}

// --- MOTOR DE SIMULACIÓN ---
function ejecutarSimulacion() {
  const N = Math.min(10000, Math.max(1, parseInt(document.getElementById('n-vals').value) || 10));
  resultados = [];
  
  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (currentDist === 'normal') {
    const mu = parseFloat(document.getElementById('norm-mu').value) || 10;
    const vari = Math.max(0.0001, parseFloat(document.getElementById('norm-var').value) || 1);
    const sigma = Math.sqrt(vari);
    paramsGlobales = { mu, vari, sigma };

    thead.innerHTML = `<tr><th>i</th><th>r<sub>i</sub> U(0,1)</th><th>Fila Z</th><th>Col Z</th><th>Z<sub>α</sub></th><th>X<sub>i</sub> = μ + Z<sub>α</sub>·σ</th></tr>`;
    
    for (let i = 1; i <= N; i++) {
      const ri = Math.random();
      const z = invNormalCDF(ri);
      const coords = zToTableCoords(z);
      const xi = mu + z * sigma;
      resultados.push({ i, ri, xi, extra: [coords.fila, coords.col, z.toFixed(4)] });
      if (i <= 200) { 
        tbody.innerHTML += `<tr><td class="col-i">${i}</td><td class="col-ri">${ri.toFixed(4)}</td><td class="col-fa">${coords.fila}</td><td class="col-fa">${coords.col}</td><td class="col-z">${z.toFixed(4)}</td><td class="col-xi">${xi.toFixed(4)}</td></tr>`;
      }
    }
  } else if (currentDist === 'exponencial') {
    const lambda = parseFloat(document.getElementById('exp-lambda').value) || 2;
    paramsGlobales = { lambda };

    thead.innerHTML = `<tr><th>i</th><th>r<sub>i</sub> U(0,1)</th><th>1 − r<sub>i</sub></th><th>ln(r<sub>i</sub>)</th><th>X<sub>i</sub> = −ln(r<sub>i</sub>)/λ</th></tr>`;
    for (let i = 1; i <= N; i++) {
      const ri = Math.random();
      const xi = -Math.log(ri) / lambda; 
      resultados.push({ i, ri, xi, extra: [(1 - ri).toFixed(4), Math.log(ri).toFixed(4)] });
      if (i <= 200) {
        tbody.innerHTML += `<tr><td class="col-i">${i}</td><td class="col-ri">${ri.toFixed(4)}</td><td class="col-fa">${(1 - ri).toFixed(4)}</td><td class="col-z">${Math.log(ri).toFixed(4)}</td><td class="col-xi">${xi.toFixed(4)}</td></tr>`;
      }
    }
  } else if (currentDist === 'poisson') {
    const lambda = parseFloat(document.getElementById('poi-lambda').value) || 4;
    paramsGlobales = { lambda };

    thead.innerHTML = `<tr><th>i</th><th>Números Aleatorios r<sub>m</sub> Usados</th><th>Producto Final</th><th>X<sub>i</sub> (Pasos K)</th></tr>`;
    const L = Math.exp(-lambda);
    for (let i = 1; i <= N; i++) {
      let k = -1, p = 1, r_list = [];
      do {
        k++; const r = Math.random(); r_list.push(r.toFixed(3)); p *= r;
      } while (p >= L && k < 100);
      const xi = k;
      resultados.push({ i, ri: parseFloat(r_list[0]), xi, extra: [r_list.join(', '), p.toFixed(5)] });
      if (i <= 200) {
        tbody.innerHTML += `<tr><td class="col-i">${i}</td><td class="col-ri" style="max-width:250px; overflow:hidden; text-overflow:ellipsis;" title="${r_list.join(', ')}">${r_list.join(', ')}</td><td class="col-z">${p.toFixed(5)}</td><td class="col-xi">${xi}</td></tr>`;
      }
    }
  }

  if (N > 200) {
    tbody.innerHTML += `<tr><td colspan="10" style="color:var(--text-muted);font-style:italic;">... mostrados los primeros 200 valores de un total de ${N} ...</td></tr>`;
  }

  calcularEstadisticasYGrafico(N);
}

function calcularEstadisticasYGrafico(N) {
  const xs = resultados.map(r => r.xi);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const varSim = xs.length > 1 ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1) : 0;
  const stdSim = Math.sqrt(varSim);
  const cv = mean !== 0 ? (stdSim / Math.abs(mean)) : 0;

  let tMean = 0, tVar = 0, tStd = 0, tCv = 0;
  if (currentDist === 'normal') {
    tMean = paramsGlobales.mu; tVar = paramsGlobales.vari; tStd = paramsGlobales.sigma; tCv = tStd / Math.abs(tMean);
  } else if (currentDist === 'exponencial') {
    tMean = 1 / paramsGlobales.lambda; tVar = 1 / (paramsGlobales.lambda ** 2); tStd = Math.sqrt(tVar); tCv = tStd / tMean;
  } else if (currentDist === 'poisson') {
    tMean = paramsGlobales.lambda; tVar = paramsGlobales.lambda; tStd = Math.sqrt(tVar); tCv = tStd / tMean;
  }

  const rows = [
    ['Media muestral X̄ (μ)', mean.toFixed(4), tMean.toFixed(4)],
    ['Varianza S² (σ²)', varSim.toFixed(4), tVar.toFixed(4)],
    ['Desv. Estándar S (σ)', stdSim.toFixed(4), tStd.toFixed(4)],
    ['Coef. Variación Cv', cv.toFixed(4), tCv.toFixed(4)],
    ['Valor Mínimo Generado', Math.min(...xs).toFixed(4), '—'],
    ['Valor Máximo Generado', Math.max(...xs).toFixed(4), '—']
  ];

  let html = '';
  for (const [name, sim, teo] of rows) {
    html += `<div class="stat-row"><div style="color:var(--text-desc);font-size:12px;">${name}</div><div style="display:flex;gap:16px;"><span style="font-family:monospace;color:#0ea5e9;font-size:12px;">${sim}</span><span style="font-family:monospace;color:#00d4aa;font-size:12px;">${teo}</span></div></div>`;
  }
  document.getElementById('stats-rows').innerHTML = html;

  ['results-card', 'stats-card', 'hist-card', 'clt-card', 'freq-card', 'export-card'].forEach(id => document.getElementById(id).style.display = 'block');
  document.getElementById('results-title').textContent = `Tabla de simulación (N = ${N})`;
  
  reDrawChart();
  reDrawCLTChart();
  generarTablaFrecuencias(xs);
}

// --- NUEVA FUNCIÓN: HISTOGRAMA DE PROMEDIOS DE SUBGRUPOS (TLC) ---
function reDrawCLTChart() {
  const xs = resultados.map(r => r.xi);
  if (xs.length === 0) return;
  
  const m = parseInt(document.getElementById('subgroup-m').value) || 5;
  let averages = [];
  
  // Agrupamiento de m en m y cálculo de promedios de subgrupos
  for (let i = 0; i < xs.length; i += m) {
    if (i + m <= xs.length) {
      const sub = xs.slice(i, i + m);
      const avg = sub.reduce((a, b) => a + b, 0) / m;
      averages.push(avg);
    }
  }

  const canvas = document.getElementById('clt-canvas');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 160 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  
  const W = rect.width, H = 160;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  
  let xMin = Math.min(...averages), xMax = Math.max(...averages);
  if (xMin === xMax) { xMin -= 1; xMax += 1; }

  const bins = 12; // Los promedios siempre se tratan de manera continua
  const bw = (xMax - xMin) / bins;
  const counts = new Array(bins).fill(0);

  for (const v of averages) {
    let idx = Math.floor((v - xMin) / bw);
    if (idx === bins) idx = bins - 1;
    if (idx >= 0 && idx < bins) counts[idx]++;
  }

  const maxC = Math.max(...counts, 1);
  const paddingLeft = 45, paddingRight = 25, paddingTop = 20, paddingBottom = 20;
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - paddingLeft - paddingRight) + paddingLeft;
  const ty = y => H - (y / (maxC * 1.2)) * (H - paddingTop - paddingBottom) - paddingBottom;

  // Render eje Y (Frecuencias del TLC)
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.lineWidth = 1;
  ctx.fillStyle = isDark ? '#64748b' : '#334155'; ctx.font = '9px monospace';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  
  for (let i = 0; i <= 4; i++) {
    const yVal = (maxC * 1.2) * (i / 4);
    const yPos = ty(yVal);
    ctx.fillText(Math.round(yVal), paddingLeft - 8, yPos);
    if (i > 0) {
      ctx.strokeStyle = isDark ? 'rgba(30, 45, 64, 0.4)' : 'rgba(203, 213, 225, 0.4)';
      ctx.beginPath(); ctx.moveTo(paddingLeft, yPos); ctx.lineTo(W - paddingRight, yPos); ctx.stroke();
    }
  }

  // Dibujado de barras de promedios (En tono Púrpura/Amatista)
  for (let i = 0; i < bins; i++) {
    const x = xMin + i * bw;
    const cx = tx(x), cw = Math.max(tx(x + bw) - cx - 2, 2);
    const by = ty(counts[i]), bh = ty(0) - by;
    const g = ctx.createLinearGradient(cx, by, cx, ty(0));
    g.addColorStop(0, 'rgba(167, 139, 250, 0.85)');
    g.addColorStop(1, 'rgba(167, 139, 250, 0.15)');
    ctx.fillStyle = g; ctx.fillRect(cx, by, cw, bh);
  }

  // Coordenadas superiores (X, Y)
  ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = 'bold 9px monospace';
  for (let i = 0; i < bins; i++) {
    const x = xMin + i * bw;
    const cx = tx(x), cw = Math.max(tx(x + bw) - cx - 2, 2);
    const by = ty(counts[i]);
    const dotX = cx + cw / 2, xVal = x + bw / 2, yVal = counts[i];
    
    ctx.beginPath(); ctx.arc(dotX, by, 3, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
    ctx.fillText(`(${xVal.toFixed(1)},${yVal})`, dotX, by - 4);
    ctx.fillStyle = '#f59e0b';
  }

  // Ajuste matemático de la curva de densidad Normal teórica para promedios muestrales
  const cltMean = averages.reduce((a, b) => a + b, 0) / averages.length;
  const cltVar = averages.length > 1 ? averages.reduce((a, b) => a + (b - cltMean) ** 2, 0) / (averages.length - 1) : 0.01;
  const cltStd = Math.sqrt(cltVar || 0.01);
  const scale = averages.length * bw;

  ctx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const x = xMin + (i / 300) * (xMax - xMin);
    let y = (1 / (cltStd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - cltMean) / cltStd) ** 2) * scale;
    i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y));
  }
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.stroke();

  // Ejes estructurales
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(paddingLeft, ty(0)); ctx.lineTo(W - paddingRight, ty(0));
  ctx.moveTo(paddingLeft, paddingTop); ctx.lineTo(paddingLeft, ty(0)); ctx.stroke();
  
  // Ticks eje X
  ctx.fillStyle = isDark ? '#64748b' : '#334155'; ctx.font = '9px monospace'; ctx.textBaseline = 'top';
  for (let i = 0; i <= 6; i++) {
    const val = xMin + (i / 6) * (xMax - xMin);
    ctx.fillText(val.toFixed(1), tx(val), ty(0) + 6);
  }

  document.getElementById('clt-legend').innerHTML = `<span style="color:#a78bfa">●</span> Frecuencia Promedios (Y) &nbsp;&nbsp; <span style="color:#f59e0b">●</span> Puntos (X,Y) &nbsp;&nbsp; <span style="color:#a78bfa">─</span> Curva Límite Central (Normal)`;
}

function reDrawChart() {
  const xs = resultados.map(r => r.xi);
  if (xs.length === 0) return;
  const canvas = document.getElementById('hist-canvas');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 160 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  
  const W = rect.width, H = 160;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  
  let xMin = Math.min(...xs), xMax = Math.max(...xs);
  if (currentDist === 'normal') {
    xMin = paramsGlobales.mu - 4 * paramsGlobales.sigma;
    xMax = paramsGlobales.mu + 4 * paramsGlobales.sigma;
  } else if (currentDist === 'exponencial') {
    xMin = 0; xMax = Math.max(xMax, 4 / paramsGlobales.lambda);
  } else if (currentDist === 'poisson') {
    xMin = 0; xMax = Math.max(xMax, paramsGlobales.lambda + 4 * Math.sqrt(paramsGlobales.lambda));
  }

  const isDiscrete = currentDist === 'poisson';
  const bins = isDiscrete ? Math.ceil(xMax - xMin) + 1 : 12;
  const bw = isDiscrete ? 1 : (xMax - xMin) / bins;
  const counts = new Array(bins).fill(0);

  for (const v of xs) {
    const idx = isDiscrete ? Math.floor(v - xMin) : Math.floor((v - xMin) / bw);
    if (idx >= 0 && idx < bins) counts[idx]++;
  }

  const maxC = Math.max(...counts, 1);
  const paddingLeft = 45, paddingRight = 25, paddingTop = 20, paddingBottom = 20;
  const tx = x => ((x - xMin) / (xMax - xMin || 1)) * (W - paddingLeft - paddingRight) + paddingLeft;
  const ty = y => H - (y / (maxC * 1.2)) * (H - paddingTop - paddingBottom) - paddingBottom;

  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.lineWidth = 1;
  ctx.fillStyle = isDark ? '#64748b' : '#334155'; ctx.font = '9px monospace';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  
  for (let i = 0; i <= 4; i++) {
    const yVal = (maxC * 1.2) * (i / 4);
    const yPos = ty(yVal);
    ctx.fillText(Math.round(yVal), paddingLeft - 8, yPos);
    if (i > 0) {
      ctx.strokeStyle = isDark ? 'rgba(30, 45, 64, 0.4)' : 'rgba(203, 213, 225, 0.4)';
      ctx.beginPath(); ctx.moveTo(paddingLeft, yPos); ctx.lineTo(W - paddingRight, yPos); ctx.stroke();
    }
  }

  for (let i = 0; i < bins; i++) {
    const x = xMin + i * bw;
    const cx = tx(x);
    const cw = isDiscrete ? Math.max(5, (W - paddingLeft - paddingRight) / bins * 0.6) : Math.max(tx(x + bw) - cx - 2, 2);
    const by = ty(counts[i]), bh = ty(0) - by;
    const g = ctx.createLinearGradient(cx, by, cx, ty(0));
    g.addColorStop(0, 'rgba(14,165,233,0.85)'); g.addColorStop(1, 'rgba(14,165,233,0.15)');
    ctx.fillStyle = g;
    if (isDiscrete) { ctx.fillRect(cx - cw / 2, by, cw, bh); } else { ctx.fillRect(cx, by, cw, bh); }
  }

  ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = 'bold 9px monospace';
  for (let i = 0; i < bins; i++) {
    const x = xMin + i * bw;
    const cx = tx(x);
    const cw = isDiscrete ? Math.max(5, (W - paddingLeft - paddingRight) / bins * 0.6) : Math.max(tx(x + bw) - cx - 2, 2);
    const by = ty(counts[i]);
    const dotX = isDiscrete ? cx : cx + cw / 2, xVal = x + (isDiscrete ? 0 : bw / 2), yVal = counts[i];
    
    ctx.beginPath(); ctx.arc(dotX, by, 3, 0, 2 * Math.PI); ctx.fill();
    const labelX = isDiscrete ? xVal.toFixed(0) : xVal.toFixed(1);
    ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a'; ctx.fillText(`(${labelX},${yVal})`, dotX, by - 4);
    ctx.fillStyle = '#f59e0b';
  }

  if (currentDist === 'normal' || currentDist === 'exponencial') {
    const scale = xs.length * bw;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const x = xMin + (i / 300) * (xMax - xMin);
      let y = currentDist === 'normal' ? normalPDF(x, paramsGlobales.mu, paramsGlobales.sigma) : expPDF(x, paramsGlobales.lambda);
      y *= scale; i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y));
    }
    ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2; ctx.stroke();
    document.getElementById('hist-legend').innerHTML = `<span style="color:#0ea5e9">●</span> Histograma (Y) &nbsp;&nbsp; <span style="color:#f59e0b">●</span> Puntos (X,Y) &nbsp;&nbsp; <span style="color:#00d4aa">─</span> Curva Teórica`;
  } else { 
    ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const k = Math.floor(xMin + i), y = poissonPMF(k, paramsGlobales.lambda) * xs.length, cx = tx(k);
      ctx.fillStyle = '#00d4aa'; ctx.beginPath(); ctx.arc(cx, ty(y), 4, 0, 2 * Math.PI); ctx.fill();
      if (i === 0) ctx.moveTo(cx, ty(y)); else ctx.lineTo(cx, ty(y));
    }
    ctx.stroke();
    document.getElementById('hist-legend').innerHTML = `<span style="color:#0ea5e9">●</span> Masa (Y) &nbsp;&nbsp; <span style="color:#f59e0b">●</span> Puntos (X,Y) &nbsp;&nbsp; <span style="color:#00d4aa">●</span> PMF Teórica`;
  }

  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(paddingLeft, ty(0)); ctx.lineTo(W - paddingRight, ty(0)); 
  ctx.moveTo(paddingLeft, paddingTop); ctx.lineTo(paddingLeft, ty(0)); ctx.stroke();
  
  ctx.fillStyle = isDark ? '#64748b' : '#334155'; ctx.font = '9px monospace'; ctx.textBaseline = 'top';
  for (let i = 0; i <= 6; i++) {
    const val = xMin + (i / 6) * (xMax - xMin); ctx.fillText(val.toFixed(1), tx(val), ty(0) + 6);
  }
}

function generarTablaFrecuencias(xs) {
  const tbody = document.getElementById('freq-table-body');
  tbody.innerHTML = ''; const N = xs.length;
  let xMin = Math.min(...xs), xMax = Math.max(...xs);
  const isDiscrete = currentDist === 'poisson';
  let clases = [];
  
  if (isDiscrete) {
    const minInt = Math.floor(xMin), maxInt = Math.floor(xMax);
    for (let k = minInt; k <= maxInt; k++) {
      const f = xs.filter(v => Math.floor(v) === k).length;
      clases.push({ label: `k = ${k}`, midpoint: k, f: f });
    }
  } else {
    const bins = 12;
    if (currentDist === 'normal') {
      xMin = paramsGlobales.mu - 4 * paramsGlobales.sigma; xMax = paramsGlobales.mu + 4 * paramsGlobales.sigma;
    } else if (currentDist === 'exponencial') {
      xMin = 0; xMax = Math.max(xMax, 4 / paramsGlobales.lambda);
    }
    const bw = (xMax - xMin) / bins;
    for (let i = 0; i < bins; i++) {
      const lower = xMin + i * bw, upper = xMin + (i + 1) * bw;
      const f = xs.filter(v => v >= lower && v < upper).length;
      clases.push({ label: `[${lower.toFixed(2)} , ${upper.toFixed(2)})`, midpoint: (lower + upper) / 2, f: f });
    }
  }
  
  let F_acum = 0, H_acum = 0;
  clases.forEach(c => {
    F_acum += c.f; const h = c.f / N; H_acum += h;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-desc); font-weight:600; text-align:left; padding-left:15px;">${c.label}</td>
      <td style="font-family:monospace;">${c.midpoint.toFixed(2)}</td>
      <td style="color:#0ea5e9; font-weight:700;">${c.f}</td>
      <td style="color:var(--text-muted);">${F_acum}</td>
      <td style="color:#00d4aa;">${h.toFixed(4)}</td>
      <td style="color:var(--text-muted);">${Math.min(1.0, H_acum).toFixed(4)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportToCSV() {
  let csv = `=== SIMULACION DISTRIBUCION ${currentDist.toUpperCase()} ===\n\n`;
  csv += `PARAMETROS TEORICOS\n`;
  for (let key in paramsGlobales) csv += `${key},${paramsGlobales[key]}\n`;
  csv += `\n=== DATOS GENERADOS ===\n`;
  if (currentDist === 'normal') {
    csv += `i,ri U(0-1),Fila Z,Col Z,Za,Xi\n`;
    for (const r of resultados) csv += `${r.i},${r.ri.toFixed(6)},${r.extra[0]},${r.extra[1]},${r.extra[2]},${r.xi.toFixed(6)}\n`;
  } else if (currentDist === 'exponencial') {
    csv += `i,ri U(0-1),1-ri,ln(ri),Xi\n`;
    for (const r of resultados) csv += `${r.i},${r.ri.toFixed(6)},${r.extra[0]},${r.extra[1]},${r.xi.toFixed(6)}\n`;
  } else {
    csv += `i,r_list,Producto,Xi\n`;
    for (const r of resultados) csv += `${r.i},"${r.extra[0]}",${r.extra[1]},${r.xi}\n`;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `simulacion_${currentDist}.csv`; a.click();
}

function copyToClipboard() {
  let txt = '';
  if (currentDist === 'normal') {
    txt += "i\tri (U(0,1))\tFila Z\tCol Z\tZα\tXi\n";
    for (const r of resultados) txt += `${r.i}\t${r.ri.toFixed(6)}\t${r.extra[0]}\t${r.extra[1]}\t${r.extra[2]}\t${r.xi.toFixed(6)}\n`;
  } else if (currentDist === 'exponencial') {
    txt += "i\tri (U(0,1))\t1-ri\tln(ri)\tXi\n";
    for (const r of resultados) txt += `${r.i}\t${r.ri.toFixed(6)}\t${r.extra[0]}\t${r.extra[1]}\t${r.xi.toFixed(6)}\n`;
  } else {
    txt += "i\tr_list\tProducto\tXi\n";
    for (const r of resultados) txt += `${r.i}\t${r.extra[0]}\t${r.extra[1]}\t${r.xi}\n`;
  }
  navigator.clipboard.writeText(txt).then(() => {
    const msg = document.getElementById('copy-msg'); msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2500);
  });
}

updateCalculatedValues();