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

// --- MANEJO DE PESTAÑAS (FÓRMULAS / SIMULACIÓN / CALCULAR P) ---
function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-btn-formulas').classList.toggle('active', tab === 'formulas');
  document.getElementById('tab-btn-sim').classList.toggle('active', tab === 'sim');
  document.getElementById('tab-btn-calc').classList.toggle('active', tab === 'calc');
  
  document.getElementById('view-formulas').style.display = tab === 'formulas' ? 'block' : 'none';
  document.getElementById('view-sim').style.display = tab === 'sim' ? 'block' : 'none';
  document.getElementById('view-calc').style.display = tab === 'calc' ? 'block' : 'none';

  if (tab === 'calc') {
    document.getElementById('calc-warning').style.display = 'none';
    document.getElementById('calc-normal-content').style.display = 'none';
    document.getElementById('calc-exponencial-content').style.display = 'none';
    
    const poiContent = document.getElementById('calc-poisson-content');
    if (poiContent) poiContent.style.display = 'none';
    
    const uniContent = document.getElementById('calc-uniforme-content');
    if (uniContent) uniContent.style.display = 'none';
    
    if (currentDist === 'normal') {
      document.getElementById('calc-normal-content').style.display = 'block';
      ejecutarCalculadoraPorOpcion();
    } else if (currentDist === 'exponencial') {
      document.getElementById('calc-exponencial-content').style.display = 'block';
      ejecutarCalculadoraExpPorOpcion();
    } else if (currentDist === 'poisson') {
      if (poiContent) poiContent.style.display = 'block';
      ejecutarCalculadoraPoiPorOpcion();
    } else if (currentDist === 'uniforme') {
      if (uniContent) uniContent.style.display = 'block';
      ejecutarCalculadoraUniPorOpcion();
    } else {
      document.getElementById('calc-warning').style.display = 'block';
    }
  }
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
  } else if (currentDist === 'uniforme') {
    icon.textContent = '𝒰'; title.textContent = 'Simulación Distribución Uniforme'; subtitle.textContent = 'Transformada Inversa — Escalamiento Lineal';
  }

  document.querySelectorAll('.dist-section').forEach(el => el.classList.remove('active-dist'));
  document.getElementById(`formulas-${currentDist}`).classList.add('active-dist');
  document.getElementById(`inputs-${currentDist}`).classList.add('active-dist');

  ['results-card', 'stats-card', 'hist-card', 'clt-card', 'freq-card', 'export-card'].forEach(id => document.getElementById(id).style.display = 'none');
  resultados = [];

  updateCalculatedValues();
  updateBtnText();

  if (activeTab === 'calc') {
    switchTab('calc');
  }
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
  } else if (currentDist === 'uniforme') {
    const a = parseFloat(document.getElementById('uni-a').value) || 0;
    const b = parseFloat(document.getElementById('uni-b').value) || 10;
    display.innerHTML = `Media Teórica ((a+b)/2) = <span style="color:#0ea5e9;font-family:monospace;">${((a + b) / 2).toFixed(4)}</span>`;
  } else {
    display.innerHTML = '';
  }
}

// --- OPERACIONES MATEMÁTICAS ---
function erf(x) {
  const s = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  return s * y;
}

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
function uniformPDF(x, a, b) { return (x >= a && x <= b) ? (1 / (b - a)) : 0; }

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
  } else if (currentDist === 'uniforme') {
    const a = parseFloat(document.getElementById('uni-a').value) || 0;
    const b = parseFloat(document.getElementById('uni-b').value) || 10;
    const diff = b - a;
    paramsGlobales = { a, b, diff };

    thead.innerHTML = `<tr><th>i</th><th>r<sub>i</sub> U(0,1)</th><th>b − a (Rango)</th><th>X<sub>i</sub> = a + (b−a)·r<sub>i</sub></th></tr>`;
    
    for (let i = 1; i <= N; i++) {
      const ri = Math.random();
      const xi = a + diff * ri; 
      resultados.push({ i, ri, xi, extra: [diff.toFixed(2)] });
      
      if (i <= 200) {
        tbody.innerHTML += `<tr><td class="col-i">${i}</td><td class="col-ri">${ri.toFixed(4)}</td><td class="col-fa">${diff.toFixed(2)}</td><td class="col-xi">${xi.toFixed(4)}</td></tr>`;
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
  } else if (currentDist === 'uniforme') {
    tMean = (paramsGlobales.a + paramsGlobales.b) / 2;
    tVar = (paramsGlobales.diff ** 2) / 12;
    tStd = Math.sqrt(tVar);
    tCv = tMean !== 0 ? (tStd / Math.abs(tMean)) : 0;
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

// --- HISTOGRAMA DE PROMEDIOS DE SUBGRUPOS (TLC) ---
function reDrawCLTChart() {
  const xs = resultados.map(r => r.xi);
  if (xs.length === 0) return;
  
  const m = parseInt(document.getElementById('subgroup-m').value) || 5;
  let averages = [];
  
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

  const bins = 12; 
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
    const cx = tx(x), cw = Math.max(tx(x + bw) - cx - 2, 2);
    const by = ty(counts[i]), bh = ty(0) - by;
    const g = ctx.createLinearGradient(cx, by, cx, ty(0));
    g.addColorStop(0, 'rgba(167, 139, 250, 0.85)');
    g.addColorStop(1, 'rgba(167, 139, 250, 0.15)');
    ctx.fillStyle = g; ctx.fillRect(cx, by, cw, bh);
  }

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

  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(paddingLeft, ty(0)); ctx.lineTo(W - paddingRight, ty(0));
  ctx.moveTo(paddingLeft, paddingTop); ctx.lineTo(paddingLeft, ty(0)); ctx.stroke();
  
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
  } else if (currentDist === 'uniforme') {
    xMin = paramsGlobales.a;
    xMax = paramsGlobales.b;
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

  if (currentDist === 'normal' || currentDist === 'exponencial' || currentDist === 'uniforme') {
    const scale = xs.length * bw;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const x = xMin + (i / 300) * (xMax - xMin);
      let y = 0;
      if (currentDist === 'normal') {
        y = normalPDF(x, paramsGlobales.mu, paramsGlobales.sigma);
      } else if (currentDist === 'exponencial') {
        y = expPDF(x, paramsGlobales.lambda);
      } else if (currentDist === 'uniforme') {
        y = uniformPDF(x, paramsGlobales.a, paramsGlobales.b);
      }
      y *= scale; 
      i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y));
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
    } else if (currentDist === 'uniforme') {
      xMin = paramsGlobales.a; xMax = paramsGlobales.b;
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

// --- MOTOR ANALÍTICO DE LA CALCULADORA NORMAL POR OPCIONES ---
let calcOpcionActiva = 1; // Opción inicial por defecto: P(X <= a)

function cambiarOpcionCalculadora(opcion) {
  calcOpcionActiva = opcion;
  
  // Actualizar estilos visuales de los botones para reflejar cuál está seleccionado
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-opt-${i}`);
    if (i === opcion) {
      btn.style.background = 'rgba(0, 212, 170, 0.15)';
      btn.style.borderColor = '#00d4aa';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = '';
    }
  }
  
  ejecutarCalculadoraPorOpcion();
}

function ejecutarCalculadoraPorOpcion() {
  if (currentDist !== 'normal') return;

  // Recibir parámetros de forma exclusiva e independiente dentro de este menú
  const mu = parseFloat(document.getElementById('calc-mu').value) || 10;
  const sigma = Math.max(0.001, parseFloat(document.getElementById('calc-sigma').value) || 1);

  // Recibir límites de control
  const a = parseFloat(document.getElementById('calc-a').value) || 0;
  const b = parseFloat(document.getElementById('calc-b').value) || 0;

  const cdfA = normalCDF(a, mu, sigma);
  const cdfB = normalCDF(b, mu, sigma);

  let resultadoFinal = 0;
  let labelTexto = "";
  let tituloGrafico = "";

  // Separación estricta de cálculos matemáticos y etiquetas por opciones
  switch (calcOpcionActiva) {
    case 1:
      resultadoFinal = cdfA;
      labelTexto = `P(X ≤ ${a}) [Acumulada Izquierda] =`;
      tituloGrafico = `Área Sombreada Izquierda hasta a = ${a}`;
      break;
    case 2:
      resultadoFinal = 1 - cdfA;
      labelTexto = `P(X > ${a}) [Complemento Derecho] =`;
      tituloGrafico = `Área Sombreada Derecha desde a = ${a}`;
      break;
    case 3:
      resultadoFinal = b >= a ? (cdfB - cdfA) : 0;
      labelTexto = b >= a ? `P(${a} ≤ X ≤ ${b}) [Intervalo Central] =` : "Error: Límite 'a' debe ser menor o igual a 'b'";
      tituloGrafico = b >= a ? `Área Sombreada Central entre ${a} y ${b}` : "Error de Intervalo";
      break;
    case 4:
      const pEntre = b >= a ? (cdfB - cdfA) : 0;
      resultadoFinal = 1 - pEntre;
      labelTexto = b >= a ? `P(X < ${a} o X > ${b}) [Extremos Fuera de Rango] =` : "Error: Límite 'a' debe ser menor o igual a 'b'";
      tituloGrafico = b >= a ? `Áreas Extremas Sombreadas Fuera de [${a}, ${b}]` : "Error de Intervalo";
      break;
  }

  // Reflejar datos calculados en el DOM
  document.getElementById('res-calc-label').textContent = labelTexto;
  document.getElementById('res-calc-value').textContent = (typeof resultadoFinal === 'number') ? resultadoFinal.toFixed(6) : "-";
  document.getElementById('pdf-graph-title').textContent = `Campana de Densidad (PDF) — ${tituloGrafico}`;

  // Trazar lienzos gráficos basados en la opción activa
  drawCalcPDF(mu, sigma, a, b);
  drawCalcCDF(mu, sigma, a, b);
}

function normalCDF(x, mu, sigma) {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2))));
}

// Gráfico PDF Adaptado para aislar el sombreado según la opción seleccionada
// Gráfico 1: Función de Densidad de Probabilidad (PDF) con área sombreada dinámica por opción
function drawCalcPDF(mu, sigma, a, b) {
  const canvas = document.getElementById('calc-pdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMin = mu - 4 * sigma, xMax = mu + 4 * sigma;
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const ty = y => H - (y / (normalPDF(mu, mu, sigma) * 1.1)) * (H - 30) - 20;

  // === ÁREA SOMBREADA DINÁMICA SEGÚN LA OPCIÓN ACTIVA ===
  ctx.fillStyle = 'rgba(0, 212, 170, 0.2)'; 
  
  if (calcOpcionActiva === 1) {
    // Opción 1: P(X <= a) -> Sombrear desde el extremo izquierdo hasta 'a'
    ctx.beginPath();
    ctx.moveTo(tx(xMin), ty(0));
    const step = (a - xMin) / 100;
    for (let x = xMin; x <= a; x += step) {
      ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
    }
    ctx.lineTo(tx(a), ty(0));
    ctx.closePath();
    ctx.fill();
  } 
  else if (calcOpcionActiva === 2) {
    // Opción 2: P(X > a) -> Sombrear desde 'a' hasta el extremo derecho
    ctx.beginPath();
    ctx.moveTo(tx(a), ty(0));
    const step = (xMax - a) / 100;
    for (let x = a; x <= xMax; x += step) {
      ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
    }
    ctx.lineTo(tx(xMax), ty(0));
    ctx.closePath();
    ctx.fill();
  } 
  else if (calcOpcionActiva === 3) {
    // Opción 3: P(a <= X <= b)
    if (b > a) {
      ctx.beginPath();
      ctx.moveTo(tx(a), ty(0));
      const step = (b - a) / 100;
      for (let x = a; x <= b; x += step) {
        ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
      }
      ctx.lineTo(tx(b), ty(0));
      ctx.closePath();
      ctx.fill();
    } else if (Math.abs(a - b) < 0.00001) {
      // SOLUCIÓN AL CUELGUE: Si son iguales, la probabilidad de un punto continuo es 0 (solo se dibuja una línea sutil)
      ctx.strokeStyle = 'rgba(0, 212, 170, 0.5)';
      ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(normalPDF(a, mu, sigma))); ctx.stroke();
    }
  } 
  else if (calcOpcionActiva === 4) {
    // Opción 4: P(X < a o X > b) -> Ambos extremos laterales de forma aislada
    // Extremo Izquierdo siempre se dibuja
    ctx.beginPath();
    ctx.moveTo(tx(xMin), ty(0));
    const stepLeft = (a - xMin) / 100;
    for (let x = xMin; x <= a; x += stepLeft) {
      ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
    }
    ctx.lineTo(tx(a), ty(0));
    ctx.closePath();
    ctx.fill();

    // Extremo Derecho solo si b > a, o si son iguales sombrea el resto completo
    if (b > a || Math.abs(a - b) < 0.00001) {
      ctx.beginPath();
      ctx.moveTo(tx(b), ty(0));
      const stepRight = (xMax - b) / 100;
      for (let x = b; x <= xMax; x += stepRight) {
        ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
      }
      ctx.lineTo(tx(xMax), ty(0));
      ctx.closePath();
      ctx.fill();
    }
  }

  // Trazar la curva de la campana (Línea sólida superior)
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    i === 0 ? ctx.moveTo(tx(x), ty(normalPDF(x, mu, sigma))) : ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
  }
  ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2; ctx.stroke();

  // Líneas indicadoras verticales para los límites 'a' y 'b'
  ctx.lineWidth = 1;
  if (a >= xMin && a <= xMax) {
    ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(normalPDF(a, mu, sigma))); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = '9px monospace'; ctx.fillText(`a=${a}`, tx(a), ty(normalPDF(a, mu, sigma)) - 4);
  }
  if ((calcOpcionActiva === 3 || calcOpcionActiva === 4) && b >= xMin && b <= xMax && b >= a) {
    ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(normalPDF(b, mu, sigma))); ctx.stroke();
    ctx.fillStyle = '#ea580c'; ctx.font = '9px monospace'; ctx.fillText(`b=${b}`, tx(b), ty(normalPDF(b, mu, sigma)) - 4);
  }

  // Base Eje X
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

function drawCalcCDF(mu, sigma, a, b) {
  const canvas = document.getElementById('calc-cdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMin = mu - 4 * sigma, xMax = mu + 4 * sigma;
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const ty = y => H - y * (H - 30) - 20;

  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    i === 0 ? ctx.moveTo(tx(x), ty(normalCDF(x, mu, sigma))) : ctx.lineTo(tx(x), ty(normalCDF(x, mu, sigma)));
  }
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.stroke();

  ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';

  if ((calcOpcionActiva === 1 || calcOpcionActiva === 2 || calcOpcionActiva === 3 || calcOpcionActiva === 4) && a >= xMin && a <= xMax) {
    const yA = normalCDF(a, mu, sigma);
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(yA)); ctx.lineTo(tx(xMin), ty(yA)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(a), ty(yA), 3, 0, 2 * Math.PI); ctx.fill();
  }
  if ((calcOpcionActiva === 3 || calcOpcionActiva === 4) && b >= xMin && b <= xMax && b >= a) {
    const yB = normalCDF(b, mu, sigma);
    ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(yB)); ctx.lineTo(tx(xMin), ty(yB)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(b), ty(yB), 3, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// =====================================================================
// --- MOTOR ANALÍTICO DE LA CALCULADORA EXPONENCIAL POR OPCIONES ---
// =====================================================================

function expCDF(x, lambda) {
  return x < 0 ? 0 : 1 - Math.exp(-lambda * x);
}

function cambiarOpcionCalculadoraExp(opcion) {
  calcExpOpcionActiva = opcion;
  
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-exp-opt-${i}`);
    if (i === opcion) {
      btn.style.background = 'rgba(0, 212, 170, 0.15)';
      btn.style.borderColor = '#00d4aa';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = '';
    }
  }
  ejecutarCalculadoraExpPorOpcion();
}

function ejecutarCalculadoraExpPorOpcion() {
  if (currentDist !== 'exponencial') return;

  const lambda = Math.max(0.001, parseFloat(document.getElementById('calc-exp-lambda').value) || 2);
  let a = parseFloat(document.getElementById('calc-exp-a').value) || 0;
  let b = parseFloat(document.getElementById('calc-exp-b').value) || 0;
  
  // Forzar que los valores sean positivos (dominio exponencial x >= 0)
  if (a < 0) a = 0; 
  if (b < 0) b = 0;

  const cdfA = expCDF(a, lambda);
  const cdfB = expCDF(b, lambda);

  let resultadoFinal = 0;
  let labelTexto = "";
  let tituloGrafico = "";

  switch (calcExpOpcionActiva) {
    case 1:
      resultadoFinal = cdfA;
      labelTexto = `P(X ≤ ${a}) [Acumulada Izquierda] =`;
      tituloGrafico = `Área Sombreada desde 0 hasta a = ${a}`;
      break;
    case 2:
      resultadoFinal = 1 - cdfA;
      labelTexto = `P(X > ${a}) [Decaimiento Derecho] =`;
      tituloGrafico = `Área Sombreada desde a = ${a} hacia ∞`;
      break;
    case 3:
      resultadoFinal = b >= a ? (cdfB - cdfA) : 0;
      labelTexto = b >= a ? `P(${a} ≤ X ≤ ${b}) [Intervalo Central] =` : "Error: Límite 'a' debe ser ≤ 'b'";
      tituloGrafico = b >= a ? `Área Sombreada entre ${a} y ${b}` : "Error de Intervalo";
      break;
    case 4:
      const pEntre = b >= a ? (cdfB - cdfA) : 0;
      resultadoFinal = 1 - pEntre;
      labelTexto = b >= a ? `P(X < ${a} o X > ${b}) [Extremos Aislados] =` : "Error: Límite 'a' debe ser ≤ 'b'";
      tituloGrafico = b >= a ? `Áreas Sombreadas Fuera de [${a}, ${b}]` : "Error de Intervalo";
      break;
  }

  document.getElementById('res-exp-calc-label').textContent = labelTexto;
  document.getElementById('res-exp-calc-value').textContent = (typeof resultadoFinal === 'number') ? resultadoFinal.toFixed(6) : "-";
  document.getElementById('pdf-exp-graph-title').textContent = `Curva de Densidad (PDF) — ${tituloGrafico}`;

  drawCalcExpPDF(lambda, a, b);
  drawCalcExpCDF(lambda, a, b);
}

function drawCalcExpPDF(lambda, a, b) {
  const canvas = document.getElementById('calc-exp-pdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  // Dominio: Desde 0 hasta un poco más allá del valor máximo analizado para ver la cola
  const xMin = 0;
  const xMax = Math.max(a, b, 4 / lambda) * 1.2; 
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  // El pico máximo en PDF exponencial es lambda (en x=0)
  const ty = y => H - (y / (lambda * 1.1)) * (H - 30) - 20; 

  ctx.fillStyle = 'rgba(0, 212, 170, 0.2)'; 
  
  if (calcExpOpcionActiva === 1) {
    ctx.beginPath(); ctx.moveTo(tx(xMin), ty(0));
    const step = (a - xMin) / 100;
    if (step > 0) {
      for (let x = xMin; x <= a; x += step) ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
    } else { ctx.lineTo(tx(a), ty(expPDF(a, lambda))); }
    ctx.lineTo(tx(a), ty(0)); ctx.closePath(); ctx.fill();
  } 
  else if (calcExpOpcionActiva === 2) {
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0));
    const step = (xMax - a) / 100;
    for (let x = a; x <= xMax; x += step) ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
    ctx.lineTo(tx(xMax), ty(0)); ctx.closePath(); ctx.fill();
  } 
  else if (calcExpOpcionActiva === 3) {
    if (b > a) {
      ctx.beginPath(); ctx.moveTo(tx(a), ty(0));
      const step = (b - a) / 100;
      for (let x = a; x <= b; x += step) ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
      ctx.lineTo(tx(b), ty(0)); ctx.closePath(); ctx.fill();
    } else if (Math.abs(a - b) < 0.00001) {
      ctx.strokeStyle = 'rgba(0, 212, 170, 0.5)';
      ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(expPDF(a, lambda))); ctx.stroke();
    }
  } 
  else if (calcExpOpcionActiva === 4) {
    // Extremo Izquierdo
    ctx.beginPath(); ctx.moveTo(tx(xMin), ty(0));
    const stepLeft = (a - xMin) / 100;
    if (stepLeft > 0) {
      for (let x = xMin; x <= a; x += stepLeft) ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
    } else { ctx.lineTo(tx(a), ty(expPDF(a, lambda))); }
    ctx.lineTo(tx(a), ty(0)); ctx.closePath(); ctx.fill();

    // Extremo Derecho
    if (b > a || Math.abs(a - b) < 0.00001) {
      ctx.beginPath(); ctx.moveTo(tx(b), ty(0));
      const stepRight = (xMax - b) / 100;
      for (let x = b; x <= xMax; x += stepRight) ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
      ctx.lineTo(tx(xMax), ty(0)); ctx.closePath(); ctx.fill();
    }
  }

  // Trazar curva exponencial PDF
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    i === 0 ? ctx.moveTo(tx(x), ty(expPDF(x, lambda))) : ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
  }
  ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2; ctx.stroke();

  // Trazado de límites a y b
  ctx.lineWidth = 1;
  if (a >= xMin && a <= xMax) {
    ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(expPDF(a, lambda))); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = '9px monospace'; ctx.fillText(`a=${a}`, tx(a), ty(expPDF(a, lambda)) - 4);
  }
  if ((calcExpOpcionActiva === 3 || calcExpOpcionActiva === 4) && b >= xMin && b <= xMax && b >= a) {
    ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(expPDF(b, lambda))); ctx.stroke();
    ctx.fillStyle = '#ea580c'; ctx.font = '9px monospace'; ctx.fillText(`b=${b}`, tx(b), ty(expPDF(b, lambda)) - 4);
  }

  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

function drawCalcExpCDF(lambda, a, b) {
  const canvas = document.getElementById('calc-exp-cdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMin = 0, xMax = Math.max(a, b, 4 / lambda) * 1.2;
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const ty = y => H - y * (H - 30) - 20; // CDF va de 0 a 1

  // Curva de Distribución Acumulada
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    const y = expCDF(x, lambda);
    i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y));
  }
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.stroke();

  // Puntos de proyección
  ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';

  if ((calcExpOpcionActiva === 1 || calcExpOpcionActiva === 2 || calcExpOpcionActiva === 3 || calcExpOpcionActiva === 4) && a >= xMin && a <= xMax) {
    const yA = expCDF(a, lambda);
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(yA)); ctx.lineTo(tx(xMin), ty(yA)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(a), ty(yA), 3, 0, 2 * Math.PI); ctx.fill();
  }
  if ((calcExpOpcionActiva === 3 || calcExpOpcionActiva === 4) && b >= xMin && b <= xMax && b >= a) {
    const yB = expCDF(b, lambda);
    ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(yB)); ctx.lineTo(tx(xMin), ty(yB)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(b), ty(yB), 3, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// =====================================================================
// --- MOTOR ANALÍTICO DE LA CALCULADORA POISSON POR OPCIONES ---
// =====================================================================

// Función acumulada para Poisson (suma de PMFs)
function poissonCDF(x, lambda) {
  if (x < 0) return 0;
  let sum = 0;
  const k = Math.floor(x);
  for (let i = 0; i <= k; i++) {
    sum += poissonPMF(i, lambda);
  }
  return sum;
}

function cambiarOpcionCalculadoraPoi(opcion) {
  calcPoiOpcionActiva = opcion;
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-poi-opt-${i}`);
    if (btn) {
      if (i === opcion) {
        btn.style.background = 'rgba(0, 212, 170, 0.15)';
        btn.style.borderColor = '#00d4aa';
      } else {
        btn.style.background = 'transparent';
        btn.style.borderColor = '';
      }
    }
  }
  ejecutarCalculadoraPoiPorOpcion();
}

function ejecutarCalculadoraPoiPorOpcion() {
  if (currentDist !== 'poisson') return;

  const lambda = Math.max(0.01, parseFloat(document.getElementById('calc-poi-lambda').value) || 4);
  let a = parseInt(document.getElementById('calc-poi-a').value) || 0;
  let b = parseInt(document.getElementById('calc-poi-b').value) || 0;

  if (a < 0) a = 0;
  if (b < 0) b = 0;

  const cdfA = poissonCDF(a, lambda);
  const cdfB = poissonCDF(b, lambda);
  const cdfA_minus_1 = poissonCDF(a - 1, lambda); // Clave para variables discretas

  let resultadoFinal = 0;
  let labelTexto = "";
  let tituloGrafico = "";

  switch (calcPoiOpcionActiva) {
    case 1:
      resultadoFinal = cdfA;
      labelTexto = `P(X ≤ ${a}) [Acumulada Izquierda] =`;
      tituloGrafico = `Suma de Masas de 0 a ${a}`;
      break;
    case 2:
      resultadoFinal = 1 - cdfA; // Complemento
      labelTexto = `P(X > ${a}) [Complemento Derecho] =`;
      tituloGrafico = `Masas activas desde ${a + 1} hacia ∞`;
      break;
    case 3:
      resultadoFinal = b >= a ? (cdfB - cdfA_minus_1) : 0;
      labelTexto = b >= a ? `P(${a} ≤ X ≤ ${b}) [Intervalo Exacto] =` : "Error: 'a' debe ser ≤ 'b'";
      tituloGrafico = b >= a ? `Masas en el intervalo [${a}, ${b}]` : "Error de Intervalo";
      break;
    case 4:
      const pEntre = b >= a ? (cdfB - cdfA_minus_1) : 0;
      resultadoFinal = 1 - pEntre;
      labelTexto = b >= a ? `P(X < ${a} o X > ${b}) [Extremos Aislados] =` : "Error: 'a' debe ser ≤ 'b'";
      tituloGrafico = b >= a ? `Masas Fuera de [${a}, ${b}]` : "Error de Intervalo";
      break;
  }

  document.getElementById('res-poi-calc-label').textContent = labelTexto;
  document.getElementById('res-poi-calc-value').textContent = (typeof resultadoFinal === 'number') ? resultadoFinal.toFixed(6) : "-";
  document.getElementById('pdf-poi-graph-title').textContent = `Probabilidad de Masa (PMF) — ${tituloGrafico}`;

  drawCalcPoiPMF(lambda, a, b);
  drawCalcPoiCDF(lambda, a, b);
}

// PMF Gráfico de Puntos/Lollipops (Propio de Poisson)
function drawCalcPoiPMF(lambda, a, b) {
  const canvas = document.getElementById('calc-poi-pdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  // Mostrar datos hasta un rango visible razonable (media + 4 sigmas)
  const xMax = Math.max(a, b, lambda + 4 * Math.sqrt(lambda));
  const bins = Math.ceil(xMax) + 1;

  let maxP = 0;
  for (let k = 0; k < bins; k++) maxP = Math.max(maxP, poissonPMF(k, lambda));

  const paddingLeft = 30, paddingRight = 20, paddingTop = 15, paddingBottom = 20;
  const tx = x => paddingLeft + (x / (bins - 1 || 1)) * (W - paddingLeft - paddingRight);
  const ty = y => H - paddingBottom - (y / (maxP * 1.1)) * (H - paddingTop - paddingBottom);

  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(paddingLeft, ty(0)); ctx.lineTo(W - paddingRight, ty(0)); ctx.stroke();

  for (let k = 0; k < bins; k++) {
    const p = poissonPMF(k, lambda);
    const cx = tx(k);
    const cy = ty(p);

    let pintar = false;
    if (calcPoiOpcionActiva === 1 && k <= a) pintar = true;
    else if (calcPoiOpcionActiva === 2 && k > a) pintar = true;
    else if (calcPoiOpcionActiva === 3 && b >= a && k >= a && k <= b) pintar = true;
    else if (calcPoiOpcionActiva === 4 && b >= a && (k < a || k > b)) pintar = true;

    ctx.strokeStyle = pintar ? '#00d4aa' : (isDark ? '#334155' : '#94a3b8');
    ctx.fillStyle = pintar ? '#00d4aa' : (isDark ? '#334155' : '#94a3b8');

    // Trazar línea y punto ("lollipop")
    ctx.beginPath();
    ctx.moveTo(cx, ty(0));
    ctx.lineTo(cx, cy);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Trazado de Etiquetas a y b
  ctx.fillStyle = '#ef4444'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  if (a >= 0 && a < bins && (calcPoiOpcionActiva !== 3 || b >= a)) ctx.fillText(`a=${a}`, tx(a), ty(0) + 12);
  if ((calcPoiOpcionActiva === 3 || calcPoiOpcionActiva === 4) && b >= a && b < bins) {
    ctx.fillStyle = '#ea580c'; ctx.fillText(`b=${b}`, tx(b), ty(0) + 12);
  }
}

// CDF Gráfico de Función Escalonada
function drawCalcPoiCDF(lambda, a, b) {
  const canvas = document.getElementById('calc-poi-cdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMax = Math.max(a, b, lambda + 4 * Math.sqrt(lambda));
  const bins = Math.ceil(xMax) + 1;

  const paddingLeft = 30, paddingRight = 20, paddingTop = 15, paddingBottom = 20;
  const tx = x => paddingLeft + (x / (bins - 1 || 1)) * (W - paddingLeft - paddingRight);
  const ty = y => H - paddingBottom - y * (H - paddingTop - paddingBottom);

  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2;
  let currentY = 0;
  
  for (let k = 0; k < bins; k++) {
    const p = poissonPMF(k, lambda);
    const nextY = currentY + p;

    // Escalonamiento (Línea horizontal)
    ctx.beginPath();
    ctx.moveTo(tx(k), ty(nextY));
    if (k < bins - 1) {
      ctx.lineTo(tx(k + 1), ty(nextY));
    } else {
      ctx.lineTo(tx(k) + 20, ty(nextY)); 
    }
    ctx.stroke();

    // Salto visual del escalón (Dashed vertical)
    if (k > 0) {
      ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
      ctx.moveTo(tx(k), ty(currentY)); ctx.lineTo(tx(k), ty(nextY)); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = '#0ea5e9';
    }
    currentY = nextY;
  }

  // Proyecciones condicionales
  ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';

  if (a >= 0 && a < bins) {
    const yA = poissonCDF(a, lambda);
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(yA)); ctx.lineTo(paddingLeft, ty(yA)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(a), ty(yA), 3, 0, 2 * Math.PI); ctx.fill();
  }
  if (b >= 0 && b < bins && b >= a && (calcPoiOpcionActiva === 3 || calcPoiOpcionActiva === 4)) {
    const yB = poissonCDF(b, lambda);
    ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(yB)); ctx.lineTo(paddingLeft, ty(yB)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(b), ty(yB), 3, 0, 2 * Math.PI); ctx.fill();
  }

  ctx.setLineDash([]);
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(paddingLeft, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// =====================================================================
// --- MOTOR ANALÍTICO DE LA CALCULADORA UNIFORME POR OPCIONES ---
// =====================================================================

// Función de distribución acumulada analítica para Uniforme
function uniformCDF(x, alpha, beta) {
  if (x < alpha) return 0;
  if (x > beta) return 1;
  return (x - alpha) / (beta - alpha);
}

function cambiarOpcionCalculadoraUni(opcion) {
  calcUniOpcionActiva = opcion;
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-uni-opt-${i}`);
    if (btn) {
      if (i === opcion) {
        btn.style.background = 'rgba(0, 212, 170, 0.15)';
        btn.style.borderColor = '#00d4aa';
      } else {
        btn.style.background = 'transparent';
        btn.style.borderColor = '';
      }
    }
  }
  ejecutarCalculadoraUniPorOpcion();
}

function ejecutarCalculadoraUniPorOpcion() {
  if (currentDist !== 'uniforme') return;

  let alpha = parseFloat(document.getElementById('calc-uni-min').value) || 0;
  let beta = parseFloat(document.getElementById('calc-uni-max').value) || 10;
  
  if (alpha >= beta) beta = alpha + 1; // Seguridad matemática

  let a = parseFloat(document.getElementById('calc-uni-a').value) || 0;
  let b = parseFloat(document.getElementById('calc-uni-b').value) || 0;

  const cdfA = uniformCDF(a, alpha, beta);
  const cdfB = uniformCDF(b, alpha, beta);

  let resultadoFinal = 0;
  let labelTexto = "";
  let tituloGrafico = "";

  switch (calcUniOpcionActiva) {
    case 1:
      resultadoFinal = cdfA;
      labelTexto = `P(X ≤ ${a}) [Área Izquierda] =`;
      tituloGrafico = `Área Sombreada hasta a = ${a}`;
      break;
    case 2:
      resultadoFinal = 1 - cdfA;
      labelTexto = `P(X > ${a}) [Área Derecha] =`;
      tituloGrafico = `Área Sombreada desde a = ${a}`;
      break;
    case 3:
      resultadoFinal = b >= a ? (cdfB - cdfA) : 0;
      labelTexto = b >= a ? `P(${a} ≤ X ≤ ${b}) [Intervalo Central] =` : "Error: 'a' debe ser ≤ 'b'";
      tituloGrafico = b >= a ? `Área Sombreada entre ${a} y ${b}` : "Error de Intervalo";
      break;
    case 4:
      const pEntre = b >= a ? (cdfB - cdfA) : 0;
      resultadoFinal = 1 - pEntre;
      labelTexto = b >= a ? `P(X < ${a} o X > ${b}) [Extremos Aislados] =` : "Error: 'a' debe ser ≤ 'b'";
      tituloGrafico = b >= a ? `Áreas Fuera de [${a}, ${b}]` : "Error de Intervalo";
      break;
  }

  document.getElementById('res-uni-calc-label').textContent = labelTexto;
  document.getElementById('res-uni-calc-value').textContent = (typeof resultadoFinal === 'number') ? resultadoFinal.toFixed(6) : "-";
  document.getElementById('pdf-uni-graph-title').textContent = `Densidad Uniforme (PDF) — ${tituloGrafico}`;

  drawCalcUniPDF(alpha, beta, a, b);
  drawCalcUniCDF(alpha, beta, a, b);
}

// PDF Uniforme Rectangular
function drawCalcUniPDF(alpha, beta, a, b) {
  const canvas = document.getElementById('calc-uni-pdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  // Mostrar los límites más un poco de holgura visual
  const padding = (beta - alpha) * 0.2;
  const xMin = alpha - padding, xMax = beta + padding;
  
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const pdfVal = 1 / (beta - alpha); // Altura de la caja
  const ty = y => H - (y / (pdfVal * 1.4)) * (H - 30) - 20;

  ctx.fillStyle = 'rgba(0, 212, 170, 0.2)'; 
  
  // Función auxiliar rápida para dibujar las cajas según la opción
  const drawRect = (startX, endX) => {
    const drawStart = Math.max(alpha, startX);
    const drawEnd = Math.min(beta, endX);
    if (drawStart < drawEnd) {
       ctx.fillRect(tx(drawStart), ty(pdfVal), tx(drawEnd) - tx(drawStart), ty(0) - ty(pdfVal));
    }
  };

  if (calcUniOpcionActiva === 1) drawRect(alpha, a);
  else if (calcUniOpcionActiva === 2) drawRect(a, beta);
  else if (calcUniOpcionActiva === 3 && b >= a) drawRect(a, b);
  else if (calcUniOpcionActiva === 4 && b >= a) {
    drawRect(alpha, a);
    drawRect(b, beta);
  }

  // Trazar los bordes formales del PDF Rectangular
  ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx(xMin), ty(0));
  ctx.lineTo(tx(alpha), ty(0));
  ctx.lineTo(tx(alpha), ty(pdfVal));
  ctx.lineTo(tx(beta), ty(pdfVal));
  ctx.lineTo(tx(beta), ty(0));
  ctx.lineTo(tx(xMax), ty(0));
  ctx.stroke();

  // Líneas indicadoras
  ctx.lineWidth = 1;
  if (a >= alpha && a <= beta && (calcUniOpcionActiva === 1 || calcUniOpcionActiva === 2 || calcUniOpcionActiva === 3 || calcUniOpcionActiva === 4)) {
    ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(pdfVal)); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = '9px monospace'; ctx.fillText(`a=${a}`, tx(a), ty(pdfVal) - 4);
  }
  if (b >= alpha && b <= beta && (calcUniOpcionActiva === 3 || calcUniOpcionActiva === 4) && b >= a) {
    ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(pdfVal)); ctx.stroke();
    ctx.fillStyle = '#ea580c'; ctx.font = '9px monospace'; ctx.fillText(`b=${b}`, tx(b), ty(pdfVal) - 4);
  }

  // Eje X
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// CDF Uniforme (Línea Diagonal Lineal)
function drawCalcUniCDF(alpha, beta, a, b) {
  const canvas = document.getElementById('calc-uni-cdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const padding = (beta - alpha) * 0.2;
  const xMin = alpha - padding, xMax = beta + padding;
  
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const ty = y => H - y * (H - 30) - 20; // y va de 0 a 1 lineal

  // Trazar línea de Probabilidad Acumulada
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx(xMin), ty(0));
  ctx.lineTo(tx(alpha), ty(0));
  ctx.lineTo(tx(beta), ty(1));
  ctx.lineTo(tx(xMax), ty(1));
  ctx.stroke();

  // Puntos y trazados de proyección
  ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';

  if (a >= alpha && a <= beta && (calcUniOpcionActiva === 1 || calcUniOpcionActiva === 2 || calcUniOpcionActiva === 3 || calcUniOpcionActiva === 4)) {
    const yA = uniformCDF(a, alpha, beta);
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(yA)); ctx.lineTo(tx(xMin), ty(yA)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(a), ty(yA), 3, 0, 2 * Math.PI); ctx.fill();
  }
  if (b >= alpha && b <= beta && (calcUniOpcionActiva === 3 || calcUniOpcionActiva === 4) && b >= a) {
    const yB = uniformCDF(b, alpha, beta);
    ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(yB)); ctx.lineTo(tx(xMin), ty(yB)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(b), ty(yB), 3, 0, 2 * Math.PI); ctx.fill();
  }

  ctx.setLineDash([]);
  
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// INYECCIÓN DE INICIO GENERAL AUTOMÁTICO (Solo asegúrate de reemplazar el tuyo al fondo con este)
setTimeout(() => { 
  cambiarOpcionCalculadora(1); 
  cambiarOpcionCalculadoraExp(1); 
  cambiarOpcionCalculadoraPoi(1); 
  cambiarOpcionCalculadoraUni(1);
}, 100);


// Inicialización de la UI
updateCalculatedValues();