/**
 * Matemática DETERMINÍSTICA do motor.
 * Math.sin/cos/pow/atan2/exp não são iguais entre versões do V8 (Node x Chrome diferem na última casa
 * decimal), e isso bastava para o solo e o online divergirem com a mesma semente. Aqui tudo é feito só
 * com + − × ÷ e raiz quadrada, que o padrão IEEE 754 obriga a dar o mesmo resultado em qualquer máquina.
 * A precisão (~1e-13) é muito maior do que o jogo precisa.
 */
export const PI = 3.141592653589793;
const HALF_PI = 1.5707963267948966;
const LN2 = 0.6931471805599453;
const SQRT3 = 1.7320508075688772;
const TAN_PI_12 = 0.2679491924311227;

function sinPoly(x) { // |x| <= π/4
  const x2 = x * x;
  return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880 + x2 * (-1 / 39916800 + x2 * (1 / 6227020800 + x2 * (-1 / 1307674368000))))))));
}
function cosPoly(x) { // |x| <= π/4
  const x2 = x * x;
  return 1 + x2 * (-1 / 2 + x2 * (1 / 24 + x2 * (-1 / 720 + x2 * (1 / 40320 + x2 * (-1 / 3628800 + x2 * (1 / 479001600 + x2 * (-1 / 87178291200 + x2 * (1 / 20922789888000))))))));
}
function quadrant(x, shift) {
  if (!Number.isFinite(x)) return NaN;
  const k = Math.round(x / HALF_PI), r = x - k * HALF_PI;
  switch ((((k + shift) % 4) + 4) % 4) {
    case 0: return sinPoly(r);
    case 1: return cosPoly(r);
    case 2: return -sinPoly(r);
    default: return -cosPoly(r);
  }
}
export const sin = x => quadrant(x, 0);
export const cos = x => quadrant(x, 1);

function atanSmall(z) { // |z| <= tan(π/12)
  const z2 = z * z;
  let term = z, sum = z;
  for (let n = 3; n <= 31; n += 2) { term *= -z2; sum += term / n; }
  return sum;
}
export function atan(z) {
  if (Number.isNaN(z)) return NaN;
  const sign = z < 0 ? -1 : 1;
  let a = z * sign, offset = 0;
  if (a > 1) { a = 1 / a; offset = -1; }
  let v = a > TAN_PI_12 ? PI / 6 + atanSmall((a * SQRT3 - 1) / (SQRT3 + a)) : atanSmall(a);
  if (offset) v = HALF_PI - v;
  return sign * v;
}
export function atan2(y, x) {
  if (x > 0) return atan(y / x);
  if (x < 0) return atan(y / x) + (y < 0 ? -PI : PI);
  return y > 0 ? HALF_PI : y < 0 ? -HALF_PI : 0;
}
export function exp(x) {
  if (x !== x) return NaN;
  if (x > 709) return Infinity;
  if (x < -745) return 0;
  const k = Math.round(x / LN2), r = x - k * LN2;
  let term = 1, sum = 1;
  for (let n = 1; n <= 18; n++) { term = term * r / n; sum += term; }
  let scale = 1;
  if (k > 0) for (let i = 0; i < k; i++) scale *= 2; else for (let i = 0; i < -k; i++) scale /= 2;
  return sum * scale;
}
export function log(x) {
  if (!(x > 0)) return x === 0 ? -Infinity : NaN;
  if (x === Infinity) return Infinity;
  let e = 0, m = x;
  while (m >= 1.4142135623730951) { m /= 2; e++; }
  while (m < 0.7071067811865476) { m *= 2; e--; }
  const s = (m - 1) / (m + 1), s2 = s * s;
  let term = s, sum = s;
  for (let n = 3; n <= 33; n += 2) { term *= s2; sum += term / n; }
  return 2 * sum + e * LN2;
}
export function pow(x, y) {
  if (y === 0) return 1;
  if (y === 1) return x;
  if (y === 2) return x * x;
  if (x === 0) return y > 0 ? 0 : Infinity;
  if (x < 0) return NaN; // o jogo nunca eleva número negativo a expoente fracionário
  return exp(y * log(x));
}
export const hypot = (a, b) => Math.sqrt(a * a + b * b);
