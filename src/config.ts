// 구성 가능한 탭(configurableTabs)의 설정 페이지.
// 저장 시 contentUrl 에 ?inTeams=1 을 붙여 본 앱이 Teams 안에서 열렸음을 알 수 있게 한다.
import { app, pages } from '@microsoft/teams-js';

async function main() {
  await app.initialize();
  const contentUrl = new URL('./?inTeams=1', location.href).toString();
  const websiteUrl = new URL('./', location.href).toString();

  pages.config.registerOnSaveHandler((saveEvent) => {
    pages.config
      .setConfig({
        entityId: 'marble-roulette',
        suggestedDisplayName: '구슬 추첨',
        contentUrl,
        websiteUrl,
      })
      .then(() => saveEvent.notifySuccess())
      .catch((e) => saveEvent.notifyFailure(String(e)));
  });

  pages.config.setValidityState(true);
  app.notifySuccess();
}

main().catch((e) => console.error('[teams-config]', e));
