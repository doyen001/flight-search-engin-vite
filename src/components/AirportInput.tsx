import { MapPin } from 'lucide-react'

interface AirportSuggestion {
  code: string
  city: string
  name: string
}

interface AirportInputProps {
  label: string
  placeholder: string
  value: string
  suggestions: AirportSuggestion[]
  showSuggestions: boolean
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  onSelectSuggestion: (airport: AirportSuggestion) => void
}

export function AirportInput({
  label,
  placeholder,
  value,
  suggestions,
  showSuggestions,
  onChange,
  onFocus,
  onBlur,
  onSelectSuggestion
}: AirportInputProps) {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto custom-scrollbar">
            {suggestions.map((airport) => (
              <div
                key={airport.code}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => onSelectSuggestion(airport)}
              >
                <div className="font-medium text-gray-900">{airport.code} - {airport.city}</div>
                <div className="text-sm text-gray-600">{airport.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}