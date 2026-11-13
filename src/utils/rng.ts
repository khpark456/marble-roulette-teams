// 시뮬레이션 전용 난수.
//
// 추첨 결과에 영향을 주는 난수(구슬 배치, 밀도, 스킬, 흔들기)는 전부 여기서 뽑는다.
// 같은 시드로 reseed 하면 어느 PC 에서 돌려도 같은 과정·같은 당첨자가 나온다 (다시보기 공유).
// 화면 연출용 난수(폭죽 파티클 등)는 Math.random 을 그대로 쓴다. 프레임 수에 따라
// 호출 횟수가 달라지는 곳이 이 수열을 쓰면 결과가 어긋난다.

let state = 0;

/** mulberry32. 정수 연산만 써서 브라우저마다 결과가 같다 */
export function simRandom(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function reseed(seed: number) {
  state = seed >>> 0;
}

/** 새 추첨용 시드 (32bit) */
export function randomSeed(): number {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  } catch {
    return Math.floor(Math.random() * 4294967296) >>> 0;
  }
}
