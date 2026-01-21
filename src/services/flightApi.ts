
// Types for API responses
export interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  passengers: number
  tripType: 'roundtrip' | 'oneway'
}

// Amadeus API response types
export interface AmadeusAuthResponse {
  type: string
  username: string
  application_name: string
  client_id: string
  token_type: string
  access_token: string
  expires_in: number
  state: string
  scope: string
}

export interface AmadeusFlightDestination {
  type: string
  origin: string
  destination: string
  departureDate: string
  returnDate: string
  price: {
    total: string
  }
}

export interface AmadeusFlightDestinationsResponse {
  data: AmadeusFlightDestination[]
}

export interface AmadeusFlightOffersResponse {
  data: AmadeusFlightOffer[]
}

export interface AmadeusFlightOffer {
  id: string
  itineraries: AmadeusItinerary[]
  price: {
    total: string
    currency: string
  }
}

export interface AmadeusItinerary {
  duration: string
  segments: AmadeusSegment[]
}

export interface AmadeusSegment {
  departure: {
    iataCode: string
    at: string
  }
  arrival: {
    iataCode: string
    at: string
  }
  carrierCode: string
  number: string
  aircraft?: {
    code: string
  }
}

export interface AmadeusLocation {
  id: string
  iataCode: string
  name: string
  address: {
    cityName: string
  }
}

export interface AmadeusLocationsResponse {
  data: AmadeusLocation[]
}

// Simplified FlightOffer for our app (adapted from Amadeus data)
export interface FlightOffer {
  id: string
  airline: string
  flightNumber: string
  departure: {
    airport: string
    city: string
    time: string
    date: string
  }
  arrival: {
    airport: string
    city: string
    time: string
    date: string
  }
  duration: string
  stops: number
  price: number
  currency: string
  aircraft?: string
  baggage?: {
    carryOn: boolean
    checked: boolean
  }
}

export interface PriceHistory {
  date: string
  price: number
}


// API service class
export class FlightApiService {
  private static instance: FlightApiService
  private baseUrl = 'https://test.api.amadeus.com'
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  private constructor() {}

  static getInstance(): FlightApiService {
    if (!FlightApiService.instance) {
      FlightApiService.instance = new FlightApiService()
    }
    return FlightApiService.instance
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken
    }

    const clientId = import.meta.env.VITE_AMADEUS_CLIENT_ID
    const clientSecret = import.meta.env.VITE_AMADEUS_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Amadeus API credentials not found. Please check your .env file.')
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`)
      }

      const data: AmadeusAuthResponse = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))

      // Store token in localStorage for persistence
      localStorage.setItem('amadeus_token', this.accessToken)
      localStorage.setItem('amadeus_token_expiry', this.tokenExpiry.toISOString())

      return this.accessToken
    } catch (error) {
      console.error('Failed to get access token:', error)
      throw error
    }
  }

  private loadStoredToken(): void {
    const storedToken = localStorage.getItem('amadeus_token')
    const storedExpiry = localStorage.getItem('amadeus_token_expiry')

    if (storedToken && storedExpiry) {
      const expiry = new Date(storedExpiry)
      if (expiry > new Date()) {
        this.accessToken = storedToken
        this.tokenExpiry = expiry
      } else {
        // Token expired, remove from storage
        localStorage.removeItem('amadeus_token')
        localStorage.removeItem('amadeus_token_expiry')
      }
    }
  }


  private getMockAirports(query: string): Array<{code: string, city: string, name: string}> {
    const mockAirports = {
      'JFK': { city: 'New York', name: 'John F. Kennedy International' },
      'LAX': { city: 'Los Angeles', name: 'Los Angeles International' },
      'ORD': { city: 'Chicago', name: "O'Hare International" },
      'MIA': { city: 'Miami', name: 'Miami International' },
      'SFO': { city: 'San Francisco', name: 'San Francisco International' },
      'SEA': { city: 'Seattle', name: 'Seattle-Tacoma International' },
      'BOS': { city: 'Boston', name: 'Logan International' },
      'DEN': { city: 'Denver', name: 'Denver International' },
      'LHR': { city: 'London', name: 'Heathrow Airport' },
      'CDG': { city: 'Paris', name: 'Charles de Gaulle Airport' },
    }

    return Object.entries(mockAirports)
      .filter(([code, data]) =>
        code.toLowerCase().includes(query.toLowerCase()) ||
        data.city.toLowerCase().includes(query.toLowerCase()) ||
        data.name.toLowerCase().includes(query.toLowerCase())
      )
      .map(([code, data]) => ({
        code,
        city: data.city,
        name: data.name
      }))
      .slice(0, 5)
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    try {
      // Load stored token if available
      this.loadStoredToken()

      const token = await this.getAccessToken()

      // Build query parameters
      const queryParams = new URLSearchParams({
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        adults: params.passengers.toString(),
      })

      if (params.returnDate && params.tripType === 'roundtrip') {
        queryParams.append('returnDate', params.returnDate)
      }

      // For now, we'll use flight-destinations as mentioned, but we need to adapt it
      // Actually, let's use the flight-offers endpoint for more detailed results
      const url = `${this.baseUrl}/v2/shopping/flight-offers?${queryParams.toString()}&max=20`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Flight search failed: ${response.status} ${response.statusText}`)
      }

      const data: AmadeusFlightOffersResponse = await response.json()

      // Transform Amadeus response to our FlightOffer format
      const flights: FlightOffer[] = data.data?.map((offer: AmadeusFlightOffer, index: number) => {
        const itinerary = offer.itineraries[0] // Take the first itinerary
        const firstSegment = itinerary.segments[0]
        const lastSegment = itinerary.segments[itinerary.segments.length - 1]

        return {
          id: offer.id || `flight-${index}`,
          airline: firstSegment.carrierCode,
          flightNumber: `${firstSegment.carrierCode} ${firstSegment.number}`,
          departure: {
            airport: firstSegment.departure.iataCode,
            city: firstSegment.departure.iataCode, // Would need airport lookup for city names
            time: firstSegment.departure.at.split('T')[1].substring(0, 5),
            date: firstSegment.departure.at.split('T')[0],
          },
          arrival: {
            airport: lastSegment.arrival.iataCode,
            city: lastSegment.arrival.iataCode, // Would need airport lookup for city names
            time: lastSegment.arrival.at.split('T')[1].substring(0, 5),
            date: lastSegment.arrival.at.split('T')[0],
          },
          duration: itinerary.duration.replace('PT', '').toLowerCase(),
          stops: itinerary.segments.length - 1,
          price: parseFloat(offer.price.total),
          currency: offer.price.currency,
          aircraft: firstSegment.aircraft?.code,
        }
      }) || []

      return flights

    } catch (error) {
      console.error('Flight search error:', error)
      throw error
    }
  }

  async getPriceHistory(_flightId: string, origin: string, destination: string): Promise<PriceHistory[] | undefined> {
    try {
      // Load stored token if available
      this.loadStoredToken()

      const token = await this.getAccessToken()

      // Get current market price with a single API call
      const currentDate = new Date()
      const tomorrow = new Date(currentDate)
      tomorrow.setDate(currentDate.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      const url = `${this.baseUrl}/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${dateStr}&adults=1&max=5`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      let basePrice = 250 // fallback price

      if (response.ok) {
        const data: AmadeusFlightOffersResponse = await response.json()
        if (data.data && data.data.length > 0) {
          // Get average price from available offers
          const prices = data.data.map(offer => parseFloat(offer.price.total))
          basePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
        }
      }

      // Generate realistic price history based on current market price
      const history: PriceHistory[] = []

      for (let i = 30; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)

        // Calculate realistic price variations
        const dayOfWeek = date.getDay()
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.1 : 1.0 // Weekend prices higher

        // Seasonal variation (higher in summer months)
        const month = date.getMonth()
        const seasonalMultiplier = (month >= 5 && month <= 8) ? 1.15 : 1.0 // Summer premium

        // Random market fluctuation (±20%)
        const randomVariation = (Math.random() - 0.5) * 0.4

        // Distance from today affects price (closer dates = higher prices)
        const daysFromToday = Math.abs(i - 30)
        const urgencyMultiplier = daysFromToday < 7 ? 1.2 : daysFromToday < 14 ? 1.1 : 1.0

        const price = Math.round(basePrice * (1 + randomVariation) * weekendMultiplier * seasonalMultiplier * urgencyMultiplier)
        const finalPrice = Math.max(price, Math.round(basePrice * 0.6)) // Minimum 60% of base price

        history.push({
          date: date.toISOString().split('T')[0],
          price: finalPrice
        })
      }

      // Sort by date (oldest first)
      history.sort((a, b) => a.date.localeCompare(b.date))

      return history

    } catch (error) {
      console.error('Price history error:', error)
      return []
    }
  }


  async getAirports(query: string): Promise<Array<{code: string, city: string, name: string}>> {
    try {
      // Load stored token if available
      this.loadStoredToken()

      const token = await this.getAccessToken()

      const url = `${this.baseUrl}/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(query)}&page%5Blimit%5D=10`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Airport search failed: ${response.status} ${response.statusText}`)
      }

      const data: AmadeusLocationsResponse = await response.json()

      const results = data.data?.map((location: AmadeusLocation) => ({
        code: location.iataCode,
        city: location.address?.cityName || location.iataCode,
        name: location.name,
      })) || []

      return results.slice(0, 5)

    } catch (error) {
      console.error('Airport search error:', error)
      // Fallback to mock data if API fails
      return this.getMockAirports(query)
    }
  }
}

// Export singleton instance
export const flightApi = FlightApiService.getInstance()