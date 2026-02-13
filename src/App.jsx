import { useRef, useEffect, useState } from 'react'
import './App.css'

const COUPANG_LINKS = [
  'https://link.coupang.com/a/dLO0Mx',
  'https://link.coupang.com/a/dLO1da',
  'https://link.coupang.com/a/dLO1ri',
  'https://link.coupang.com/a/dLO1U7',
  'https://link.coupang.com/a/dLO17w',
  'https://link.coupang.com/a/dLO2ka',
]

const CHASE_RADIUS = 80 // 반응 거리
const SPEED_PER_SECOND = 1300 // 초당 이동 픽셀 (더 멀리 도망)
const WALL_KICK = 100 // 벽/구석에 붙었을 때 한 번에 튕겨 나가는 거리 (데스크톱)
const WALL_KICK_MOBILE = 50 // 모바일에서는 덜 튕기도록

const getWallKick = () => {
  const w = window.visualViewport?.width ?? window.innerWidth
  return w <= 768 ? WALL_KICK_MOBILE : WALL_KICK
}

const getVisibleBounds = () => {
  const padding = 24
  const v = window.visualViewport
  const vw = v?.width ?? document.documentElement.clientWidth ?? window.innerWidth
  const vh = v?.height ?? document.documentElement.clientHeight ?? window.innerHeight
  const offsetX = v?.offsetLeft ?? 0
  const offsetY = v?.offsetTop ?? 0
  
  const minX = offsetX + padding
  const maxX = Math.max(minX + 50, offsetX + vw - padding)
  const minY = offsetY + padding
  const maxY = Math.max(minY + 50, offsetY + vh - padding)
  return { minX, maxX, minY, maxY }
}

function App() {
  const noButtonRef = useRef(null)
  const yesButtonRef = useRef(null)
  const buttonsRef = useRef(null)
  const pageRef = useRef(null)
  
  // 애니메이션 관련 Refs
  const requestRef = useRef(null)
  const previousTimeRef = useRef(null)
  
  const cursorRef = useRef({ x: 0, y: 0 })
  const posRef = useRef({ x: 0, y: 0 })
  const [hasRunAway, setHasRunAway] = useState(false)
  const [showLoading, setShowLoading] = useState(true)
  const absPosRef = useRef({ left: 0, top: 0 })
  const lastChaseEndRef = useRef(0)

  // 초기 로딩: 페이드인 → 3초 유지 → 페이드아웃 후 제거
  useEffect(() => {
    const t = setTimeout(() => setShowLoading(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const handleYesClick = () => {
    if (Date.now() - lastChaseEndRef.current < 400) return
    const randomIndex = Math.floor(Math.random() * COUPANG_LINKS.length)
    window.open(COUPANG_LINKS[randomIndex], '_blank', 'noopener,noreferrer')
  }

  // 애니메이션 프레임마다 실행될 함수 (부드러운 움직임 핵심)
  const animate = (time) => {
    if (previousTimeRef.current != undefined) {
      const deltaTime = time - previousTimeRef.current
      // 프레임 드랍이 있어도 속도 일정 유지 (초당 픽셀 이동)
      const moveDistance = SPEED_PER_SECOND * (deltaTime / 1000)
      moveAwayFromCursor(moveDistance)
    }
    previousTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }

  const moveAwayFromCursor = (stepSize) => {
    const btn = noButtonRef.current
    if (!btn) return

    const bounds = getVisibleBounds()
    const rect = btn.getBoundingClientRect()
    const bx = rect.left + rect.width / 2
    const by = rect.top + rect.height / 2
    const { x: cx, y: cy } = cursorRef.current

    const dx = cx - bx
    const dy = cy - by
    const dist = Math.sqrt(dx * dx + dy * dy) || 1

    // 도망가는 방향 (커서 반대쪽)
    let nx = -dx / dist
    let ny = -dy / dist

    // 벽에 붙었는지 (여유 있게 판정해서 진동 방지)
    const margin = 8
    const atLeft = rect.left <= bounds.minX + margin
    const atRight = rect.right >= bounds.maxX - margin
    const atTop = rect.top <= bounds.minY + margin
    const atBottom = rect.bottom >= bounds.maxY - margin

    // 벽 쪽으로 가는 성분 제거
    if (atLeft && nx < 0) nx = 0
    if (atRight && nx > 0) nx = 0
    if (atTop && ny < 0) ny = 0
    if (atBottom && ny > 0) ny = 0

    const slideLen = Math.sqrt(nx * nx + ny * ny)
    const SQ2 = 1 / Math.sqrt(2)

    // 벽/구석에 막혀서 움직일 수 없을 때만 한 번에 크게 튕겨냄
    let moveDistance = stepSize
    if (slideLen < 0.01) {
      if (atLeft && atTop) { nx = SQ2; ny = SQ2 }
      else if (atLeft && atBottom) { nx = SQ2; ny = -SQ2 }
      else if (atRight && atTop) { nx = -SQ2; ny = SQ2 }
      else if (atRight && atBottom) { nx = -SQ2; ny = -SQ2 }
      else if (atLeft) { nx = 1; ny = 0 }
      else if (atRight) { nx = -1; ny = 0 }
      else if (atTop) { nx = 0; ny = 1 }
      else if (atBottom) { nx = 0; ny = -1 }
      moveDistance = getWallKick()
    } else {
      nx /= slideLen
      ny /= slideLen
      // 벽에 붙어 있으면 (구석 아님) 이번 프레임만 크게 튕겨서 벽에서 멀어지게
      if (atLeft || atRight || atTop || atBottom) {
        moveDistance = getWallKick()
      }
    }

    posRef.current.x += nx * moveDistance
    posRef.current.y += ny * moveDistance

    btn.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`

    // 벽 안으로만 보정
    let newRect = btn.getBoundingClientRect()
    for (let i = 0; i < 3; i++) {
      let changed = false
      if (newRect.left < bounds.minX) {
        posRef.current.x += bounds.minX - newRect.left
        changed = true
      }
      if (newRect.right > bounds.maxX) {
        posRef.current.x -= newRect.right - bounds.maxX
        changed = true
      }
      if (newRect.top < bounds.minY) {
        posRef.current.y += bounds.minY - newRect.top
        changed = true
      }
      if (newRect.bottom > bounds.maxY) {
        posRef.current.y -= newRect.bottom - bounds.maxY
        changed = true
      }
      if (!changed) break
      btn.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
      newRect = btn.getBoundingClientRect()
    }
  }

  const isCursorNearButton = (clientX, clientY) => {
    const btn = noButtonRef.current
    if (!btn) return false
    const rect = btn.getBoundingClientRect()
    const bx = rect.left + rect.width / 2
    const by = rect.top + rect.height / 2
    const dist = Math.sqrt((clientX - bx) ** 2 + (clientY - by) ** 2)
    return dist < CHASE_RADIUS
  }

  const startChase = (e) => {
    if (requestRef.current) return // 이미 실행 중이면 무시
    
    // pointerenter 등으로 호출될 때 커서 위치가 아직 반영되지 않았을 수 있으므로 이벤트에서 갱신
    if (e?.clientX != null && e?.clientY != null) {
      cursorRef.current = { x: e.clientX, y: e.clientY }
    }
    
    const btn = noButtonRef.current
    const container = buttonsRef.current
    
    if (btn && container && !hasRunAway) {
      const btnRect = btn.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      // 1. 현재 위치를 '출발점'으로 잡습니다.
      const initialLeft = btnRect.left - containerRect.left
      const initialTop = btnRect.top - containerRect.top
      
      absPosRef.current = { left: initialLeft, top: initialTop }

      // 2. [핵심 수정] 시작하자마자 즉시 일정 거리만큼 튕겨내야 겹치지 않습니다.
      // Yes버튼이 커지면서 자리를 차지하기 때문에, No버튼은 이미 도망가 있어야 합니다.
      const bx = btnRect.left + btnRect.width / 2
      const by = btnRect.top + btnRect.height / 2
      const { x: cx, y: cy } = cursorRef.current

      const dx = cx - bx
      const dy = cy - by
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      // 도망갈 방향 계산
      const nx = -dx / dist
      const ny = -dy / dist

      // 시작 시 즉시 멀리 튕겨나감 (Initial Kick)
      const INITIAL_KICK = 60
      posRef.current.x = nx * INITIAL_KICK
      posRef.current.y = ny * INITIAL_KICK
      // 첫 프레임에는 animate에서 moveAwayFromCursor가 호출되지 않으므로, 여기서 바로 transform 적용
      btn.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
    }
    
    setHasRunAway(true)
    
    // 애니메이션 시작
    previousTimeRef.current = undefined
    requestRef.current = requestAnimationFrame(animate)
  }
  const stopChase = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = null
      previousTimeRef.current = null
    }
  }

  const handlePointerMove = (e) => {
    cursorRef.current = { x: e.clientX, y: e.clientY }
    if (isCursorNearButton(e.clientX, e.clientY)) {
      startChase()
    } else {
      stopChase()
    }
  }

  const handleNoButtonPointerDown = (e) => {
    e.preventDefault()
    cursorRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    startChase()
  }

  const handleNoButtonPointerMove = (e) => {
    cursorRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleNoButtonPointerUp = (e) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    lastChaseEndRef.current = Date.now()
    stopChase()
  }

  const handleNoButtonClick = () => {
    window.close()
  }

  const clampButtonToViewport = () => {
    const btn = noButtonRef.current
    if (!btn || !hasRunAway) return
    const bounds = getVisibleBounds()
    const rect = btn.getBoundingClientRect()
    let dx = 0
    let dy = 0
    if (rect.left < bounds.minX) dx = bounds.minX - rect.left
    else if (rect.right > bounds.maxX) dx = bounds.maxX - rect.right
    if (rect.top < bounds.minY) dy = bounds.minY - rect.top
    else if (rect.bottom > bounds.maxY) dy = bounds.maxY - rect.bottom
    if (dx || dy) {
      posRef.current.x += dx
      posRef.current.y += dy
      btn.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
    }
  }

  useEffect(() => {
    const handleResize = () => clampButtonToViewport()
    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('scroll', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('scroll', handleResize)
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [hasRunAway])

  return (
    <>
      {showLoading && (
        <div className="loading-screen" aria-hidden="true">
          <span className="loading-screen__emoji">💌</span>
        </div>
      )}
      <div
        ref={pageRef}
        className={`valentine-page ${!showLoading ? 'valentine-page--visible' : ''}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={stopChase}
      >
      <div className="valentine-page__main">
      <div className="content">
        <div className="emojis !pt-[24px]">
          <span className="emoji emoji--1">❤️</span>
          <span className="emoji emoji--2">🌹</span>
          <span className="emoji emoji--3">🍫</span>
        </div>

        <p className="message">남자친구가 발렌타인 편지를 보냈어요! ✉️</p>

        <div className="quote-box">
          <p className="quote-label">
            <span className="quote-label-icon" aria-hidden>💌</span>
            메세지
          </p>
          <p className="quote">자기야 나 초콜릿 사줘♥️</p>
        </div>

        <div ref={buttonsRef} className="buttons">
          <button
            ref={yesButtonRef}
            className={`btn-yes ${hasRunAway ? 'btn-yes--full' : ''}`}
            onClick={handleYesClick}
          >
            Yes! 좋아요♥️
          </button>
          <button
            ref={noButtonRef}
            className={`btn-no ${hasRunAway ? 'btn-no--absolute' : ''}`}
            style={
              hasRunAway
                ? {
                    left: absPosRef.current.left,
                    top: absPosRef.current.top,
                  }
                : undefined
            }
            onPointerEnter={(e) => startChase(e)}
            onPointerDown={handleNoButtonPointerDown}
            onPointerMove={handleNoButtonPointerMove}
            onPointerUp={handleNoButtonPointerUp}
            onPointerCancel={handleNoButtonPointerUp}
            onClick={handleNoButtonClick}
          >
            No💔
          </button>
        </div>

        <p className="partner-disclaimer text-center !text-[12px]">
        이 사이트는 쿠팡 파트너스 활동의 일환으로<br/>이에 따른 일정액의 수수료를 제공받습니다.
      </p>
      </div>
      </div>

    </div>
    </>
  )
}

export default App