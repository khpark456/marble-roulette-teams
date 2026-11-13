// 브라우저 엔진과 상관없이 같은 값이 나오는 수학 함수.
//
// Math.sin/cos/exp/hypot 은 명세상 근삿값이라 V8(Chrome·Edge·Teams)과 JavaScriptCore(Safari)의
// 결과가 마지막 자리에서 다를 수 있다. 순위 계산이 슬로모션 → 물리 스텝 크기로 이어지므로
// 시뮬레이션 경로에서는 사칙연산과 Math.sqrt(정확히 반올림이 보장됨)만으로 계산한다.

const TWO_PI = 6.283185307179586;
const PI = 3.141592653589793;
const HALF_PI = 1.5707963267948966;

/** [-π/4, π/4] 근처에서 쓰는 테일러 급수 */
function sinPoly(x: number) {
  const x2 = x * x;
  return x * (1 - (x2 / 6) * (1 - (x2 / 20) * (1 - (x2 / 42) * (1 - (x2 / 72) * (1 - (x2 / 110) * (1 - x2 / 156))))));
}

function cosPoly(x: number) {
  const x2 = x * x;
  return 1 - (x2 / 2) * (1 - (x2 / 12) * (1 - (x2 / 30) * (1 - (x2 / 56) * (1 - (x2 / 90) * (1 - x2 / 132)))));
}

export function dsin(x: number): number {
  // [-π, π] 로 줄인 뒤 사분면별로 급수를 고른다
  let r = x - TWO_PI * Math.round(x / TWO_PI);
  if (r > PI) r -= TWO_PI;
  if (r < -PI) r += TWO_PI;
  const q = Math.round(r / HALF_PI);
  const t = r - q * HALF_PI;
  switch (((q % 4) + 4) % 4) {
    case 0:
      return sinPoly(t);
    case 1:
      return cosPoly(t);
    case 2:
      return -sinPoly(t);
    default:
      return -cosPoly(t);
  }
}

export function dcos(x: number): number {
  return dsin(x + HALF_PI);
}

export function dhypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

/** 1 - e^(-x). 0 ≤ x ≤ 0.5 정도의 작은 값용 (순위 평활화 계수) */
export function oneMinusExpNeg(x: number): number {
  // 1 - e^-x = x - x²/2! + x³/3! - ...
  let term = x;
  let sum = x;
  for (let n = 2; n <= 12; n++) {
    term *= -x / n;
    sum += term;
  }
  return sum;
}
