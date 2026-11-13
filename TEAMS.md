# 구슬 추첨 for Microsoft Teams

[마블 룰렛](https://github.com/lazygyu/roulette)(lazygyu, MIT)을 Microsoft Teams 앱으로 만든 사내용 포크입니다.

## 할 수 있는 것

| 위치 | 동작 |
|---|---|
| 개인 앱 | 왼쪽 앱 바에서 열어 혼자 추첨 |
| 채널 / 그룹 채팅 탭 | 탭으로 고정해 두고 누구나 추첨, **결과 공유**로 채팅방에 다시보기 링크 올리기 |
| 회의 사이드 패널 | 참가자 이름을 넣고 **스테이지에 공유** |
| 회의 스테이지 | 공유한 사람이 **시작**을 누르면 모든 참가자가 같은 화면을 봄 |

회의 공유는 Teams의 **ScreenShare 방식**을 씁니다. 공유한 사람의 화면에서만 추첨이 돌고,
다른 참가자는 그 화면을 영상으로 봅니다. 그래서 모두가 같은 당첨자를 봅니다.
(기본 방식인 Collaborative를 쓰면 참가자마다 물리 시뮬레이션이 따로 돌아서 당첨자가 사람마다 달라집니다.)

Teams 테마(라이트·다크·고대비)에 맞춰 화면 색이 자동으로 바뀝니다.

## 채팅방에 추첨 과정 공유 (다시보기)

1. 채팅방의 **구슬 추첨** 탭(또는 개인 앱)에서 추첨합니다.
2. 끝나면 **결과 공유** 버튼이 나옵니다. 누르면 Teams 공유 창이 뜨고, 채팅방을 골라 보냅니다.
   (공유 창을 지원하지 않는 Teams 버전이면 링크가 복사되니 채팅에 붙여 넣으세요.)
3. 채팅방 사람들이 링크를 누르면 Teams 안에서 앱이 열리고, **시작**을 누르면 같은 추첨이
   처음부터 그대로 재생되어 같은 사람이 당첨됩니다.

서버에 아무것도 저장하지 않습니다. 링크 안에 시드(난수 시작값)·이름·맵·옵션이 들어 있고,
게임이 이 값만으로 결과가 정해지도록 만들어져 있어서 누구의 PC에서 돌려도 같은 결과가 나옵니다.

- 링크에 참가자 이름이 들어갑니다 (주소창에 보이는 형태로 인코딩됨). 링크를 받은 사람은 이름 목록을 볼 수 있습니다.
- 받는 사람도 앱이 설치돼 있어야 Teams 안에서 열립니다. 없으면 Teams가 설치를 안내하거나 브라우저로 엽니다.
- 맵 공유마당에서 **다운로드한 맵**은 공유할 수 없습니다 (받는 사람에게 같은 맵이 없을 수 있음). 기본 맵만 됩니다.
- 앱을 업데이트해 물리·맵 코드가 바뀌면 `src/replay.ts`의 `REPLAY_VERSION`을 올리세요.
  예전 링크는 "재생할 수 없다"고 안내합니다 (다른 결과를 보여주지 않도록).

### 결과가 같게 나오도록 바꾼 부분

원본은 매번 랜덤이고 프레임 속도에 따라 시뮬레이션이 조금씩 달라져서, 다음을 고쳤습니다.

| 원본 | 변경 |
|---|---|
| `Math.random()` | 추첨에 영향을 주는 난수는 시드 고정 난수(`src/utils/rng.ts`) 사용. 폭죽 같은 연출만 `Math.random` |
| 슬로모션·순위 정렬이 프레임마다 갱신 | 물리 스텝(10ms)마다 갱신 → 프레임 속도와 무관 |
| 골인한 구슬을 0.5초 타이머로 제거 | 50스텝 뒤 제거 |
| 시작 전 대기 시간 동안 회전 장애물이 돌아감 | 시작 순간 빈 물리 월드에서 같은 시드로 다시 배치 |
| 순위 계산의 `Math.hypot/sin/cos/exp` | 사칙연산만 쓰는 함수(`src/utils/detMath.ts`). Chrome 계열과 Safari 계열의 계산 결과 차이 방지 |

같은 링크를 프레임 간격 7·16.7·33·40ms로 돌려 4개 기본 맵 모두에서 30개 구슬의 완주 순서가 전부 같은 것을 확인했습니다.

## 원본과 다른 점

- 광고와 외부 분석(umami, Google Analytics)을 뺐습니다. 원본은 구슬 이름(=참가자 이름)을
  분석 서버로 보내기 때문에, 사내에서 쓰면 직원 이름이 외부로 나갑니다.
- 원본 사이트 공지 팝업과 쇼핑몰 버튼을 뺐습니다.
- **맵 공유마당**(marblerouletteshop.com에서 맵 받기)은 그대로 둡니다. 맵 목록만 받고
  이름은 보내지 않습니다. 외부 접속을 완전히 막아야 하면 `src/mapSelector.ts`에서 끄세요.

## 배포 (GitHub Pages)

1. 이 폴더를 회사 GitHub 저장소로 올립니다 (예: `myorg/marble-roulette-teams`).
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
3. `main`에 푸시하면 `.github/workflows/deploy.yml`이 다음을 합니다.
   - 웹 앱을 빌드해 `https://<계정>.github.io/<저장소>/`에 배포
   - 그 주소를 넣은 Teams 앱 패키지 `marble-roulette-teams.zip` 생성
4. **Actions** 탭에서 실행 결과를 열고 **Artifacts → teams-app-package**를 내려받습니다.
   (압축 안에 `marble-roulette-teams.zip`이 들어 있습니다.)

> 비공개 저장소의 GitHub Pages는 GitHub Enterprise Cloud에서만 됩니다.
> 앱 소스에 비밀 정보는 없으므로 공개 저장소로 두어도 됩니다.

## Teams에 설치

**조직 전체에 배포 (Teams 관리자)**
Teams 관리 센터 → **Teams 앱 → 앱 관리 → 업로드** → `marble-roulette-teams.zip`.
필요하면 **설정 정책**으로 왼쪽 앱 바에 고정합니다.

**혼자 시험해 보기**
Teams → **앱 → 앱 관리 → 앱 업로드 → 사용자 지정 앱 업로드**.
(조직 정책에서 사용자 지정 앱 업로드가 허용돼 있어야 합니다.)

## 회의에서 쓰는 법

1. 회의 상단 **앱(+)** → **구슬 추첨** 추가 → **저장**.
2. 사이드 패널에 참가자 이름 입력 (`이름*2` = 구슬 2개, `이름/3` = 가중치 3).
3. **스테이지에 공유** → 공유된 화면에서 **시작**.

스테이지 공유는 회의 **발표자** 역할만 할 수 있습니다.

## 직접 빌드

```bash
npx yarn@1 install
npx yarn@1 build                      # dist/ 에 웹 앱
TEAMS_APP_URL=https://<배포 주소>/ npx yarn@1 teams:package   # dist-teams/marble-roulette-teams.zip
```

- `teams/app-id.txt`: Teams 앱 ID(GUID). 바꾸면 Teams가 다른 앱으로 인식하니 그대로 두세요.
- `teams/manifest.template.json`: 앱 이름·설명·권한. 회사 개인정보처리방침 주소가 있으면
  `privacyUrl`, `termsOfUseUrl`을 그 주소로 바꾸세요 (지금은 앱 주소로 채워집니다).
- `TEAMS_DEVELOPER_NAME`: 매니페스트의 개발자 이름 (Actions에서는 저장소 소유자 이름).

## 구조

| 파일 | 역할 |
|---|---|
| `src/teams.ts` | Teams SDK 초기화, 테마 연동, 사이드 패널 런처, 스테이지 공유, 채팅 공유 |
| `src/replay.ts` | 다시보기 링크 만들기·읽기 |
| `src/utils/rng.ts`, `src/utils/detMath.ts` | 시드 고정 난수, 브라우저와 무관한 수학 함수 |
| `config.html`, `src/config.ts` | 탭 추가 시 나오는 설정 화면 (`contentUrl`에 `?inTeams=1`을 붙임) |
| `teams/` | 매니페스트 템플릿, 아이콘, 앱 ID |
| `scripts/build-teams-package.js` | 매니페스트를 채워 zip 생성 |
| `scripts/make-teams-icons.py` | 아이콘 다시 만들기 |

## 라이선스

MIT. 원저작자 lazygyu의 저작권 표시(`LICENSE`)를 유지해야 합니다.
"마블 룰렛™"은 원저작자의 상표이므로 Teams 앱 이름은 "구슬 추첨"으로 했습니다.
