import './localization';
import { reportCommunityMapPlay } from './communityMaps';
import { initMapSelector } from './mapSelector';
import options from './options';
import { Roulette } from './roulette';
import { decodeReplay, encodeReplay, type ReplayData } from './replay';
import { initTeams, REPLAY_SUBPAGE_PREFIX, shareReplay } from './teams';

// Teams 사내용 포크: 광고(AdService)와 외부 분석(umami/gtag)은 뺐다.
// 원본은 구슬 이름(=참가자 이름)을 분석 서버로 보내는데, 사내에서 쓰면 직원 이름이
// 외부로 나가므로 제거했다. 맵 공유마당(맵 내려받기)은 그대로 쓴다.

const roulette = new Roulette();
(window as any).roulette = roulette;

const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
// 맵 공유마당 API
const mapApiBase = isLocalhost ? 'http://localhost:3000' : 'https://marblerouletteshop.com';

// index.html 이 초기화할 때 부른다
(window as any).initMapSelector = (onMapChange: () => void, toast: (key: string) => void) =>
  initMapSelector({ roulette, apiBase: mapApiBase, onMapChange, toast });

// 시작 버튼. 받은 맵이면 플레이 1회를 알린다
(window as any).reportMapPlay = () => reportCommunityMapPlay(mapApiBase, roulette.getCurrentMap()?.id ?? '');
(window as any).options = options;

// 다시보기: 웹 링크(?replay=) 또는 Teams 딥링크(subPageId 'replay:...')로 들어온다.
// index.html 의 initialize 가 이 값을 받아 다시보기 모드로 들어간다
const replayPromise = (async () => {
  const fromUrl = new URLSearchParams(location.search).get('replay');
  const subPageId = await initTeams();
  const raw = fromUrl ?? (subPageId?.startsWith(REPLAY_SUBPAGE_PREFIX) ? subPageId.slice(REPLAY_SUBPAGE_PREFIX.length) : null);
  return raw ? decodeReplay(raw) : null;
})();
(window as any).getReplay = () => replayPromise;

// 결과 공유 버튼
(window as any).shareResult = (data: ReplayData, winners: string[]) => shareReplay(encodeReplay(data), winners);
