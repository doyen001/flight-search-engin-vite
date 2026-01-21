import { useState, useEffect, useCallback } from 'react'
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { flightApi, type PriceHistory } from '../services/flightApi'

interface PriceGraphProps {
  origin: string
  destination: string
  departureDate: string
  className?: string
}

interface ProcessedData {
  date: string
  price: number
  formattedDate: string
  isSelectedDate: boolean
}

export function PriceGraph({ origin, destination, departureDate, className = '' }: PriceGraphProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPriceHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use a mock flight ID for demonstration
      const mockFlightId = 'mock-flight-1'
      const history = await flightApi.getPriceHistory(mockFlightId, origin, destination)
      setPriceHistory(history || [])
    } catch (err) {
      setError('Failed to load price history')
      console.error('Error loading price history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [origin, destination])

  useEffect(() => {
    if (origin && destination && departureDate) {
      loadPriceHistory()
    }
  }, [origin, destination, departureDate, loadPriceHistory])

  const processData = (): ProcessedData[] => {
    return priceHistory.map(item => ({
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      isSelectedDate: item.date === departureDate
    }))
  }

  const getPriceTrend = () => {
    if (priceHistory.length < 2) return null

    const recent = priceHistory.slice(-7) // Last 7 days
    const current = recent[recent.length - 1]?.price || 0
    const previous = recent[recent.length - 2]?.price || 0

    if (current > previous) return 'up'
    if (current < previous) return 'down'
    return 'stable'
  }

  const getCurrentPrice = () => {
    const selectedData = priceHistory.find(item => item.date === departureDate)
    return selectedData?.price || null
  }

  const getPriceRange = () => {
    if (priceHistory.length === 0) return null

    const prices = priceHistory.map(item => item.price)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  }

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{
      payload: ProcessedData;
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.formattedDate}</p>
          <p className="text-blue-600 font-semibold">${data.price}</p>
          {data.isSelectedDate && (
            <p className="text-xs text-green-600 font-medium mt-1">Your selected date</p>
          )}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || priceHistory.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">Price history not available</p>
          <p className="text-sm text-gray-400">Unable to load price trends for this route</p>
        </div>
      </div>
    )
  }

  const processedData = processData()
  const trend = getPriceTrend()
  const currentPrice = getCurrentPrice()
  const priceRange = getPriceRange()

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Price Trends</h3>
          <p className="text-sm text-gray-600">
            {origin} to {destination} • Last 30 days
          </p>
        </div>

        {trend && (
          <div className="flex items-center space-x-2">
            {trend === 'up' && <TrendingUp className="h-5 w-5 text-red-500" />}
            {trend === 'down' && <TrendingDown className="h-5 w-5 text-green-500" />}
            {trend === 'stable' && <Minus className="h-5 w-5 text-gray-500" />}
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-red-600' :
              trend === 'down' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {trend === 'up' ? 'Prices rising' :
               trend === 'down' ? 'Prices falling' : 'Prices stable'}
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Price range: ${priceRange?.min} - ${priceRange?.max}</span>
          {currentPrice && (
            <span className="font-medium text-green-600">
              Selected: ${currentPrice}
            </span>
          )}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={processedData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
            {/* Highlight selected date */}
            {processedData.filter(d => d.isSelectedDate).map((_, index) => (
              <Line
                key={`selected-${index}`}
                type="monotone"
                dataKey="price"
                stroke="#10B981"
                strokeWidth={0}
                dot={{ fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF', r: 6 }}
                activeDot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Prices are estimates and may vary. Select your preferred date for the best deals.
      </div>
    </div>
  )
}