# RKBO CareerMaker

**RKBO 선수 통산 자동 제작기** — HHRecord.zip과 RKBO.xls 시즌별 기록을 불러와 구단/선수를 선택하고 PNG 이미지를 저장하는 독립 GitHub Pages 웹앱입니다.

- **웹사이트:** https://p0emkite.github.io/RKBO_CareerMaker/ (GitHub Pages 활성화 후)
- **코드:** https://github.com/p0emkite/RKBO_CareerMaker

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
