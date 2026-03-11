# GitHub 자동 푸시를 위한 인증 설정

자동으로 `git push`가 되려면 한 번만 인증을 설정하면 됩니다. 아래 두 방법 중 하나를 선택하세요.

---

## 방법 1: Personal Access Token (HTTPS) — 추천

가장 간단한 방법입니다. 토큰을 만들고, 푸시할 때 비밀번호 대신 입력합니다.

### 1단계: 토큰 만들기

1. GitHub 로그인 후 **우측 상단 프로필 아이콘** → **Settings**
2. 왼쪽 맨 아래 **Developer settings**
3. **Personal access tokens** → **Tokens (classic)** 또는 **Fine-grained tokens**
4. **Generate new token** 클릭
5. **Note**: `260311 push` 등 구분용 이름 입력
6. **Expiration**: 90일 또는 No expiration (본인 선택)
7. **Scope**에서 **repo** 체크 (저장소 읽기/쓰기)
8. **Generate token** 클릭 후 **생성된 토큰을 복사** (한 번만 보이므로 안전한 곳에 저장)

### 2단계: 토큰으로 푸시하기

터미널에서:

```powershell
cd c:\Users\SD2-18\Downloads\260311
git push -u origin main
```

- **Username**: GitHub 아이디 (`yw342`)
- **Password**: 비밀번호가 아니라 **방금 복사한 토큰** 붙여넣기

Windows에서는 **Git Credential Manager**가 토큰을 저장해 두므로, 다음부터는 `git push`만 해도 자동으로 인증됩니다.

### (선택) 저장소 주소에 토큰 넣기 — 자동 입력

매번 묻지 않게 하려면 원격 URL에 토큰을 넣을 수 있습니다. **토큰이 코드/문서에 노출되지 않도록 주의**하세요.

```powershell
cd c:\Users\SD2-18\Downloads\260311
git remote set-url origin https://yw342:여기에토큰붙여넣기@github.com/yw342/260311.git
git push -u origin main
```

이후에는 `git push`만 해도 됩니다. 토큰을 바꾸거나 제거하려면:

```powershell
git remote set-url origin https://github.com/yw342/260311.git
```

---

## 방법 2: SSH 키

SSH 키를 쓰면 토큰 대신 키로 인증합니다.

### 1단계: SSH 키 생성 (이미 있으면 생략)

```powershell
ssh-keygen -t ed25519 -C "yw342@users.noreply.github.com" -f "$env:USERPROFILE\.ssh\id_ed25519_github"
```

엔터로 비밀번호 없이 생성해도 됩니다.

### 2단계: 공개 키를 GitHub에 등록

1. 공개 키 내용 복사:
   ```powershell
   Get-Content "$env:USERPROFILE\.ssh\id_ed25519_github.pub"
   ```
2. GitHub → **Settings** → **SSH and GPG keys** → **New SSH key**
3. 제목 입력 후 복사한 내용 붙여넣기 → **Add SSH key**

### 3단계: 원격을 SSH로 변경 후 푸시

```powershell
cd c:\Users\SD2-18\Downloads\260311
git remote set-url origin git@github.com:yw342/260311.git
git push -u origin main
```

한 번 성공하면 이후에는 `git push`만 해도 자동으로 푸시됩니다.

---

## 정리

| 방법 | 장점 | 한 번 해둘 것 |
|------|------|----------------|
| **Personal Access Token (HTTPS)** | 설정 간단, Windows에서 자동 저장 | 토큰 생성 → 한 번 `git push` 시 토큰 입력 |
| **SSH** | 토큰 노출 없음, 한 번 설정 후 편함 | SSH 키 생성 + GitHub에 공개 키 등록 |

둘 다 한 번만 설정해 두면, 이후에는 **`git add .` → `git commit -m "메시지"` → `git push`** 만으로 자동 푸시할 수 있습니다.
