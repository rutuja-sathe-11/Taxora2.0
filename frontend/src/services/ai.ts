import { Transaction, Document, AIInsight } from '../types'
import { aiAPI, documentAPI } from './api'

class AIService {
  async processInvoice(file: File): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'invoice')
    formData.append('name', file.name)
    try {
      const response = await documentAPI.upload(formData)
      return response.data
    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  async analyzeTransactions(transactions: Transaction[]): Promise<AIInsight[]> {
    try {
      const response = await aiAPI.insights()
      return response.data.results || response.data
    } catch (error) {
      console.error('Error getting insights:', error)
      return []
    }
  }

  private formatAIResponse(raw: any): string {
    const aiResponse = raw?.ai_response?.content || raw?.ai_response || raw?.analysis || 'OK'

    try {
      const parsedResponse = JSON.parse(aiResponse)
      if (parsedResponse.title && parsedResponse.advice) {
        let formattedResponse = `# ${parsedResponse.title}\n\n`
        if (parsedResponse.summary) {
          formattedResponse += `**Summary:** ${parsedResponse.summary}\n\n`
        }
        formattedResponse += parsedResponse.advice
        if (parsedResponse.disclaimer) {
          let disclaimer = parsedResponse.disclaimer
          if (typeof disclaimer === 'string' && disclaimer.includes('"disclaimer":')) {
            const match = disclaimer.match(/"disclaimer":\s*"([^"]+)"/)
            if (match) {
              disclaimer = match[1]
            }
          }
          formattedResponse += `\n\n---\n\n*${disclaimer}*`
        }
        return formattedResponse
      }
    } catch {
      // plain text
    }

    return aiResponse
  }

  async chatWithAIWithMeta(message: string, context?: any): Promise<{ content: string; sessionId?: string }> {
    try {
      let response

      if (context?.ragFile instanceof File) {
        const formData = new FormData()
        formData.append('message', message)
        if (context?.sessionId) {
          formData.append('session_id', context.sessionId)
        }
        formData.append('rag_file', context.ragFile)
        response = await aiAPI.ragChat(formData)
      } else if (context?.sessionId) {
        const formData = new FormData()
        formData.append('message', message)
        formData.append('session_id', context.sessionId)
        response = await aiAPI.ragChat(formData)
      } else {
        response = await aiAPI.chat({
          message,
          session_id: context?.sessionId,
          context_documents: context?.documents || [],
          context_transactions: context?.transactions || []
        })
      }

      return {
        content: this.formatAIResponse(response.data),
        sessionId: response.data?.session_id,
      }
    } catch (error) {
      console.error('Error chatting with AI:', error)
      throw new Error('Failed to get AI response')
    }
  }

  async chatWithAI(message: string, context?: any): Promise<string> {
    const result = await this.chatWithAIWithMeta(message, context)
    return result.content
  }

  async generateDocumentSummary(document: Document): Promise<string> {
    try {
      const response = await aiAPI.analyzeDocuments([document.id])
      return response.data.analysis
    } catch (error) {
      console.error('Error generating summary:', error)
      return 'Failed to generate summary'
    }
  }

  async getInsights(filters?: any): Promise<AIInsight[]> {
    try {
      const response = await aiAPI.insights(filters)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error getting insights:', error)
      return []
    }
  }

  async markInsightRead(insightId: string): Promise<void> {
    try {
      await aiAPI.markInsightRead(insightId)
    } catch (error) {
      console.error('Error marking insight as read:', error)
    }
  }

  async dismissInsight(insightId: string): Promise<void> {
    try {
      await aiAPI.dismissInsight(insightId)
    } catch (error) {
      console.error('Error dismissing insight:', error)
    }
  }
}

export const aiService = new AIService()