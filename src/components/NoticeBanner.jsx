import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Info, Megaphone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  markNoticeRead,
  recordNoticeSeen,
} from '../services/noticeService'

const ROTATE_MS = 15000
const SWIPE_THRESHOLD = 48

function ToneIcon({ tone }) {
  if (tone === 'warning') return <AlertTriangle size={20} aria-hidden />
  if (tone === 'success') return <CheckCircle2 size={20} aria-hidden />
  return <Info size={20} aria-hidden />
}

/**
 * Sticky notice carousel.
 * @param {object} props
 * @param {Array} props.notices
 * @param {(id: string) => void} [props.onNoticeRead] — after mark as read (live mode)
 * @param {boolean} [props.preview] — no Firestore writes
 * @param {boolean} [props.sticky] — default true
 */
export function NoticeBanner({
  notices = [],
  onNoticeRead,
  preview = false,
  sticky = true,
}) {
  const { user, profile } = useAuth()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [readingId, setReadingId] = useState(null)
  const [localRead, setLocalRead] = useState(() => new Set())
  const seenRef = useRef(new Set())
  const swipeRef = useRef({ x: 0, y: 0, active: false })
  const hoverRef = useRef(false)

  const list = notices ?? []
  const safeIndex = list.length === 0 ? 0 : Math.min(index, list.length - 1)
  const current = list[safeIndex] ?? null

  const noticeIds = list.map((n) => n.id).join('|')
  useEffect(() => {
    setIndex(0)
  }, [noticeIds])

  useEffect(() => {
    if (preview || !current?.id || !user || !profile) return
    if (seenRef.current.has(current.id)) return
    seenRef.current.add(current.id)
    recordNoticeSeen(current.id, {
      ...profile,
      id: profile.id || user.uid,
    }).catch((err) => console.error('recordNoticeSeen', err))
  }, [current?.id, preview, user, profile])

  useEffect(() => {
    if (paused || preview || list.length < 2) return undefined
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % list.length)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [paused, preview, list.length])

  if (!list.length || !current) return null

  const goNext = () => {
    if (list.length < 2) return
    setIndex((i) => (i + 1) % list.length)
  }

  const goPrev = () => {
    if (list.length < 2) return
    setIndex((i) => (i - 1 + list.length) % list.length)
  }

  const onPointerDown = (e) => {
    if (list.length < 2) return
    if (e.target.closest('button')) return
    swipeRef.current = {
      x: e.clientX,
      y: e.clientY,
      active: true,
    }
    setPaused(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerUp = (e) => {
    const start = swipeRef.current
    if (!start.active) return
    swipeRef.current = { ...start, active: false }
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) >= Math.abs(dy)) {
      if (dx < 0) goNext()
      else goPrev()
    }
    if (!hoverRef.current) setPaused(false)
  }

  const onPointerCancel = () => {
    swipeRef.current = { x: 0, y: 0, active: false }
    if (!hoverRef.current) setPaused(false)
  }

  const onKeyDown = (e) => {
    if (list.length < 2) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    }
  }

  const isRead = preview
    ? localRead.has(current.id || `preview-${safeIndex}`)
    : false

  const handleMarkRead = async () => {
    if (preview) {
      setLocalRead((prev) => new Set(prev).add(current.id || `preview-${safeIndex}`))
      return
    }
    if (!user || !profile || !current.id) return
    setReadingId(current.id)
    try {
      await markNoticeRead(current.id, {
        ...profile,
        id: profile.id || user.uid,
      })
      onNoticeRead?.(current.id)
    } catch (err) {
      console.error(err)
    } finally {
      setReadingId(null)
    }
  }

  return (
    <div
      className={`notice-banner notice-tone-${current.tone || 'info'}${sticky ? ' is-sticky' : ''}${list.length > 1 ? ' is-swipeable' : ''}`}
      role={list.length > 1 ? 'region' : undefined}
      aria-roledescription={list.length > 1 ? 'carousel' : undefined}
      tabIndex={list.length > 1 ? 0 : undefined}
      onMouseEnter={() => {
        hoverRef.current = true
        setPaused(true)
      }}
      onMouseLeave={() => {
        hoverRef.current = false
        setPaused(false)
      }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          if (!hoverRef.current) setPaused(false)
        }
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <div className="notice-banner-panel" aria-live="polite">
        <div className="notice-banner-inner">
          <span className="notice-banner-icon" aria-hidden>
            <ToneIcon tone={current.tone} />
          </span>
          <div className="notice-banner-body">
            <div className="notice-banner-kicker">
              <Megaphone size={14} aria-hidden />
              <span>Notice</span>
            </div>
            <h3 className="notice-banner-title">{current.title}</h3>
            <p className="notice-banner-message">{current.message}</p>
          </div>
          <div className="notice-banner-actions">
            {isRead || readingId === current.id ? (
              <span className="notice-read-badge">
                <Check size={16} aria-hidden />
                {readingId === current.id ? 'Saving…' : 'Read'}
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-sm notice-mark-read-btn"
                onClick={handleMarkRead}
                disabled={readingId != null}
              >
                Mark as read
              </button>
            )}
          </div>
        </div>

        {list.length > 1 && (
          <div className="notice-banner-dots" role="tablist" aria-label="Notices">
            {list.map((n, i) => (
              <button
                key={n.id || `dot-${i}`}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Notice ${i + 1} of ${list.length}`}
                className={`notice-dot${i === safeIndex ? ' is-active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
