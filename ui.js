// =====================================================================
// --- VARIABLES GLOBALES Y CONTROL DE INTERFAZ ---
// =====================================================================

// Variables de control global de simulación
window.resultados = [];
window.paramsGlobales = {};
let currentDist = 'normal';
let activeTab = 'formulas';
let appMainMode = 'distribuciones'; 

// LÓGICA DE TEMAS (CLARO / OSCURO)
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  
  if (resultados.length > 0 && typeof reDrawChart === 'function') {
    reDrawChart();
    reDrawCLTChart();
  }
}

// MANEJO DE PESTAÑAS
// --- MANEJO DE PESTAÑAS (FÓRMULAS / SIMULACIÓN / CALCULAR P / AUTOLAVADO) ---
function switchTab(tab) {
  activeTab = tab;
  
  // 1. Actualizar estado activo de los botones en el menú
  document.getElementById('tab-btn-formulas').classList.toggle('active', tab === 'formulas');
  document.getElementById('tab-btn-sim').classList.toggle('active', tab === 'sim');
  document.getElementById('tab-btn-calc').classList.toggle('active', tab === 'calc');
  document.getElementById('tab-btn-autolavado').classList.toggle('active', tab === 'autolavado');
  
  // 2. Ocultar todas las vistas principales
  document.getElementById('view-formulas').style.display = tab === 'formulas' ? 'block' : 'none';
  document.getElementById('view-sim').style.display = tab === 'sim' ? 'block' : 'none';
  document.getElementById('view-calc').style.display = tab === 'calc' ? 'block' : 'none';
  document.getElementById('view-autolavado').style.display = tab === 'autolavado' ? 'block' : 'none';

  // 3. Lógica específica para la vista de Calculadoras (Calculadora P)
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
      if (typeof ejecutarCalculadoraPorOpcion === 'function') ejecutarCalculadoraPorOpcion();
    } else if (currentDist === 'exponencial') {
      document.getElementById('calc-exponencial-content').style.display = 'block';
      if (typeof ejecutarCalculadoraExpPorOpcion === 'function') ejecutarCalculadoraExpPorOpcion();
    } else if (currentDist === 'poisson') {
      if (poiContent) poiContent.style.display = 'block';
      if (typeof ejecutarCalculadoraPoiPorOpcion === 'function') ejecutarCalculadoraPoiPorOpcion();
    } else if (currentDist === 'uniforme') {
      if (uniContent) uniContent.style.display = 'block';
      if (typeof ejecutarCalculadoraUniPorOpcion === 'function') ejecutarCalculadoraUniPorOpcion();
    } else {
      document.getElementById('calc-warning').style.display = 'block';
    }
  }

  // 4. Lógica específica para inicializar Autolavado
  if (tab === 'autolavado') {
    if (typeof initAutolavado === 'function') {
      initAutolavado();
    }
  }
}

// SELECTOR DE DISTRIBUCIÓN
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

  if (activeTab === 'calc') switchTab('calc');
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

// --- GESTOR DE MODOS (SIMULACIÓN <-> DESCRIPTIVA) ---
function toggleMainMode() {
  const descWorkspace = document.getElementById('view-descriptive-workspace');
  // IDs de los contenedores que pertenecen al modo simulación
  const mainViews = [document.getElementById('view-formulas'), document.getElementById('view-sim'), document.getElementById('view-calc')];
  const tabsMenu = document.querySelector('.tabs');
  const distSelector = document.getElementById('wrapper-dist-selector');
  const btn = document.getElementById('btn-toggle-analysis');

  if (appMainMode === 'distribuciones') {
    appMainMode = 'descriptiva';
    btn.textContent = '🎲 Volver a Simulaciones';
    mainViews.forEach(v => v.style.display = 'none');
    tabsMenu.style.display = 'none';
    distSelector.style.display = 'none';
    descWorkspace.style.display = 'block';
  } else {
    appMainMode = 'distribuciones';
    btn.textContent = '📊 Analizar Datos';
    descWorkspace.style.display = 'none';
    tabsMenu.style.display = 'flex';
    distSelector.style.display = 'block';
    // Volver a la pestaña activa
    switchTab(activeTab);
  }
}