// =====================================================================
// --- CALCULADORAS DE PROBABILIDAD ANALÍTICAS ---
// =====================================================================

let calcOpcionActiva = 1;
let calcExpOpcionActiva = 1;
let calcPoiOpcionActiva = 1;
let calcUniOpcionActiva = 1;

// --- CALCULADORA NORMAL ---
function cambiarOpcionCalculadora(opcion) {
  calcOpcionActiva = opcion;
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

  // 1. CAPTURA DE CAMPOS EN RAW (TEXTO EN BRUTO)
  const muRaw = document.getElementById('calc-mu').value;
  const sigmaRaw = document.getElementById('calc-sigma').value;
  const aRaw = document.getElementById('calc-a').value;
  const bRaw = document.getElementById('calc-b').value;
  const nRaw = document.getElementById('calc-sample-n') ? document.getElementById('calc-sample-n').value : "25";

  // 2. VALIDACIÓN CRÍTICA: Si el usuario está borrando y el campo queda vacío, frenamos el crasheo
  if (muRaw === "" || sigmaRaw === "" || aRaw === "" || bRaw === "") return;
  
  const typeEl = document.getElementById('calc-var-type');
  if (typeEl && typeEl.value === 'media' && nRaw === "") return;

  // 3. PARSEO SEGURO UNA VEZ VERIFICADO QUE HAY DATOS
  const mu = parseFloat(muRaw);
  const sigmaIndividual = parseFloat(sigmaRaw);
  const a = parseFloat(aRaw);
  const b = parseFloat(bRaw);

  // Si los datos parciales no son números válidos aún, evitamos operar
  if (isNaN(mu) || isNaN(sigmaIndividual) || isNaN(a) || isNaN(b)) return;
  if (sigmaIndividual <= 0) return; // La desviación no puede ser cero ni negativa

  // 4. LÓGICA DEL TEOREMA DEL LÍMITE CENTRAL (TLC)
  let sigma = sigmaIndividual;
  let varLabel = "X";
  
  if (typeEl && typeEl.value === 'media') {
    const n = parseInt(nRaw) || 25;
    if (isNaN(n) || n <= 0) return; // Evita división por cero o raíces imaginarias
    sigma = sigmaIndividual / Math.sqrt(n);
    varLabel = "X̄";
  }

  // 5. CÁLCULO DE PROBABILIDADES
  const cdfA = normalCDF(a, mu, sigma);
  const cdfB = normalCDF(b, mu, sigma);

  let resultadoFinal = 0, labelTexto = "", tituloGrafico = "";
  switch (calcOpcionActiva) {
    case 1: resultadoFinal = cdfA; labelTexto = `P(${varLabel} ≤ ${a}) =`; tituloGrafico = `Área Izquierda hasta ${a}`; break;
    case 2: resultadoFinal = 1 - cdfA; labelTexto = `P(${varLabel} > ${a}) =`; tituloGrafico = `Área Derecha desde ${a}`; break;
    case 3: resultadoFinal = b >= a ? (cdfB - cdfA) : 0; labelTexto = b >= a ? `P(${a} ≤ ${varLabel} ≤ ${b}) =` : "Error: 'a' debe ser ≤ 'b'"; tituloGrafico = b >= a ? `Área Central [${a}, ${b}]` : "Error"; break;
    case 4: const pEntre = b >= a ? (cdfB - cdfA) : 0; resultadoFinal = 1 - pEntre; labelTexto = b >= a ? `P(${varLabel} < ${a} o ${varLabel} > ${b}) =` : "Error: 'a' debe ser ≤ 'b'"; tituloGrafico = b >= a ? `Áreas Fuera de [${a}, ${b}]` : "Error"; break;
  }

  // 6. RENDERIZADO SEGURO EN INTERFAZ
  const labelEl = document.getElementById('res-calc-label');
  const valEl = document.getElementById('res-calc-value');
  const titleEl = document.getElementById('pdf-graph-title');

  if (labelEl) labelEl.textContent = labelTexto;
  if (valEl) valEl.textContent = (typeof resultadoFinal === 'number') ? resultadoFinal.toFixed(6) : "-";
  if (titleEl) titleEl.textContent = `Campana de Densidad (${varLabel}) — ${tituloGrafico}`;

  // 7. DIBUJO SEGURO EN CANVAS
  drawCalcPDF(mu, sigma, a, b); 
  drawCalcCDF(mu, sigma, a, b);
}

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

  ctx.fillStyle = 'rgba(0, 212, 170, 0.2)'; 
  if (calcOpcionActiva === 1) {
    ctx.beginPath(); ctx.moveTo(tx(xMin), ty(0));
    const step = (a - xMin) / 100;
    for (let x = xMin; x <= a; x += step) ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
    ctx.lineTo(tx(a), ty(0)); ctx.closePath(); ctx.fill();
  } else if (calcOpcionActiva === 2) {
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0));
    const step = (xMax - a) / 100;
    for (let x = a; x <= xMax; x += step) ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
    ctx.lineTo(tx(xMax), ty(0)); ctx.closePath(); ctx.fill();
  } else if (calcOpcionActiva === 3) {
    if (b > a) {
      ctx.beginPath(); ctx.moveTo(tx(a), ty(0));
      const step = (b - a) / 100;
      for (let x = a; x <= b; x += step) ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
      ctx.lineTo(tx(b), ty(0)); ctx.closePath(); ctx.fill();
    } else if (Math.abs(a - b) < 0.00001) {
      ctx.strokeStyle = 'rgba(0, 212, 170, 0.5)';
      ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(normalPDF(a, mu, sigma))); ctx.stroke();
    }
  } else if (calcOpcionActiva === 4) {
    ctx.beginPath(); ctx.moveTo(tx(xMin), ty(0));
    const stepLeft = (a - xMin) / 100;
    for (let x = xMin; x <= a; x += stepLeft) ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
    ctx.lineTo(tx(a), ty(0)); ctx.closePath(); ctx.fill();
    if (b > a || Math.abs(a - b) < 0.00001) {
      ctx.beginPath(); ctx.moveTo(tx(b), ty(0));
      const stepRight = (xMax - b) / 100;
      for (let x = b; x <= xMax; x += stepRight) ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
      ctx.lineTo(tx(xMax), ty(0)); ctx.closePath(); ctx.fill();
    }
  }

  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    i === 0 ? ctx.moveTo(tx(x), ty(normalPDF(x, mu, sigma))) : ctx.lineTo(tx(x), ty(normalPDF(x, mu, sigma)));
  }
  ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2; ctx.stroke();

  ctx.lineWidth = 1;
  if (a >= xMin && a <= xMax) {
    ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(normalPDF(a, mu, sigma))); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = '9px monospace'; ctx.fillText(`a=${a}`, tx(a), ty(normalPDF(a, mu, sigma)) - 4);
  }
  if ((calcOpcionActiva === 3 || calcOpcionActiva === 4) && b >= xMin && b <= xMax && b >= a) {
    ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(normalPDF(b, mu, sigma))); ctx.stroke();
    ctx.fillStyle = '#ea580c'; ctx.font = '9px monospace'; ctx.fillText(`b=${b}`, tx(b), ty(normalPDF(b, mu, sigma)) - 4);
  }

  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
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

  ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';
  if ((calcOpcionActiva >= 1 && calcOpcionActiva <= 4) && a >= xMin && a <= xMax) {
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
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// --- CALCULADORA EXPONENCIAL ---
function cambiarOpcionCalculadoraExp(opcion) {
  calcExpOpcionActiva = opcion;
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-exp-opt-${i}`);
    if (i === opcion) { btn.style.background = 'rgba(0, 212, 170, 0.15)'; btn.style.borderColor = '#00d4aa'; } 
    else { btn.style.background = 'transparent'; btn.style.borderColor = ''; }
  }
  ejecutarCalculadoraExpPorOpcion();
}

function ejecutarCalculadoraExpPorOpcion() {
  if (currentDist !== 'exponencial') return;
  const lambda = Math.max(0.001, parseFloat(document.getElementById('calc-exp-lambda').value) || 2);
  let a = parseFloat(document.getElementById('calc-exp-a').value) || 0;
  let b = parseFloat(document.getElementById('calc-exp-b').value) || 0;
  if (a < 0) a = 0; if (b < 0) b = 0;

  const cdfA = expCDF(a, lambda), cdfB = expCDF(b, lambda);
  let resultadoFinal = 0, labelTexto = "", tituloGrafico = "";
  switch (calcExpOpcionActiva) {
    case 1: resultadoFinal = cdfA; labelTexto = `P(X ≤ ${a}) =`; tituloGrafico = `Área Sombreada desde 0 hasta a = ${a}`; break;
    case 2: resultadoFinal = 1 - cdfA; labelTexto = `P(X > ${a}) =`; tituloGrafico = `Área Sombreada desde a = ${a} hacia ∞`; break;
    case 3: resultadoFinal = b >= a ? (cdfB - cdfA) : 0; labelTexto = b >= a ? `P(${a} ≤ X ≤ ${b}) =` : "Error: Límite 'a' debe ser ≤ 'b'"; tituloGrafico = b >= a ? `Área Sombreada entre ${a} y ${b}` : "Error"; break;
    case 4: resultadoFinal = 1 - (b >= a ? (cdfB - cdfA) : 0); labelTexto = b >= a ? `P(X < ${a} o X > ${b}) =` : "Error"; tituloGrafico = b >= a ? `Áreas Fuera de [${a}, ${b}]` : "Error"; break;
  }
  document.getElementById('res-exp-calc-label').textContent = labelTexto;
  document.getElementById('res-exp-calc-value').textContent = (typeof resultadoFinal === 'number') ? resultadoFinal.toFixed(6) : "-";
  document.getElementById('pdf-exp-graph-title').textContent = `Curva de Densidad (PDF) — ${tituloGrafico}`;
  drawCalcExpPDF(lambda, a, b); drawCalcExpCDF(lambda, a, b);
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
  const xMin = 0, xMax = Math.max(a, b, 4 / lambda) * 1.2; 
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const ty = y => H - (y / (lambda * 1.1)) * (H - 30) - 20; 

  ctx.fillStyle = 'rgba(0, 212, 170, 0.2)'; 
  if (calcExpOpcionActiva === 1) {
    ctx.beginPath(); ctx.moveTo(tx(xMin), ty(0));
    const step = (a - xMin) / 100;
    if (step > 0) { for (let x = xMin; x <= a; x += step) ctx.lineTo(tx(x), ty(expPDF(x, lambda))); } 
    else { ctx.lineTo(tx(a), ty(expPDF(a, lambda))); }
    ctx.lineTo(tx(a), ty(0)); ctx.closePath(); ctx.fill();
  } else if (calcExpOpcionActiva === 2) {
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0));
    const step = (xMax - a) / 100;
    for (let x = a; x <= xMax; x += step) ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
    ctx.lineTo(tx(xMax), ty(0)); ctx.closePath(); ctx.fill();
  } else if (calcExpOpcionActiva === 3 && b > a) {
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0));
    const step = (b - a) / 100;
    for (let x = a; x <= b; x += step) ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
    ctx.lineTo(tx(b), ty(0)); ctx.closePath(); ctx.fill();
  } else if (calcExpOpcionActiva === 4) {
    ctx.beginPath(); ctx.moveTo(tx(xMin), ty(0));
    const stepLeft = (a - xMin) / 100;
    if (stepLeft > 0) { for (let x = xMin; x <= a; x += stepLeft) ctx.lineTo(tx(x), ty(expPDF(x, lambda))); } 
    else { ctx.lineTo(tx(a), ty(expPDF(a, lambda))); }
    ctx.lineTo(tx(a), ty(0)); ctx.closePath(); ctx.fill();
    if (b > a || Math.abs(a - b) < 0.00001) {
      ctx.beginPath(); ctx.moveTo(tx(b), ty(0));
      const stepRight = (xMax - b) / 100;
      for (let x = b; x <= xMax; x += stepRight) ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
      ctx.lineTo(tx(xMax), ty(0)); ctx.closePath(); ctx.fill();
    }
  }

  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    i === 0 ? ctx.moveTo(tx(x), ty(expPDF(x, lambda))) : ctx.lineTo(tx(x), ty(expPDF(x, lambda)));
  }
  ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2; ctx.stroke();
  ctx.lineWidth = 1;
  if (a >= xMin && a <= xMax) {
    ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(expPDF(a, lambda))); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = '9px monospace'; ctx.fillText(`a=${a}`, tx(a), ty(expPDF(a, lambda)) - 4);
  }
  if ((calcExpOpcionActiva === 3 || calcExpOpcionActiva === 4) && b >= xMin && b <= xMax && b >= a) {
    ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(expPDF(b, lambda))); ctx.stroke();
    ctx.fillStyle = '#ea580c'; ctx.font = '9px monospace'; ctx.fillText(`b=${b}`, tx(b), ty(expPDF(b, lambda)) - 4);
  }
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
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
  const ty = y => H - y * (H - 30) - 20;

  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    const y = expCDF(x, lambda);
    i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y));
  }
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.stroke();
  ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';
  if ((calcExpOpcionActiva >= 1 && calcExpOpcionActiva <= 4) && a >= xMin && a <= xMax) {
    const yA = expCDF(a, lambda);
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(yA)); ctx.lineTo(tx(xMin), ty(yA)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(a), ty(yA), 3, 0, 2 * Math.PI); ctx.fill();
  }
  if ((calcExpOpcionActiva === 3 || calcExpOpcionActiva === 4) && b >= xMin && b <= xMax && b >= a) {
    const yB = expCDF(b, lambda);
    ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(yB)); ctx.lineTo(tx(xMin), ty(yB)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(b), ty(yB), 3, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.setLineDash([]); ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// --- CALCULADORA POISSON ---
function cambiarOpcionCalculadoraPoi(opcion) {
  calcPoiOpcionActiva = opcion;
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-poi-opt-${i}`);
    if (btn) { btn.style.background = i === opcion ? 'rgba(0, 212, 170, 0.15)' : 'transparent'; btn.style.borderColor = i === opcion ? '#00d4aa' : ''; }
  }
  ejecutarCalculadoraPoiPorOpcion();
}

function ejecutarCalculadoraPoiPorOpcion() {
  if (currentDist !== 'poisson') return;
  const lambda = Math.max(0.01, parseFloat(document.getElementById('calc-poi-lambda').value) || 4);
  let a = parseInt(document.getElementById('calc-poi-a').value) || 0;
  let b = parseInt(document.getElementById('calc-poi-b').value) || 0;
  if (a < 0) a = 0; if (b < 0) b = 0;

  const cdfA = poissonCDF(a, lambda), cdfB = poissonCDF(b, lambda), cdfA_minus_1 = poissonCDF(a - 1, lambda);
  let resultadoFinal = 0, labelTexto = "", tituloGrafico = "";

  switch (calcPoiOpcionActiva) {
    case 1: resultadoFinal = cdfA; labelTexto = `P(X ≤ ${a}) =`; tituloGrafico = `Suma de Masas de 0 a ${a}`; break;
    case 2: resultadoFinal = 1 - cdfA; labelTexto = `P(X > ${a}) =`; tituloGrafico = `Masas activas desde ${a + 1} hacia ∞`; break;
    case 3: resultadoFinal = b >= a ? (cdfB - cdfA_minus_1) : 0; labelTexto = b >= a ? `P(${a} ≤ X ≤ ${b}) =` : "Error: 'a' debe ser ≤ 'b'"; tituloGrafico = b >= a ? `Masas en el intervalo [${a}, ${b}]` : "Error de Intervalo"; break;
    case 4: resultadoFinal = 1 - (b >= a ? (cdfB - cdfA_minus_1) : 0); labelTexto = b >= a ? `P(X < ${a} o X > ${b}) =` : "Error: 'a' debe ser ≤ 'b'"; tituloGrafico = b >= a ? `Masas Fuera de [${a}, ${b}]` : "Error de Intervalo"; break;
  }
  document.getElementById('res-poi-calc-label').textContent = labelTexto;
  document.getElementById('res-poi-calc-value').textContent = (typeof resultadoFinal === 'number') ? resultadoFinal.toFixed(6) : "-";
  document.getElementById('pdf-poi-graph-title').textContent = `Probabilidad de Masa (PMF) — ${tituloGrafico}`;
  drawCalcPoiPMF(lambda, a, b); drawCalcPoiCDF(lambda, a, b);
}

function drawCalcPoiPMF(lambda, a, b) {
  const canvas = document.getElementById('calc-poi-pdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
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
    const cy = ty(poissonPMF(k, lambda)), cx = tx(k);
    let pintar = false;
    if (calcPoiOpcionActiva === 1 && k <= a) pintar = true;
    else if (calcPoiOpcionActiva === 2 && k > a) pintar = true;
    else if (calcPoiOpcionActiva === 3 && b >= a && k >= a && k <= b) pintar = true;
    else if (calcPoiOpcionActiva === 4 && b >= a && (k < a || k > b)) pintar = true;
    ctx.strokeStyle = pintar ? '#00d4aa' : (isDark ? '#334155' : '#94a3b8');
    ctx.fillStyle = pintar ? '#00d4aa' : (isDark ? '#334155' : '#94a3b8');
    ctx.beginPath(); ctx.moveTo(cx, ty(0)); ctx.lineTo(cx, cy); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.fillStyle = '#ef4444'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  if (a >= 0 && a < bins && (calcPoiOpcionActiva !== 3 || b >= a)) ctx.fillText(`a=${a}`, tx(a), ty(0) + 12);
  if ((calcPoiOpcionActiva === 3 || calcPoiOpcionActiva === 4) && b >= a && b < bins) { ctx.fillStyle = '#ea580c'; ctx.fillText(`b=${b}`, tx(b), ty(0) + 12); }
}

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

  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; let currentY = 0;
  for (let k = 0; k < bins; k++) {
    const nextY = currentY + poissonPMF(k, lambda);
    ctx.beginPath(); ctx.moveTo(tx(k), ty(nextY));
    if (k < bins - 1) ctx.lineTo(tx(k + 1), ty(nextY)); else ctx.lineTo(tx(k) + 20, ty(nextY));
    ctx.stroke();
    if (k > 0) {
      ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1';
      ctx.moveTo(tx(k), ty(currentY)); ctx.lineTo(tx(k), ty(nextY)); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = '#0ea5e9';
    }
    currentY = nextY;
  }
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
  ctx.setLineDash([]); ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(paddingLeft, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// --- CALCULADORA UNIFORME ---
function cambiarOpcionCalculadoraUni(opcion) {
  calcUniOpcionActiva = opcion;
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-uni-opt-${i}`);
    if (btn) { btn.style.background = i === opcion ? 'rgba(0, 212, 170, 0.15)' : 'transparent'; btn.style.borderColor = i === opcion ? '#00d4aa' : ''; }
  }
  ejecutarCalculadoraUniPorOpcion();
}

function ejecutarCalculadoraUniPorOpcion() {
  if (currentDist !== 'uniforme') return;
  let alpha = parseFloat(document.getElementById('calc-uni-min').value) || 0;
  let beta = parseFloat(document.getElementById('calc-uni-max').value) || 10;
  if (alpha >= beta) beta = alpha + 1;
  let a = parseFloat(document.getElementById('calc-uni-a').value) || 0;
  let b = parseFloat(document.getElementById('calc-uni-b').value) || 0;
  const cdfA = uniformCDF(a, alpha, beta), cdfB = uniformCDF(b, alpha, beta);
  let resultadoFinal = 0, labelTexto = "", tituloGrafico = "";
  switch (calcUniOpcionActiva) {
    case 1: resultadoFinal = cdfA; labelTexto = `P(X ≤ ${a}) =`; tituloGrafico = `Área Sombreada hasta a = ${a}`; break;
    case 2: resultadoFinal = 1 - cdfA; labelTexto = `P(X > ${a}) =`; tituloGrafico = `Área Sombreada desde a = ${a}`; break;
    case 3: resultadoFinal = b >= a ? (cdfB - cdfA) : 0; labelTexto = b >= a ? `P(${a} ≤ X ≤ ${b}) =` : "Error: 'a' debe ser ≤ 'b'"; tituloGrafico = b >= a ? `Área Sombreada entre ${a} y ${b}` : "Error"; break;
    case 4: resultadoFinal = 1 - (b >= a ? (cdfB - cdfA) : 0); labelTexto = b >= a ? `P(X < ${a} o X > ${b}) =` : "Error"; tituloGrafico = b >= a ? `Áreas Fuera de [${a}, ${b}]` : "Error"; break;
  }
  document.getElementById('res-uni-calc-label').textContent = labelTexto;
  document.getElementById('res-uni-calc-value').textContent = (typeof resultadoFinal === 'number') ? resultadoFinal.toFixed(6) : "-";
  document.getElementById('pdf-uni-graph-title').textContent = `Densidad Uniforme (PDF) — ${tituloGrafico}`;
  drawCalcUniPDF(alpha, beta, a, b); drawCalcUniCDF(alpha, beta, a, b);
}

function drawCalcUniPDF(alpha, beta, a, b) {
  const canvas = document.getElementById('calc-uni-pdf-canvas');
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
  const pdfVal = 1 / (beta - alpha);
  const ty = y => H - (y / (pdfVal * 1.4)) * (H - 30) - 20;

  ctx.fillStyle = 'rgba(0, 212, 170, 0.2)'; 
  const drawRect = (startX, endX) => {
    const drawStart = Math.max(alpha, startX), drawEnd = Math.min(beta, endX);
    if (drawStart < drawEnd) ctx.fillRect(tx(drawStart), ty(pdfVal), tx(drawEnd) - tx(drawStart), ty(0) - ty(pdfVal));
  };
  if (calcUniOpcionActiva === 1) drawRect(alpha, a);
  else if (calcUniOpcionActiva === 2) drawRect(a, beta);
  else if (calcUniOpcionActiva === 3 && b >= a) drawRect(a, b);
  else if (calcUniOpcionActiva === 4 && b >= a) { drawRect(alpha, a); drawRect(b, beta); }

  ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(tx(xMin), ty(0)); ctx.lineTo(tx(alpha), ty(0)); ctx.lineTo(tx(alpha), ty(pdfVal));
  ctx.lineTo(tx(beta), ty(pdfVal)); ctx.lineTo(tx(beta), ty(0)); ctx.lineTo(tx(xMax), ty(0)); ctx.stroke();

  ctx.lineWidth = 1;
  if (a >= alpha && a <= beta) {
    ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(pdfVal)); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = '9px monospace'; ctx.fillText(`a=${a}`, tx(a), ty(pdfVal) - 4);
  }
  if (b >= alpha && b <= beta && (calcUniOpcionActiva === 3 || calcUniOpcionActiva === 4) && b >= a) {
    ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(pdfVal)); ctx.stroke();
    ctx.fillStyle = '#ea580c'; ctx.font = '9px monospace'; ctx.fillText(`b=${b}`, tx(b), ty(pdfVal) - 4);
  }
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

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
  const ty = y => H - y * (H - 30) - 20;

  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(tx(xMin), ty(0)); ctx.lineTo(tx(alpha), ty(0)); ctx.lineTo(tx(beta), ty(1)); ctx.lineTo(tx(xMax), ty(1)); ctx.stroke();

  ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';
  if (a >= alpha && a <= beta) {
    const yA = uniformCDF(a, alpha, beta);
    ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(yA)); ctx.lineTo(tx(xMin), ty(yA)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(a), ty(yA), 3, 0, 2 * Math.PI); ctx.fill();
  }
  if (b >= alpha && b <= beta && (calcUniOpcionActiva === 3 || calcUniOpcionActiva === 4) && b >= a) {
    const yB = uniformCDF(b, alpha, beta);
    ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(yB)); ctx.lineTo(tx(xMin), ty(yB)); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(tx(b), ty(yB), 3, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.setLineDash([]); ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// --- CALCULADORA t-STUDENT (NUEVA Y EXCLUSIVA) ---
let calcTSOpcionActiva = 1;

function cambiarOpcionCalculadoraTS(opcion) {
  calcTSOpcionActiva = opcion;
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-ts-opt-${i}`);
    if (btn) {
      btn.style.background = i === opcion ? 'rgba(0, 212, 170, 0.15)' : 'transparent';
      btn.style.borderColor = i === opcion ? '#00d4aa' : '';
    }
  }
  ejecutarCalculadoraTSPorOpcion();
}

function ejecutarCalculadoraTSPorOpcion() {
  if (currentDist !== 'tstudent') return;
  const df = Math.max(1, parseInt(document.getElementById('calc-ts-df').value) || 5);
  const a = parseFloat(document.getElementById('calc-ts-a').value) || 0;
  const b = parseFloat(document.getElementById('calc-ts-b').value) || 0;

  const cdfA = tStudentCDF(a, df);
  const cdfB = tStudentCDF(b, df);

  let resultadoFinal = 0, labelTexto = "", tituloGrafico = "";
  switch (calcTSOpcionActiva) {
    case 1: resultadoFinal = cdfA; labelTexto = `P(T ≤ ${a}) =`; tituloGrafico = `Área Sombreada Izquierda hasta t = ${a}`; break;
    case 2: resultadoFinal = 1 - cdfA; labelTexto = `P(T > ${a}) =`; tituloGrafico = `Área Sombreada Derecha desde t = ${a}`; break;
    case 3: resultadoFinal = b >= a ? (cdfB - cdfA) : 0; labelTexto = b >= a ? `P(${a} ≤ T ≤ ${b}) =` : "Error: Límite 'a' debe ser ≤ 'b'"; tituloGrafico = b >= a ? `Área Central entre ${a} y ${b}` : "Error"; break;
    case 4: resultadoFinal = 1 - (b >= a ? (cdfB - cdfA) : 0); labelTexto = b >= a ? `P(T < ${a} o T > ${b}) =` : "Error"; tituloGrafico = b >= a ? `Áreas de Colas Fuera de [${a}, ${b}]` : "Error"; break;
  }

  document.getElementById('res-ts-calc-label').textContent = labelTexto;
  document.getElementById('res-ts-calc-value').textContent = resultadoFinal.toFixed(6);
  document.getElementById('pdf-ts-graph-title').textContent = `Curva de Densidad t-Student (ν=${df}) — ${tituloGrafico}`;

  drawCalcTStudentPDF(df, a, b);
  drawCalcTStudentCDF(df, a, b);
}

function drawCalcTStudentPDF(df, a, b) {
  const canvas = document.getElementById('calc-ts-pdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMin = -4, xMax = 4;
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const ty = y => H - (y / (tStudentPDF(0, df) * 1.2)) * (H - 30) - 20;

  ctx.fillStyle = 'rgba(167, 139, 250, 0.25)'; // Color púrpura distintivo para inferencia
  const drawShaded = (start, end) => {
    ctx.beginPath(); ctx.moveTo(tx(start), ty(0));
    const step = (end - start) / 100;
    for (let x = start; x <= end; x += step) ctx.lineTo(tx(x), ty(tStudentPDF(x, df)));
    ctx.lineTo(tx(end), ty(0)); ctx.closePath(); ctx.fill();
  };

  if (calcTSOpcionActiva === 1) drawShaded(xMin, a);
  else if (calcTSOpcionActiva === 2) drawShaded(a, xMax);
  else if (calcTSOpcionActiva === 3 && b > a) drawShaded(a, b);
  else if (calcTSOpcionActiva === 4) { drawShaded(xMin, a); if (b > a) drawShaded(b, xMax); }

  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    i === 0 ? ctx.moveTo(tx(x), ty(tStudentPDF(x, df))) : ctx.lineTo(tx(x), ty(tStudentPDF(x, df)));
  }
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(tStudentPDF(a, df))); ctx.stroke();
  if ((calcTSOpcionActiva === 3 || calcTSOpcionActiva === 4) && b >= a) {
    ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(tStudentPDF(b, df))); ctx.stroke();
  }
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

function drawCalcTStudentCDF(df, a, b) {
  const canvas = document.getElementById('calc-ts-cdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMin = -4, xMax = 4;
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const ty = y => H - y * (H - 30) - 20;

  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    i === 0 ? ctx.moveTo(tx(x), ty(tStudentCDF(x, df))) : ctx.lineTo(tx(x), ty(tStudentCDF(x, df)));
  }
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

// --- CALCULADORA CHI-CUADRADO (NUEVA) ---
let calcChiOpcionActiva = 1;

function cambiarOpcionCalculadoraChi(opcion) {
  calcChiOpcionActiva = opcion;
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-chi-opt-${i}`);
    if (btn) {
      btn.style.background = i === opcion ? 'rgba(14, 165, 233, 0.15)' : 'transparent';
      btn.style.borderColor = i === opcion ? '#0ea5e9' : '';
    }
  }
  ejecutarCalculadoraChiPorOpcion();
}

function ejecutarCalculadoraChiPorOpcion() {
  if (currentDist !== 'chicuadrado') return;
  const df = Math.max(1, parseInt(document.getElementById('calc-chi-df').value) || 5);
  const a = Math.max(0, parseFloat(document.getElementById('calc-chi-a').value) || 0);
  const b = Math.max(0, parseFloat(document.getElementById('calc-chi-b').value) || 0);

  const cdfA = chiCuadradoCDF(a, df);
  const cdfB = chiCuadradoCDF(b, df);

  let resultadoFinal = 0, labelTexto = "", tituloGrafico = "";
  switch (calcChiOpcionActiva) {
    case 1: resultadoFinal = cdfA; labelTexto = `P(𝒳² ≤ ${a}) =`; tituloGrafico = `Área Sombreada Izquierda hasta a = ${a}`; break;
    case 2: resultadoFinal = 1 - cdfA; labelTexto = `P(𝒳² > ${a}) =`; tituloGrafico = `Área Sombreada Derecha desde a = ${a}`; break;
    case 3: resultadoFinal = b >= a ? (cdfB - cdfA) : 0; labelTexto = b >= a ? `P(${a} ≤ 𝒳² ≤ ${b}) =` : "Error: Límite 'a' debe ser ≤ 'b'"; tituloGrafico = b >= a ? `Área Central entre ${a} y ${b}` : "Error"; break;
    case 4: resultadoFinal = 1 - (b >= a ? (cdfB - cdfA) : 0); labelTexto = b >= a ? `P(𝒳² < ${a} o 𝒳² > ${b}) =` : "Error"; tituloGrafico = b >= a ? `Áreas Fuera de [${a}, ${b}]` : "Error"; break;
  }

  document.getElementById('res-chi-calc-label').textContent = labelTexto;
  document.getElementById('res-chi-calc-value').textContent = resultadoFinal.toFixed(6);
  document.getElementById('pdf-chi-graph-title').textContent = `Curva de Densidad Chi-Cuadrado (ν=${df}) — ${tituloGrafico}`;

  drawCalcChiPDF(df, a, b);
  drawCalcChiCDF(df, a, b);
}

function drawCalcChiPDF(df, a, b) {
  const canvas = document.getElementById('calc-chi-pdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMin = 0, xMax = df + 4 * Math.sqrt(2 * df);
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  
  let maxPdf = 0;
  for(let x = 0; x <= xMax; x += 0.1) {
     let y = chiCuadradoPDF(x, df);
     if(y > maxPdf) maxPdf = y;
  }
  if(maxPdf === 0 || maxPdf > 10) maxPdf = 0.5;

  const ty = y => H - (y / (maxPdf * 1.2)) * (H - 30) - 20;

  ctx.fillStyle = 'rgba(14, 165, 233, 0.25)'; 
  const drawShaded = (start, end) => {
    ctx.beginPath(); ctx.moveTo(tx(start), ty(0));
    const step = (end - start) / 100;
    for (let x = start; x <= end; x += step) {
        let val = x===0 && df===1 ? 0 : chiCuadradoPDF(x, df);
        ctx.lineTo(tx(x), ty(val));
    }
    ctx.lineTo(tx(end), ty(0)); ctx.closePath(); ctx.fill();
  };

  if (calcChiOpcionActiva === 1) drawShaded(xMin, a);
  else if (calcChiOpcionActiva === 2) drawShaded(a, xMax);
  else if (calcChiOpcionActiva === 3 && b > a) drawShaded(a, b);
  else if (calcChiOpcionActiva === 4) { drawShaded(xMin, a); if (b > a) drawShaded(b, xMax); }

  ctx.beginPath();
  for (let i = 0.1; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    let val = x===0 && df===1 ? 0 : chiCuadradoPDF(x, df);
    i === 0.1 ? ctx.moveTo(tx(x), ty(val)) : ctx.lineTo(tx(x), ty(val));
  }
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.stroke();

  ctx.lineWidth = 1;
  let valA = a===0 && df===1 ? 0 : chiCuadradoPDF(a, df);
  ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tx(a), ty(0)); ctx.lineTo(tx(a), ty(valA)); ctx.stroke();
  if ((calcChiOpcionActiva === 3 || calcChiOpcionActiva === 4) && b >= a) {
    let valB = b===0 && df===1 ? 0 : chiCuadradoPDF(b, df);
    ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(tx(b), ty(0)); ctx.lineTo(tx(b), ty(valB)); ctx.stroke();
  }
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

function drawCalcChiCDF(df, a, b) {
  const canvas = document.getElementById('calc-chi-cdf-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 150 * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const W = rect.width, H = 150;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const xMin = 0, xMax = df + 4 * Math.sqrt(2 * df);
  const tx = x => ((x - xMin) / (xMax - xMin)) * (W - 40) + 20;
  const ty = y => H - y * (H - 30) - 20;

  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    i === 0 ? ctx.moveTo(tx(x), ty(chiCuadradoCDF(x, df))) : ctx.lineTo(tx(x), ty(chiCuadradoCDF(x, df)));
  }
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = isDark ? '#1e2d40' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
}

function toggleCalcSampleInput() {
  const el = document.getElementById('calc-var-type');
  if (el) {
    document.getElementById('calc-sample-n-container').style.display = el.value === 'media' ? 'block' : 'none';
    ejecutarCalculadoraPorOpcion();
  }
}

// =====================================================================
// --- VÍNCULO GLOBAL CON EL CONTROLADOR DE PESTAÑAS (SWITCHTAB) ---
// =====================================================================
const originalSwitchTab = switchTab;
switchTab = function(tab) {
  // Ejecutamos primero la función original para cambiar los contenedores base
  originalSwitchTab(tab);
  
  // Si entramos a la pestaña de la calculadora, gestionamos los contenidos específicos
  if (tab === 'calc') {
    const warningEl = document.getElementById('calc-warning');
    if (warningEl) warningEl.style.display = 'none';

    // 1. Ocultamos TODOS los contenidos de las calculadoras analíticas para limpiar la pantalla
    const contenidosCalculadoras = [
      'calc-normal-content',
      'calc-exponencial-content',
      'calc-poisson-content',
      'calc-uniforme-content',
      'calc-tstudent-content',
      'calc-chicuadrado-content'
    ];
    
    contenidosCalculadoras.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // 2. Activamos e inicializamos exclusivamente la calculadora de la distribución seleccionada
    if (currentDist === 'normal') {
      document.getElementById('calc-normal-content').style.display = 'block';
      if (typeof ejecutarCalculadoraPorOpcion === 'function') ejecutarCalculadoraPorOpcion();
    } else if (currentDist === 'exponencial') {
      document.getElementById('calc-exponencial-content').style.display = 'block';
      if (typeof ejecutarCalculadoraExpPorOpcion === 'function') ejecutarCalculadoraExpPorOpcion();
    } else if (currentDist === 'poisson') {
      const poiContent = document.getElementById('calc-poisson-content');
      if (poiContent) poiContent.style.display = 'block';
      if (typeof ejecutarCalculadoraPoiPorOpcion === 'function') ejecutarCalculadoraPoiPorOpcion();
    } else if (currentDist === 'uniforme') {
      const uniContent = document.getElementById('calc-uniforme-content');
      if (uniContent) uniContent.style.display = 'block';
      if (typeof ejecutarCalculadoraUniPorOpcion === 'function') ejecutarCalculadoraUniPorOpcion();
    } else if (currentDist === 'tstudent') {
      const tsContent = document.getElementById('calc-tstudent-content');
      if (tsContent) tsContent.style.display = 'block';
      if (typeof ejecutarCalculadoraTSPorOpcion === 'function') ejecutarCalculadoraTSPorOpcion();
    } else if (currentDist === 'chicuadrado') {
      const chiContent = document.getElementById('calc-chicuadrado-content');
      if (chiContent) chiContent.style.display = 'block';
      if (typeof cambiarOpcionCalculadoraChi === 'function') cambiarOpcionCalculadoraChi(1); // Enciende e inicializa la Chi-Cuadrado
    } else {
      if (warningEl) warningEl.style.display = 'block';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar modo de distribución por defecto
  if (typeof initSimulacion === 'function') {
    initSimulacion();
  }
  
  // Si tienes otras calculadoras, asegúrate de que también se inicien
  setTimeout(() => {
    if (typeof cambiarOpcionCalculadora === 'function') cambiarOpcionCalculadora(1);
    if (typeof cambiarOpcionCalculadoraExp === 'function') cambiarOpcionCalculadoraExp(1);
    if (typeof cambiarOpcionCalculadoraPoi === 'function') cambiarOpcionCalculadoraPoi(1);
    if (typeof cambiarOpcionCalculadoraUni === 'function') cambiarOpcionCalculadoraUni(1);
  }, 200);
});