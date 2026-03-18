import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { clientService, Client } from '../services/clients'

interface ClientContextType {
  clients: Client[]
  loading: boolean
  addClient: (client: Client) => void
  updateClient: (id: string, client: Client) => void
  deleteClient: (id: string) => void
  refreshClients: () => Promise<void>
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

export const useClients = () => {
  const context = useContext(ClientContext)
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientProvider')
  }
  return context
}

interface ClientProviderProps {
  children: ReactNode
}

export const ClientProvider: React.FC<ClientProviderProps> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  const loadClients = async () => {
    setLoading(true)
    try {
      const clientsData = await clientService.getClients()
      setClients(clientsData)
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const addClient = (client: Client) => {
    setClients(prev => [...prev, client])
    // Refresh the list to get updated data from backend
    loadClients().catch(console.error)
  }

  const updateClient = (id: string, updatedClient: Client) => {
    setClients(prev => prev.map(client => 
      client.id === id ? updatedClient : client
    ))
  }

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(client => client.id !== id))
  }

  const refreshClients = async () => {
    await loadClients()
  }

  useEffect(() => {
    loadClients()
  }, [])

  const value: ClientContextType = {
    clients,
    loading,
    addClient,
    updateClient,
    deleteClient,
    refreshClients
  }

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  )
}

