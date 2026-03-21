import React, { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Send, Bot, User, Lightbulb, FileText, Calculator, AlertTriangle, ChevronDown, ChevronUp, Paperclip, X } from 'lucide-react'
import { aiService } from '../services/ai'
import ReactMarkdown from 'react-markdown'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
  isExpanded?: boolean
}

const quickQuestions = [
  "How can I optimize my tax deductions this year?",
  "What are the GST compliance requirements for my business?",
  "How do I calculate TDS on professional services?",
  "What documents do I need for ITR filing?",
  "How can I claim input tax credit?",
  "What are the penalties for late GST filing?"
]

export const AITaxAdvisor: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI Tax Advisor. I can help you with tax planning, GST compliance, ITR filing, and other financial queries. What would you like to know?",
      timestamp: new Date(),
      suggestions: ["Tax Planning", "GST Queries", "ITR Filing", "TDS Calculations"]
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedRagFile, setSelectedRagFile] = useState<File | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const ragFileInputRef = useRef<HTMLInputElement>(null)
  
  const MAX_RESPONSE_LENGTH = 800 // Characters to show before truncating

  const scrollToBottom = (immediate = false) => {
    // Use requestAnimationFrame and multiple timeouts to ensure content is fully rendered
    const scroll = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'end' })
      }
      // Also try scrolling the container directly as a fallback
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    }

    if (immediate) {
      scroll()
    } else {
      requestAnimationFrame(() => {
        setTimeout(scroll, 50)
        // Additional scroll attempts for async markdown rendering
        setTimeout(scroll, 200)
        setTimeout(scroll, 500)
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Additional effect to handle markdown content rendering delays
  useEffect(() => {
    if (!messagesContainerRef.current) return

    let scrollTimeout: NodeJS.Timeout
    const observer = new MutationObserver(() => {
      // Debounce scroll calls to avoid excessive scrolling
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const container = messagesContainerRef.current
        if (container) {
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
          // Only scroll if user is near bottom (hasn't manually scrolled up)
          if (isNearBottom) {
            scrollToBottom()
          }
        }
      }, 100)
    })

    observer.observe(messagesContainerRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => {
      observer.disconnect()
      clearTimeout(scrollTimeout)
    }
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    try {
      const response = await aiService.chatWithAIWithMeta(content.trim(), {
        messages,
        sessionId,
        ragFile: selectedRagFile,
      })

      if (response.sessionId) {
        setSessionId(response.sessionId)
      }
      
      // Truncate response if too long
      let processedResponse = response.content
      if (response.content.length > MAX_RESPONSE_LENGTH * 2) {
        // If response is very long, truncate it more aggressively
        const { truncated } = truncateContent(response.content, MAX_RESPONSE_LENGTH * 2)
        processedResponse = truncated
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: processedResponse,
        timestamp: new Date(),
        suggestions: getContextualSuggestions(content)
      }

      setMessages(prev => [...prev, assistantMessage])
      setSelectedRagFile(null)
      if (ragFileInputRef.current) {
        ragFileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Failed to get AI response:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const getContextualSuggestions = (userQuery: string): string[] => {
    const query = userQuery.toLowerCase()
    
    if (query.includes('gst') || query.includes('tax')) {
      return ["Tell me about GST rates", "How to file GST returns?", "Input tax credit rules"]
    } else if (query.includes('itr') || query.includes('income tax')) {
      return ["ITR filing deadline", "Documents needed for ITR", "Tax deductions under 80C"]
    } else if (query.includes('tds')) {
      return ["TDS rates for FY 2024-25", "How to deposit TDS?", "TDS certificate format"]
    }
    
    return ["Tax saving tips", "Compliance checklist", "Business expenses"]
  }

  const handleQuickQuestion = (question: string) => {
    sendMessage(question)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputMessage)
    }
  }

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const truncateContent = (content: string, maxLength: number): { truncated: string; isLong: boolean } => {
    if (content.length <= maxLength) {
      return { truncated: content, isLong: false }
    }
    // Try to truncate at a sentence boundary
    const truncated = content.substring(0, maxLength)
    const lastPeriod = truncated.lastIndexOf('.')
    const lastNewline = truncated.lastIndexOf('\n')
    const cutPoint = Math.max(lastPeriod, lastNewline)
    
    if (cutPoint > maxLength * 0.7) {
      return { truncated: content.substring(0, cutPoint + 1), isLong: true }
    }
    return { truncated: content.substring(0, maxLength) + '...', isLong: true }
  }

  return (
    <div className="space-y-8 bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Tax Advisor</h1>
        <p className="text-gray-400">Get expert tax advice powered by artificial intelligence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-gray-900">
        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b border-gray-700">
              <CardTitle className="text-white flex items-center space-x-2">
                <Bot className="w-5 h-5 text-blue-400" />
                <span>Tax Advisor Chat</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 bg-gray-900 overflow-hidden">
              {/* Messages */}
              <div 
                ref={messagesContainerRef} 
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
                style={{ maxHeight: 'calc(600px - 140px)' }}
              >
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start space-x-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}>
                        {message.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                      </div>
                      
                      <div className={`p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-gray-100 border border-gray-700'
                      }`}>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            {(() => {
                              const isExpanded = expandedMessages.has(message.id)
                              const { truncated, isLong } = truncateContent(message.content, MAX_RESPONSE_LENGTH)
                              const displayContent = isExpanded ? message.content : truncated
                              
                              return (
                                <>
                                  <ReactMarkdown
                                    components={{
                                      h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                                      h2: ({ children }) => <h2 className="text-base font-semibold text-white mb-2">{children}</h2>,
                                      h3: ({ children }) => <h3 className="text-sm font-semibold text-white mb-1">{children}</h3>,
                                      p: ({ children }) => <p className="text-sm text-gray-100 mb-2">{children}</p>,
                                      ul: ({ children }) => <ul className="list-disc list-inside text-sm text-gray-100 mb-2 space-y-1">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-gray-100 mb-2 space-y-1">{children}</ol>,
                                      li: ({ children }) => <li className="text-sm text-gray-100">{children}</li>,
                                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                      em: ({ children }) => <em className="italic text-gray-200">{children}</em>,
                                      hr: () => <hr className="border-gray-600 my-3" />,
                                      blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-600 pl-3 italic text-gray-300">{children}</blockquote>
                                    }}
                                  >
                                    {displayContent}
                                  </ReactMarkdown>
                                  {isLong && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleMessageExpansion(message.id)}
                                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 p-0 h-auto flex items-center gap-1"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="w-3 h-3" />
                                          Show less
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-3 h-3" />
                                          Show more
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                        
                        {message.suggestions && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickQuestion(suggestion)}
                                className="text-xs"
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-400 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3 max-w-[80%]">
                      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-700 p-4 bg-gray-900">
                <div className="flex items-center space-x-2">
                  <input
                    ref={ragFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.csv,.md,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setSelectedRagFile(file)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => ragFileInputRef.current?.click()}
                    disabled={isTyping}
                    title="Upload document for RAG"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Ask me anything about taxes, GST, ITR filing..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={isTyping}
                  />
                  <Button 
                    onClick={() => sendMessage(inputMessage)}
                    disabled={isTyping || !inputMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {selectedRagFile && (
                  <div className="mt-2 flex items-center justify-between rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-200">
                    <span className="truncate mr-2">RAG document: {selectedRagFile.name}</span>
                    <button
                      type="button"
                      className="text-blue-300 hover:text-white"
                      onClick={() => {
                        setSelectedRagFile(null)
                        if (ragFileInputRef.current) ragFileInputRef.current.value = ''
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 bg-gray-900 min-h-full">
          {/* Quick Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>Quick Questions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickQuestion(question)}
                    className="w-full justify-start text-left h-auto py-2 px-3"
                  >
                    <span className="text-xs">{question}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">AI Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { icon: Calculator, label: 'Tax Calculations', desc: 'Calculate taxes, TDS, and deductions' },
                  { icon: FileText, label: 'Compliance Guide', desc: 'GST, ITR, and filing requirements' },
                  { icon: AlertTriangle, label: 'Risk Analysis', desc: 'Identify compliance risks and issues' },
                  { icon: Lightbulb, label: 'Optimization', desc: 'Tax planning and saving strategies' }
                ].map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <Icon className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-white font-medium text-sm">{feature.label}</p>
                        <p className="text-gray-400 text-xs">{feature.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card>
            <CardContent className="p-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-400 font-medium">Disclaimer</p>
                    <p className="text-xs text-gray-300 mt-1">
                      AI responses are for informational purposes only. Please consult with a qualified CA for specific advice.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}