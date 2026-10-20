// =====================================================================
// --- LÓGICA MATEMÁTICA Y ESTADÍSTICA PURA ---
// =====================================================================

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

function normalCDF(x, mu, sigma) {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2))));
}
function expCDF(x, lambda) {
  return x < 0 ? 0 : 1 - Math.exp(-lambda * x);
}
function poissonCDF(x, lambda) {
  if (x < 0) return 0;
  let sum = 0;
  const k = Math.floor(x);
  for (let i = 0; i <= k; i++) {
    sum += poissonPMF(i, lambda);
  }
  return sum;
}
function uniformCDF(x, alpha, beta) {
  if (x < alpha) return 0;
  if (x > beta) return 1;
  return (x - alpha) / (beta - alpha);
}

// =====================================================================
// --- LÓGICA t-STUDENT (CORREGIDA Y COMPLETA) ---
// =====================================================================

// Función Gamma de Euler (Aproximación de Lanczos)
function gamma(n) {
  const g = 7, p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (n < 0.5) return Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));
  n -= 1; let x = p[0]; for (let i = 1; i < g + 2; i++) x += p[i] / (n + i);
  let t = n + g + 0.5; return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x;
}

// Función de Densidad de Probabilidad (PDF) de t-Student
function tStudentPDF(x, df) {
  const num = gamma((df + 1) / 2);
  const den = Math.sqrt(df * Math.PI) * gamma(df / 2);
  return (num / den) * Math.pow(1 + (x * x) / df, -(df + 1) / 2);
}

// Función de Distribución Acumulada (CDF) de t-Student via Integración Numérica (Regla de Simpson)
function tStudentCDF(t, df) {
  if (t === 0) return 0.5;
  if (t < 0) return 1 - tStudentCDF(-t, df);
  
  // Integración desde 0 hasta t
  let sum = 0;
  const steps = 100;
  const h = t / steps;
  
  for (let i = 0; i <= steps; i++) {
    const x = i * h;
    const fx = tStudentPDF(x, df);
    if (i === 0 || i === steps) sum += fx;
    else if (i % 2 === 1) sum += 4 * fx;
    else sum += 2 * fx;
  }
  return 0.5 + (sum * h / 3);
}

// Función Cuantil (Inversa de la CDF) de t-Student — Búsqueda por Bisección
// Devuelve el valor t tal que P(T ≤ t) = p, para los grados de libertad dados.
function invTStudentCDF(p, df) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Aproximación inicial usando la normal estándar (válida para df grandes)
  let low = -10, high = 10;
  const tolerance = 1e-8;
  const maxIter = 200;

  // Ajustamos el rango de búsqueda según la probabilidad
  if (p < 0.5) {
    low = -10;
    high = 0;
  } else {
    low = 0;
    high = 10;
  }

  // Bisección para encontrar la raíz de tStudentCDF(t, df) - p = 0
  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const cdfMid = tStudentCDF(mid, df);
    if (Math.abs(cdfMid - p) < tolerance) return mid;
    if (cdfMid < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

// Generador de variables aleatorias t-Student (Método de composición analítica)
function generarTStudent(df) {
  // Generamos una variable Normal Estándar Z usando Box-Muller directo
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Generamos una Chi-Cuadrada con 'df' grados de libertad
  let chi2 = 0;
  for (let i = 0; i < df; i++) {
    const u1_c = Math.random();
    const u2_c = Math.random();
    const z_c = Math.sqrt(-2 * Math.log(u1_c)) * Math.cos(2 * Math.PI * u2_c);
    chi2 += z_c * z_c;
  }

  // Teorema: T = Z / sqrt(V / ν)
  return z / Math.sqrt(chi2 / df);
}

// =====================================================================
// --- LÓGICA CHI-CUADRADO (𝒳²) ---
// =====================================================================

// Función de Densidad de Probabilidad (PDF)
function chiCuadradoPDF(x, df) {
  if (x <= 0) return 0;
  const num = Math.pow(x, (df / 2) - 1) * Math.exp(-x / 2);
  const den = Math.pow(2, df / 2) * gamma(df / 2);
  return num / den;
}

// Función de Distribución Acumulada (CDF) mediante regla de Simpson
function chiCuadradoCDF(x, df) {
  if (x <= 0) return 0;
  let sum = 0;
  const steps = 100;
  const h = x / steps;
  for (let i = 0; i <= steps; i++) {
    const t = i * h;
    const ft = chiCuadradoPDF(t, df);
    if (i === 0 || i === steps) sum += ft;
    else if (i % 2 === 1) sum += 4 * ft;
    else sum += 2 * ft;
  }
  return (sum * h) / 3;
}

// Generador de simulación (Método: Suma de Z²)
function generarChiCuadrado(df) {
  let chi2 = 0;
  for (let i = 0; i < df; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    chi2 += z * z;
  }
  return chi2;
}

// Función Cuantil (Inversa de la CDF) de Chi-Cuadrado — Búsqueda por Bisección
// Devuelve el valor x tal que P(𝒳² ≤ x) = p, para los grados de libertad dados.
function invChiCuadradoCDF(p, df) {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;

  let low = 0, high = df + 4 * Math.sqrt(2 * df) + 20;
  const tolerance = 1e-8;
  const maxIter = 200;

  // Bisección para encontrar la raíz de chiCuadradoCDF(x, df) - p = 0
  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const cdfMid = chiCuadradoCDF(mid, df);
    if (Math.abs(cdfMid - p) < tolerance) return mid;
    if (cdfMid < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

// =====================================================================
// --- LÓGICA F DE FISHER ---
// =====================================================================

// Función de Densidad de Probabilidad (PDF) de F de Fisher
function fisherPDF(x, d1, d2) {
  if (x <= 0) return 0;
  const num = gamma((d1 + d2) / 2) * Math.pow(d1 / d2, d1 / 2) * Math.pow(x, (d1 / 2) - 1);
  const den = gamma(d1 / 2) * gamma(d2 / 2) * Math.pow(1 + (d1 * x / d2), (d1 + d2) / 2);
  return num / den;
}

// Función de Distribución Acumulada (CDF) de F de Fisher mediante regla de Simpson
function fisherCDF(x, d1, d2) {
  if (x <= 0) return 0;
  let sum = 0;
  const steps = 200;
  const h = x / steps;
  for (let i = 0; i <= steps; i++) {
    const t = i * h;
    const ft = fisherPDF(t, d1, d2);
    if (i === 0 || i === steps) sum += ft;
    else if (i % 2 === 1) sum += 4 * ft;
    else sum += 2 * ft;
  }
  return (sum * h) / 3;
}

// Función Cuantil (Inversa de la CDF) de F de Fisher — Búsqueda por Bisección
function invFisherCDF(p, d1, d2) {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;

  let low = 0, high = 50;
  const tolerance = 1e-8;
  const maxIter = 200;

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const cdfMid = fisherCDF(mid, d1, d2);
    if (Math.abs(cdfMid - p) < tolerance) return mid;
    if (cdfMid < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

// Generador de variables aleatorias F de Fisher (Método: cociente de Chi-Cuadradas)
function generarFisher(d1, d2) {
  const chi1 = generarChiCuadrado(d1);
  const chi2 = generarChiCuadrado(d2);
  return (chi1 / d1) / (chi2 / d2);
}

// =====================================================================
// --- LÓGICA GAMMA ---
// =====================================================================

// Función de Densidad de Probabilidad (PDF) de Gamma
function gammaPDF(x, alpha, beta) {
  if (x <= 0) return 0;
  return (Math.pow(beta, alpha) / gamma(alpha)) * Math.pow(x, alpha - 1) * Math.exp(-beta * x);
}

// Función de Distribución Acumulada (CDF) de Gamma mediante regla de Simpson
function gammaCDF(x, alpha, beta) {
  if (x <= 0) return 0;
  let sum = 0;
  const steps = 200;
  const h = x / steps;
  for (let i = 0; i <= steps; i++) {
    const t = i * h;
    const ft = gammaPDF(t, alpha, beta);
    if (i === 0 || i === steps) sum += ft;
    else if (i % 2 === 1) sum += 4 * ft;
    else sum += 2 * ft;
  }
  return (sum * h) / 3;
}

// Función Cuantil (Inversa de la CDF) de Gamma — Búsqueda por Bisección
function invGammaCDF(p, alpha, beta) {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;

  let low = 0, high = (alpha / beta) * 4 + 10;
  const tolerance = 1e-8;
  const maxIter = 200;

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const cdfMid = gammaCDF(mid, alpha, beta);
    if (Math.abs(cdfMid - p) < tolerance) return mid;
    if (cdfMid < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

// Generador de variables aleatorias Gamma (Método: suma de Exponenciales para α entero, Marsaglia-Tsang para α no entero)
function generarGamma(alpha, beta) {
  if (alpha < 1) {
    // Marsaglia-Tsang para α < 1
    const d = alpha + 1/3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      const u1 = Math.random();
      const u2 = Math.random();
      const v = (1 - 1e-10) * u1;
      const z = Math.tan(Math.PI * v);
      const x = d * (1 + c * z);
      if (x <= 0) continue;
      const v2 = u2 * Math.pow(1 + c * z, 2) * Math.exp(d * z - x + d);
      if (v2 <= 1) return x / beta;
    }
  } else {
    // Para α ≥ 1: suma de Exponenciales
    let sum = 0;
    const n = Math.floor(alpha);
    for (let i = 0; i < n; i++) {
      sum += -Math.log(Math.random()) / beta;
    }
    // Ajuste para la parte fraccionaria
    const frac = alpha - n;
    if (frac > 0) {
      sum += generarGamma(frac, beta);
    }
    return sum;
  }
}
