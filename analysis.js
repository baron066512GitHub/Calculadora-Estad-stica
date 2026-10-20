// =====================================================================
// --- MÓDULO DE ANÁLISIS DE DATOS ESTADÍSTICOS PROPIOS ---
// =====================================================================

let isAnalysisMode = false;
let datosAnalizados = [];

function toggleAnalysisMode() {
  isAnalysisMode = !isAnalysisMode;
  const btn = document.getElementById('btn-toggle-analysis');
  const tabs = document.querySelector('.tabs');
  const viewFormulas = document.getElementById('view-formulas');
  const viewSim = document.getElementById('view-sim');
  const viewCalc = document.getElementById('view-calc');
  const viewAnalysis = document.getElementById('view-analysis');
  const distSelector = document.getElementById('dist-selector');

  if (isAnalysisMode) {
    btn.textContent = "🎲 Volver a Simulador";
    btn.style.background = "rgba(167, 139, 250, 0.2)";
    btn.style.borderColor = "#a78bfa";
    btn.style.color = "#a78bfa";
    tabs.style.display = 'none';
    viewFormulas.style.display = 'none';
    viewSim.style.display = 'none';
    viewCalc.style.display = 'none';
    distSelector.disabled = true;
    viewAnalysis.style.display = 'block';
  } else {
    btn.textContent = "📊 Analizar Datos";
    btn.style.background = "var(--bg-card)";
    btn.style.borderColor = "var(--border-color)";
    btn.style.color = "var(--text-main)";
    tabs.style.display = 'flex';
    distSelector.disabled = false;
    viewAnalysis.style.display = 'none';
    if (typeof switchTab === 'function') switchTab(activeTab);
  }
}

function toggleGroupingInputs() {
  const grouping = document.getElementById('analysis-grouping').value;
  document.getElementById('grouping-options').style.display = grouping === 'agrupados' ? 'grid' : 'none';
  procesarAnalisis();
}

function toggleIntervalInput() {
  const mode = document.getElementById('analysis-auto-intervals').value;
  document.getElementById('manual-intervals-container').style.visibility = mode === 'manual' ? 'visible' : 'hidden';
  procesarAnalisis();
}

function procesarAnalisis() {
  const rawData = document.getElementById('analysis-input').value;
  datosAnalizados = rawData.split(/[\s,;\n]+/).map(Number).filter(v => !isNaN(v) && v !== 0 || rawData.includes('0') && v === 0);

  if (datosAnalizados.length < 3) {
    alert("Por favor introduce al menos 3 números válidos.");
    return;
  }

  datosAnalizados.sort((a, b) => a - b);
  const isGrouped = document.getElementById('analysis-grouping').value === 'agrupados';
  const isPopulation = document.getElementById('analysis-type').value === 'poblacion';
  const autoIntervals = document.getElementById('analysis-auto-intervals').value === 'auto';
  const n = datosAnalizados.length;
  
  let clases = [];
  const min = datosAnalizados[0], max = datosAnalizados[n - 1];
  const rango = max - min;

  // 1. CONSTRUCCIÓN DE CLASES / TABLA DE FRECUENCIAS
  if (!isGrouped) {
    const mapeoFrec = {};
    datosAnalizados.forEach(x => mapeoFrec[x] = (mapeoFrec[x] || 0) + 1);
    for (let valor in mapeoFrec) {
      clases.push({ label: `Valor: ${valor}`, midpoint: parseFloat(valor), f: mapeoFrec[valor] });
    }
  } else {
    let k = autoIntervals ? Math.ceil(1 + 3.322 * Math.log10(n)) : parseInt(document.getElementById('analysis-k').value) || 5;
    if (k < 2) k = 2;
    let amplitud = rango / k;
    if (amplitud === 0) amplitud = 1;

    for (let i = 0; i < k; i++) {
      const inferior = min + i * amplitud, superior = min + (i + 1) * amplitud;
      const f = datosAnalizados.filter(v => (i === k - 1) ? (v >= inferior && v <= superior) : (v >= inferior && v < superior)).length;
      clases.push({ label: `[${inferior.toFixed(2)} , ${superior.toFixed(2)}${i === k - 1 ? ']' : ')'}`, midpoint: (inferior + superior) / 2, f: f });
    }
  }

  // 2. RENDERIZADO DE TABLA (ORDEN SOLICITADO)
  const thead = document.querySelector('#analysis-freq-card table thead');
  thead.innerHTML = `<tr><th>Nº</th><th style="text-align:left; padding-left:15px;">Intervalos</th><th>Frec. Abs (fᵢ)</th><th>Frec. Acum (Fᵢ)</th><th>Marca (Xᵢ)</th><th>Frec. Rel (hᵢ)</th><th>Frec. Rel. Acum (Hᵢ)</th></tr>`;
  const tbody = document.getElementById('analysis-freq-table-body');
  tbody.innerHTML = '';
  let F_acum = 0, H_acum = 0;
  
  clases.forEach((c, index) => {
    F_acum += c.f;
    const h = c.f / n;
    H_acum += h;
    tbody.innerHTML += `<tr><td style="color:var(--text-muted); font-family:monospace;">${index + 1}</td><td style="color:var(--text-desc); font-weight:600; text-align:left; padding-left:15px;">${c.label}</td><td style="color:#0ea5e9; font-weight:700;">${c.f}</td><td style="color:var(--text-muted);">${F_acum}</td><td style="font-family:monospace;">${c.midpoint.toFixed(2)}</td><td style="color:#00d4aa;">${h.toFixed(4)}</td><td style="color:var(--text-muted);">${Math.min(1.0, H_acum).toFixed(4)}</td></tr>`;
  });

  // 3. CÁLCULO DE ESTADÍSTICOS
  let media, mediana, moda, varianza, desviacion, cv, asimetria, curtosis;
  if (!isGrouped) {
    media = datosAnalizados.reduce((a, b) => a + b, 0) / n;
    const mid = Math.floor(n / 2);
    mediana = n % 2 !== 0 ? datosAnalizados[mid] : (datosAnalizados[mid - 1] + datosAnalizados[mid]) / 2;
    const frecMap = {}; let maxFrec = 0, modas = [];
    datosAnalizados.forEach(v => { frecMap[v] = (frecMap[v] || 0) + 1; if (frecMap[v] > maxFrec) maxFrec = frecMap[v]; });
    for (let k in frecMap) if (frecMap[k] === maxFrec) modas.push(Number(k));
    moda = modas.length === n ? "No existe moda" : modas.join(', ');
    const m2 = datosAnalizados.reduce((a, v) => a + Math.pow(v - media, 2), 0);
    const m3 = datosAnalizados.reduce((a, v) => a + Math.pow(v - media, 3), 0);
    const m4 = datosAnalizados.reduce((a, v) => a + Math.pow(v - media, 4), 0);

    if (isPopulation) {
      varianza = m2 / n; desviacion = Math.sqrt(varianza);
      asimetria = (m3 / n) / Math.pow(desviacion, 3);
      curtosis = ((m4 / n) / Math.pow(desviacion, 4)) - 3;
    } else {
      varianza = m2 / (n - 1); desviacion = Math.sqrt(varianza);
      asimetria = n > 2 ? (n * m3) / ((n - 1) * (n - 2) * Math.pow(desviacion, 3)) : 0;
      if (n > 3) {
        const f1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
        const f2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
        curtosis = (f1 * (m4 / Math.pow(desviacion, 4))) - f2;
      } else curtosis = 0;
    }
  } else {
    media = clases.reduce((a, c) => a + (c.midpoint * c.f), 0) / n;
    let fa = 0, idxMediana = 0;
    for (let i = 0; i < clases.length; i++) { fa += clases[i].f; if (fa >= n / 2) { idxMediana = i; break; } }
    mediana = clases[idxMediana].midpoint;
    let maxF = -1, classModa = clases[0];
    clases.forEach(c => { if (c.f > maxF) { maxF = c.f; classModa = c; } });
    moda = classModa.midpoint.toFixed(2);
    const m2 = clases.reduce((a, c) => a + c.f * Math.pow(c.midpoint - media, 2), 0);
    varianza = m2 / (isPopulation ? n : n - 1);
    desviacion = Math.sqrt(varianza);
    asimetria = (clases.reduce((a, c) => a + c.f * Math.pow(c.midpoint - media, 3), 0) / n) / Math.pow(desviacion, 3);
    curtosis = ((clases.reduce((a, c) => a + c.f * Math.pow(c.midpoint - media, 4), 0) / n) / Math.pow(desviacion, 4)) - 3;
  }
  cv = media !== 0 ? (desviacion / Math.abs(media)) : 0;

  // 4. RENDERIZADO ESTADÍSTICO
  const rows = [
    ['Total Observaciones (n)', n, 'Rango General', rango.toFixed(2)],
    ['Media Aritmética (X̄)', media.toFixed(4), 'Mediana', typeof mediana === 'number' ? mediana.toFixed(4) : mediana],
    ['Moda', moda, 'Varianza (' + (isPopulation ? 'σ²' : 'S²') + ')', varianza.toFixed(4)],
    ['Desviación Estándar (' + (isPopulation ? 'σ' : 'S') + ')', desviacion.toFixed(4), 'Coef. de Variación (Cv)', (cv * 100).toFixed(2) + '%'],
    ['Asimetría de Fisher', isNaN(asimetria) ? '0.0000' : asimetria.toFixed(4), 'Curtosis (Exceso)', isNaN(curtosis) ? '0.0000' : curtosis.toFixed(4)]
  ];
  let htmlRows = '';
  rows.forEach(r => {
    htmlRows += `<div class="stat-row"><div style="width:45%; color:var(--text-desc); font-size:12px;"><b>${r[0]}:</b> <span style="font-family:monospace; color:#0ea5e9;">${r[1]}</span></div><div style="width:45%; color:var(--text-desc); font-size:12px;"><b>${r[2]}:</b> <span style="font-family:monospace; color:#00d4aa;">${r[3]}</span></div></div>`;
  });
  document.getElementById('analysis-stats-rows').innerHTML = htmlRows;
  document.getElementById('analysis-stats-card').style.display = 'block';
  document.getElementById('analysis-chart-card').style.display = 'block';
  document.getElementById('analysis-freq-card').style.display = 'block';
  drawAnalysisChart(clases);
  drawAnalysisEmpiricalCharts(clases, datosAnalizados); 

}

function drawAnalysisChart(clases) {
  const canvas = document.getElementById('analysis-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 160 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const W = rect.width, H = 160;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const maxC = Math.max(...clases.map(c => c.f), 1);
  const paddingLeft = 40, paddingRight = 20, paddingTop = 20, paddingBottom = 20;
  const tx = idx => paddingLeft + (idx / clases.length) * (W - paddingLeft - paddingRight);
  const ty = y => H - (y / (maxC * 1.2)) * (H - paddingTop - paddingBottom) - paddingBottom;
  const cw = (W - paddingLeft - paddingRight) / clases.length;

  ctx.strokeStyle = isDark ? 'rgba(30, 45, 64, 0.4)' : 'rgba(203, 213, 225, 0.4)';
  for (let i = 0; i <= 4; i++) {
    const yVal = (maxC * 1.2) * (i / 4), yPos = ty(yVal);
    ctx.fillStyle = isDark ? '#64748b' : '#334155'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(yVal), paddingLeft - 6, yPos + 3);
    if (i > 0) { ctx.beginPath(); ctx.moveTo(paddingLeft, yPos); ctx.lineTo(W - paddingRight, yPos); ctx.stroke(); }
  }

  clases.forEach((c, i) => {
    const cx = tx(i), by = ty(c.f), bh = ty(0) - by;
    const grad = ctx.createLinearGradient(cx, by, cx, ty(0));
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.85)'); grad.addColorStop(1, 'rgba(0, 212, 170, 0.15)');
    ctx.fillStyle = grad; ctx.fillRect(cx + 1, by, cw - 2, bh);
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 1; ctx.strokeRect(cx + 1, by, cw - 2, bh);
    ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a'; ctx.textAlign = 'center'; ctx.font = 'bold 9px monospace';
    ctx.fillText(c.f, cx + cw / 2, by - 4);
  });
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(paddingLeft, ty(0)); ctx.lineTo(W - paddingRight, ty(0));
  ctx.moveTo(paddingLeft, paddingTop); ctx.lineTo(paddingLeft, ty(0)); ctx.stroke();
  ctx.fillStyle = isDark ? '#64748b' : '#334155'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  clases.forEach((c, i) => { ctx.fillText(c.midpoint.toFixed(1), tx(i) + cw / 2, ty(0) + 12); });
  document.getElementById('analysis-legend').innerHTML = `<span style="color:#0ea5e9">■</span> Intervalos / Marcas de Clase (fᵢ)`;
}

function calcularProbabilidad(tipo) {
  // Captura los valores de los inputs directamente por su ID
  const a = parseFloat(document.getElementById('analysis-prob-a').value);
  const b = parseFloat(document.getElementById('analysis-prob-b').value);
  
  // Validamos que 'a' siempre exista (para los casos menor/mayor)
  if (isNaN(a)) {
    alert("Por favor ingresa un valor en el campo 'Límite a'.");
    return;
  }

  const n = datosAnalizados.length;
  let conteo = 0;
  let etiqueta = "";

  switch (tipo) {
    case 'menor':
      conteo = datosAnalizados.filter(x => x <= a).length;
      etiqueta = `P(X ≤ ${a})`;
      break;
    case 'mayor':
      conteo = datosAnalizados.filter(x => x > a).length;
      etiqueta = `P(X > ${a})`;
      break;
    case 'entre':
      if (isNaN(b)) { alert("Ingresa un valor en 'Límite b'."); return; }
      conteo = datosAnalizados.filter(x => x >= a && x <= b).length;
      etiqueta = `P(${a} ≤ X ≤ ${b})`;
      break;
    case 'fuera':
      if (isNaN(b)) { alert("Ingresa un valor en 'Límite b'."); return; }
      conteo = datosAnalizados.filter(x => x < a || x > b).length;
      etiqueta = `P(X < ${a} o X > ${b})`;
      break;
  }

  const probabilidad = conteo / n;
  
  // Imprime el resultado en el elemento correcto
  document.getElementById('res-prob-val').innerHTML = 
    `${etiqueta} = ${probabilidad.toFixed(4)} <span style="color:var(--text-muted)">(${(probabilidad * 100).toFixed(2)}%)</span>`;
}

// Añade esta función al final de analysis.js
function drawAnalysisEmpiricalCharts(clases, datos) {
  // PDF / PMF empírica (frecuencia relativa)
  const pdfCanvas = document.getElementById('analysis-pdf-canvas');
  const cdfCanvas = document.getElementById('analysis-cdf-canvas');
  
  if (!pdfCanvas || !cdfCanvas) return;
  
  const dpr = window.devicePixelRatio || 1;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  
  // Dibujar PDF
  const rect = pdfCanvas.getBoundingClientRect();
  pdfCanvas.width = rect.width * dpr;
  pdfCanvas.height = 150 * dpr;
  const ctxPdf = pdfCanvas.getContext('2d');
  ctxPdf.scale(dpr, dpr);
  
  const W = rect.width, H = 150;
  const n = datos.length;
  const maxRel = Math.max(...clases.map(c => c.f / n), 0.01);
  const paddingLeft = 40, paddingRight = 20, paddingTop = 15, paddingBottom = 20;
  const cw = (W - paddingLeft - paddingRight) / clases.length;
  
  // Limpiar y dibujar ejes
  ctxPdf.clearRect(0, 0, W, H);
  ctxPdf.fillStyle = isDark ? '#64748b' : '#334155';
  ctxPdf.font = '9px monospace';
  
  // Eje Y
  for (let i = 0; i <= 4; i++) {
    const rel = (maxRel * i) / 4;
    const y = H - paddingBottom - (rel / maxRel) * (H - paddingTop - paddingBottom);
    ctxPdf.fillText(rel.toFixed(3), paddingLeft - 6, y + 3);
    ctxPdf.beginPath();
    ctxPdf.moveTo(paddingLeft, y);
    ctxPdf.lineTo(W - paddingRight, y);
    ctxPdf.strokeStyle = isDark ? 'rgba(30,45,64,0.4)' : 'rgba(203,213,225,0.4)';
    ctxPdf.stroke();
  }
  
  // Barras de frecuencia relativa
  clases.forEach((c, i) => {
    const x = paddingLeft + i * cw;
    const hRel = c.f / n;
    const barHeight = (hRel / maxRel) * (H - paddingTop - paddingBottom);
    const y = H - paddingBottom - barHeight;
    
    const grad = ctxPdf.createLinearGradient(x, y, x, y + barHeight);
    grad.addColorStop(0, 'rgba(0, 212, 170, 0.85)');
    grad.addColorStop(1, 'rgba(0, 212, 170, 0.15)');
    ctxPdf.fillStyle = grad;
    ctxPdf.fillRect(x + 1, y, cw - 2, barHeight);
    ctxPdf.strokeStyle = '#00d4aa';
    ctxPdf.strokeRect(x + 1, y, cw - 2, barHeight);
    
    ctxPdf.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
    ctxPdf.textAlign = 'center';
    ctxPdf.fillText(c.midpoint.toFixed(1), x + cw / 2, H - paddingBottom + 12);
  });
  
  // Dibujar CDF (acumulada)
  cdfCanvas.width = rect.width * dpr;
  cdfCanvas.height = 150 * dpr;
  const ctxCdf = cdfCanvas.getContext('2d');
  ctxCdf.scale(dpr, dpr);
  ctxCdf.clearRect(0, 0, W, H);
  
  let acum = 0;
  const points = [];
  clases.forEach((c, i) => {
    acum += c.f / n;
    const x = paddingLeft + i * cw + cw / 2;
    const y = H - paddingBottom - acum * (H - paddingTop - paddingBottom);
    points.push({ x, y, acum });
  });
  
  // Dibujar escalera de CDF
  ctxCdf.beginPath();
  ctxCdf.strokeStyle = '#a78bfa';
  ctxCdf.lineWidth = 2;
  let prevX = paddingLeft;
  let prevY = H - paddingBottom;
  
  points.forEach((p, idx) => {
    ctxCdf.beginPath();
    ctxCdf.moveTo(prevX, prevY);
    ctxCdf.lineTo(p.x - cw / 2, prevY);
    ctxCdf.lineTo(p.x - cw / 2, p.y);
    ctxCdf.lineTo(p.x, p.y);
    ctxCdf.stroke();
    prevX = p.x;
    prevY = p.y;
    
    // Etiquetas
    ctxCdf.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
    ctxCdf.font = 'bold 9px monospace';
    ctxCdf.fillText(p.acum.toFixed(3), p.x + 3, p.y - 3);
  });
  
  // Línea final
  ctxCdf.beginPath();
  ctxCdf.moveTo(prevX, prevY);
  ctxCdf.lineTo(W - paddingRight, prevY);
  ctxCdf.stroke();
  
  // Ejes CDF
  ctxCdf.fillStyle = isDark ? '#64748b' : '#334155';
  for (let i = 0; i <= 4; i++) {
    const prob = i / 4;
    const y = H - paddingBottom - prob * (H - paddingTop - paddingBottom);
    ctxCdf.fillText(prob.toFixed(2), paddingLeft - 6, y + 3);
  }
  ctxCdf.beginPath();
  ctxCdf.moveTo(paddingLeft, H - paddingBottom);
  ctxCdf.lineTo(W - paddingRight, H - paddingBottom);
  ctxCdf.moveTo(paddingLeft, paddingTop);
  ctxCdf.lineTo(paddingLeft, H - paddingBottom);
  ctxCdf.stroke();
}

// =====================================================================
// --- MÓDULO: PRUEBAS DE HOMOCEDASTICIDAD (BREUSCH-PAGAN Y WHITE) ---
// =====================================================================

// Regresión Lineal Simple: Y = b0 + b1*X
function regresionLinealSimple(x, y) {
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    den += (x[i] - meanX) ** 2;
  }
  const b1 = den !== 0 ? num / den : 0;
  const b0 = meanY - b1 * meanX;

  let ssr = 0, sst = 0;
  const yHat = [], resid = [], residSq = [];
  for (let i = 0; i < n; i++) {
    const yh = b0 + b1 * x[i];
    const u = y[i] - yh;
    yHat.push(yh);
    resid.push(u);
    residSq.push(u * u);
    ssr += (yh - meanY) ** 2;
    sst += (y[i] - meanY) ** 2;
  }
  const r2 = sst !== 0 ? Math.max(0, Math.min(1, ssr / sst)) : 0;
  return { b0, b1, r2, yHat, resid, residSq };
}

// Regresión Auxiliar de White: u^2 = d0 + d1*X + d2*X^2 (Resolución por Gauss-Jordan 3x3)
function regresionCuadraticaWhite(x, y) {
  const n = x.length;
  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0;
  let sy = 0, sxy = 0, sx2y = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i], xi2 = xi * xi, yi = y[i];
    sx += xi;
    sx2 += xi2;
    sx3 += xi2 * xi;
    sx4 += xi2 * xi2;
    sy += yi;
    sxy += xi * yi;
    sx2y += xi2 * yi;
  }

  // Matriz aumentada del sistema de ecuaciones normales
  const A = [
    [n,   sx,  sx2, sy],
    [sx,  sx2, sx3, sxy],
    [sx2, sx3, sx4, sx2y]
  ];

  // Eliminación Gaussiana con pivoteo parcial
  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    const tmp = A[i]; A[i] = A[maxRow]; A[maxRow] = tmp;

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let j = i; j < 4; j++) A[i][j] /= pivot;

    for (let k = 0; k < 3; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = i; j < 4; j++) A[k][j] -= factor * A[i][j];
      }
    }
  }

  const d0 = A[0][3] || 0, d1 = A[1][3] || 0, d2 = A[2][3] || 0;
  const meanY = sy / n;
  let sse = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    const yh = d0 + d1 * x[i] + d2 * x[i] * x[i];
    sse += (y[i] - yh) ** 2;
    sst += (y[i] - meanY) ** 2;
  }
  const r2 = sst !== 0 ? Math.max(0, Math.min(1, 1 - (sse / sst))) : 0;
  return { d0, d1, d2, r2 };
}

// Búsqueda binaria para hallar el Valor Crítico de Chi-Cuadrado
function invChiCuadrado(p, df) {
  let low = 0, high = df + 20 * Math.sqrt(2 * df);
  for (let i = 0; i < 45; i++) {
    const mid = (low + high) / 2;
    if (chiCuadradoCDF(mid, df) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function ejecutarPruebasHomocedasticidad() {
  const rawX = document.getElementById('homo-x').value.trim();
  const rawY = document.getElementById('homo-y').value.trim();
  if (!rawX || !rawY) return;

  const x = rawX.split(/[\s,;]+/).map(Number).filter(v => !isNaN(v));
  const y = rawY.split(/[\s,;]+/).map(Number).filter(v => !isNaN(v));

  if (x.length !== y.length || x.length < 4) {
    alert("X e Y deben tener la misma cantidad de datos (mínimo 4 pares).");
    return;
  }

  const n = x.length;
  const alpha = parseFloat(document.getElementById('homo-alpha').value) || 0.05;

  // 1. Regresión Principal MCO
  const ols = regresionLinealSimple(x, y);

  // 2. Prueba de Breusch-Pagan (gl = 1)
  const auxBP = regresionLinealSimple(x, ols.residSq);
  const lmBP = n * auxBP.r2;
  const pValBP = Math.max(0, 1 - chiCuadradoCDF(lmBP, 1));
  const critBP = invChiCuadrado(1 - alpha, 1);
  const rechazaBP = pValBP < alpha;

  // 3. Prueba de White (gl = 2)
  const auxWhite = regresionCuadraticaWhite(x, ols.residSq);
  const lmWhite = n * auxWhite.r2;
  const pValWhite = Math.max(0, 1 - chiCuadradoCDF(lmWhite, 2));
  const critWhite = invChiCuadrado(1 - alpha, 2);
  const rechazaWhite = pValWhite < alpha;

  // 4. Mostrar Resumen MCO
  document.getElementById('homo-ols-summary').innerHTML = `
    <span style="color:#00d4aa; font-weight:bold;">Ecuación Estimada (MCO):</span> Ŷ = ${ols.b0.toFixed(4)} + (${ols.b1.toFixed(4)})·X &nbsp;&nbsp;|&nbsp;&nbsp; 
    <b>n:</b> ${n} &nbsp;&nbsp;|&nbsp;&nbsp; <b>R² original:</b> ${ols.r2.toFixed(4)}
  `;

  // 5. Tarjetas de Decisión Estadística
  document.getElementById('homo-bp-box').innerHTML = `
    <div class="card-title" style="color:#0ea5e9;">Prueba de Breusch-Pagan (ν = 1)</div>
    <div class="stat-row"><span>R² Auxiliar:</span><b style="font-family:monospace;">${auxBP.r2.toFixed(4)}</b></div>
    <div class="stat-row"><span>Estadístico LM (n·R²):</span><b style="font-family:monospace; color:#0ea5e9;">${lmBP.toFixed(4)}</b></div>
    <div class="stat-row"><span>Valor Crítico 𝒳²(1):</span><b style="font-family:monospace;">${critBP.toFixed(4)}</b></div>
    <div class="stat-row"><span>p-valor:</span><b style="font-family:monospace; color:${rechazaBP ? '#ef4444' : '#00d4aa'};">${pValBP.toFixed(5)}</b></div>
    <div style="margin-top:10px; padding:8px; border-radius:6px; font-size:12px; font-weight:bold; text-align:center; background:${rechazaBP ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,170,0.15)'}; color:${rechazaBP ? '#ef4444' : '#00d4aa'};">
      ${rechazaBP ? '⚠️ Se rechaza H₀: Existe Heterocedasticidad' : '✅ No se rechaza H₀: Existe Homocedasticidad'}
    </div>
  `;

  document.getElementById('homo-white-box').innerHTML = `
    <div class="card-title" style="color:#f59e0b;">Prueba de White (ν = 2)</div>
    <div class="stat-row"><span>R² Auxiliar:</span><b style="font-family:monospace;">${auxWhite.r2.toFixed(4)}</b></div>
    <div class="stat-row"><span>Estadístico LM (n·R²):</span><b style="font-family:monospace; color:#f59e0b;">${lmWhite.toFixed(4)}</b></div>
    <div class="stat-row"><span>Valor Crítico 𝒳²(2):</span><b style="font-family:monospace;">${critWhite.toFixed(4)}</b></div>
    <div class="stat-row"><span>p-valor:</span><b style="font-family:monospace; color:${rechazaWhite ? '#ef4444' : '#00d4aa'};">${pValWhite.toFixed(5)}</b></div>
    <div style="margin-top:10px; padding:8px; border-radius:6px; font-size:12px; font-weight:bold; text-align:center; background:${rechazaWhite ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,170,0.15)'}; color:${rechazaWhite ? '#ef4444' : '#00d4aa'};">
      ${rechazaWhite ? '⚠️ Se rechaza H₀: Existe Heterocedasticidad' : '✅ No se rechaza H₀: Existe Homocedasticidad'}
    </div>
  `;

  // 6. Poblar Tabla de Residuos
  const tbody = document.getElementById('homo-table-body');
  tbody.innerHTML = '';
  for (let i = 0; i < n; i++) {
    tbody.innerHTML += `
      <tr>
        <td class="col-i">${i + 1}</td>
        <td>${x[i].toFixed(3)}</td>
        <td>${y[i].toFixed(3)}</td>
        <td class="col-z">${ols.yHat[i].toFixed(4)}</td>
        <td class="col-fa">${ols.resid[i].toFixed(4)}</td>
        <td class="col-xi">${ols.residSq[i].toFixed(4)}</td>
      </tr>
    `;
  }

  document.getElementById('homo-results-card').style.display = 'block';
  document.getElementById('homo-chart-card').style.display = 'block';
  document.getElementById('homo-table-card').style.display = 'block';

  drawHomoChart(x, ols.residSq, auxBP, auxWhite);
}

function drawHomoChart(x, u2, auxBP, auxWhite) {
  const canvas = document.getElementById('homo-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 180 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = rect.width, H = 180;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMin = Math.min(...x), xMax = Math.max(...x);
  const yMax = Math.max(...u2, 0.01) * 1.15;
  const padL = 45, padR = 20, padT = 15, padB = 25;

  const tx = val => padL + ((val - xMin) / (xMax - xMin || 1)) * (W - padL - padR);
  const ty = val => H - padB - (val / yMax) * (H - padT - padB);

  ctx.clearRect(0, 0, W, H);

  // Ejes
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.lineTo(W - padR, H - padB);
  ctx.stroke();

  // Curva Auxiliar Breusch-Pagan (Azul)
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx(xMin), ty(Math.max(0, auxBP.b0 + auxBP.b1 * xMin)));
  ctx.lineTo(tx(xMax), ty(Math.max(0, auxBP.b0 + auxBP.b1 * xMax)));
  ctx.stroke();

  // Curva Auxiliar White (Ámbar punteada)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const xi = xMin + (i / 100) * (xMax - xMin);
    const yi = Math.max(0, auxWhite.d0 + auxWhite.d1 * xi + auxWhite.d2 * xi * xi);
    if (i === 0) ctx.moveTo(tx(xi), ty(yi));
    else ctx.lineTo(tx(xi), ty(yi));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Puntos (Xi, ui^2)
  for (let i = 0; i < x.length; i++) {
    ctx.fillStyle = '#00d4aa';
    ctx.beginPath();
    ctx.arc(tx(x[i]), ty(u2[i]), 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

setTimeout(() => {
  if (typeof toggleTheme === 'function') {
    const originalToggleTheme = toggleTheme;
    toggleTheme = function() {
      originalToggleTheme();
      if (isAnalysisMode && datosAnalizados.length > 0) { procesarAnalisis(); }
    };
  }
}, 200);