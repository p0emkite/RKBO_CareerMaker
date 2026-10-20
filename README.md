# RKBO CareerMaker

**RKBO 선수 통산 자동 제작기** — HHRecord.zip과 RKBO.xls 시즌별 기록을 불러와 구단/선수를 선택하고 PNG 이미지를 저장하는 독립 GitHub Pages 웹앱입니다.

- **웹사이트:** https://p0emkite.github.io/RKBO_CareerMaker/ (GitHub Pages 활성화 후)
- **코드:** https://github.com/p0emkite/RKBO_CareerMaker
- **공용 선수 DB:** [data/career-db.json](data/career-db.json)

## 사용법

1. HHRecord.zip 및 RKBO.xls를 업로드합니다. 기록은 브라우저의 IndexedDB에 누적 저장됩니다.
2. 최신 소속 구단을 고르고 선수를 선택합니다.
3. 선수의 투명 PNG 이미지를 넣고 위치/크기를 조절합니다.
4. 팀색 단색 또는 그라데이션을 선택합니다.
5. 우승 시즌 정보는 `시즌 차수,구단 코드` 형태로 등록해 우승 별(★)을 적용할 수 있습니다.
6. 통산 PNG를 저장합니다. 다음 시즌 기록 ZIP/XLS를 추가하면 같은 브라우저의 DB가 갱신됩니다.
7. 브라우저 데이터 유실에 대비해 **DB JSON 백업**을 저장하세요.

## 기술 구조

- HTML/CSS/JS 정적 사이트. 서버/로그인 불필요.
- JSZip: HHRecord.zip의 `Results/Players/p_*.htm` 기록 추출.
- SheetJS: 구형 Excel `.xls` 및 `.xlsx` 시즌별 기록 추출.
- HHRecord의 `Year = 시즌 차수 + 1950`. 예: 2010 = 60차.
- 다른 닉네임의 선수는 동일 시즌에서 공통 지표가 모두 정확히 일치하고 후보가 유일할 때만 연결합니다. 모호하거나 불일치하는 기록은 자동 병합하지 않습니다.
- 레이아웃은 현재 참고 이미지 기준의 **베타**이며, 정확한 출력 규격 및 디자인은 추가 검증 중입니다.
- 기존 [RKBO-](https://github.com/p0emkite/RKBO-) 저장소의 구단 로고를 공개 이미지 URL로 참조합니다. 해당 저장소가 비공개/삭제되면 로고를 별도 배치해야 합니다.

## GitHub Pages 배포

저장소의 **Settings → Pages → Build and deployment** 에서 `Deploy from a branch`, `main`, `/(root)`를 선택하고 **Save**를 누릅니다. 배포 후 위 웹사이트 URL을 열면 됩니다.

## 검증 필요

- 사용자 제공 HHRecord.zip 및 RKBO.xls 전체 누적 통합 테스트, 선수 수/성적/시즌별 팀 교차 검증.
- 닉네임 변경 판정 결과 및 누적 충돌 처리 검증.
- 포스트시즌, 우승팀 자동 추출, 원본 샘플과 픽셀 수준의 정확한 레이아웃 복제는 추후 개선.
- 기존 구단 로고는 8개 구단만 확인되었습니다. 누락 구단은 텍스트로 표시합니다.


## 최신 시즌 수동 설정

- 「최신 시즌 차수 (직접 설정)」에 **60**처럼 RKBO 차수를 입력하고 **시즌 저장**을 누릅니다. 브라우저 저장소에 이 설정이 보관됩니다.
- 자동 최대 시즌 스캔(85차 등)은 현역 판별에 사용하지 않습니다.
- 「은퇴 선수 포함」이 꺼져 있으면 저장된 시즌(60차 = Year 2010)에 기록이 있는 선수만 표시합니다.
- 해당 시즌을 아직 저장하지 않았다면 목록에는 현역 선수가 표시되지 않고 시즌 설정을 안내합니다. 「은퇴 선수 포함」을 체크하면 전체 선수를 볼 수 있습니다.
- 여러 기기에서 같은 시즌 차수를 쓰려면 아래 방법으로 GitHub 공용 DB에 함께 저장하세요.

## GitHub에 선수 DB 직접 기록하기

- 실제 저장 파일: **data/career-db.json** (schema 2, players/currentSeason/champions/updatedAt)
- 사이트 접속 시 공개 GitHub DB를 읽습니다. 브라우저에 선수 데이터가 비어 있으면 자동으로 내려받아 사용할 수 있습니다.
- 기존 브라우저 데이터가 있으면 GitHub DB로 자동 덮어쓰지 않습니다. 「GitHub DB 불러오기」를 누르고 교체를 확인해야 합니다. 먼저 「DB JSON 백업」을 받아 두세요.
- **읽기는 GitHub 토큰 없이 가능**합니다.
- **GitHub에 저장하려면** 웹사이트의 GitHub 공용 DB 영역에서 **GitHub Fine-grained personal access token**을 연결하고, 데이터 업로드/최신 시즌 수정을 마친 뒤 「현재 DB를 GitHub에 저장」을 누르세요.
- 토큰 생성: [GitHub Settings / Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
  - Resource owner: p0emkite
  - Repository access: Only select repositories → **RKBO_CareerMaker**
  - Repository permissions → **Contents: Read and write**. Metadata: Read (기본값)
  - 토큰은 되도록 짧은 유효기간을 지정하세요.
- 토큰은 **현재 열린 웹페이지의 JS 메모리에만** 보관합니다. 새로고침 또는 브라우저를 닫으면 다시 연결해야 하며, JSON/IndexedDB/localStorage/GitHub 소스 파일에는 넣지 않습니다.
- GitHub API는 성공적으로 커밋되기 전에 SHA를 확인하며, 원격 DB가 그 사이 바뀌었다면 저장을 차단합니다.
- **공개 저장소이므로** 선수 이름과 성적, 우승팀 정보는 누구나 열람할 수 있고 과거 커밋 기록에도 남습니다. 개인 연락처·민감정보는 포함하지 마세요.
- 선수 DB가 비어 있으면 클라우드에 덮어쓰지 않습니다.
- 업로드된 사진 PNG는 GitHub DB에 저장하지 않습니다. 사진은 별도 업로드/PNG 생성에만 사용합니다.
- 오프라인/인증 오류 때는 기존 브라우저 DB를 그대로 유지하며, JSON 백업을 사용할 수 있습니다.
- 자동 GitHub 커밋은 하지 않습니다. 확인된 상태에서 명시적으로 저장 버튼을 누르는 방식입니다.

