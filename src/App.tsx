import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plane, Users } from 'lucide-react'
import { flightApi } from './services/flightApi'
import type { FlightOffer, FlightSearchParams } from './services/flightApi'
import { PriceGraph } from './components/PriceGraph'
import { AirportInput } from './components/AirportInput'
import { DateInput } from './components/DateInput'

// Types
interface FlightSearch {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  passengers: number
  tripType: 'roundtrip' | 'oneway'
}

interface FlightFilters {
  airlines: string[]
  stops: number[]
  priceRange: [number, number]
  sortBy: 'price' | 'duration' | 'departure'
}

// Using FlightOffer from API service

function App() {
  const [searchForm, setSearchForm] = useState<FlightSearch>({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    passengers: 1,
    tripType: 'roundtrip'
  })

  const [flights, setFlights] = useState<FlightOffer[]>([])
  const [filteredFlights, setFilteredFlights] = useState<FlightOffer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [filters, setFilters] = useState<FlightFilters>({
    airlines: [],
    stops: [],
    priceRange: [0, 2000],
    sortBy: 'price'
  })
  const [airportSuggestions, setAirportSuggestions] = useState<Array<{code: string, city: string, name: string}>>([])
  const [showSuggestions, setShowSuggestions] = useState<'origin' | 'destination' | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = async () => {
    if (!searchForm.origin || !searchForm.destination || !searchForm.departureDate) {
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    try {
      const searchParams: FlightSearchParams = {
        origin: searchForm.origin.toUpperCase(),
        destination: searchForm.destination.toUpperCase(),
        departureDate: searchForm.departureDate,
        returnDate: searchForm.returnDate,
        passengers: searchForm.passengers,
        tripType: searchForm.tripType
      }

      const results = await flightApi.searchFlights(searchParams)
      setFlights(results)
    } catch (error) {
      console.error('Error searching flights:', error)
      // In a real app, you'd show an error message to the user
      setFlights([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort flights
  useEffect(() => {
    let filtered = [...flights]

    // Filter by airlines
    if (filters.airlines.length > 0) {
      filtered = filtered.filter(flight => filters.airlines.includes(flight.airline))
    }

    // Filter by stops
    if (filters.stops.length > 0) {
      filtered = filtered.filter(flight => filters.stops.includes(flight.stops))
    }

    // Filter by price range
    filtered = filtered.filter(flight =>
      flight.price >= filters.priceRange[0] && flight.price <= filters.priceRange[1]
    )

    // Sort flights
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price':
          return a.price - b.price
        case 'duration':
          // Simple duration comparison (in a real app, you'd parse the duration string)
          return a.duration.localeCompare(b.duration)
        case 'departure':
          return a.departure.time.localeCompare(b.departure.time)
        default:
          return 0
      }
    })

    setFilteredFlights(filtered)
  }, [flights, filters])

  // Update price range when flights change
  useEffect(() => {
    if (flights.length > 0) {
      const prices = flights.map(f => f.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      setFilters(prev => ({
        ...prev,
        priceRange: [minPrice, maxPrice]
      }))
    }
  }, [flights])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Debounced airport search function
  const debouncedSearchAirports = useCallback(async (field: 'origin' | 'destination', value: string) => {
    try {
      const suggestions = await flightApi.getAirports(value)
      setAirportSuggestions(suggestions)
      setShowSuggestions(field)
    } catch (error) {
      console.error('Error fetching airport suggestions:', error)
    }
  }, [])

  // Handle airport input changes with debouncing
  const handleAirportInput = useCallback((field: 'origin' | 'destination', value: string) => {
    setSearchForm(prev => ({ ...prev, [field]: value }))

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Clear suggestions if input is too short
    if (value.length < 2) {
      setShowSuggestions(null)
      setAirportSuggestions([])
      return
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearchAirports(field, value)
    }, 1000)
  }, [debouncedSearchAirports])

  const selectAirport = (field: 'origin' | 'destination', airport: {code: string, city: string, name: string}) => {
    setSearchForm(prev => ({ ...prev, [field]: airport.code }))
    setShowSuggestions(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Plane className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">FlightSearch</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Search Form */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Origin */}
            <AirportInput
              label="From"
              placeholder="Origin city or airport"
              value={searchForm.origin}
              suggestions={airportSuggestions}
              showSuggestions={showSuggestions === 'origin'}
              onChange={(value) => handleAirportInput('origin', value)}
              onFocus={() => searchForm.origin.length >= 2 && setShowSuggestions('origin')}
              onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
              onSelectSuggestion={(airport) => selectAirport('origin', airport)}
            />

            {/* Destination */}
            <AirportInput
              label="To"
              placeholder="Destination city or airport"
              value={searchForm.destination}
              suggestions={airportSuggestions}
              showSuggestions={showSuggestions === 'destination'}
              onChange={(value) => handleAirportInput('destination', value)}
              onFocus={() => searchForm.destination.length >= 2 && setShowSuggestions('destination')}
              onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
              onSelectSuggestion={(airport) => selectAirport('destination', airport)}
            />

            {/* Departure Date */}
            <DateInput
              label="Departure"
              value={searchForm.departureDate}
              onChange={(value) => setSearchForm({...searchForm, departureDate: value})}
              min={new Date().toISOString().split('T')[0]}
            />

            {/* Return Date */}
            <DateInput
              label="Return"
              value={searchForm.returnDate || ''}
              onChange={(value) => setSearchForm({...searchForm, returnDate: value})}
              disabled={searchForm.tripType === 'oneway'}
              min={searchForm.departureDate || new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Trip Type */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tripType"
                  value="roundtrip"
                  checked={searchForm.tripType === 'roundtrip'}
                  onChange={(e) => setSearchForm({...searchForm, tripType: e.target.value as 'roundtrip' | 'oneway'})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Round trip</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tripType"
                  value="oneway"
                  checked={searchForm.tripType === 'oneway'}
                  onChange={(e) => setSearchForm({...searchForm, tripType: e.target.value as 'roundtrip' | 'oneway'})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">One way</span>
              </label>
            </div>

            {/* Passengers & Search Button */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-400" />
                <select
                  value={searchForm.passengers}
                  onChange={(e) => setSearchForm({...searchForm, passengers: parseInt(e.target.value)})}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1,2,3,4,5,6,7,8].map(num => (
                    <option key={num} value={num}>{num} passenger{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading || !searchForm.origin || !searchForm.destination || !searchForm.departureDate}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Search className="h-5 w-5" />
                <span>{isLoading ? 'Searching...' : 'Search Flights'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-6">
            {/* Price Graph */}
            {searchForm.origin && searchForm.destination && searchForm.departureDate && (
              <PriceGraph
                origin={searchForm.origin}
                destination={searchForm.destination}
                departureDate={searchForm.departureDate}
              />
            )}

            {/* Filters */}
            {flights.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={() => setFilters({
                      airlines: [],
                      stops: [],
                      priceRange: [0, 2000],
                      sortBy: 'price'
                    })}
                    className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {/* Airlines Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Airlines</label>
                    <div className="space-y-2">
                      {Array.from(new Set(flights.map(f => f.airline))).map(airline => (
                        <label key={airline} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.airlines.includes(airline)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  airlines: [...prev.airlines, airline]
                                }))
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  airlines: prev.airlines.filter(a => a !== airline)
                                }))
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{airline}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Stops Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stops</label>
                    <div className="space-y-2">
                      {[0, 1, 2].map(stops => (
                        <label key={stops} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.stops.includes(stops)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  stops: [...prev.stops, stops]
                                }))
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  stops: prev.stops.filter(s => s !== stops)
                                }))
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={Math.min(...flights.map(f => f.price))}
                        max={Math.max(...flights.map(f => f.price))}
                        value={filters.priceRange[1]}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          priceRange: [prev.priceRange[0], parseInt(e.target.value)]
                        }))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
      <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        sortBy: e.target.value as 'price' | 'duration' | 'departure'
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="price">Price (lowest first)</option>
                      <option value="duration">Duration (shortest first)</option>
                      <option value="departure">Departure time (earliest first)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  Showing {filteredFlights.length} of {flights.length} flights
                </div>
              </div>
            )}

            {/* Flight Results */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Flight Results {searchForm.origin && searchForm.destination && (
                    <span className="text-gray-600 font-normal text-sm sm:text-base">
                      • {searchForm.origin} to {searchForm.destination}
                    </span>
                  )}
                </h2>
              </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching for the best flights...</p>
              </div>
            ) : filteredFlights.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredFlights.map((flight, index) => (
                    <div
                      key={flight.id}
                      className="p-4 sm:p-6 hover:bg-gray-50 hover:shadow-md transition-all duration-200 border border-transparent hover:border-gray-200 rounded-lg mx-2 sm:mx-0 animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="font-semibold text-gray-900">{flight.airline}</span>
                            <span className="text-gray-600 text-sm">{flight.flightNumber}</span>
                            {flight.aircraft && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {flight.aircraft}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-900">
                                {flight.departure.time}
                              </div>
                              <div className="text-sm text-gray-600">
                                {flight.departure.airport}
                              </div>
                              <div className="text-xs text-gray-500">
                                {flight.departure.city}
                              </div>
                            </div>

                            <div className="flex-1 px-4">
                              <div className="text-center">
                                <div className="text-sm text-gray-600 mb-1">{flight.duration}</div>
                                <div className="flex items-center justify-center">
                                  <div className="w-12 sm:w-16 h-px bg-gray-300"></div>
                                  <div className="mx-2 text-xs text-gray-500">
                                    {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                                  </div>
                                  <div className="w-12 sm:w-16 h-px bg-gray-300"></div>
                                </div>
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-900">
                                {flight.arrival.time}
                              </div>
                              <div className="text-sm text-gray-600">
                                {flight.arrival.airport}
                              </div>
                              <div className="text-xs text-gray-500">
                                {flight.arrival.city}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center lg:flex-col lg:items-end gap-3 lg:ml-6">
                          <div className="text-center lg:text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              ${flight.price}
                            </div>
                            <div className="text-sm text-gray-600">
                              {flight.currency}
                            </div>
                          </div>
                          <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap">
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                ))}
      </div>
            ) : (
              <div className="p-12 text-center animate-fade-in">
                <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-bounce" />
                <p className="text-gray-600 text-lg font-medium mb-2">No flights found</p>
                <p className="text-gray-500 mb-4">We couldn't find any flights matching your criteria.</p>
                <button
                  onClick={() => setFilters({
                    airlines: [],
                    stops: [],
                    priceRange: [0, 2000],
                    sortBy: 'price'
                  })}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Clear filters and try again
        </button>
              </div>
            )}
            </div>
          </div>
        )}
      </main>
      </div>
  )
}

export default App
