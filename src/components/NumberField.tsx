import { useId } from 'react'
import { inputClass, mutedText } from './ui'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  unit?: string
  placeholder?: string
  /** Allow a decimal point (for weights). Whole numbers use a number-only keypad. */
  decimal?: boolean
  className?: string
}

/** A labelled number box. The label is tied to the box by id (not wrapped around it) so assistive technology reads just the label. */
export function NumberField({ label, value, onChange, unit, placeholder, decimal = true, className = '' }: Props) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {unit && <span className={`font-normal ${mutedText}`}> ({unit})</span>}
      </label>
      <input id={id} className={inputClass} inputMode={decimal ? 'decimal' : 'numeric'} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
