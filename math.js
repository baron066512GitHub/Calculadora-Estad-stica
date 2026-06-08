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