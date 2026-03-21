import React, { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Send, Plus, Check, X, Clock, AlertCircle } from 'lucide-react'
import { chatService } from '../services/chat'
import { authService } from '../services/auth'
import { complianceService } from '../services/compliance'
import { useClients } from '../contexts/ClientContext'

interface Message {
  id: string
  sender_id: string
  sender_detail: any
  content: string
  created_at: string
  is_read: boolean
}

interface Conversation {
  id: string
  ca_detail: any
  sme_detail: any
  status: string
  messages?: Message[]
  other_participant?: any
}

interface ConversationListItem {
  id: string
  status: string
  last_message?: {
    content: string
    created_at: string
  }
  unread_count: number
  other_participant?: any
}

export const ChatComponent: React.FC = () => {
  const currentUser = authService.getCurrentUser()
  const { clients } = useClients()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'pending' | 'all'>('active')
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null)
  const [clientReports, setClientReports] = useState<any[]>([])
  const [mappedClientId, setMappedClientId] = useState<string>('')
  const [selectedReportId, setSelectedReportId] = useState<string>('')
  const [sharingReport, setSharingReport] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadConversations()
    // Set up polling for new messages every 2 seconds
    const interval = setInterval(loadConversations, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // If we navigated here from CA Connect, auto-open the target conversation once.
    const selectedId = chatService.consumeSelectedConversationId()
    if (!selectedId) return
    handleSelectConversation({ id: selectedId } as ConversationListItem)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations()
      setConversations(data.results)
      setError(null)
    } catch (err: any) {
      console.error('Error loading conversations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectConversation = async (conversation: ConversationListItem) => {
    try {
      setLoading(true)
      const fullConversation = await chatService.getConversation(conversation.id as string)
      setSelectedConversation(fullConversation)
      setMessages(fullConversation.messages || [])

      if (currentUser?.role === 'CA') {
        const participantEmail = fullConversation.other_participant?.email
        const matchedClient = clients.find(c => c.email?.toLowerCase() === String(participantEmail || '').toLowerCase())
        if (matchedClient) {
          const cid = String(matchedClient.id)
          setMappedClientId(cid)
          const reports = await complianceService.getReportsByClient(cid)
          setClientReports(reports)
        } else {
          setMappedClientId('')
          setClientReports([])
        }
        setSelectedReportId('')
      }

      setError(null)
    } catch (err: any) {
      console.error('Error loading conversation:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((!messageInput.trim() && !selectedAttachment) || !selectedConversation) {
      return
    }

    // Check if conversation is active
    if (!['active', 'accepted'].includes(selectedConversation.status)) {
      setError('Cannot send messages in ' + selectedConversation.status + ' conversations')
      return
    }

    try {
      setSending(true)
      const contentToSend = messageInput.trim() || (selectedAttachment ? `Shared file: ${selectedAttachment.name}` : '')
      const newMessage = await chatService.sendMessage(
        selectedConversation.id as string,
        contentToSend,
        selectedAttachment || undefined,
        selectedAttachment ? 'document' : undefined
      )
      
      setMessages([...messages, newMessage])
      setMessageInput('')
      setSelectedAttachment(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setError(null)
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handlePickAttachment = () => {
    fileInputRef.current?.click()
  }

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedAttachment(file)
    setError(null)
  }

  const handleShareSelectedReport = async () => {
    if (!selectedConversation || !selectedReportId) {
      return
    }

    try {
      setSharingReport(true)
      const report = clientReports.find(r => String(r.id) === selectedReportId)
      if (!report?.file_url) {
        throw new Error('Selected report file not available')
      }

      // Share as a direct secure link message to avoid cross-origin/download re-upload failures.
      const caption = `Shared report: ${report.report_type || 'report'}\n${report.file_url}`
      const sent = await chatService.sendMessage(
        selectedConversation.id as string,
        caption
      )
      setMessages(prev => [...prev, sent])
      setError(null)
      setSelectedReportId('')
    } catch (err: any) {
      console.error('Error sharing report:', err)
      const errorMessage = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to share report'
      setError(errorMessage)
    } finally {
      setSharingReport(false)
    }
  }

  const handleAcceptRequest = async (conversationId: string) => {
    try {
      await chatService.acceptConnectionRequest(conversationId)
      await loadConversations()
      setError(null)
    } catch (err: any) {
      console.error('Error accepting request:', err)
      setError(err.message)
    }
  }

  const handleRejectRequest = async (conversationId: string) => {
    try {
      await chatService.rejectConnectionRequest(conversationId)
      await loadConversations()
      setError(null)
    } catch (err: any) {
      console.error('Error rejecting request:', err)
      setError(err.message)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (tab === 'active') return conv.status === 'active'
    if (tab === 'pending') return conv.status === 'pending'
    return true
  })

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'accepted':
        return 'bg-blue-500/20 text-blue-400'
      case 'rejected':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Conversations List */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-white">Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-96 space-y-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab('active')}
                className={`px-3 py-1 rounded text-sm ${
                  tab === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setTab('pending')}
                className={`px-3 py-1 rounded text-sm ${
                  tab === 'pending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setTab('all')}
                className={`px-3 py-1 rounded text-sm ${
                  tab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded p-2 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredConversations.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  {tab === 'pending'
                    ? 'No pending requests'
                    : 'No conversations yet'}
                </p>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id
                        ? 'bg-blue-600/50'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white truncate">
                        {conv.other_participant?.business_name ||
                          conv.other_participant?.first_name ||
                          'User'}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${getStatusBadgeColor(conv.status)}`}>
                        {conv.status}
                      </span>
                      {conv.last_message?.created_at && (
                        <span className="text-gray-500">
                          {new Date(conv.last_message.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-2">
        {selectedConversation ? (
          <Card className="h-full flex flex-col">
            {/* Chat Header */}
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">
                    {selectedConversation.other_participant?.business_name ||
                      selectedConversation.other_participant?.first_name ||
                      'Chat'}
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">
                    {selectedConversation.other_participant?.email}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded ${getStatusBadgeColor(selectedConversation.status)}`}>
                  {selectedConversation.status}
                </span>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      String(msg.sender_id) === String(currentUser?.id) ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        String(msg.sender_id) === String(currentUser?.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-100'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      {msg.attachment && (
                        <a
                          href={msg.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline mt-2 inline-block opacity-90"
                        >
                          View attachment
                        </a>
                      )}
                      <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {String(msg.sender_id) === String(currentUser?.id) && (
                          <span className="ml-2">
                            {msg.is_read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Message Input */}
            {['active', 'accepted'].includes(selectedConversation.status) ? (
              <div className="border-t border-gray-700 p-4">
                {currentUser?.role === 'CA' && mappedClientId && clientReports.length > 0 && (
                  <div className="mb-3 flex gap-2">
                    <select
                      value={selectedReportId}
                      onChange={e => setSelectedReportId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm"
                    >
                      <option value="">Select report to share...</option>
                      {clientReports.map(report => (
                        <option key={report.id} value={String(report.id)}>
                          {report.report_type} • {new Date(report.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={handleShareSelectedReport}
                      disabled={!selectedReportId || sharingReport}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600"
                    >
                      {sharingReport ? 'Sharing...' : 'Share Report'}
                    </Button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentChange}
                  />
                  {currentUser?.role === 'CA' && (
                    <Button
                      type="button"
                      onClick={handlePickAttachment}
                      className="bg-gray-700 hover:bg-gray-600"
                      title="Attach and share document/report"
                    >
                      <Plus size={18} />
                    </Button>
                  )}
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    disabled={sending}
                    className="flex-1 bg-gray-700 text-white border-gray-600 placeholder-gray-400"
                  />
                  <Button
                    type="submit"
                    disabled={sending || (!messageInput.trim() && !selectedAttachment)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                  >
                    {sending ? (
                      <div className="animate-spin h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send size={18} />
                    )}
                  </Button>
                </form>
                {selectedAttachment && (
                  <div className="mt-2 text-xs text-gray-300 flex items-center justify-between bg-gray-800/60 rounded px-2 py-1">
                    <span className="truncate">Attachment: {selectedAttachment.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAttachment(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ) : selectedConversation.status === 'pending' && currentUser?.role === 'CA' ? (
              <div className="border-t border-gray-700 p-4 flex gap-2">
                <Button
                  onClick={() => handleAcceptRequest(selectedConversation.id as string)}
                  className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Accept Request
                </Button>
                <Button
                  onClick={() => handleRejectRequest(selectedConversation.id as string)}
                  className="flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Reject Request
                </Button>
              </div>
            ) : (
              <div className="border-t border-gray-700 p-4 text-center text-gray-400">
                <p className="flex items-center justify-center gap-2">
                  <Clock size={18} />
                  {selectedConversation.status === 'pending'
                    ? 'Waiting for CA response...'
                    : 'Conversation closed'}
                </p>
              </div>
            )}
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center text-gray-400">
              <p className="text-lg">Select a conversation to start chatting</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ChatComponent
