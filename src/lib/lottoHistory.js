import { supabase } from './supabase'

const TABLE = 'lotto_history'

/**
 * 추첨 이력을 Supabase에 저장 (번호 뽑기·공 클릭 시 호출)
 * @param {number[]} numbers - 본 번호 6개
 * @param {number} bonus - 보너스 번호
 */
export async function saveLottoHistory(numbers, bonus) {
  if (!supabase) return
  try {
    const { error } = await supabase.from(TABLE).insert({
      numbers,
      bonus,
    })
    if (error) throw error
  } catch (e) {
    console.error('Failed to save lotto history:', e)
  }
}

/**
 * Supabase에서 최근 추첨 이력 조회 (최신순)
 * @param {number} limit - 최대 개수
 * @returns {Promise<Array<{ id: string, numbers: number[], bonus: number, created_at: string }>>}
 */
export async function fetchLottoHistory(limit = 20) {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, numbers, bonus, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  } catch (e) {
    console.error('Failed to fetch lotto history:', e)
    return []
  }
}
