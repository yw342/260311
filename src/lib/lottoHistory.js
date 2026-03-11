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
