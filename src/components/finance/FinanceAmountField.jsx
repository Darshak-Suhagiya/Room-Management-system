import { useId, useState } from 'react'
import { formatRupeesShort, parseRupeesToPaise } from '../../utils/money'

export function FinanceAmountField({
  label,
  valuePaise,
  onChangePaise,
  disabled = false,
  hint,
  allowNegative = false,
  emptyValue = 0,
}) {
  const id = useId()
  const [raw, setRaw] = useState(() =>
    valuePaise || valuePaise === 0 ? String((Number(valuePaise) || 0) / 100) : '',
  )
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const next = e.target.value
    setRaw(next)
    if (next.trim() === '' || next.trim() === '-') {
      setError('')
      onChangePaise?.(emptyValue)
      return
    }
    if (allowNegative && /^-?\d/.test(next.replace(/,/g, ''))) {
      const negative = next.trim().startsWith('-')
      const parsed = parseRupeesToPaise(next.replace('-', ''))
      if (!parsed.ok) {
        setError(parsed.message)
        return
      }
      setError('')
      onChangePaise?.(negative ? -parsed.value : parsed.value)
      return
    }
    const parsed = parseRupeesToPaise(next)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    setError('')
    onChangePaise?.(parsed.value)
  }

  return (
    <label className="field-stack finance-amount-field">
      {label ? <span className="field-stack-label">{label}</span> : null}
      <span className={`finance-amount-input-wrap${error ? ' is-error' : ''}`}>
        <span className="finance-amount-currency" aria-hidden>
          ₹
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={raw}
          disabled={disabled}
          onChange={handleChange}
          placeholder="0"
          className={error ? 'finance-amount-error' : ''}
          aria-invalid={Boolean(error)}
        />
      </span>
      <span className={`finance-amount-preview${error ? ' is-error' : ' muted'}`}>
        {error || hint || formatRupeesShort(valuePaise || 0)}
      </span>
    </label>
  )
}
