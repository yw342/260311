import { useState, useCallback, useEffect, useRef } from 'react'
import './App.css'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function makeDeck() {
  const deck = []
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s, rank: r })
    }
  }
  return deck
}

function cardValue(card) {
  if (card.rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(card.rank)) return 10
  return parseInt(card.rank, 10)
}

function handTotal(hand) {
  let total = hand.reduce((sum, c) => sum + cardValue(c), 0)
  let aces = hand.filter((c) => c.rank === 'A').length
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const INITIAL_CHIPS = 100
const BET_OPTIONS = [10, 25, 50, 100]

const JS_DOS_CDN = 'https://cdn.jsdelivr.net/npm/js-dos@7.4.7/dist'
const DOOM_BUNDLE_URL = 'https://cdn.dos.zone/custom/dos/doom.jsdos'

function DoomOverlay({ onClose }) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function runDoom() {
      try {
        if (typeof window.emulators !== 'undefined') {
          window.emulators.pathPrefix = JS_DOS_CDN + '/'
        }
        if (typeof window.Dos !== 'undefined' && container) {
          window.Dos(container, {
            withNetworkingApi: false,
            withExperimentalApi: true,
          }).run(DOOM_BUNDLE_URL)
          setStatus('running')
        }
      } catch (e) {
        setError(e?.message || '실행 실패')
        setStatus('error')
      }
    }

    if (window.Dos) {
      runDoom()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${JS_DOS_CDN}/js-dos.css`
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = `${JS_DOS_CDN}/js-dos.js`
    script.async = true
    script.onload = () => {
      if (containerRef.current) runDoom()
    }
    script.onerror = () => {
      setError('js-dos 로드 실패')
      setStatus('error')
    }
    document.body.appendChild(script)
  }, [])

  return (
    <div className="doom-overlay" role="dialog" aria-modal="true" aria-label="DOOM">
      <div className="doom-header">
        <span className="doom-title">🎮 DOOM (고전)</span>
        <button type="button" className="doom-close" onClick={onClose} aria-label="DOOM 닫기">
          ×
        </button>
      </div>
      <div className="doom-frame-wrap">
        <div ref={containerRef} id="doom-jsdos" className="doom-jsdos-container" />
        {status === 'loading' && (
          <p className="doom-status">DOOM 불러오는 중…</p>
        )}
        {status === 'error' && error && (
          <p className="doom-error">{error}</p>
        )}
      </div>
    </div>
  )
}

function MiniBlackjack({ onClose }) {
  const [chips, setChips] = useState(INITIAL_CHIPS)
  const [currentBet, setCurrentBet] = useState(0)
  const [deck, setDeck] = useState([])
  const [player, setPlayer] = useState([])
  const [dealer, setDealer] = useState([])
  const [dealerHidden, setDealerHidden] = useState(true)
  const [result, setResult] = useState(null)
  const [phase, setPhase] = useState('bet')

  const draw = useCallback((fromDeck, count = 1) => {
    const d = [...fromDeck]
    const drawn = d.splice(0, count)
    return { deck: d, drawn }
  }, [])

  const startNewRound = useCallback(() => {
    setCurrentBet(0)
    setResult(null)
    setPlayer([])
    setDealer([])
    setDeck([])
    setDealerHidden(true)
    setPhase('bet')
  }, [])

  const startGame = useCallback(() => {
    if (phase !== 'bet' || currentBet <= 0 || currentBet > chips) return
    setChips((c) => c - currentBet)
    const d = shuffle(makeDeck())
    const { deck: d1, drawn: p1 } = draw(d, 2)
    const { deck: d2, drawn: d0 } = draw(d1, 2)
    setDeck(d2)
    setPlayer(p1)
    setDealer(d0)
    setDealerHidden(true)
    setResult(null)
    setPhase('play')
  }, [phase, currentBet, chips, draw])

  const handleHit = useCallback(() => {
    if (phase !== 'play' || handTotal(player) >= 21) return
    const { deck: newDeck, drawn } = draw(deck, 1)
    setDeck(newDeck)
    setPlayer((p) => [...p, ...drawn])
  }, [deck, player, phase, draw])

  const handleStand = useCallback(() => {
    if (phase !== 'play') return
    setDealerHidden(false)
    setPhase('dealer')
  }, [phase])

  useEffect(() => {
    if (phase !== 'dealer') return
    const playerTot = handTotal(player)
    if (playerTot > 21) {
      setResult('lose')
      setPhase('done')
      return
    }
    let dealerHand = [...dealer]
    let currentDeck = [...deck]
    while (handTotal(dealerHand) < 17) {
      const { deck: nextDeck, drawn } = draw(currentDeck, 1)
      currentDeck = nextDeck
      dealerHand = [...dealerHand, ...drawn]
    }
    setDeck(currentDeck)
    setDealer(dealerHand)
    const dealerTot = handTotal(dealerHand)
    if (dealerTot > 21) setResult('win')
    else if (dealerTot > playerTot) setResult('lose')
    else if (dealerTot < playerTot) setResult('win')
    else setResult('push')
    setPhase('done')
  }, [phase, dealer, deck, player, draw])

  useEffect(() => {
    if (phase !== 'done') return
    if (result === 'win') setChips((c) => c + currentBet * 2)
    else if (result === 'push') setChips((c) => c + currentBet)
  }, [phase, result, currentBet])

  useEffect(() => {
    if (phase === 'play' && handTotal(player) > 21) {
      setDealerHidden(false)
      setResult('lose')
      setPhase('done')
    }
  }, [phase, player])

  const playerTot = handTotal(player)
  const dealerTot = handTotal(dealer)
  const isGameOver = phase === 'done' && chips <= 0

  return (
    <div className="blackjack-overlay" role="dialog" aria-modal="true" aria-label="미니 블랙잭">
      <div className="blackjack-modal">
        <div className="blackjack-header">
          <h2>🃏 미니 블랙잭</h2>
          <div className="blackjack-chips">
            <span className="blackjack-chips-label">칩</span>
            <span className="blackjack-chips-value">{chips}</span>
          </div>
          <button type="button" className="blackjack-close" onClick={onClose} aria-label="게임 닫기">
            ×
          </button>
        </div>
        <div className="blackjack-body">
          {phase === 'bet' && (
            <div className="blackjack-bet">
              <p className="blackjack-bet-label">배팅할 칩을 선택하세요</p>
              <div className="blackjack-bet-options">
                {BET_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`blackjack-bet-btn ${currentBet === amount ? 'selected' : ''}`}
                    onClick={() => setCurrentBet(amount)}
                    disabled={amount > chips}
                  >
                    {amount}
                  </button>
                ))}
                <button
                  type="button"
                  className={`blackjack-bet-btn ${currentBet === chips ? 'selected' : ''}`}
                  onClick={() => setCurrentBet(chips)}
                  disabled={chips <= 0}
                >
                  전부
                </button>
              </div>
              <p className="blackjack-bet-current">배팅: {currentBet} 칩</p>
            </div>
          )}

          {(phase === 'play' || phase === 'dealer' || phase === 'done') && (
            <>
              <div className="blackjack-hand">
                <span className="blackjack-label">딜러 ({dealerHidden ? '?' : dealerTot})</span>
                <div className="blackjack-cards">
                  {dealer.map((c, i) => (
                    <span key={i} className="blackjack-card">
                      {i === 1 && dealerHidden ? '?' : `${c.rank}${c.suit}`}
                    </span>
                  ))}
                </div>
              </div>
              <div className="blackjack-hand">
                <span className="blackjack-label">나 ({playerTot}) · 배팅 {currentBet}</span>
                <div className="blackjack-cards">
                  {player.map((c, i) => (
                    <span key={i} className="blackjack-card">{c.rank}{c.suit}</span>
                  ))}
                </div>
              </div>
              {result && (
                <p className={`blackjack-result ${result}`}>
                  {result === 'win' && `승리! +${currentBet} 칩`}
                  {result === 'lose' && '패배'}
                  {result === 'push' && '무승부 (배팅 반환)'}
                </p>
              )}
            </>
          )}

          {isGameOver && (
            <p className="blackjack-gameover">칩이 없습니다</p>
          )}
        </div>
        <div className="blackjack-actions">
          {phase === 'bet' && (
            <button
              type="button"
              className="btn-blackjack btn-start"
              onClick={startGame}
              disabled={currentBet <= 0 || currentBet > chips || chips <= 0}
            >
              게임 시작
            </button>
          )}
          {phase === 'play' && (
            <>
              <button type="button" className="btn-blackjack btn-hit" onClick={handleHit} disabled={playerTot >= 21}>
                Hit
              </button>
              <button type="button" className="btn-blackjack btn-stand" onClick={handleStand}>
                Stand
              </button>
            </>
          )}
          {phase === 'done' && !isGameOver && (
            <button type="button" className="btn-blackjack btn-next" onClick={startNewRound}>
              다음 게임
            </button>
          )}
          {phase === 'done' && isGameOver && (
            <>
              <button type="button" className="btn-blackjack btn-restart" onClick={() => { setChips(INITIAL_CHIPS); startNewRound(); }}>
                다시 시작 (칩 100)
              </button>
              <button type="button" className="btn-blackjack btn-close" onClick={onClose}>
                게임 닫기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const MIN = 1
const MAX = 45
const COUNT = 6
const HISTORY_MAX = 20

function getRange(num) {
  if (num <= 10) return 1
  if (num <= 20) return 2
  if (num <= 30) return 3
  if (num <= 40) return 4
  return 5
}

function pickNumbers() {
  const set = new Set()
  while (set.size < COUNT) {
    set.add(MIN + Math.floor(Math.random() * (MAX - MIN + 1)))
  }
  return Array.from(set).sort((a, b) => a - b)
}

function pickBonus(excludeNumbers) {
  const excluded = new Set(excludeNumbers)
  const available = []
  for (let n = MIN; n <= MAX; n++) {
    if (!excluded.has(n)) available.push(n)
  }
  return available[Math.floor(Math.random() * available.length)]
}

function pickOneExcluding(excludeSet) {
  const available = []
  for (let n = MIN; n <= MAX; n++) {
    if (!excludeSet.has(n)) available.push(n)
  }
  return available[Math.floor(Math.random() * available.length)]
}

function Ball({ num, isBonus = false, animationDelay, onClick }) {
  const range = getRange(num)
  return (
    <div
      className={`ball show clickable ${isBonus ? 'bonus' : ''}`}
      data-range={range}
      title={isBonus ? '클릭하면 보너스 번호만 다시 뽑기' : '클릭하면 이 번호만 다시 뽑기'}
      style={{ animationDelay }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {num}
    </div>
  )
}

function getInitialState() {
  const numbers = pickNumbers()
  return { numbers, bonus: pickBonus(numbers) }
}

// 2026년 로또 1등 당첨번호 (인터넷 검색 자료 기준)
const LOTTO_2026_WINNERS = [
  { round: 1214, date: '2026.03.07', numbers: [10, 15, 19, 27, 30, 33], bonus: 14 },
  { round: 1213, date: '2026.02.28', numbers: [5, 11, 25, 27, 36, 38], bonus: 2 },
  { round: 1212, date: '2026.02.21', numbers: [5, 8, 25, 31, 41, 44], bonus: 45 },
]

function BallStatic({ num, isBonus = false }) {
  const range = getRange(num)
  return (
    <div
      className={`ball ball-static ${isBonus ? 'bonus' : ''}`}
      data-range={range}
    >
      {num}
    </div>
  )
}

function App() {
  const [{ numbers, bonus }, setState] = useState(getInitialState)
  const [history, setHistory] = useState([])
  const [bonusClickCount, setBonusClickCount] = useState(0)
  const [firstBallClickCount, setFirstBallClickCount] = useState(0)
  const [showBlackjack, setShowBlackjack] = useState(false)
  const [showDoom, setShowDoom] = useState(false)

  const regenerateAll = useCallback(() => {
    setBonusClickCount(0)
    setFirstBallClickCount(0)
    const newNumbers = pickNumbers()
    const newBonus = pickBonus(newNumbers)
    setState({ numbers: newNumbers, bonus: newBonus })
    setHistory((h) => [{ numbers: newNumbers, bonus: newBonus }, ...h].slice(0, HISTORY_MAX))
  }, [])

  const replaceNumber = useCallback((index) => {
    setBonusClickCount(0)
    if (index !== 0) {
      setFirstBallClickCount(0)
    } else {
      const next = firstBallClickCount + 1
      setFirstBallClickCount(next)
      if (next >= 3) {
        setFirstBallClickCount(0)
        setShowDoom(true)
      }
    }
    setState((prev) => {
      const current = prev.numbers[index]
      const others = new Set(prev.numbers.filter((_, j) => j !== index))
      others.add(current)
      const newNum = pickOneExcluding(others)
      const next = [...prev.numbers]
      next[index] = newNum
      next.sort((a, b) => a - b)
      setHistory((h) => [{ numbers: next, bonus: prev.bonus }, ...h].slice(0, HISTORY_MAX))
      return { ...prev, numbers: next }
    })
  }, [firstBallClickCount])

  const replaceBonus = useCallback(() => {
    const nextCount = bonusClickCount + 1
    setBonusClickCount(nextCount)
    if (nextCount >= 3) {
      setBonusClickCount(0)
      setShowBlackjack(true)
    }
    setState((prev) => {
      const newBonus = pickBonus(prev.numbers)
      setHistory((h) => [{ numbers: prev.numbers, bonus: newBonus }, ...h].slice(0, HISTORY_MAX))
      return { ...prev, bonus: newBonus }
    })
  }, [bonusClickCount])

  const shareText = `${numbers.join(', ')} + 보너스 ${bonus}\n로또 번호 추천`

  const shareCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      alert('클립보드에 복사되었습니다.')
    } catch {
      alert('복사에 실패했습니다.')
    }
  }, [shareText])

  const shareTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420')
  }, [shareText])

  const shareFacebook = useCallback(() => {
    const pageUrl = encodeURIComponent(window.location.href)
    const url = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}&quote=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420')
  }, [shareText])

  const shareKakao = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '로또 번호 추천',
          text: shareText,
          url: window.location.href,
        })
      } catch (err) {
        if (err.name !== 'AbortError') shareCopy()
      }
    } else {
      shareCopy()
    }
  }, [shareText, shareCopy])

  return (
    <main>
      <h1>로또 번호 추천</h1>
      <p className="subtitle">1~45 중 무작위 6개 + 보너스 번호</p>

      <div className="card">
        <div className="balls-row" aria-live="polite">
          {numbers.map((num, i) => (
            <Ball
              key={`${i}-${num}`}
              num={num}
              animationDelay={`${i * 0.06}s`}
              onClick={() => replaceNumber(i)}
            />
          ))}
        </div>
        <div className="bonus-section" aria-live="polite">
          <span className="bonus-label">보너스</span>
          <Ball
            num={bonus}
            isBonus
            animationDelay="0.36s"
            onClick={replaceBonus}
          />
        </div>
        <button type="button" className="btn-generate" onClick={regenerateAll}>
          번호 뽑기
        </button>

        <div className="share-section">
          <span className="share-label">공유하기</span>
          <div className="share-buttons">
            <button
              type="button"
              className="share-btn share-twitter"
              onClick={shareTwitter}
              title="X(트위터)로 공유"
              aria-label="X(트위터)로 공유"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            <button
              type="button"
              className="share-btn share-facebook"
              onClick={shareFacebook}
              title="페이스북으로 공유"
              aria-label="페이스북으로 공유"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button
              type="button"
              className="share-btn share-kakao"
              onClick={shareKakao}
              title="카카오톡 / 공유"
              aria-label="카카오톡 또는 공유"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
              </svg>
            </button>
            <button
              type="button"
              className="share-btn share-copy"
              onClick={shareCopy}
              title="번호 복사"
              aria-label="번호 복사"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showBlackjack && (
        <MiniBlackjack onClose={() => setShowBlackjack(false)} />
      )}

      {showDoom && (
        <DoomOverlay onClose={() => setShowDoom(false)} />
      )}

      <p className="hint">
        버튼을 누를 때마다 새로운 번호가 추천됩니다. 공을 클릭하면 해당 번호만 바꿀 수 있습니다. 참고용으로만 사용하세요.
      </p>

      {history.length > 0 && (
        <section className="history-section" aria-label="번호 추천 이력">
          <h2 className="history-title">번호 추천 이력</h2>
          <p className="history-desc">번호 뽑기·공 클릭으로 바뀐 번호 포함 (최신순, 최대 {HISTORY_MAX}개)</p>
          <ul className="history-list">
            {history.map((item, idx) => (
              <li key={idx} className="history-item">
                <span className="history-index">{idx + 1}</span>
                <div className="history-balls">
                  {item.numbers.map((num) => (
                    <BallStatic key={`${idx}-${num}`} num={num} />
                  ))}
                  <span className="history-plus">+</span>
                  <BallStatic num={item.bonus} isBonus />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="winners-section" aria-label="2026년 로또 1등 당첨번호">
        <h2 className="winners-title">2026년 로또 1등 당첨번호</h2>
        <p className="winners-desc">회차별 당첨번호 (참고용)</p>
        <ul className="winners-list">
          {LOTTO_2026_WINNERS.map(({ round, date, numbers, bonus }) => (
            <li key={round} className="winners-item">
              <div className="winners-meta">
                <span className="winners-round">{round}회</span>
                <span className="winners-date">{date}</span>
              </div>
              <div className="winners-balls">
                {numbers.map((num) => (
                  <BallStatic key={`${round}-${num}`} num={num} />
                ))}
                <span className="winners-plus">+</span>
                <BallStatic num={bonus} isBonus />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
