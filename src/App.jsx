import { useRef, useEffect, useState } from 'react'
import './App.css'

const COUPANG_LINKS = [
  'https://link.coupang.com/a/dLKm0w',
  'https://link.coupang.com/a/dLKnyK',
  'https://link.coupang.com/a/dLKnSH',
]

const CHASE_RADIUS = 40
const MOVE_SPEED = 80
const MOVE_INTERVAL_MS = 30
const VIEWPORT_PADDING = 100

function App() {
  const noButtonRef = useRef(null)
  const buttonsRef = useRef(null)
  const intervalRef = useRef(null)
  const cursorRef = useRef({ x: 0, y: 0 })
  const posRef = useRef({ x: 0, y: 0 })
  const [hasRunAway, setHasRunAway] = useState(false)
  const absPosRef = useRef({ left: 0, top: 0 })

  const handleYesClick = () => {
    const randomIndex = Math.floor(Math.random() * COUPANG_LINKS.length)
    window.location.href = COUPANG_LINKS[randomIndex]
  }

  const moveAwayFromCursor = () => {
    const btn = noButtonRef.current
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    const bx = rect.left + rect.width / 2
    const by = rect.top + rect.height / 2
    const { x: cx, y: cy } = cursorRef.current

    const dx = cx - bx
    const dy = cy - by
    const dist = Math.sqrt(dx * dx + dy * dy) || 1

    const nx = -dx / dist
    const ny = -dy / dist

    posRef.current.x += nx * MOVE_SPEED
    posRef.current.y += ny * MOVE_SPEED
    btn.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`

    const newRect = btn.getBoundingClientRect()
    if (newRect.left < VIEWPORT_PADDING) {
      posRef.current.x += VIEWPORT_PADDING - newRect.left
    }
    if (newRect.right > window.innerWidth - VIEWPORT_PADDING) {
      posRef.current.x -= newRect.right - (window.innerWidth - VIEWPORT_PADDING)
    }
    if (newRect.top < VIEWPORT_PADDING) {
      posRef.current.y += VIEWPORT_PADDING - newRect.top
    }
    if (newRect.bottom > window.innerHeight - VIEWPORT_PADDING) {
      posRef.current.y -= newRect.bottom - (window.innerHeight - VIEWPORT_PADDING)
    }
    btn.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
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

  const startChase = () => {
    if (intervalRef.current) return
    const btn = noButtonRef.current
    const container = buttonsRef.current
    if (btn && container && !hasRunAway) {
      const btnRect = btn.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      absPosRef.current = {
        left: btnRect.left - containerRect.left,
        top: btnRect.top - containerRect.top,
      }
    }
    setHasRunAway(true)
    intervalRef.current = setInterval(moveAwayFromCursor, MOVE_INTERVAL_MS)
  }

  const stopChase = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const handleMouseMove = (e) => {
    cursorRef.current = { x: e.clientX, y: e.clientY }
    if (isCursorNearButton(e.clientX, e.clientY)) {
      startChase()
    } else {
      stopChase()
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div
      className="valentine-page"
      onMouseMove={handleMouseMove}
      onMouseLeave={stopChase}
    >
      <div className="content">
        <div className="emojis">
          <span>❤️</span>
          <span>🌹</span>
          <span>🍫</span>
        </div>

        <p className="message">남자친구가 발렌타인 편지를 보냈어요 ✉️</p>

        <p className="quote">자기야 나 초콜릿 사줘♥️</p>

        <div ref={buttonsRef} className="buttons">
          <button
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
            onPointerEnter={startChase}
          >
            No💔
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
