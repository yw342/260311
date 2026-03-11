# Supabase에 추첨 이력 저장하기

> **Supabase**: 오픈소스 Firebase 대안. PostgreSQL 기반 DB, 실시간 구독, 인증 등을 제공합니다.

---

## 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 접속 후 로그인
2. **New Project** → 조직 선택 → 프로젝트 이름·비밀번호 입력 → **Create**
3. 프로젝트가 준비되면 **Settings** → **API** 에서 다음 값을 확인:
   - **Project URL** (예: `https://xxxxx.supabase.co`)
   - **anon public** 키 (프론트에서 사용하는 공개 키)

---

## 2. 테이블 생성

**SQL Editor**에서 아래 SQL 실행:

```sql
-- 추첨 이력 테이블
create table public.lotto_history (
  id uuid default gen_random_uuid() primary key,
  numbers smallint[] not null,        -- 본 번호 6개 [1,2,3,4,5,6]
  bonus smallint not null,             -- 보너스 번호
  created_at timestamptz default now()
);

-- 인덱스 (이력 조회용)
create index lotto_history_created_at_idx on public.lotto_history (created_at desc);

-- RLS 활성화 (선택: 보안용)
alter table public.lotto_history enable row level security;

-- 모든 사용자가 insert 가능, select도 허용 (공개 이력일 때)
create policy "Allow anonymous insert" on public.lotto_history
  for insert with check (true);
create policy "Allow anonymous select" on public.lotto_history
  for select using (true);
```

- `numbers`: 본 번호 6개 배열
- `bonus`: 보너스 번호
- `created_at`: 저장 시각 (자동)

RLS를 쓰지 않으면 위 `enable row level security`와 `create policy` 부분은 생략해도 됩니다.

---

## 3. 프로젝트에 패키지 설치

```bash
cd c:\Users\SD2-18\Downloads\260311
npm install @supabase/supabase-js
```

---

## 4. 환경 변수 설정

Vite는 `VITE_` 로 시작하는 변수만 클라이언트에 노출됩니다.

### 로컬 개발: `.env` 파일

**프로젝트 루트에 `.env` 파일 생성** (이 파일은 Git에 올리지 마세요):

```env
VITE_SUPABASE_URL=https://여기프로젝트ID.supabase.co
VITE_SUPABASE_ANON_KEY=여기에_anon_public_키_붙여넣기
```

- `.env` 는 이미 `.gitignore`에 있으면 제외됨. 없으면 추가: `echo .env >> .gitignore`

#### `.env` 만드는 방법 (자세히)

1. **프로젝트 루트**  
   - 이 프로젝트의 “루트”는 `package.json`, `vite.config.js`가 있는 폴더입니다.  
   - 예: `c:\Users\SD2-18\Downloads\260311` (그 안에 `src`, `index.html` 등이 같이 있음).

2. **`.env` 파일 만들기**  
   - **방법 A**: `.env.example`을 복사해서 이름만 `.env`로 바꾼 뒤, 아래 3단계에서 값만 채웁니다.  
   - **방법 B**: 루트 폴더에 새 파일을 만들고 이름을 **정확히** `.env`로 저장합니다.  
     - Windows 탐색기에서는 “이름이 .으로 시작하는 파일”이 안 보일 수 있음. Cursor/VS Code 왼쪽 파일 목록에서 루트 우클릭 → **New File** → 이름에 `.env` 입력 후 저장.

3. **Supabase에서 값 복사하기**  
   - [supabase.com](https://supabase.com) 로그인 → 사용하는 프로젝트 클릭.  
   - 왼쪽 아래 **Settings**(톱니바퀴) → **API** 메뉴로 이동.  
   - **Project URL**  
     - “Project URL” 항목에 있는 `https://xxxxx.supabase.co` 형태 주소를 **전부** 복사합니다.  
     - `.env`의 `VITE_SUPABASE_URL=` 뒤에 붙여넣습니다. (따옴표 없이, 공백 없이.)  
   - **Project API keys**  
     - “anon” **public** 키 한 줄 전체를 복사합니다.  
     - `.env`의 `VITE_SUPABASE_ANON_KEY=` 뒤에 붙여넣습니다. (따옴표 없이, 공백 없이.)  
   - `service_role` 키는 사용하지 마세요. (비밀 키라서 브라우저/프론트에 넣으면 안 됩니다.)

4. **저장 후 확인**  
   - `.env` 파일 내용이 아래처럼 두 줄이면 됩니다 (실제 값은 각자 프로젝트에 맞게).  
     - `VITE_SUPABASE_URL=https://abcdefgh.supabase.co`  
     - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`  
   - 등호 앞뒤에 공백 넣지 말 것. 값에 따옴표 넣지 말 것.  
   - 수정 후 `npm run dev`를 다시 실행하면 앱이 새 환경 변수를 읽습니다.

### Vercel 배포: 대시보드 환경 변수

프로젝트를 Vercel로 배포한 경우, 빌드 시 같은 변수를 주입하려면 Vercel 대시보드에서 설정합니다.

1. [vercel.com](https://vercel.com) 로그인 → 해당 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 아래 두 개 추가 (Production / Preview / Development 원하는 환경에 체크):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Supabase Project URL (예: `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public 키 |

4. **Save** 후 **Redeploy** (Deployments → 최신 배포 옆 ⋮ → Redeploy)

- 변수 이름을 **정확히** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 로 해야 Vite가 클라이언트 번들에 넣습니다.
- 값을 수정한 뒤에는 반드시 **다시 배포**해야 적용됩니다.

---

## Vercel로 환경 변수 관리하기

Vercel에서는 **프로젝트 단위**로 환경 변수를 관리합니다. 코드나 `.env`에 비밀 값을 넣지 않고, 대시보드에서만 설정합니다.

### 1. 환경 변수 화면 들어가기

1. [vercel.com](https://vercel.com) 로그인
2. **Dashboard**에서 해당 **프로젝트** 클릭
3. 상단 탭 **Settings** 클릭
4. 왼쪽 메뉴에서 **Environment Variables** 클릭

### 2. 변수 추가하기

- **Key**: 변수 이름 (예: `VITE_SUPABASE_URL`). 대소문자·밑줄까지 정확히 입력.
- **Value**: 값 (예: `https://xxxxx.supabase.co`). 비밀 키는 한 번 저장하면 Value는 다시 보이지 않으므로 복사해 둘 것.
- **Environment**: 이 변수를 어디에 쓸지 선택
  - **Production**: 프로덕션 도메인(보통 `프로젝트명.vercel.app`) 배포 시
  - **Preview**: PR·브랜치별 미리보기 배포 시
  - **Development**: `vercel dev` 로컬 실행 시 (선택 사항)
- **Add** 또는 **Save** 클릭

여러 환경에 쓰려면 같은 Key로 Production / Preview / Development를 각각 체크해 저장하거나, 한 번에 여러 환경을 선택해 추가하면 됩니다.

### 3. 변수 수정·삭제하기

- **수정**: 해당 행 오른쪽 **⋮** (또는 연필 아이콘) → **Edit** → Value 변경 후 Save.  
  (Value는 보안상 다시 보이지 않을 수 있음. 그럴 땐 새 값으로 덮어쓰기.)
- **삭제**: **⋮** → **Delete** 후 확인.

### 4. 적용 시점 (꼭 할 것)

- Vite는 **빌드할 때** `VITE_` 로 시작하는 변수를 코드에 박아 넣습니다.
- 따라서 **환경 변수를 추가하거나 수정한 뒤에는 반드시 다시 배포**해야 합니다.
  - **Deployments** 탭 → 최신 배포 오른쪽 **⋮** → **Redeploy**  
  - 또는 **Git에 푸시**하면 자동으로 새 배포가 되고, 그때 최신 환경 변수가 사용됩니다.

변수만 바꾸고 Redeploy를 하지 않으면, 이미 빌드된 이전 번들 때문에 새 값이 반영되지 않습니다.

### 5. 이 프로젝트에서 쓸 변수 정리

| Key | 설명 | 예시 값 |
|-----|------|--------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | `https://abcdefgh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public 키 | `eyJhbGciOiJIUzI1NiIs...` |

- 이름이 `VITE_` 로 시작해야 브라우저에서 `import.meta.env.VITE_...` 로 사용할 수 있습니다.
- `service_role` 같은 비밀 키는 절대 Vercel 환경 변수에 넣지 마세요 (클라이언트에 노출됩니다).

---

## 5. Supabase 클라이언트 초기화 (`src/lib/supabase.js`)

이 단계에서는 **Supabase와 통신할 클라이언트**를 한 곳에서 만들고, 다른 파일에서 `import`해서 쓰도록 합니다.

### 5-1. 파일 위치

- **경로**: 프로젝트 루트 기준 **`src/lib/supabase.js`**
- `src` 안에 `lib` 폴더가 없으면 먼저 만든 뒤, 그 안에 `supabase.js` 파일을 생성합니다.
- Cursor/VS Code: 왼쪽에서 `src` 우클릭 → **New Folder** → `lib` 입력 → `lib` 우클릭 → **New File** → `supabase.js` 입력.

### 5-2. 전체 코드

`src/lib/supabase.js` 파일을 열고 아래 내용을 **그대로** 넣습니다.

```javascript
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('Supabase env not set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Lotto history will not be saved to cloud.')
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null
```

### 5-3. 코드가 하는 일 (줄별 설명)

| 줄 | 내용 | 설명 |
|----|------|------|
| 1 | `import { createClient } from ...` | Supabase 공식 라이브러리에서 브라우저용 클라이언트를 만드는 함수를 가져옵니다. (`npm install @supabase/supabase-js` 로 이미 설치된 패키지) |
| 3–4 | `import.meta.env.VITE_...` | Vite가 **빌드 시** `.env` 또는 Vercel 환경 변수에서 `VITE_` 로 시작하는 값만 읽어서 여기 넣습니다. 다른 이름의 변수는 브라우저에 노출되지 않습니다. |
| 6–8 | `if (!url \|\| !anonKey) { console.warn(...) }` | URL이나 anon 키가 비어 있으면(환경 변수 미설정) 콘솔에 한 번만 경고를 띄웁니다. 앱은 그대로 동작하고, 저장만 하지 않게 됩니다. |
| 10 | `export const supabase = ... ? createClient(...) : null` | URL과 키가 **둘 다 있을 때만** `createClient(url, anonKey)`로 실제 클라이언트를 만들고, 하나라도 없으면 `null`을 내보냅니다. 다른 파일에서는 `if (!supabase) return` 처럼 막아 주면 됩니다. |

### 5-4. 왜 이렇게 하나요?

- **한 파일에서만 클라이언트 생성**: 여러 곳에서 각자 `createClient`를 부르지 않고, `src/lib/supabase.js`에서 한 번만 만들고 `export`해서 재사용합니다. 나중에 URL·키를 바꿀 때도 이 파일만 보면 됩니다.
- **env 없을 때 `null`**: `.env`를 안 만들었거나 Vercel에 변수를 안 넣은 상태에서도 앱이 뜨고, “추첨 이력만 저장 안 됨”으로 두려면 `supabase`가 `null`이어야 합니다. 그래서 `createClient` 대신 `null`을 넣는 것입니다.
- **`VITE_` 접두사**: Vite는 보안상 `VITE_` 로 시작하는 변수만 프론트 코드(`import.meta.env`)에 노출합니다. Supabase URL·anon 키는 공개용이라 `VITE_` 로 두고, 비밀 키(예: `service_role`)는 절대 여기 넣지 마세요.

### 5-5. 확인 방법

1. **저장** 후 개발 서버를 띄웁니다: 터미널에서 `npm run dev`
2. 브라우저에서 앱을 연 뒤 **F12** → **Console** 탭을 엽니다.
   - **환경 변수를 넣지 않은 경우**: `Supabase env not set (...). Lotto history will not be saved to cloud.` 같은 경고가 한 번 보이면 정상입니다.
   - **`.env` 또는 Vercel에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣은 경우**: 그 경고가 없고, 번호 뽑기·공 클릭 시 Supabase Table Editor에 행이 쌓이면 클라이언트가 정상 동작하는 것입니다.
3. 다른 파일에서 사용할 때는 `import { supabase } from './lib/supabase'` 또는 `from '@/lib/supabase'` 처럼 불러온 뒤, `supabase.from('lotto_history').insert(...)` 등으로 사용합니다. (이 프로젝트에서는 `src/lib/lottoHistory.js`에서 이미 이렇게 사용 중입니다.)

이 단계까지 완료하면 “`src/lib/supabase.js`로 클라이언트 생성”은 끝난 것입니다.

---

## 6. 추첨 이력 저장 (insert)

이력을 추가하는 곳(번호 뽑기·개별 공 클릭)에서 Supabase에 insert 합니다.

**예: 공용 함수 `src/lib/lottoHistory.js`**

```javascript
import { supabase } from './supabase'

const TABLE = 'lotto_history'

export async function saveLottoHistory(numbers, bonus) {
  if (!supabase) return
  try {
    const { error } = await supabase
      .from(TABLE)
      .insert({
        numbers: numbers,  // [1,2,3,4,5,6]
        bonus: bonus,
      })
    if (error) throw error
  } catch (e) {
    console.error('Failed to save lotto history:', e)
  }
}
```

**App.jsx에서 사용**

- `regenerateAll` 안에서 `setState` 후: `saveLottoHistory(newNumbers, newBonus)`
- `replaceNumber`의 `setState` 콜백 안에서 `next`, `prev.bonus` 계산 후: `saveLottoHistory(next, prev.bonus)`
- `replaceBonus`의 `setState` 콜백 안에서: `saveLottoHistory(prev.numbers, newBonus)`

`saveLottoHistory`는 **비동기**이므로 `await`를 쓰거나 `.then()`으로 호출하고, 실패 시 위처럼 `console.error`만 해도 됩니다. (필요하면 사용자에게 토스트 메시지 표시)

---

## 7. (선택) 이력 조회

Supabase에 쌓인 이력을 화면에 보여주려면:

```javascript
const { data, error } = await supabase
  .from('lotto_history')
  .select('id, numbers, bonus, created_at')
  .order('created_at', { ascending: false })
  .limit(20)
```

- `data`를 state에 넣어서 기존 “추천 이력” UI에 Supabase 이력을 섞어서 보여주거나, “저장된 이력” 탭을 따로 만들 수 있습니다.

---

## 8. 정리

| 단계 | 내용 |
|------|------|
| 1 | Supabase 프로젝트 생성, URL·anon key 확인 |
| 2 | `lotto_history` 테이블 SQL 실행 |
| 3 | `npm install @supabase/supabase-js` |
| 4 | `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정 |
| 5 | `src/lib/supabase.js`로 클라이언트 생성 |
| 6 | 이력 추가 시점마다 `saveLottoHistory(numbers, bonus)` 호출 |

이렇게 하면 번호 뽑기·개별 공 클릭으로 바뀐 추첨 이력을 Supabase에 저장할 수 있습니다.  
원하면 다음 단계로 `App.jsx`에 `saveLottoHistory` 호출을 넣는 위치까지 코드로 정리해 줄 수 있습니다.
