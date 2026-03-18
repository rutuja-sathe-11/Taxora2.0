import { API_BASE_URL } from './api'

interface Conversation {
  id: string
  ca: string
  ca_detail: any
  sme: string
  sme_detail: any
  status: 'pending' | 'accepted' | 'active' | 'rejected' | 'closed'
  created_at: string
  updated_at: string
  last_message_at?: string
  last_message?: {
    id: string
    content: string
    created_at: string
    sender_id: string
  }
  unread_count: number
  other_participant?: any
}

interface Message {
  id: string
  conversation: string
  sender: string
  sender_id: string
  sender_detail: any
  content: string
  is_read: boolean
  read_at?: string
  created_at: string
  updated_at: string
  attachment?: string
  attachment_type?: string
}

class ChatService {
  private baseUrl = `${API_BASE_URL}/chat`
  private conversationCache: Map<string, Conversation> = new Map()
  private selectedConversationStorageKey = 'taxora:selectedConversationId'

  /**
   * Get all conversations for the current user
   */
  async getConversations(page = 1, pageSize = 50): Promise<{
    count: number
    next: string | null
    previous: string | null
    results: Conversation[]
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversations/?page=${page}&page_size=${pageSize}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }
  }

  /**
   * Get a single conversation with all its messages
   */
  async getConversation(conversationId: string): Promise<Conversation & { messages: Message[] }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversations/${conversationId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`)
      }

      const data = await response.json()
      this.conversationCache.set(conversationId, data)
      return data
    } catch (error) {
      console.error('Error fetching conversation:', error)
      throw error
    }
  }

  /**
   * Send a connection request from SME to CA
   */
  async sendConnectionRequest(caId: string): Promise<Conversation> {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversations/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ca: caId }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        // Backend may return an existing conversation on 400
        if (error?.conversation?.id) {
          this.conversationCache.set(error.conversation.id, error.conversation)
          return error.conversation
        }
        throw new Error(error.detail || error.error || 'Failed to send connection request')
      }

      const data = await response.json()
      this.conversationCache.set(data.id, data)
      return data
    } catch (error) {
      console.error('Error sending connection request:', error)
      throw error
    }
  }

  setSelectedConversationId(conversationId: string) {
    localStorage.setItem(this.selectedConversationStorageKey, conversationId)
  }

  consumeSelectedConversationId(): string | null {
    const id = localStorage.getItem(this.selectedConversationStorageKey)
    if (id) localStorage.removeItem(this.selectedConversationStorageKey)
    return id
  }

  /**
   * Accept a pending connection request (CA action)
   */
  async acceptConnectionRequest(conversationId: string): Promise<Conversation> {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversations/${conversationId}/accept/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to accept connection request: ${response.statusText}`)
      }

      const data = await response.json()
      this.conversationCache.set(conversationId, data)
      return data
    } catch (error) {
      console.error('Error accepting connection request:', error)
      throw error
    }
  }

  /**
   * Reject a pending connection request (CA action)
   */
  async rejectConnectionRequest(conversationId: string): Promise<Conversation> {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversations/${conversationId}/reject/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to reject connection request: ${response.statusText}`)
      }

      const data = await response.json()
      this.conversationCache.set(conversationId, data)
      return data
    } catch (error) {
      console.error('Error rejecting connection request:', error)
      throw error
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    content: string,
    attachment?: File,
    attachmentType?: string
  ): Promise<Message> {
    try {
      const formData = new FormData()
      formData.append('content', content)

      if (attachment) {
        formData.append('attachment', attachment)
        formData.append('attachment_type', attachmentType || 'other')
      }

      const response = await fetch(
        `${this.baseUrl}/conversations/${conversationId}/messages/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || error.content?.[0] || 'Failed to send message')
      }

      return response.json()
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  /**
   * Get messages in a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    page = 1,
    pageSize = 50
  ): Promise<{
    count: number
    next: string | null
    previous: string | null
    results: Message[]
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversations/${conversationId}/messages/?page=${page}&page_size=${pageSize}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw error
    }
  }

  /**
   * Mark all messages as read in a conversation
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversations/${conversationId}/mark_as_read/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to mark conversation as read: ${response.statusText}`)
      }

      // Update cache
      const conversation = this.conversationCache.get(conversationId)
      if (conversation) {
        conversation.unread_count = 0
        this.conversationCache.set(conversationId, conversation)
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error)
      throw error
    }
  }

  /**
   * Clear the conversation cache
   */
  clearCache(): void {
    this.conversationCache.clear()
  }

  /**
   * Get cached conversation
   */
  getCachedConversation(conversationId: string): Conversation | undefined {
    return this.conversationCache.get(conversationId)
  }
}

export const chatService = new ChatService()
