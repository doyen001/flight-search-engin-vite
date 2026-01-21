import { Calendar } from 'lucide-react'

interface DateInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  min?: string
}

export function DateInput({
  label,
  value,
  onChange,
  disabled = false,
  min
}: DateInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="date"
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={min}
        />
      </div>
    </div>
  )
}