// Microsoft Teams 연동.
//
// Teams 안에서 열렸는지는 URL의 ?inTeams=1 로 판단한다. 탭 설정 페이지(config.html)가
// contentUrl 에 이 파라미터를 붙인다. app.initialize() 는 Teams 밖에서 응답 없이
// 매달리므로, 일반 브라우저에서 열었을 때 기다리지 않도록 파라미터로 먼저 거른다.
//
// 프레임별 동작
// - content     : 채널/채팅 탭. 일반 웹과 같은 화면에 Teams 테마만 맞춘다.
// - sidePanel   : 회의 사이드 패널(폭 약 320px). 게임 대신 "스테이지에 공유" 런처를 띄운다.
// - meetingStage: 공유된 화면. ScreenShare 프로토콜로 공유하므로 발표자 한 사람의
//                 인스턴스만 물리 시뮬레이션을 돌리고 나머지는 그 화면을 영상으로 본다.
//                 Collaborative 로 공유하면 참가자마다 따로 시뮬레이션이 돌아 당첨자가
//                 사람마다 달라지므로 쓰면 안 된다.
import { app, clipboard, FrameContexts, meeting, sharing } from '@microsoft/teams-js';
import { buildWebReplayUrl } from './replay';

const NAMES_KEY = 'mbr_names';
/** manifest 의 개인 앱 탭 entityId. 다시보기 딥링크가 이 탭을 연다 */
const PERSONAL_TAB_ENTITY = 'marble-roulette-personal';
/** 딥링크 subEntityId 앞에 붙여 다시보기 링크임을 표시한다 */
export const REPLAY_SUBPAGE_PREFIX = 'replay:';

let teamsAppId: string | null = null;

export const isTeamsLaunch = new URLSearchParams(location.search).get('inTeams') === '1';

type TeamsTheme = 'default' | 'dark' | 'contrast' | string;

function waitForRoulette(): Promise<any> {
  return new Promise((resolve) => {
    const check = () => {
      const r = (window as any).roulette;
      if (r?.isReady) resolve(r);
      else setTimeout(check, 100);
    };
    check();
  });
}

async function applyTheme(theme: TeamsTheme) {
  const dark = theme !== 'default';
  const roulette = await waitForRoulette();
  roulette.setTheme(dark ? 'dark' : 'light');
  document.documentElement.classList.toggle('light', !dark);
  const chk = document.querySelector<HTMLInputElement>('#chkDarkMode');
  if (chk) chk.checked = dark;
  (window as any).options && ((window as any).options.darkMode = dark);
}

/** 스테이지에 띄울 URL. 이름은 기존 ?names= 파라미터로 넘긴다 */
export function buildStageUrl(names: string[]): string {
  const url = new URL(location.origin + location.pathname);
  url.searchParams.set('inTeams', '1');
  url.searchParams.set('stage', '1');
  if (names.length) url.searchParams.set('names', names.join(','));
  return url.toString();
}

function parseNames(text: string): string[] {
  return text
    .split(/[,\r\n]/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function setStatus(msg: string, kind: 'info' | 'error' = 'info') {
  const el = document.querySelector<HTMLElement>('#teamsStatus');
  if (!el) return;
  el.textContent = msg;
  el.dataset.kind = kind;
}

function setupSidePanel() {
  document.documentElement.classList.add('teams-side-panel');
  const panel = document.querySelector<HTMLElement>('#teamsPanel');
  const textarea = document.querySelector<HTMLTextAreaElement>('#teamsNames');
  const button = document.querySelector<HTMLButtonElement>('#btnShareStage');
  if (!panel || !textarea || !button) return;
  panel.hidden = false;

  const saved = localStorage.getItem(NAMES_KEY);
  if (saved) textarea.value = saved.split(',').join('\n');

  const count = document.querySelector<HTMLElement>('#teamsNameCount');
  const updateCount = () => {
    const n = parseNames(textarea.value).length;
    if (count) count.textContent = `${n}명`;
    button.disabled = n === 0;
  };
  textarea.addEventListener('input', updateCount);
  updateCount();

  meeting.getAppContentStageSharingCapabilities((err, caps) => {
    if (err || !caps?.doesAppHaveSharePermission) {
      button.disabled = true;
      setStatus('이 회의에서 스테이지 공유 권한이 없습니다. 발표자 역할인지 확인해 주세요.', 'error');
    }
  });

  button.addEventListener('click', () => {
    const names = parseNames(textarea.value);
    if (!names.length) return;
    localStorage.setItem(NAMES_KEY, names.join(','));
    button.disabled = true;
    setStatus('스테이지에 공유하는 중…');
    meeting.shareAppContentToStage(
      (err) => {
        button.disabled = false;
        if (err) {
          console.error('[teams] shareAppContentToStage 실패', err);
          setStatus(`공유하지 못했습니다 (${err.message ?? err.errorCode}).`, 'error');
        } else {
          setStatus('공유했습니다. 스테이지 화면에서 시작 버튼을 눌러 주세요.');
        }
      },
      buildStageUrl(names),
      { sharingProtocol: meeting.SharingProtocol.ScreenShare },
    );
  });
}

/**
 * Teams 안이면 SDK 를 초기화한다. 다시보기 딥링크로 열렸으면 그 subPageId 를 돌려준다.
 */
export async function initTeams(): Promise<string | undefined> {
  if (!isTeamsLaunch) return;
  document.documentElement.classList.add('in-teams');
  try {
    await app.initialize();
    const context = await app.getContext();
    teamsAppId = context.app.appId ? String(context.app.appId) : null;
    const frame = context.page.frameContext;
    document.documentElement.dataset.teamsFrame = frame;

    applyTheme(context.app.theme);
    app.registerOnThemeChangeHandler(applyTheme);

    if (frame === FrameContexts.sidePanel) setupSidePanel();

    app.notifySuccess();
    return context.page.subPageId;
  } catch (e) {
    console.error('[teams] 초기화 실패', e);
    app.notifyFailure?.({ reason: app.FailedReason.Other, message: String(e) });
  }
}

/**
 * 개인 앱 탭을 여는 Teams 딥링크. 받는 사람이 Teams 안에서 바로 다시보기를 본다.
 * 앱이 설치돼 있지 않으면 Teams 가 설치를 안내하고, webUrl 은 Teams 밖(모바일 웹 등)에서 열 때 쓴다
 */
function buildTeamsReplayLink(encoded: string): string | null {
  if (!teamsAppId) return null;
  const context = JSON.stringify({ subEntityId: REPLAY_SUBPAGE_PREFIX + encoded });
  const webUrl = buildWebReplayUrl(encoded);
  return (
    `https://teams.microsoft.com/l/entity/${encodeURIComponent(teamsAppId)}/${PERSONAL_TAB_ENTITY}` +
    `?webUrl=${encodeURIComponent(webUrl)}&context=${encodeURIComponent(context)}`
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (isTeamsLaunch && clipboard.isSupported()) {
      await clipboard.write(new Blob([text], { type: 'text/plain' }));
      return true;
    }
  } catch (e) {
    console.warn('[teams] clipboard.write 실패', e);
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export type ShareOutcome = 'dialog' | 'copied' | 'manual';

/**
 * 추첨 결과를 채팅에 공유한다.
 * 1) Teams 공유 대화상자(sharing.shareWebContent)로 채팅을 골라 바로 보낸다
 * 2) 지원하지 않는 클라이언트면 링크를 복사해 채팅에 붙여 넣게 한다
 * 3) 복사도 막혀 있으면 'manual' 을 돌려주고 호출한 쪽이 링크를 보여준다
 */
export async function shareReplay(encoded: string, winners: string[]): Promise<{ outcome: ShareOutcome; url: string; text: string }> {
  const url = (isTeamsLaunch && buildTeamsReplayLink(encoded)) || buildWebReplayUrl(encoded);
  const message = `🎉 구슬 추첨 당첨: ${winners.join(', ')}\n링크를 누르면 추첨 과정을 처음부터 그대로 볼 수 있습니다.`;
  const text = `${message}\n${url}`;

  if (isTeamsLaunch) {
    try {
      if (sharing.isSupported()) {
        await sharing.shareWebContent({ content: [{ type: 'URL', url, message, preview: true }] });
        return { outcome: 'dialog', url, text };
      }
    } catch (e) {
      // 사용자가 대화상자를 닫아도 오류로 온다. 그때는 복사로 넘어가지 않고 그냥 끝낸다
      const code = (e as { errorCode?: number })?.errorCode;
      if (code === 8000 /* USER_ABORT */) return { outcome: 'dialog', url, text };
      console.warn('[teams] shareWebContent 실패, 복사로 대신합니다', e);
    }
  }
  return { outcome: (await copyText(text)) ? 'copied' : 'manual', url, text };
}
