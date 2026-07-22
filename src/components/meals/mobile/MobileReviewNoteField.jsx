import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function MobileReviewNoteField({
  value,
  onChange,
  onBlur,
  disabled = false,
}) {
  const hasText = Boolean((value ?? '').trim())
  const [open, setOpen] = useState(hasText)

  if (!open && !hasText) {
    return (
      <button
        type="button"
        className="meal-feedback-add-note-btn"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        + Add a note (optional)
      </button>
    )
  }

  return (
    <label className="meal-feedback-note-field">
      <span className="meal-feedback-note-label">
        Note
        {!hasText && (
          <button
            type="button"
            className="meal-feedback-note-collapse"
            onClick={() => setOpen(false)}
          >
            <ChevronDown size={16} aria-hidden />
          </button>
        )}
      </span>
      <textarea
        className="app-textarea meal-feedback-note-textarea"
        rows={2}
        value={value}
        disabled={disabled}
        placeholder="Share anything about this dish…"
        inputMode="text"
        enterKeyHint="done"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </label>
  )
}
