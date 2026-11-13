// 다시보기 링크.
//
// 추첨 결과는 (시드, 이름 목록, 맵, 스킬 사용, 당첨 범위) 만으로 완전히 정해진다 (roulette.ts 의
// _rebuildForRun 참고). 이 값을 링크에 담아 두면 링크를 연 사람의 PC 에서 같은 추첨이 처음부터
// 다시 돌아가고 같은 사람이 당첨된다. 서버에 아무것도 저장하지 않는다.
//
// 물리·맵·순위 계산 코드를 바꿔 결과가 달라질 수 있으면 REPLAY_VERSION 을 올린다.
// 버전이 다른 링크는 "이 버전에서는 재생할 수 없다" 고 알린다 (다른 결과를 보여주는 것보다 낫다).

export const REPLAY_VERSION = 1;

export interface ReplayData {
  /** 시드 (uint32) */
  seed: number;
  /** setMarbles 에 넘긴 이름 그대로 (이름*개수, 이름/가중치 포함) */
  names: string[];
  /** 기본 맵 인덱스 */
  map: number;
  skills: boolean;
  /** 실제 구슬 수로 잘린 당첨 범위 (0-based, 양끝 포함) */
  range: [number, number];
}

interface Wire {
  v: number;
  s: number;
  n: string[];
  m: number;
  k: 0 | 1;
  r: [number, number];
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeReplay(d: ReplayData): string {
  const wire: Wire = { v: REPLAY_VERSION, s: d.seed >>> 0, n: d.names, m: d.map, k: d.skills ? 1 : 0, r: d.range };
  return toBase64Url(JSON.stringify(wire));
}

export type DecodeResult = { ok: true; data: ReplayData } | { ok: false; reason: 'invalid' | 'version' };

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

export function decodeReplay(raw: string): DecodeResult {
  let w: Partial<Wire>;
  try {
    w = JSON.parse(fromBase64Url(raw));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!w || typeof w !== 'object') return { ok: false, reason: 'invalid' };
  if (w.v !== REPLAY_VERSION) return { ok: false, reason: 'version' };
  if (
    !isInt(w.s) ||
    !Array.isArray(w.n) ||
    !w.n.length ||
    !w.n.every((x) => typeof x === 'string') ||
    !isInt(w.m) ||
    !Array.isArray(w.r) ||
    !isInt(w.r[0]) ||
    !isInt(w.r[1])
  ) {
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, data: { seed: w.s >>> 0, names: w.n, map: w.m, skills: w.k === 1, range: [w.r[0], w.r[1]] } };
}

/** 브라우저에서 바로 여는 다시보기 주소 */
export function buildWebReplayUrl(encoded: string): string {
  const url = new URL(location.origin + location.pathname);
  url.searchParams.set('replay', encoded);
  return url.toString();
}
