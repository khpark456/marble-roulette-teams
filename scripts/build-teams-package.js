// Teams 앱 패키지(zip)를 만든다.
//
//   TEAMS_APP_URL=https://<계정>.github.io/<저장소>/ yarn teams:package
//
// 결과: dist-teams/marble-roulette-teams.zip  (Teams 관리 센터나 "앱 업로드"에 올린다)
// TEAMS_APP_URL 은 앱이 배포된 주소이며 반드시 https 이고 / 로 끝나야 한다.
// 같은 앱으로 계속 업데이트하려면 teams/app-id.txt 의 GUID 를 바꾸지 말 것.
const { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
let appUrl = process.env.TEAMS_APP_URL;
if (!appUrl) {
  console.error('TEAMS_APP_URL 환경변수가 필요합니다. 예) TEAMS_APP_URL=https://myorg.github.io/marble-roulette-teams/');
  process.exit(1);
}
if (!appUrl.endsWith('/')) appUrl += '/';
const url = new URL(appUrl);
if (url.protocol !== 'https:') {
  console.error('Teams 탭 주소는 https 여야 합니다:', appUrl);
  process.exit(1);
}

const appId = (process.env.TEAMS_APP_ID || readFileSync(path.join(root, 'teams/app-id.txt'), 'utf8')).trim();
const developerName = process.env.TEAMS_DEVELOPER_NAME || 'Internal';

const manifest = readFileSync(path.join(root, 'teams/manifest.template.json'), 'utf8')
  .replaceAll('{{APP_ID}}', appId)
  .replaceAll('{{APP_URL}}', appUrl)
  .replaceAll('{{APP_HOST}}', url.host)
  .replaceAll('{{DEVELOPER_NAME}}', developerName);
JSON.parse(manifest); // 치환 후에도 올바른 JSON 인지 확인

const work = path.join(root, 'dist-teams/package');
rmSync(path.join(root, 'dist-teams'), { recursive: true, force: true });
mkdirSync(work, { recursive: true });
writeFileSync(path.join(work, 'manifest.json'), manifest);
copyFileSync(path.join(root, 'teams/color.png'), path.join(work, 'color.png'));
copyFileSync(path.join(root, 'teams/outline.png'), path.join(work, 'outline.png'));

const zip = path.join(root, 'dist-teams/marble-roulette-teams.zip');
const files = ['manifest.json', 'color.png', 'outline.png'].map((f) => path.join(work, f));
execFileSync('zip', ['-j', '-q', zip, ...files], { stdio: 'inherit' });
console.log('Teams 앱 패키지:', path.relative(root, zip));
console.log('  앱 주소:', appUrl);
console.log('  앱 ID  :', appId);
