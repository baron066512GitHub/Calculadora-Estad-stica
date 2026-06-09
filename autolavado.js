// =====================================================================
// --- LÓGICA DEL AUTOLAVADO (Aislada para no causar conflictos) ---
// =====================================================================

// Generadores de números aleatorios propios del autolavado
function generarNormal(media, desviacion) {
  const u1 = Math.random(); const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return media + desviacion * z;
}

function generarExponencial(media) {
  const lambda = 1 / media;
  return -(1 / lambda) * Math.log(1 - Math.random());
}

function generarPoissonDiscreta(lambda) {
  const limite = Math.exp(-lambda);
  let producto = 1, conteo = -1;
  do { producto *= Math.random(); conteo++; } while (producto > limite);
  return conteo;
}

function generarPoissonContinua(lambda) {
  return generarNormal(lambda, Math.sqrt(lambda));
}

function generarUniforme(a, b) {
  return a + (b - a) * Math.random();
}

function generarValorEtapa(config) {
  let valor;
  switch (config.distribucion) {
    case 'normal': valor = generarNormal(config.media, config.desviacion); break;
    case 'exponencial': valor = generarExponencial(config.media); break;
    case 'poisson': valor = config.modoPoisson === 'continua' ? generarPoissonContinua(config.lambda) : generarPoissonDiscreta(config.lambda); break;
    case 'uniforme': valor = generarUniforme(config.a, config.b); break;
  }
  return Math.max(0, valor);
}

// Configuración de etapas
const ETAPAS_POR_DEFECTO = [
  { nombre: 'Limpieza', distribucion: 'normal', media: 10, desviacion: 2, lambda: 10, a: 8, b: 12 },
  { nombre: 'Lavado',   distribucion: 'exponencial', media: 12, desviacion: 2, lambda: 10, a: 8, b: 12 },
  { nombre: 'Secado',   distribucion: 'uniforme', media: 10, desviacion: 2, lambda: 10, a: 8, b: 12 }
];

const PARAMS_POR_DISTRIBUCION = {
  normal: [ { clave: 'media', etiqueta: 'Media (μ)', paso: '0.1' }, { clave: 'desviacion', etiqueta: 'Desviación estándar (σ)', paso: '0.1' } ],
  exponencial: [ { clave: 'media', etiqueta: 'Media (1/λ)', paso: '0.1' } ],
  poisson: [ { clave: 'lambda', etiqueta: 'Lambda (λ)', paso: '0.1' } ],
  uniforme: [ { clave: 'a', etiqueta: 'Límite inferior (a)', paso: '0.1' }, { clave: 'b', etiqueta: 'Límite superior (b)', paso: '0.1' } ]
};

const VALORES_PARAMS_POR_DEFECTO = { media: 10, desviacion: 2, lambda: 10, a: 8, b: 12 };

let contenedorEtapas;
let contadorEtapas = 0;
const etapas = [];
let graficoBarras = null;
let graficoHistograma = null;
let ultimaSimulacion = [];

function crearEtapa(defecto) {
  const id = `al-etapa-${++contadorEtapas}`;
  const nombre = defecto.nombre || `Etapa ${etapas.length + 1}`;
  const etapa = { id, nombre, defecto };
  etapas.push(etapa);

  const tarjeta = document.createElement('div');
  tarjeta.className = 'card al-etapa-card';
  tarjeta.dataset.etapa = id;
  tarjeta.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <h4 style="color:#00d4aa; margin:0;">${nombre}</h4>
      <button type="button" class="btn-outline al-btn-quitar" style="width:auto; margin:0; padding:4px 8px;">✕ Quitar</button>
    </div>
    <div class="grid2">
      <div>
        <label for="dist-${id}">Distribución</label>
        <select id="dist-${id}">
          <option value="normal">Normal</option>
          <option value="exponencial">Exponencial</option>
          <option value="poisson">Poisson</option>
          <option value="uniforme">Uniforme</option>
        </select>
      </div>
      <div id="modo-pois-${id}" style="display:none;">
        <label for="modo-pois-select-${id}">Modo (Poisson)</label>
        <select id="modo-pois-select-${id}">
          <option value="discreta">Discreta (Exacta)</option>
          <option value="continua">Continua (Aprox)</option>
        </select>
      </div>
    </div>
    <div class="grid2 al-etapa-params" id="params-${id}" style="margin-top:10px;"></div>
  `;
  contenedorEtapas.appendChild(tarjeta);

  const select = tarjeta.querySelector(`#dist-${id}`);
  select.value = defecto.distribucion;
  select.addEventListener('change', () => renderParametros(etapa));
  const selectModoPoisson = tarjeta.querySelector(`#modo-pois-select-${id}`);
  selectModoPoisson.value = defecto.modoPoisson || 'discreta';
  tarjeta.querySelector('.al-btn-quitar').addEventListener('click', () => quitarEtapa(etapa, tarjeta));

  renderParametros(etapa);
  actualizarEstadoBotonesQuitar();
}

function quitarEtapa(etapa, tarjeta) {
  if (etapas.length <= 1) return;
  const indice = etapas.indexOf(etapa);
  if (indice !== -1) etapas.splice(indice, 1);
  tarjeta.remove();
  actualizarEstadoBotonesQuitar();
}

function actualizarEstadoBotonesQuitar() {
  const deshabilitar = etapas.length <= 1;
  contenedorEtapas.querySelectorAll('.al-btn-quitar').forEach(boton => { boton.disabled = deshabilitar; });
}

function renderParametros(etapa) {
  const select = document.getElementById(`dist-${etapa.id}`);
  const distribucion = select.value;
  const contenedor = document.getElementById(`params-${etapa.id}`);
  const definiciones = PARAMS_POR_DISTRIBUCION[distribucion];

  document.getElementById(`modo-pois-${etapa.id}`).style.display = distribucion === 'poisson' ? 'block' : 'none';

  contenedor.innerHTML = definiciones.map(def => {
    const valorPorDefecto = etapa.defecto.distribucion === distribucion ? etapa.defecto[def.clave] : VALORES_PARAMS_POR_DEFECTO[def.clave];
    return `<div><label for="${etapa.id}-${def.clave}">${def.etiqueta}</label><input type="number" id="${etapa.id}-${def.clave}" data-clave="${def.clave}" step="${def.paso}" value="${valorPorDefecto}"></div>`;
  }).join('');
}

function leerConfiguracionEtapa(etapa) {
  const distribucion = document.getElementById(`dist-${etapa.id}`).value;
  const contenedor = document.getElementById(`params-${etapa.id}`);
  const config = { distribucion, nombre: etapa.nombre };
  contenedor.querySelectorAll('input').forEach(input => { config[input.dataset.clave] = parseFloat(input.value); });
  if (distribucion === 'poisson') config.modoPoisson = document.getElementById(`modo-pois-select-${etapa.id}`).value;
  return config;
}

// NUEVO NOMBRE PARA EVITAR CONFLICTO
function simularAutolavado() {
  const inputK = document.getElementById('al-num-autos');
  const inputHoras = document.getElementById('al-horas-operacion');
  
  let k = Math.min(500, Math.max(1, parseInt(inputK.value, 10) || 1));
  const horas = Math.max(0, parseFloat(inputHoras.value) || 0);
  const configs = etapas.map(leerConfiguracionEtapa);

  const resultados = [];
  for (let i = 1; i <= k; i++) {
    const tiempos = configs.map(generarValorEtapa);
    const total = tiempos.reduce((a, b) => a + b, 0);
    resultados.push({ auto: i, tiempos, total });
  }

  renderTabla(resultados, configs);
  renderMetricas(resultados, horas);
  renderGraficoBarras(resultados);
  renderHistograma(resultados);
  ultimaSimulacion = resultados;
}

function renderTabla(resultados, configs) {
  const contenedor = document.getElementById('al-results-container');
  contenedor.innerHTML = `<div class="card-title">Resultados por Auto</div><div class="tbl-wrap"><table>
    <thead><tr><th>Auto</th>${configs.map(c => `<th>${c.nombre} (min)</th>`).join('')}<th>Total (min)</th></tr></thead>
    <tbody>${resultados.map(r => `<tr><td>${r.auto}</td>${r.tiempos.map(t => `<td>${t.toFixed(2)}</td>`).join('')}<td style="color:#00d4aa; font-weight:bold;">${r.total.toFixed(2)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function renderMetricas(resultados, horas) {
  const totales = resultados.map(r => r.total);
  const n = totales.length;
  const promedio = totales.reduce((a, b) => a + b, 0) / n;
  
  const minutosDisponibles = horas * 60;
  let acumulado = 0, atendidos = 0;
  for (const total of totales) { acumulado += total; if (acumulado <= minutosDisponibles) atendidos++; else break; }

  document.getElementById('al-metricas-container').innerHTML = `
    <div class="card" style="margin-top:14px; border-left:4px solid #f59e0b;">
      <div class="card-title">Resumen Operativo</div>
      <p style="font-size:13px; color:var(--text-desc);">Promedio total por auto: <b style="color:#0ea5e9;">${promedio.toFixed(2)} min</b></p>
      <p style="font-size:13px; color:var(--text-desc); margin-top:6px;">En <b>${horas}</b> horas (${minutosDisponibles} min), se atenderán aproximadamente <b style="color:#f59e0b; font-size:16px;">${atendidos}</b> de los ${n} autos simulados.</p>
    </div>`;
}

function renderGraficoBarras(resultados) {
  const ctx = document.getElementById('al-grafico-barras');
  if (graficoBarras) graficoBarras.destroy();
  graficoBarras = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: resultados.map(r => `A${r.auto}`),
      datasets: [{ label: 'Tiempo Total (min)', data: resultados.map(r => r.total), backgroundColor: '#0ea5e9' }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
}

function renderHistograma(resultados) {
  const ctx = document.getElementById('al-grafico-histograma');
  const totales = resultados.map(r => r.total);
  const min = Math.min(...totales), max = Math.max(...totales);
  const bins = 10, ancho = (max - min) / bins || 1;
  
  const conteos = new Array(bins).fill(0);
  totales.forEach(v => { let idx = Math.floor((v - min) / ancho); if (idx >= bins) idx = bins - 1; conteos[idx]++; });

  if (graficoHistograma) graficoHistograma.destroy();
  graficoHistograma = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: conteos.map((_, i) => `${(min + i * ancho).toFixed(1)} - ${(min + (i + 1) * ancho).toFixed(1)}`),
      datasets: [{ label: 'Frecuencia de Autos', data: conteos, backgroundColor: '#00d4aa' }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
}

let inicializado = false;
function initAutolavado() {
  if (inicializado) return;
  inicializado = true;
  contenedorEtapas = document.getElementById('al-etapas-container');
  ETAPAS_POR_DEFECTO.forEach(crearEtapa);
  
  document.getElementById('al-btn-agregar-etapa').addEventListener('click', () => {
    crearEtapa({ nombre: `Etapa ${etapas.length + 1}`, distribucion: 'normal', media: 10, desviacion: 2, lambda: 10, a: 8, b: 12 });
  });

  document.getElementById('al-btn-simular').addEventListener('click', simularAutolavado);
  simularAutolavado();
}