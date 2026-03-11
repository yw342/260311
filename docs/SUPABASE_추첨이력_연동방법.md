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

## 5. Supabase 클라이언트 초기화

**`src/lib/supabase.js`** (또는 `supabase.ts`) 생성:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env not set. Lotto history will not be saved.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
```

- env가 없으면 `supabase`가 `null`이 되도록 해서, 로컬에서 Supabase 없이도 앱이 동작하게 할 수 있습니다.

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
