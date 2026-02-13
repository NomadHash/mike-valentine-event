import { useRef, useEffect, useState } from 'react'
import './App.css'

const COUPANG_LINKS = [
  'https://link.coupang.com/a/dLKm0w',
  'https://link.coupang.com/a/dLKnyK',
  'https://link.coupang.com/a/dLKnSH',
]

const CHASE_RADIUS = 80 // 반응 거리
const SPEED_PER_SECOND = 1300 // 초당 이동 픽셀 (더 멀리 도망)

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
  const absPosRef = useRef({ left: 0, top: 0 })
  const lastChaseEndRef = useRef(0)

  const handleYesClick = () => {
    if (Date.now() - lastChaseEndRef.current < 400) return
    const randomIndex = Math.floor(Math.random() * COUPANG_LINKS.length)
    window.location.href = COUPANG_LINKS[randomIndex]
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

    const rect = btn.getBoundingClientRect()
    const bx = rect.left + rect.width / 2
    const by = rect.top + rect.height / 2
    const { x: cx, y: cy } = cursorRef.current

    const dx = cx - bx
    const dy = cy - by
    const dist = Math.sqrt(dx * dx + dy * dy) || 1

    // 도망가는 방향 벡터
    const nx = -dx / dist
    const ny = -dy / dist

    // 계산된 거리만큼 이동
    posRef.current.x += nx * stepSize
    posRef.current.y += ny * stepSize

    // 1차 적용
    btn.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`

    // 벽 충돌 보정
    const bounds = getVisibleBounds()
    let newRect = btn.getBoundingClientRect()
    
    // 반복 보정으로 끼임 현상 방지
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
    <div
      ref={pageRef}
      className="valentine-page"
      onPointerMove={handlePointerMove}
      onPointerLeave={stopChase}
    >
      <div className="content">
        <div className="emojis">
          <span>❤️</span>
          <span>🌹</span>
          <span>🍫</span>
        </div>

        <p className="message">남자친구가 발렌타인 편지를 보냈어요! ✉️</p>

        <p className="quote">자기야 나 초콜릿 사줘♥️</p>

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
          >
            No💔
          </button>
        </div>
      </div>
    </div>
  )
}

export default App