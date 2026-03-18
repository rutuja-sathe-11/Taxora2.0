import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Search, UserCheck, Star, MapPin, MessageCircle, CheckCircle, Clock } from 'lucide-react'
import { authService } from '../services/auth'
import { chatService } from '../services/chat'

interface CA {
  id: string
  name: string
  firmName: string
  experience: number
  rating: number
  location: string
  specializations: string[]
  phone: string
  email: string
  isConnected: boolean
}

// Mock CA data
const mockCAs: CA[] = [
  {
    id: '1',
    name: 'CA Rajesh Kumar',
    firmName: 'Kumar & Associates',
    experience: 12,
    rating: 4.8,
    location: 'Mumbai, Maharashtra',
    specializations: ['GST', 'Income Tax', 'Corporate Law'],
    phone: '+91 98765 43210',
    email: 'rajesh@kumarassociates.com',
    isConnected: false
  },
  {
    id: '2',
    name: 'CA Priya Sharma',
    firmName: 'Sharma Tax Consultants',
    experience: 8,
    rating: 4.9,
    location: 'Delhi, NCR',
    specializations: ['Startup Advisory', 'GST', 'Audit'],
    phone: '+91 87654 32109',
    email: 'priya@sharmatax.com',
    isConnected: true
  },
  {
    id: '3',
    name: 'CA Amit Patel',
    firmName: 'Patel Financial Services',
    experience: 15,
    rating: 4.7,
    location: 'Bangalore, Karnataka',
    specializations: ['International Tax', 'Transfer Pricing', 'GST'],
    phone: '+91 76543 21098',
    email: 'amit@patelfinancial.com',
    isConnected: false
  }
]

export const CAConnect: React.FC = () => {
  const [cas, setCAs] = useState<CA[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterSpecialization, setFilterSpecialization] = useState('')

  useEffect(() => {
    loadCAs()
  }, [])

  const loadCAs = async () => {
    setLoading(true)
    try {
      const data = await authService.listCAs()
      
      // Transform backend data to CA format
      const transformedCAs: CA[] = data.map((ca: any) => ({
        id: ca.id,
        name: ca.name || `${ca.first_name || ''} ${ca.last_name || ''}`.trim() || 'CA',
        firmName: ca.business_name || 'Independent CA',
        experience: 5, // Default value, can be added to backend
        rating: 4.5, // Default value, can be added to backend
        location: 'India', // Default value, can be added to backend
        specializations: ['GST', 'Income Tax', 'Compliance'], // Default value, can be added to backend
        phone: ca.phone || '',
        email: ca.email || '',
        isConnected: ca.is_connected || false
      }))
      
      setCAs(transformedCAs)
    } catch (error) {
      console.error('Error loading CAs:', error)
      // Fallback to mock data on error
      setCAs(mockCAs)
    } finally {
      setLoading(false)
    }
  }

  const filteredCAs = cas.filter(ca => {
    const matchesSearch = ca.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ca.firmName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = !filterLocation || ca.location.toLowerCase().includes(filterLocation.toLowerCase())
    const matchesSpecialization = !filterSpecialization || 
                                 ca.specializations.some(spec => spec.toLowerCase().includes(filterSpecialization.toLowerCase()))
    
    return matchesSearch && matchesLocation && matchesSpecialization
  })

  const handleConnect = async (caId: string) => {
    try {
      await authService.connectWithCA(caId)
      
      setCAs(prevCAs => 
        prevCAs.map(ca => 
          ca.id === caId ? { ...ca, isConnected: true } : ca
        )
      )
      
      alert('Connected with CA successfully.')
    } catch (error: any) {
      console.error('Error connecting with CA:', error)
      alert(error.message || 'Error connecting with CA. Please try again.')
    }
  }

  const handleMessage = async (ca: CA) => {
    try {
      // Find existing conversation with this CA, otherwise create one
      const list = await chatService.getConversations()
      const existing = list.results.find(
        (c: any) => String(c.other_participant?.id) === String(ca.id)
      )

      const conversation = existing
        ? { id: existing.id }
        : await chatService.sendConnectionRequest(ca.id)

      chatService.setSelectedConversationId(conversation.id)
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'chat' }))
    } catch (error: any) {
      console.error('Error opening chat:', error)
      alert(error.message || 'Could not open chat. Please try again.')
    }
  }

  const connectedCAs = cas.filter(ca => ca.isConnected)
  const availableCAs = cas.filter(ca => !ca.isConnected)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">CA Connect</h1>
        <p className="text-gray-400">Find and connect with qualified Chartered Accountants</p>
      </div>

      {/* Connected CAs */}
      {connectedCAs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Your Connected CAs ({connectedCAs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedCAs.map((ca) => (
                <div key={ca.id} className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{ca.name}</h3>
                      <p className="text-sm text-gray-300">{ca.firmName}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-300">{ca.rating}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{ca.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <UserCheck className="w-4 h-4" />
                      <span>{ca.experience} years experience</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleMessage(ca)}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search CAs or firms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Input
              placeholder="Filter by location..."
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            />
            
            <Input
              placeholder="Filter by specialization..."
              value={filterSpecialization}
              onChange={(e) => setFilterSpecialization(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Available CAs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Find Chartered Accountants ({filteredCAs.filter(ca => !ca.isConnected).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCAs.filter(ca => !ca.isConnected).map((ca) => (
              <div key={ca.id} className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white mb-1">{ca.name}</h3>
                    <p className="text-sm text-gray-300">{ca.firmName}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-300">{ca.rating}</span>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{ca.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <UserCheck className="w-4 h-4" />
                    <span>{ca.experience} years experience</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Specializations:</p>
                  <div className="flex flex-wrap gap-1">
                    {ca.specializations.map((spec, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={() => handleConnect(ca.id)}
                    className="w-full"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Connect
                  </Button>
                  <div className="flex space-x-2">
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}