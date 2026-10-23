# RKBO 60차 시즌 선수 카드 도감

- **도감:** https://p0emkite.github.io/RKBO_CareerMaker/cards/
- **관리자:** https://p0emkite.github.io/RKBO_CareerMaker/cards/?admin=1
- **원본 저장소:** https://github.com/p0emkite/RKBO_CareerMaker/tree/main/cards

60차 시즌 1군 선수 211명(타자 105, 투수 106)을 기준으로 작성한 v0.2 카드의 OVR 및 5단계 등급은 그대로 유지합니다. 신규 v0.3은 카드 이미지·배치 편집 기능을 추가한 버전입니다.

## 사용
1. 누구나 일반 도감에서 카드 검색·상세 보기·즐겨찾기를 사용할 수 있습니다.
2. 관리자 주소를 열고 `p0emkite` 계정의 GitHub Fine-grained Personal Access Token을 입력합니다.
3. 토큰은 `RKBO_CareerMaker` 저장소에 대해 **Contents: Read and write** 권한과 **Metadata: Read** 권한이 필요합니다.
4. 관리자 연결 후 카드의 **사진 편집**에서 이미지를 골라 드래그로 위치 이동, 휠/슬라이더로 확대·축소 후 GitHub에 저장합니다.
5. 이미지는 `assets/cards/<card-id>.webp`로, 이미지 위치는 `data/card-images.json`에 저장됩니다. 일반 관람객은 저장소에 쓰기 권한이 없으며 편집이 불가능합니다.
6. 관리자 **GitHub 동기화**는 서버의 이미지 설정·첨부 기록을 다시 불러옵니다. 관람객은 GitHub Pages 배포 후 새로고침하면 변경된 이미지를 봅니다.

## 다른 시즌 / HHRecord 원본 업로드
관리자 화면에서 CSV / XLS / XLSX / HTML / ZIP 등을 업로드할 수 있습니다. 자료의 종류는 `season`, `hhrecord`, `other` 중 선택합니다.

큰 파일도 GitHub Contents API를 통해 파일당 700KiB 조각으로 나누어 `imports/<kind>/<id>/001.b64` 형태로 저장합니다. `data/imports.json`은 파일의 원래 이름, 크기, 조각 순서를 담습니다.

조각 파일 각각은 **원본 바이너리 조각을 base64로 인코딩한 텍스트**입니다. 추후 데이터를 복원하려면 manifest의 `chunks`를 순서대로 내려받아 각 텍스트를 base64 디코딩하고 순서대로 연결하면 됩니다. 업로드 단계에서 카드 통계를 자동 생성하거나 기존 선수 카드에 병합하지는 않습니다.

> **주의:** 이 저장소와 GitHub Pages의 자료는 공개될 수 있습니다. 다른 권리자의 자료나 개인정보를 업로드하지 마세요.

## 보안 및 범위
- 토큰은 페이지 메모리에서만 유지하며 브라우저 저장소나 커밋에 기록하지 않습니다.
- `?admin=1`은 **관리자 로그인 화면을 표시하는 옵션**일 뿐, 권한을 부여하지 않습니다. 실제 편집에는 소유자 계정의 쓰기 토큰이 필요합니다.
- GitHub에 직접 파일을 수정한 뒤에는 페이지 새로고침 또는 관리자의 동기화 버튼을 사용하세요.
- 최신 카드 이미지를 GitHub Pages에서 보려면 Pages 빌드와 배포가 완료되어야 합니다.
- v0.3은 v0.2의 스탯·OVR 산식을 변경하지 않았습니다.
