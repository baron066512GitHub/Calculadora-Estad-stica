// =====================================================================
// --- MÓDULO DE ANÁLISIS DE VARIANZA (ANOVA) Y HOMOCEDASTICIDAD ---
// =====================================================================

// Estado global de ANOVA
let anovaState = {
  activeSubtab: 'bartlett', // 'bartlett' | 'levene' | 'breusch-pagan' | 'comparativa' | 'oneway' | 'teoria'
  alfa: 0.05,
  leveneCenter: 'media',   // 'media' | 'mediana'
  bpTipo: 'breusch-pagan',  // 'breusch-pagan' | 'white'
  regModo: 'resumen',      // 'resumen' | 'bruto'
  regResumen: { n: 30, r2: 0.18 },
  grupos: [
    { nombre: 'Servidor 1', datos: '10, 12, 14, 12' },
    { nombre: 'Servidor 2', datos: '20, 25, 15, 20' },
    { nombre: 'Servidor 3', datos: '30, 31, 29, 30' }
  ],
  regDatosBrutos: `10, 62.4
15, 68.1
18, 72.3
20, 74.0
22, 77.2
25, 80.5
28, 83.1
30, 85.9
32, 89.2
35, 91.8
38, 96.0
40, 97.5
42, 102.1
45, 104.3
48, 109.8
50, 110.2
52, 115.4
55, 118.0
58, 122.9
60, 123.5
62, 129.0
65, 131.2
68, 137.4
70, 138.1
72, 144.5
75, 147.0
78, 153.2
80, 155.0
85, 163.5
90, 172.0`
};

let chartInstances = {
  bartlettGrupos: null,
  leveneGrupos: null,
  bpGrupos: null
};

let anovaInitialized = false;

// =====================================================================
// --- INICIALIZACIÓN ---
// =====================================================================
function initAnova() {
  if (anovaInitialized) {
    ejecutarSubtabActivo();
    return;
  }
  anovaInitialized = true;
  renderGruposInputs('bartlett');
  renderGruposInputs('levene');
  ejecutarSubtabActivo();
}

// =====================================================================
// --- NAVEGACIÓN ENTRE SUBPESTAÑAS DE ANOVA ---
// =====================================================================
function switchAnovaSubtab(subtab) {
  anovaState.activeSubtab = subtab;

  const tabs = ['bartlett', 'levene', 'bp', 'comparativa', 'oneway', 'teoria'];
  const viewMap = {
    'bartlett': 'anova-view-bartlett',
    'levene': 'anova-view-levene',
    'breusch-pagan': 'anova-view-bp',
    'bp': 'anova-view-bp',
    'comparativa': 'anova-view-comparativa',
    'oneway': 'anova-view-oneway',
    'teoria': 'anova-view-teoria'
  };

  const key = subtab === 'breusch-pagan' ? 'bp' : subtab;

  tabs.forEach(t => {
    const btn = document.getElementById(`subtab-btn-${t}`);
    if (btn) btn.classList.toggle('active', t === key);
  });

  ['anova-view-bartlett', 'anova-view-levene', 'anova-view-bp', 'anova-view-comparativa', 'anova-view-oneway', 'anova-view-teoria'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const activeViewId = viewMap[subtab] || 'anova-view-bartlett';
  const targetView = document.getElementById(activeViewId);
  if (targetView) targetView.style.display = 'block';

  ejecutarSubtabActivo();
}

function ejecutarSubtabActivo() {
  const s = anovaState.activeSubtab;
  if (s === 'bartlett') {
    renderGruposInputs('bartlett');
    ejecutarBartlett();
  } else if (s === 'levene') {
    renderGruposInputs('levene');
    ejecutarLevene();
  } else if (s === 'breusch-pagan' || s === 'bp') {
    ejecutarBreuschPaganWhite();
  } else if (s === 'comparativa') {
    ejecutarComparativa();
  } else if (s === 'oneway') {
    ejecutarOneWayANOVA();
  }
}

function cambiarAlfaGlobal(val) {
  const parsed = parseFloat(val);
  if (!isNaN(parsed) && parsed > 0 && parsed < 1) {
    anovaState.alfa = parsed;
    // Sincronizar todos los selectores de alfa
    ['bartlett-alfa', 'levene-alfa', 'bp-alfa'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    ejecutarSubtabActivo();
  }
}

function cambiarBpTipo(tipo) {
  anovaState.bpTipo = tipo;
  const btnBp = document.getElementById('btn-bp-subtipo-bp');
  const btnWhite = document.getElementById('btn-bp-subtipo-white');
  if (btnBp) btnBp.classList.toggle('active', tipo === 'breusch-pagan');
  if (btnWhite) btnWhite.classList.toggle('active', tipo === 'white');
  ejecutarBreuschPaganWhite();
}

function cambiarRegModo(modo) {
  anovaState.regModo = modo;
  const elResumen = document.getElementById('bp-modo-resumen');
  const elBruto = document.getElementById('bp-modo-bruto');
  if (elResumen) elResumen.style.display = modo === 'resumen' ? 'grid' : 'none';
  if (elBruto) elBruto.style.display = modo === 'bruto' ? 'block' : 'none';
  ejecutarBreuschPaganWhite();
}

// =====================================================================
// --- GESTIÓN DE GRUPOS (SINCRONIZADA) ---
// =====================================================================
function renderGruposInputs(targetPrefix = 'bartlett') {
  const container = document.getElementById(`${targetPrefix}-groups-container`);
  if (!container) return;

  container.innerHTML = '';
  anovaState.grupos.forEach((g, idx) => {
    const parsed = parsearValores(g.datos);
    const n = parsed.length;
    const media = n > 0 ? parsed.reduce((a, b) => a + b, 0) / n : 0;
    const s2 = n > 1 ? parsed.reduce((a, b) => a + Math.pow(b - media, 2), 0) / (n - 1) : 0;
    const s = Math.sqrt(s2);

    const div = document.createElement('div');
    div.className = 'group-item-card';
    div.innerHTML = `
      <div class="group-item-header">
        <div>
          <span style="font-size:11px;color:var(--text-muted);margin-right:6px;">GRUPO ${idx + 1}:</span>
          <input type="text" class="group-item-title" value="${escapeHtml(g.nombre)}" onchange="actualizarNombreGrupo(${idx}, this.value)">
        </div>
        ${anovaState.grupos.length > 2 ? `<button class="btn-del-group" onclick="eliminarGrupoHomo(${idx})">🗑️ Eliminar</button>` : ''}
      </div>
      <div>
        <label>Mediciones / Observaciones (separadas por coma o espacio):</label>
        <input type="text" style="width:100%;font-family:monospace;background:var(--bg-input);border:1px solid var(--border-color);border-radius:6px;padding:8px 10px;color:var(--text-main);"
               value="${escapeHtml(g.datos)}" oninput="actualizarDatosGrupo(${idx}, this.value)">
      </div>
      <div class="group-stat-pills">
        <span class="group-stat-pill">Tamaño (nᵢ): <b>${n}</b></span>
        <span class="group-stat-pill">Media (X̄ᵢ): <b>${n > 0 ? media.toFixed(2) : '-'}</b></span>
        <span class="group-stat-pill">Varianza (Sᵢ²): <b>${n > 1 ? s2.toFixed(3) : '-'}</b></span>
        <span class="group-stat-pill">Desv. Est (Sᵢ): <b>${n > 1 ? s.toFixed(3) : '-'}</b></span>
      </div>
    `;
    container.appendChild(div);
  });
}

function actualizarNombreGrupo(idx, nuevoNombre) {
  if (anovaState.grupos[idx]) {
    anovaState.grupos[idx].nombre = nuevoNombre;
    ejecutarSubtabActivo();
  }
}

function actualizarDatosGrupo(idx, nuevosDatos) {
  if (anovaState.grupos[idx]) {
    anovaState.grupos[idx].datos = nuevosDatos;
    renderGruposInputs('bartlett');
    renderGruposInputs('levene');
    ejecutarSubtabActivo();
  }
}

function agregarGrupoHomo() {
  const num = anovaState.grupos.length + 1;
  anovaState.grupos.push({
    nombre: `Servidor ${num}`,
    datos: '10, 12, 14, 12'
  });
  renderGruposInputs('bartlett');
  renderGruposInputs('levene');
  ejecutarSubtabActivo();
}

function eliminarGrupoHomo(idx) {
  if (anovaState.grupos.length > 2) {
    anovaState.grupos.splice(idx, 1);
    renderGruposInputs('bartlett');
    renderGruposInputs('levene');
    ejecutarSubtabActivo();
  } else {
    alert("Se requieren al menos 2 grupos para evaluar homocedasticidad.");
  }
}

function cargarEscenarioBase() {
  anovaState.grupos = [
    { nombre: 'Servidor 1', datos: '10, 12, 14, 12' },
    { nombre: 'Servidor 2', datos: '20, 25, 15, 20' },
    { nombre: 'Servidor 3', datos: '30, 31, 29, 30' }
  ];
  anovaState.alfa = 0.05;
  ['bartlett-alfa', 'levene-alfa', 'bp-alfa'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "0.05";
  });
  renderGruposInputs('bartlett');
  renderGruposInputs('levene');
  ejecutarSubtabActivo();
}

function cargarEscenarioRegresion() {
  anovaState.regResumen = { n: 30, r2: 0.18 };
  const nInput = document.getElementById('bp-reg-n');
  const r2Input = document.getElementById('bp-reg-r2');
  if (nInput) nInput.value = 30;
  if (r2Input) r2Input.value = 0.18;
  anovaState.alfa = 0.05;
  const aInput = document.getElementById('bp-alfa');
  if (aInput) aInput.value = "0.05";
  ejecutarBreuschPaganWhite();
}

function parsearValores(str) {
  if (!str) return [];
  return str.split(/[\s,;\n]+/)
    .map(v => parseFloat(v.trim()))
    .filter(v => !isNaN(v));
}

function escapeHtml(text) {
  return (text || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function obtenerGruposValidos() {
  return anovaState.grupos.map((g, i) => {
    const valores = parsearValores(g.datos);
    const n = valores.length;
    const media = n > 0 ? valores.reduce((a, b) => a + b, 0) / n : 0;
    const s2 = n > 1 ? valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / (n - 1) : 0;
    return { id: i + 1, nombre: g.nombre || `Grupo ${i + 1}`, valores, n, media, s2 };
  }).filter(g => g.n >= 2);
}

// =====================================================================
// --- 1. PRUEBA DE BARTLETT (8 PASOS) ---
// =====================================================================
function resolverBartlett(gruposParsed, alfa) {
  const k = gruposParsed.length;
  let N = 0;
  gruposParsed.forEach(g => N += g.n);
  const dfTotal = N - k;

  if (dfTotal <= 0) return { error: 'Los grados de libertad (N - k) deben ser mayores que 0.' };

  let sumPonderada = 0, sumLnPonderada = 0, sumInvDf = 0;
  gruposParsed.forEach(g => {
    const dfi = g.n - 1;
    sumPonderada += dfi * g.s2;
    sumLnPonderada += dfi * Math.log(g.s2 > 0 ? g.s2 : 1e-9);
    sumInvDf += (dfi > 0) ? (1.0 / dfi) : 0;
  });

  const Sp2 = sumPonderada / dfTotal;
  const numerador = (dfTotal * Math.log(Sp2)) - sumLnPonderada;
  const factorC = 1.0 + (1.0 / (3.0 * (k - 1))) * (sumInvDf - (1.0 / dfTotal));
  const chi0 = numerador / factorC;

  const dfCrit = k - 1;
  const chiCrit = invChiCuadradoCDF(1.0 - alfa, dfCrit);
  const pValor = 1.0 - chiCuadradoCDF(chi0, dfCrit);
  const seRechaza = chi0 > chiCrit;

  return {
    tipo: 'bartlett', k, N, dfTotal, Sp2, sumPonderada, sumLnPonderada, sumInvDf,
    numerador, factorC, chi0, dfCrit, chiCrit, pValor, seRechaza, alfa,
    grupos: gruposParsed
  };
}

function ejecutarBartlett() {
  const container = document.getElementById('bartlett-results');
  if (!container) return;

  const gruposValidos = obtenerGruposValidos();
  if (gruposValidos.length < 2) {
    container.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;"><p style="color:#ef4444;">⚠️ Se requieren al menos 2 grupos con un mínimo de 2 observaciones cada uno.</p></div>`;
    return;
  }

  const res = resolverBartlett(gruposValidos, anovaState.alfa);
  if (res.error) {
    container.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;"><p style="color:#ef4444;">⚠️ ${res.error}</p></div>`;
    return;
  }

  // Filas para la tabla del Paso 7
  let tablaPaso7Html = '';
  res.grupos.forEach(g => {
    const dfi = g.n - 1;
    const lnS2 = Math.log(g.s2 > 0 ? g.s2 : 1e-9);
    const prod = dfi * lnS2;
    const invDf = 1.0 / dfi;
    tablaPaso7Html += `
      <tr>
        <td style="font-weight:700;color:#00d4aa;">${escapeHtml(g.nombre)}</td>
        <td>${g.n}</td>
        <td>${dfi}</td>
        <td>${g.media.toFixed(2)}</td>
        <td style="color:#0ea5e9;font-weight:700;">${g.s2.toFixed(3)}</td>
        <td>${lnS2.toFixed(4)}</td>
        <td>${prod.toFixed(4)}</td>
        <td>${invDf.toFixed(4)}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="card" style="border-top:3px solid #00d4aa;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h2 style="font-size:16px;color:#00d4aa;display:flex;align-items:center;gap:8px;">
          🔬 Prueba de Bartlett — Metodología de los 8 Pasos
        </h2>
        <span class="badge badge-green">Poblaciones con Distribución Normal</span>
      </div>

      <div class="step-container">
        
        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 1</span><span class="step-title">Parámetro de Interés</span></div>
          <div class="step-body">
            Las varianzas poblacionales de los <b>k = ${res.k}</b> grupos independientes: 
            <span style="font-family:Georgia,serif;font-weight:bold;color:#00d4aa;">(σ₁², σ₂², ..., σ<sub>${res.k}</sub>²)</span>.
            Determina si los servidores o tratamientos tienen la misma estabilidad (varianza común).
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 2</span><span class="step-title">Hipótesis Nula (H₀)</span></div>
          <div class="step-body">
            <div class="step-math-box"><b>H₀:</b> σ₁² = σ₂² = ... = σ<sub>${res.k}</sub>² &nbsp;&nbsp;<span style="font-size:12px;color:var(--text-desc);font-family:'Segoe UI',sans-serif;">(Existe homocedasticidad)</span></div>
            Todas las varianzas de los grupos son estadísticamente iguales.
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 3</span><span class="step-title">Hipótesis Alternativa (H₁)</span></div>
          <div class="step-body">
            <div class="step-math-box"><b>H₁:</b> Al menos una varianza es diferente &nbsp;<span style="font-size:13px;color:#f59e0b;">(∃ i ≠ j tal que σᵢ² ≠ σⱼ²)</span></div>
            Existe heterocedasticidad en al menos una población.
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 4</span><span class="step-title">Nivel de Significancia (α)</span></div>
          <div class="step-body"><b>α = ${res.alfa}</b> &nbsp;&nbsp;(Nivel de confianza: <b>${((1 - res.alfa) * 100).toFixed(0)}%</b>).</div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 5</span><span class="step-title">Estadístico de Prueba (χ₀²)</span></div>
          <div class="step-body">
            <div class="step-math-box">
              <b>χ₀²</b> = [ (N − k)·ln(S<sub>p</sub>²) − Σ (nᵢ − 1)·ln(Sᵢ²) ] / [ 1 + (1 / [3(k − 1)]) · ( Σ (1 / (nᵢ − 1)) − (1 / (N − k)) ) ]
            </div>
            Donde la varianza combinada o agrupada (<b>S<sub>p</sub>²</b>) es:
            <div class="step-math-box" style="font-size:14px;"><b>S<sub>p</sub>²</b> = [ Σ (nᵢ − 1)·Sᵢ² ] / (N − k)</div>
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 6</span><span class="step-title">Región de Rechazo</span></div>
          <div class="step-body">
            Con <b>v = k − 1 = ${res.k} − 1 = ${res.dfCrit}</b> grados de libertad, se rechaza H₀ si:<br>
            <div class="step-math-box" style="color:#ef4444;">
              <b>χ₀² &gt; χ²<sub>1−α, k−1</sub> = χ²<sub>${(1 - res.alfa).toFixed(2)}, ${res.dfCrit}</sub> = ${res.chiCrit.toFixed(3)}</b>
            </div>
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 7</span><span class="step-title">Cálculos Numéricos Detallados</span></div>
          <div class="step-body">
            <div class="tbl-wrap" style="margin-bottom:12px;">
              <table class="anova-table">
                <thead>
                  <tr>
                    <th>Grupo / Servidor</th><th>nᵢ</th><th>nᵢ − 1</th><th>X̄ᵢ</th><th>Sᵢ²</th><th>ln(Sᵢ²)</th><th>(nᵢ − 1)·ln(Sᵢ²)</th><th>1 / (nᵢ − 1)</th>
                  </tr>
                </thead>
                <tbody>${tablaPaso7Html}</tbody>
                <tfoot>
                  <tr>
                    <td>TOTAL / SUMA</td><td>N = ${res.N}</td><td>N − k = ${res.dfTotal}</td><td>-</td><td>-</td><td>-</td>
                    <td style="color:#a78bfa;">${res.sumLnPonderada.toFixed(4)}</td><td style="color:#0ea5e9;">${res.sumInvDf.toFixed(4)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="step-calc-details">
              • <b>Grados de libertad totales:</b> N − k = ${res.N} − ${res.k} = <b>${res.dfTotal}</b><br>
              • <b>Varianza agrupada (S<sub>p</sub>²):</b> [ ${res.sumPonderada.toFixed(3)} ] / ${res.dfTotal} = <b>${res.Sp2.toFixed(3)}</b> &nbsp;(ln(S<sub>p</sub>²) = <b>${Math.log(res.Sp2).toFixed(4)}</b>)<br>
              • <b>Numerador:</b> ${res.dfTotal} · ${Math.log(res.Sp2).toFixed(4)} − [ ${res.sumLnPonderada.toFixed(4)} ] = <b>${res.numerador.toFixed(4)}</b><br>
              • <b>Factor de corrección C (Denominador):</b> 1 + [ 1 / ${3 * (res.k - 1)} ] · [ ${(res.sumInvDf - 1.0 / res.dfTotal).toFixed(4)} ] = <b>${res.factorC.toFixed(4)}</b><br>
              • <b>Estadístico final calculado:</b> <span style="font-size:16px;color:#00d4aa;font-weight:700;">χ₀² = ${res.numerador.toFixed(4)} / ${res.factorC.toFixed(4)} = ${res.chi0.toFixed(3)}</span>
            </div>
          </div>
        </div>

        <div class="step-card ${res.seRechaza ? 'step-red' : 'step-green'}">
          <div class="step-header"><span class="step-badge ${res.seRechaza ? 'badge-red' : 'badge-green'}">Paso 8</span><span class="step-title">Conclusiones y Decisión Estadística</span></div>
          <div class="step-body">
            <div class="decision-alert ${res.seRechaza ? 'rejected' : 'not-rejected'}">
              <div class="decision-title">${res.seRechaza ? '⚠️ SE RECHAZA LA HIPÓTESIS NULA (H₀)' : '✅ NO SE RECHAZA LA HIPÓTESIS NULA (H₀)'}</div>
              <div class="decision-text">
                Como el estadístico calculado <b>χ₀² = ${res.chi0.toFixed(3)}</b> es 
                <b>${res.seRechaza ? 'mayor que' : 'menor o igual que'}</b> el valor crítico 
                <b>χ²<sub>${(1 - res.alfa).toFixed(2)}, ${res.dfCrit}</sub> = ${res.chiCrit.toFixed(3)}</b>:
                <br><br>
                ${res.seRechaza
                  ? `<b>Existe evidencia estadística suficiente</b> al nivel de significancia de α = ${res.alfa} (confianza del ${((1 - res.alfa) * 100).toFixed(0)}%) de que las varianzas no son iguales (<b>hay heterocedasticidad</b>). No se cumple el supuesto de varianzas homogéneas para ANOVA estándar.`
                  : `<b>No se rechaza H₀</b>. Existe evidencia estadística de que las varianzas son iguales (<b>hay homocedasticidad</b>). Se cumple el supuesto para realizar ANOVA.`
                }
              </div>
              <div class="decision-stats-row">
                <div class="decision-stat-item">Estadístico χ₀²: <span>${res.chi0.toFixed(3)}</span></div>
                <div class="decision-stat-item">Valor Crítico: <span>${res.chiCrit.toFixed(3)}</span></div>
                <div class="decision-stat-item">P-Valor: <span>${res.pValor < 0.0001 ? '< 0.0001' : res.pValor.toFixed(4)}</span></div>
                <div class="decision-stat-item">Decisión: <span style="color:${res.seRechaza ? '#ef4444' : '#00d4aa'}">${res.seRechaza ? 'Rechazar H₀' : 'No Rechazar H₀'}</span></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  renderGraficoGenerico('chart-bartlett-grupos', 'bar', res.grupos.map(g => g.nombre), res.grupos.map(g => g.s2), 'Varianza Muestral (Sᵢ²)', '#00d4aa');
  renderGraficoCurvaCanvas('chart-bartlett-curva', 'chi2', res.chi0, res.chiCrit, res.dfCrit, null);
}

// =====================================================================
// --- 2. PRUEBA DE LEVENE (8 PASOS) ---
// =====================================================================
function resolverLevene(gruposParsed, alfa, centerType) {
  const k = gruposParsed.length;
  let N = 0;
  gruposParsed.forEach(g => N += g.n);
  const df1 = k - 1;
  const df2 = N - k;

  if (df2 <= 0) return { error: 'Se requieren más observaciones que el número de grupos (N > k).' };

  let totalZ = 0;
  const gruposZ = gruposParsed.map(g => {
    let centro = g.media;
    if (centerType === 'mediana') {
      const sorted = [...g.valores].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      centro = (sorted.length % 2 !== 0) ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    const distancias = g.valores.map(x => Math.abs(x - centro));
    const sumaZ = distancias.reduce((a, b) => a + b, 0);
    const mediaZ = sumaZ / g.n;
    totalZ += sumaZ;
    return {
      nombre: g.nombre, centro, valoresOriginales: g.valores, distancias, mediaZ, n: g.n
    };
  });

  const grandMediaZ = totalZ / N;

  let ssbZ = 0;
  gruposZ.forEach(gz => {
    ssbZ += gz.n * Math.pow(gz.mediaZ - grandMediaZ, 2);
  });

  let sswZ = 0;
  const detalleGruposSSW = gruposZ.map(gz => {
    let ssw_i = 0;
    gz.distancias.forEach(z => { ssw_i += Math.pow(z - gz.mediaZ, 2); });
    sswZ += ssw_i;
    return { nombre: gz.nombre, ssw_i };
  });

  const msbZ = ssbZ / df1;
  const mswZ = sswZ / df2;
  const f0 = msbZ / (mswZ > 0 ? mswZ : 1e-9);

  const fCrit = invFisherCDF(1.0 - alfa, df1, df2);
  const pValor = 1.0 - fisherCDF(f0, df1, df2);
  const seRechaza = f0 > fCrit;

  return {
    tipo: 'levene', k, N, df1, df2, grandMediaZ, ssbZ, sswZ, msbZ, mswZ, f0,
    fCrit, pValor, seRechaza, alfa, centerType,
    gruposZ, detalleGruposSSW
  };
}

function ejecutarLevene() {
  const container = document.getElementById('levene-results');
  if (!container) return;

  const gruposValidos = obtenerGruposValidos();
  if (gruposValidos.length < 2) {
    container.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;"><p style="color:#ef4444;">⚠️ Se requieren al menos 2 grupos con datos válidos.</p></div>`;
    return;
  }

  const res = resolverLevene(gruposValidos, anovaState.alfa, anovaState.leveneCenter);
  if (res.error) {
    container.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;"><p style="color:#ef4444;">⚠️ ${res.error}</p></div>`;
    return;
  }

  let tablaZijHtml = '';
  res.gruposZ.forEach(gz => {
    tablaZijHtml += `
      <tr>
        <td style="font-weight:700;color:#0ea5e9;">${escapeHtml(gz.nombre)}</td>
        <td>${gz.valoresOriginales.join(', ')}</td>
        <td>${gz.centro.toFixed(2)}</td>
        <td style="font-family:monospace;color:#a78bfa;">[ ${gz.distancias.map(z => z.toFixed(2)).join(', ')} ]</td>
        <td style="font-weight:700;color:#00d4aa;">${gz.mediaZ.toFixed(3)}</td>
      </tr>
    `;
  });

  let detalleSswHtml = '';
  res.detalleGruposSSW.forEach(d => {
    detalleSswHtml += `• <b>${escapeHtml(d.nombre)}:</b> SC_interno = <b>${d.ssw_i.toFixed(3)}</b><br>`;
  });

  container.innerHTML = `
    <div class="card" style="border-top:3px solid #0ea5e9;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h2 style="font-size:16px;color:#0ea5e9;display:flex;align-items:center;gap:8px;">
          🔬 Prueba de Levene — Metodología de los 8 Pasos
        </h2>
        <span class="badge badge-blue">ANOVA sobre Distancias Absolutas Zᵢⱼ = |Xᵢⱼ − X̄ᵢ|</span>
      </div>

      <div class="step-container">

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 1</span><span class="step-title">Parámetro de Interés</span></div>
          <div class="step-body">
            La dispersión media de los <b>k = ${res.k}</b> grupos evaluada a través de las desviaciones absolutas:
            <span style="font-family:Georgia,serif;font-weight:bold;color:#0ea5e9;">E|Xᵢⱼ − μᵢ|</span>.
            Es <b>robusta frente al alejamiento de la normalidad</b>.
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 2</span><span class="step-title">Hipótesis Nula (H₀)</span></div>
          <div class="step-body">
            <div class="step-math-box"><b>H₀:</b> σ₁² = σ₂² = ... = σ<sub>${res.k}</sub>² &nbsp;&nbsp;<span style="font-size:12px;color:var(--text-desc);font-family:'Segoe UI',sans-serif;">(Homocedasticidad)</span></div>
            Todas las poblaciones poseen varianzas homogéneas.
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 3</span><span class="step-title">Hipótesis Alternativa (H₁)</span></div>
          <div class="step-body">
            <div class="step-math-box"><b>H₁:</b> Al menos un grupo tiene varianza distinta &nbsp;<span style="font-size:13px;color:#f59e0b;">(∃ i ≠ j tal que σᵢ² ≠ σⱼ²)</span></div>
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 4</span><span class="step-title">Nivel de Significancia (α)</span></div>
          <div class="step-body"><b>α = ${res.alfa}</b> &nbsp;&nbsp;(Nivel de confianza: <b>${((1 - res.alfa) * 100).toFixed(0)}%</b>).</div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 5</span><span class="step-title">Estadístico de Prueba (F₀)</span></div>
          <div class="step-body">
            Transforma los datos en <b>Z<sub>ij</sub> = |X<sub>ij</sub> − X̄<sub>i</sub>|</b> y corre un ANOVA sobre las distancias Z:
            <div class="step-math-box">
              <b>F₀</b> = [ (N − k) · Σ nᵢ·(Z̄<sub>i.</sub> − Z̄<sub>..</sub>)² ] / [ (k − 1) · Σ Σ (Z<sub>ij</sub> − Z̄<sub>i.</sub>)² ] = <b>MSB<sub>Z</sub> / MSW<sub>Z</sub></b>
            </div>
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 6</span><span class="step-title">Región de Rechazo</span></div>
          <div class="step-body">
            Con <b>v₁ = k − 1 = ${res.df1}</b> y <b>v₂ = N − k = ${res.df2}</b>, se rechaza H₀ si:<br>
            <div class="step-math-box" style="color:#ef4444;">
              <b>F₀ &gt; F<sub>1−α, v₁, v₂</sub> = F<sub>${(1 - res.alfa).toFixed(2)}, ${res.df1}, ${res.df2}</sub> = ${res.fCrit.toFixed(3)}</b>
            </div>
          </div>
        </div>

        <div class="step-card step-green">
          <div class="step-header"><span class="step-badge badge-green">Paso 7</span><span class="step-title">Cálculos Numéricos Detallados</span></div>
          <div class="step-body">
            <p style="margin-bottom:8px;">1. Transformación de observaciones en distancias absolutas (Centro: ${res.centerType}):</p>
            <div class="tbl-wrap" style="margin-bottom:12px;">
              <table class="anova-table">
                <thead>
                  <tr>
                    <th>Grupo / Servidor</th><th>Datos Originales Xᵢⱼ</th><th>Centro</th><th>Distancias Zᵢⱼ = |Xᵢⱼ − Centro|</th><th>Media Z̄ᵢ.</th>
                  </tr>
                </thead>
                <tbody>${tablaZijHtml}</tbody>
              </table>
            </div>

            <div class="step-calc-details">
              • <b>Gran media global de distancias (Z̄<sub>..</sub>):</b> [ ${res.gruposZ.map(g => g.mediaZ.toFixed(2)).join(' + ')} ] / ${res.k} = <b>${res.grandMediaZ.toFixed(3)}</b><br>
              • <b>Suma de Cuadrados Entre Grupos de Distancias (SSB<sub>Z</sub>):</b><br>
              &nbsp;&nbsp;SSB<sub>Z</sub> = Σ nᵢ·(Z̄<sub>i.</sub> − Z̄<sub>..</sub>)² = <b>${res.ssbZ.toFixed(3)}</b><br><br>
              • <b>Suma de Cuadrados Dentro de Grupos (SSW<sub>Z</sub>):</b><br>
              &nbsp;&nbsp;SSW<sub>Z</sub> = Σ Σ (Z<sub>ij</sub> − Z̄<sub>i.</sub>)² = <b>${res.sswZ.toFixed(3)}</b><br>
              ${detalleSswHtml}<br>
              • <b>Sustitución en el Estadístico F₀:</b><br>
              &nbsp;&nbsp;<span style="font-size:16px;color:#0ea5e9;font-weight:700;">F₀ = [ ${res.df2} · (${res.ssbZ.toFixed(3)}) ] / [ ${res.df1} · (${res.sswZ.toFixed(3)}) ] = ${res.f0.toFixed(3)}</span>
            </div>
          </div>
        </div>

        <div class="step-card ${res.seRechaza ? 'step-red' : 'step-green'}">
          <div class="step-header"><span class="step-badge ${res.seRechaza ? 'badge-red' : 'badge-green'}">Paso 8</span><span class="step-title">Conclusiones y Decisión Estadística</span></div>
          <div class="step-body">
            <div class="decision-alert ${res.seRechaza ? 'rejected' : 'not-rejected'}">
              <div class="decision-title">${res.seRechaza ? '⚠️ SE RECHAZA LA HIPÓTESIS NULA (H₀)' : '✅ NO SE RECHAZA LA HIPÓTESIS NULA (H₀)'}</div>
              <div class="decision-text">
                Como el estadístico calculado <b>F₀ = ${res.f0.toFixed(3)}</b> es 
                <b>${res.seRechaza ? 'mayor que' : 'menor que'}</b> el valor crítico 
                <b>F<sub>${(1 - res.alfa).toFixed(2)}, ${res.df1}, ${res.df2}</sub> = ${res.fCrit.toFixed(3)}</b>:
                <br><br>
                ${res.seRechaza
                  ? `<b>Existe evidencia estadística suficiente</b> con α = ${res.alfa} para rechazar H₀. Se concluye que <b>existe heterocedasticidad</b>.`
                  : `<b>No se rechaza H₀</b>. Al 5% de significancia, no existe evidencia estadística de que las varianzas sean diferentes. <b>Se concluye que existe homocedasticidad</b>.`
                }
                <br><br>
                <div style="font-size:12px;color:var(--text-desc);border-left:3px solid #f59e0b;padding-left:10px;margin-top:8px;">
                  <b>💡 Nota didáctica del enunciado:</b> Esto demuestra cómo Bartlett y Levene pueden diferir en muestras muy pequeñas ($n = 4$). Bartlett es muy sensible a pequeños cambios bajo normalidad, mientras que Levene es <b>más conservadora y robusta</b> frente a valores extremos al usar distancias absolutas.
                </div>
              </div>
              <div class="decision-stats-row">
                <div class="decision-stat-item">Estadístico F₀: <span>${res.f0.toFixed(3)}</span></div>
                <div class="decision-stat-item">Valor Crítico: <span>${res.fCrit.toFixed(3)}</span></div>
                <div class="decision-stat-item">P-Valor: <span>${res.pValor.toFixed(4)}</span></div>
                <div class="decision-stat-item">Decisión: <span style="color:${res.seRechaza ? '#ef4444' : '#00d4aa'}">${res.seRechaza ? 'Rechazar H₀' : 'No Rechazar H₀'}</span></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  renderGraficoGenerico('chart-levene-grupos', 'bar', res.gruposZ.map(g => g.nombre), res.gruposZ.map(g => g.mediaZ), 'Media de Distancias (Z̄ᵢ.)', '#0ea5e9');
  renderGraficoCurvaCanvas('chart-levene-curva', 'fisher', res.f0, res.fCrit, res.df1, res.df2);
}

// =====================================================================
// --- 3. PRUEBA DE BREUSCH-PAGAN Y WHITE (8 PASOS) ---
// =====================================================================
function resolverBreuschPaganWhite(tipo, modo, alfa) {
  let n = 30, r2Aux = 0.18;
  let datosParsed = [];
  let regPrincipal = null;

  if (modo === 'resumen') {
    const nEl = document.getElementById('bp-reg-n');
    const r2El = document.getElementById('bp-reg-r2');
    n = nEl ? (parseInt(nEl.value) || 30) : 30;
    r2Aux = r2El ? (parseFloat(r2El.value) || 0.18) : 0.18;
  } else {
    const rawLines = anovaState.regDatosBrutos.trim().split('\n');
    rawLines.forEach(line => {
      const parts = line.split(/[\s,;]+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (parts.length >= 2) datosParsed.push({ x: parts[0], y: parts[1] });
    });

    n = datosParsed.length;
    if (n < 5) return { error: 'Se requieren al menos 5 pares (X, Y) para la regresión auxiliar.' };

    const sumX = datosParsed.reduce((s, p) => s + p.x, 0);
    const sumY = datosParsed.reduce((s, p) => s + p.y, 0);
    const meanX = sumX / n, meanY = sumY / n;

    let sxx = 0, sxy = 0;
    datosParsed.forEach(p => {
      sxx += Math.pow(p.x - meanX, 2);
      sxy += (p.x - meanX) * (p.y - meanY);
    });

    const b1 = sxy / sxx;
    const b0 = meanY - b1 * meanX;

    const residuosCuad = datosParsed.map(p => {
      const yhat = b0 + b1 * p.x;
      const e = p.y - yhat;
      return { x: p.x, y: p.y, yhat, e, e2: e * e };
    });

    const sumU = residuosCuad.reduce((s, r) => s + r.e2, 0);
    const meanU = sumU / n;

    if (tipo === 'breusch-pagan') {
      let sxu = 0, sstU = 0;
      residuosCuad.forEach(r => {
        sxu += (r.x - meanX) * (r.e2 - meanU);
        sstU += Math.pow(r.e2 - meanU, 2);
      });
      const g1 = sxu / sxx;
      const g0 = meanU - g1 * meanX;
      const ssrU = Math.pow(g1, 2) * sxx;
      r2Aux = sstU > 0 ? (ssrU / sstU) : 0;
      regPrincipal = { b0, b1, g0, g1, residuos: residuosCuad };
    } else {
      const Z1 = residuosCuad.map(r => r.x);
      const Z2 = residuosCuad.map(r => r.x * r.x);
      const fitWhite = fitMultiple2(Z1, Z2, residuosCuad.map(r => r.e2));
      r2Aux = fitWhite.r2;
      regPrincipal = { b0, b1, g0: fitWhite.b0, g1: fitWhite.b1, g2: fitWhite.b2, residuos: residuosCuad };
    }
  }

  const pRegresores = (tipo === 'breusch-pagan') ? 1 : 2;
  const lm = n * r2Aux;
  const dfCrit = pRegresores;
  const chiCrit = invChiCuadradoCDF(1.0 - alfa, dfCrit);
  const pValor = 1.0 - chiCuadradoCDF(lm, dfCrit);
  const seRechaza = lm > chiCrit;

  return {
    tipo, modo, n, r2Aux, pRegresores, lm, dfCrit, chiCrit, pValor, seRechaza, alfa, regPrincipal
  };
}

function ejecutarBreuschPaganWhite() {
  const container = document.getElementById('bp-results');
  if (!container) return;

  const tipo = anovaState.bpTipo;
  const esBP = (tipo === 'breusch-pagan');
  const nombrePrueba = esBP ? 'Breusch-Pagan' : 'White';
  const res = resolverBreuschPaganWhite(tipo, anovaState.regModo, anovaState.alfa);

  if (res.error) {
    container.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;"><p style="color:#ef4444;">⚠️ ${res.error}</p></div>`;
    return;
  }

  let detalleRegresionHtml = '';
  if (res.modo === 'bruto' && res.regPrincipal) {
    const rp = res.regPrincipal;
    detalleRegresionHtml = `
      <div class="step-calc-details" style="margin-bottom:12px;">
        <b>1. Regresión Lineal Primaria (MCO):</b> Ŷ = ${rp.b0.toFixed(3)} + ${rp.b1.toFixed(3)} · X<br>
        <b>2. Regresión Auxiliar de Residuos al Cuadrado (eᵢ²):</b><br>
        ${esBP
          ? `&nbsp;&nbsp;eᵢ² = ${rp.g0.toFixed(3)} + ${rp.g1.toFixed(3)} · Xᵢ`
          : `&nbsp;&nbsp;eᵢ² = ${rp.g0.toFixed(3)} + ${rp.g1.toFixed(3)} · Xᵢ + ${rp.g2.toFixed(4)} · Xᵢ²`
        }<br>
        &nbsp;&nbsp;Ajuste obtenido: <b>R²<sub>aux</sub> = ${res.r2Aux.toFixed(4)}</b>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card" style="border-top:3px solid #f59e0b;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h2 style="font-size:16px;color:#f59e0b;display:flex;align-items:center;gap:8px;">
          🔬 Prueba de ${nombrePrueba} — Metodología de los 8 Pasos
        </h2>
        <span class="badge badge-amber">${esBP ? 'Ecuación Auxiliar Lineal (p=1)' : 'Ecuación Auxiliar Cuadrática (p=2)'}</span>
      </div>

      <div class="step-container">

        <div class="step-card step-amber">
          <div class="step-header"><span class="step-badge badge-amber">Paso 1</span><span class="step-title">Parámetro de Interés</span></div>
          <div class="step-body">
            Los coeficientes de la regresión auxiliar sobre la varianza del error: 
            <span style="font-family:Georgia,serif;font-weight:bold;color:#f59e0b;">${esBP ? '(γ₁)' : '(γ₁, γ₂)'}</span>.
            Determina si la varianza del error <i>σᵢ²</i> depende de la variable explicativa <i>X</i>.
          </div>
        </div>

        <div class="step-card step-amber">
          <div class="step-header"><span class="step-badge badge-amber">Paso 2</span><span class="step-title">Hipótesis Nula (H₀)</span></div>
          <div class="step-body">
            <div class="step-math-box"><b>H₀:</b> σᵢ² = σ² &nbsp;&nbsp;∀ i &nbsp;&nbsp;[ es decir, ${esBP ? 'γ₁ = 0' : 'γ₁ = γ₂ = 0'} ]</div>
            La varianza del error es constante / existe <b>homocedasticidad</b>.
          </div>
        </div>

        <div class="step-card step-amber">
          <div class="step-header"><span class="step-badge badge-amber">Paso 3</span><span class="step-title">Hipótesis Alternativa (H₁)</span></div>
          <div class="step-body">
            <div class="step-math-box"><b>H₁:</b> ${esBP ? 'γ₁ ≠ 0' : 'Al menos un γⱼ ≠ 0'} &nbsp;&nbsp;<span style="font-size:12px;color:var(--text-desc);font-family:'Segoe UI',sans-serif;">(Existe heterocedasticidad)</span></div>
          </div>
        </div>

        <div class="step-card step-amber">
          <div class="step-header"><span class="step-badge badge-amber">Paso 4</span><span class="step-title">Nivel de Significancia (α)</span></div>
          <div class="step-body"><b>α = ${res.alfa}</b> &nbsp;&nbsp;(Nivel de confianza: <b>${((1 - res.alfa) * 100).toFixed(0)}%</b>).</div>
        </div>

        <div class="step-card step-amber">
          <div class="step-header"><span class="step-badge badge-amber">Paso 5</span><span class="step-title">Estadístico de Prueba (LM — Multiplicador de Lagrange)</span></div>
          <div class="step-body">
            <div class="step-math-box"><b>LM = n · R²<sub>aux</sub></b></div>
            Donde <b>R²<sub>aux</sub></b> es el coeficiente de determinación obtenido al hacer la regresión auxiliar de los residuos al cuadrado (<b>eᵢ²</b>) contra las variables independientes:
            <br>• ${esBP ? 'En <b>Breusch-Pagan</b> la regresión es lineal: <i>eᵢ² = γ₀ + γ₁Xᵢ</i>' : 'En <b>White</b> se agregan términos cuadráticos: <i>eᵢ² = γ₀ + γ₁Xᵢ + γ₂Xᵢ²</i>'}
          </div>
        </div>

        <div class="step-card step-amber">
          <div class="step-header"><span class="step-badge badge-amber">Paso 6</span><span class="step-title">Región de Rechazo</span></div>
          <div class="step-body">
            Se distribuye asintóticamente como Chi-cuadrado con <b>v = p = ${res.dfCrit}</b> grado(s) de libertad.<br>
            <div class="step-math-box" style="color:#ef4444;">
              Rechazar H₀ si <b>LM &gt; χ²<sub>1−α, p</sub> = χ²<sub>${(1 - res.alfa).toFixed(2)}, ${res.dfCrit}</sub> = ${res.chiCrit.toFixed(3)}</b>
            </div>
          </div>
        </div>

        <div class="step-card step-amber">
          <div class="step-header"><span class="step-badge badge-amber">Paso 7</span><span class="step-title">Cálculos Numéricos Detallados</span></div>
          <div class="step-body">
            ${detalleRegresionHtml}
            <div class="step-calc-details">
              1. Se corre la regresión original y se obtienen los residuos al cuadrado (eᵢ²).<br>
              2. Se corre la regresión auxiliar (${nombrePrueba}) y se obtiene <b>R²<sub>aux</sub> = ${res.r2Aux.toFixed(4)}</b>.<br>
              3. Sustituimos en el estadístico LM:<br>
              &nbsp;&nbsp;<span style="font-size:16px;color:#f59e0b;font-weight:700;">LM = ${res.n} · (${res.r2Aux.toFixed(4)}) = ${res.lm.toFixed(3)}</span>
            </div>
          </div>
        </div>

        <div class="step-card ${res.seRechaza ? 'step-red' : 'step-green'}">
          <div class="step-header"><span class="step-badge ${res.seRechaza ? 'badge-red' : 'badge-green'}">Paso 8</span><span class="step-title">Conclusiones y Decisión Estadística</span></div>
          <div class="step-body">
            <div class="decision-alert ${res.seRechaza ? 'rejected' : 'not-rejected'}">
              <div class="decision-title">${res.seRechaza ? '⚠️ SE RECHAZA LA HIPÓTESIS NULA (H₀)' : '✅ NO SE RECHAZA LA HIPÓTESIS NULA (H₀)'}</div>
              <div class="decision-text">
                Como el estadístico calculado <b>LM = ${res.lm.toFixed(3)}</b> es 
                <b>${res.seRechaza ? 'mayor que' : 'menor o igual que'}</b> el valor crítico 
                <b>χ²<sub>${(1 - res.alfa).toFixed(2)}, ${res.dfCrit}</sub> = ${res.chiCrit.toFixed(3)}</b>:
                <br><br>
                ${res.seRechaza
                  ? `<b>Se rechaza H₀</b>. Existe evidencia estadística suficiente con α = ${res.alfa} para concluir que el modelo presenta <b>heterocedasticidad</b> (la dispersión del tiempo de respuesta se descontrola a medida que cambian los usuarios concurrentes).`
                  : `<b>No se rechaza H₀</b>. Al 5% de significancia, no se rechaza la homocedasticidad para los regresores evaluados.`
                }
              </div>
              <div class="decision-stats-row">
                <div class="decision-stat-item">Estadístico LM: <span>${res.lm.toFixed(3)}</span></div>
                <div class="decision-stat-item">Valor Crítico: <span>${res.chiCrit.toFixed(3)}</span></div>
                <div class="decision-stat-item">P-Valor: <span>${res.pValor.toFixed(4)}</span></div>
                <div class="decision-stat-item">Decisión: <span style="color:${res.seRechaza ? '#ef4444' : '#00d4aa'}">${res.seRechaza ? 'Rechazar H₀' : 'No Rechazar H₀'}</span></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  renderGraficoCurvaCanvas('chart-bp-curva', 'chi2', res.lm, res.chiCrit, res.dfCrit, null);
}

// =====================================================================
// --- 4. COMPARATIVA DIRECTA BARTLETT VS LEVENE ---
// =====================================================================
function ejecutarComparativa() {
  const container = document.getElementById('comparativa-results');
  if (!container) return;

  const gruposValidos = obtenerGruposValidos();
  if (gruposValidos.length < 2) {
    container.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;"><p style="color:#ef4444;">⚠️ Se requieren al menos 2 grupos con datos para la comparativa.</p></div>`;
    return;
  }

  const resB = resolverBartlett(gruposValidos, anovaState.alfa);
  const resL = resolverLevene(gruposValidos, anovaState.alfa, anovaState.leveneCenter);

  container.innerHTML = `
    <div class="card" style="border-top:3px solid #a78bfa;">
      <div class="card-title">⚖️ Comparativa Directa sobre los Mismos Datos (k = ${gruposValidos.length} grupos)</div>
      
      <div class="tbl-wrap" style="margin-bottom:14px;">
        <table class="anova-table">
          <thead>
            <tr>
              <th style="text-align:left;">Prueba</th>
              <th>Estadístico Calculado</th>
              <th>Distribución Asintótica</th>
              <th>Valor Crítico (α = ${anovaState.alfa})</th>
              <th>P-Valor</th>
              <th>Decisión</th>
              <th>Diagnóstico</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:left;font-weight:700;color:#00d4aa;">Bartlett</td>
              <td style="font-weight:700;font-size:14px;">χ₀² = ${resB.chi0.toFixed(3)}</td>
              <td>χ² (gl = ${resB.dfCrit})</td>
              <td>${resB.chiCrit.toFixed(3)}</td>
              <td>${resB.pValor.toFixed(4)}</td>
              <td style="font-weight:700;color:${resB.seRechaza ? '#ef4444' : '#00d4aa'};">
                ${resB.seRechaza ? 'Rechaza H₀' : 'No Rechaza H₀'}
              </td>
              <td>${resB.seRechaza ? 'Heterocedasticidad' : 'Homocedasticidad'}</td>
            </tr>
            <tr>
              <td style="text-align:left;font-weight:700;color:#0ea5e9;">Levene</td>
              <td style="font-weight:700;font-size:14px;">F₀ = ${resL.f0.toFixed(3)}</td>
              <td>F (gl₁ = ${resL.df1}, gl₂ = ${resL.df2})</td>
              <td>${resL.fCrit.toFixed(3)}</td>
              <td>${resL.pValor.toFixed(4)}</td>
              <td style="font-weight:700;color:${resL.seRechaza ? '#ef4444' : '#00d4aa'};">
                ${resL.seRechaza ? 'Rechaza H₀' : 'No Rechaza H₀'}
              </td>
              <td>${resL.seRechaza ? 'Heterocedasticidad' : 'Homocedasticidad'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="decision-alert not-rejected">
        <div class="decision-title" style="color:#a78bfa;">
          💡 ¿Por qué difieren Bartlett y Levene en el Escenario Base?
        </div>
        <div class="decision-text">
          En el escenario de los tres servidores de latencia con <b>n = 4</b> mediciones cada uno ($N = 12$ total):
          <br><br>
          • <b>Bartlett (${resB.chi0.toFixed(3)} &gt; ${resB.chiCrit.toFixed(3)}):</b> Asume que las poblaciones provienen de distribuciones normales exactas y eleva al cuadrado las desviaciones muestrales ponderadas. Debido a que el Servidor 2 tiene $S_2^2 = 16.67$ frente a $0.67$ del Servidor 3, Bartlett es hipersensible a esa disparidad y <b>rechaza H₀</b>.<br><br>
          • <b>Levene (${resL.f0.toFixed(3)} &lt; ${resL.fCrit.toFixed(3)}):</b> Transforma las mediciones en distancias absolutas lineales $Z_{ij} = |X_{ij} - \bar{x}_i|$. Esta transformación suaviza el impacto de los valores extremos en muestras pequeñas, arrojando un estadístico $F_0 = 1.30$ que <b>no alcanza el umbral crítico de 4.26</b>.<br><br>
          <b>Conclusión práctica:</b> En muestras pequeñas, Levene es más <b>conservadora</b> para evitar falsas alarmas si no hay certeza absoluta de normalidad.
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// --- 5. ANOVA DE 1 FACTOR ---
// =====================================================================
function ejecutarOneWayANOVA() {
  const container = document.getElementById('anova-oneway-results');
  if (!container) return;

  const gruposValidos = obtenerGruposValidos();
  if (gruposValidos.length < 2) {
    container.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;"><p style="color:#ef4444;">⚠️ Se requieren al menos 2 grupos con datos válidos.</p></div>`;
    return;
  }

  const k = gruposValidos.length;
  let N = 0, granSuma = 0;
  gruposValidos.forEach(g => {
    const suma = g.valores.reduce((a, b) => a + b, 0);
    N += g.n;
    granSuma += suma;
  });
  const granMedia = granSuma / N;

  let ssTrat = 0;
  gruposValidos.forEach(g => {
    ssTrat += g.n * Math.pow(g.media - granMedia, 2);
  });

  let ssError = 0;
  gruposValidos.forEach(g => {
    g.valores.forEach(x => { ssError += Math.pow(x - g.media, 2); });
  });

  const ssTotal = ssTrat + ssError;
  const dfTrat = k - 1;
  const dfError = N - k;
  const dfTotal = N - 1;

  const msTrat = ssTrat / dfTrat;
  const msError = ssError / dfError;
  const f0 = msTrat / (msError > 0 ? msError : 1e-9);

  const alfa = anovaState.alfa;
  const fCrit = invFisherCDF(1.0 - alfa, dfTrat, dfError);
  const pValor = 1.0 - fisherCDF(f0, dfTrat, dfError);
  const seRechaza = f0 > fCrit;

  container.innerHTML = `
    <div class="card" style="border-top:3px solid #00d4aa;">
      <div class="card-title">Tabla ANOVA de un Factor (Diseño Completamente al Azar)</div>
      
      <div class="tbl-wrap">
        <table class="anova-table">
          <thead>
            <tr>
              <th style="text-align:left;">Fuente de Variación</th>
              <th>Suma de Cuadrados (SC)</th>
              <th>Grados de Libertad (GL)</th>
              <th>Cuadrado Medio (CM)</th>
              <th>Estadístico F₀</th>
              <th>Valor Crítico (F<sub>α</sub>)</th>
              <th>P-Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:left;font-weight:700;color:#0ea5e9;">Entre Grupos (Tratamientos)</td>
              <td>${ssTrat.toFixed(3)}</td>
              <td>${dfTrat}</td>
              <td style="font-weight:700;">${msTrat.toFixed(3)}</td>
              <td style="font-weight:700;color:#00d4aa;font-size:14px;">${f0.toFixed(3)}</td>
              <td>${fCrit.toFixed(3)}</td>
              <td>${pValor < 0.0001 ? '< 0.0001' : pValor.toFixed(4)}</td>
            </tr>
            <tr>
              <td style="text-align:left;font-weight:700;color:#a78bfa;">Dentro de los Grupos (Error)</td>
              <td>${ssError.toFixed(3)}</td>
              <td>${dfError}</td>
              <td>${msError.toFixed(3)}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="text-align:left;font-weight:700;">TOTAL</td>
              <td>${ssTotal.toFixed(3)}</td>
              <td>${dfTotal}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="decision-alert ${seRechaza ? 'rejected' : 'not-rejected'}" style="margin-top:14px;">
        <div class="decision-title">
          ${seRechaza ? '⚠️ SE RECHAZA H₀ (Diferencia Significativa entre Medias)' : '✅ NO SE RECHAZA H₀ (Medias Iguales)'}
        </div>
        <div class="decision-text">
          Como <b>F₀ = ${f0.toFixed(3)}</b> es <b>${seRechaza ? 'mayor' : 'menor o igual'}</b> que <b>F<sub>${(1 - alfa).toFixed(2)}, ${dfTrat}, ${dfError}</sub> = ${fCrit.toFixed(3)}</b> (p-valor: ${pValor < 0.0001 ? '< 0.0001' : pValor.toFixed(4)}):<br><br>
          ${seRechaza
            ? `<b>Existe evidencia estadística suficiente</b> con α = ${alfa} para concluir que <b>al menos dos de las medias poblacionales de los grupos difieren entre sí</b>.`
            : `<b>No existe evidencia estadística</b> para rechazar la igualdad de medias entre los grupos con α = ${alfa}.`
          }
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// --- RENDERIZADORES DE GRÁFICOS ---
// =====================================================================
function renderGraficoGenerico(canvasId, type, labels, data, datasetLabel, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const key = canvasId.includes('bartlett') ? 'bartlettGrupos' : 'leveneGrupos';
  if (chartInstances[key]) chartInstances[key].destroy();

  chartInstances[key] = new Chart(ctx, {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: datasetLabel,
        data: data,
        backgroundColor: color,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderGraficoCurvaCanvas(canvasId, distType, estadistico, critico, df1, df2) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 180 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = rect.width, H = 180;
  const padLeft = 40, padRight = 20, padTop = 25, padBottom = 30;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(estadistico * 1.3, critico * 1.4, 8);
  const xMax = Math.min(maxVal, 35);
  const steps = 150;

  const xVals = [], yVals = [];
  let yMax = 0;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * xMax;
    let y = (distType === 'chi2') ? chiCuadradoPDF(x, df1) : fisherPDF(x, df1, df2);
    if (isNaN(y) || !isFinite(y)) y = 0;
    xVals.push(x);
    yVals.push(y);
    if (y > yMax && x > 0.1) yMax = y;
  }
  if (yMax === 0) yMax = 1;

  const toPxX = (x) => padLeft + (x / xMax) * plotW;
  const toPxY = (y) => padTop + plotH - (y / yMax) * plotH;

  // 1. Zona Aceptación
  ctx.beginPath();
  ctx.moveTo(toPxX(0), toPxY(0));
  for (let i = 0; i <= steps; i++) {
    if (xVals[i] <= critico) ctx.lineTo(toPxX(xVals[i]), toPxY(yVals[i]));
  }
  ctx.lineTo(toPxX(Math.min(critico, xMax)), toPxY(0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 212, 170, 0.12)';
  ctx.fill();

  // 2. Zona Rechazo
  ctx.beginPath();
  ctx.moveTo(toPxX(Math.min(critico, xMax)), toPxY(0));
  let started = false;
  for (let i = 0; i <= steps; i++) {
    if (xVals[i] >= critico) {
      if (!started) { ctx.lineTo(toPxX(xVals[i]), toPxY(yVals[i])); started = true; }
      else { ctx.lineTo(toPxX(xVals[i]), toPxY(yVals[i])); }
    }
  }
  ctx.lineTo(toPxX(xMax), toPxY(0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
  ctx.fill();

  // 3. Curva
  ctx.beginPath();
  ctx.moveTo(toPxX(xVals[0]), toPxY(yVals[0]));
  for (let i = 1; i <= steps; i++) ctx.lineTo(toPxX(xVals[i]), toPxY(yVals[i]));
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 4. Eje
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop + plotH);
  ctx.lineTo(padLeft + plotW, padTop + plotH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.stroke();

  // 5. Línea Crítica
  const critPx = toPxX(critico);
  if (critPx >= padLeft && critPx <= padLeft + plotW) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(critPx, padTop);
    ctx.lineTo(critPx, padTop + plotH);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Crítico: ${critico.toFixed(2)}`, critPx, padTop - 6);
  }

  // 6. Línea Estadístico
  const statPx = toPxX(estadistico);
  if (statPx >= padLeft && statPx <= padLeft + plotW) {
    ctx.beginPath();
    ctx.moveTo(statPx, padTop + 10);
    ctx.lineTo(statPx, padTop + plotH);
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#00d4aa';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Calc: ${estadistico.toFixed(2)}`, statPx, padTop + 8);
  }
}
