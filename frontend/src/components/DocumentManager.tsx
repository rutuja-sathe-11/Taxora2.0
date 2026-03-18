import React, { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Upload, Search, Filter, Eye, Download, Trash2, Share, FileText, Image, File } from 'lucide-react'
import { Document } from '../types'
import { documentService } from '../services/documents'
import { formatDate } from '../lib/utils'

export const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'receipt', label: 'Receipts' },
    { value: 'gst_return', label: 'GST Returns' },
    { value: 'itr', label: 'ITR Documents' },
    { value: 'tds', label: 'TDS Certificates' },
    { value: 'balance_sheet', label: 'Balance Sheets' },
    { value: 'bank_statement', label: 'Bank Statements' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const docs = await documentService.getDocuments()
      setDocuments(docs)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const name = file.name.split('.')[0]
        const category = 'other' // Default category, user can change later
        
        await documentService.uploadDocument(file, name, category)
      }
      
      await loadDocuments()
    } catch (error) {
      console.error('Error uploading documents:', error)
      alert('Error uploading documents. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return

    try {
      await documentService.deleteDocument(id)
      setDocuments(docs => docs.filter(doc => doc.id !== id))
    } catch (error) {
      console.error('Error deleting document:', error)
      // no alert
    }
  }

  const handleShare = async (document: Document) => {
    const email = window.prompt('Enter email address to share with:')
    if (!email) return

    try {
      await documentService.shareDocument(document.id, {
        shared_with_email: email,
        permissions: 'VIEW'
      })
      // success toast could be added
    } catch (error) {
      console.error('Error sharing document:', error)
      alert('Error sharing document. Please try again.')
    }
  }

  const filteredDocuments = documents.map((doc: any) => ({
    id: doc.id,
    name: doc.name,
    type: (doc.category || doc.type || 'other') as any,
    uploadDate: doc.created_at || doc.uploadDate,
    size: doc.file_size ? `${Math.round(doc.file_size/1024)} KB` : (doc.size || ''),
    status: doc.status || 'completed',
    aiSummary: doc.ai_summary || doc.aiSummary,
  })).filter((doc) => {
    const matchesSearch = (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || doc.type === filterCategory
    return matchesSearch && matchesCategory
  })

  const getFileIcon = (document: Document) => {
    if (document.type === 'invoice' || document.type === 'receipt') {
      return <FileText className="w-8 h-8 text-blue-400" />
    }
    
    const extension = document.name.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return <Image className="w-8 h-8 text-green-400" />
    }
    
    return <File className="w-8 h-8 text-gray-400" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10'
      case 'processing': return 'text-yellow-400 bg-yellow-400/10'
      case 'failed': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Document Management</h1>
        <p className="text-gray-400">Upload, organize and manage your business documents</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
            />
            
            {uploading ? (
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white font-medium">Uploading documents...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div className="text-white">
                  <p className="font-medium">Drop files here or click to upload</p>
                  <p className="text-sm text-gray-400 mt-1">Supports PDF, Images, Word, Excel files</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No documents found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    {getFileIcon(document)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(document.status)}`}>
                      {document.status}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-white mb-1 truncate">{document.name}</h3>
                  <p className="text-sm text-gray-400 mb-2">{document.type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-500 mb-3">{formatDate(document.uploadDate)}</p>
                  
                  {document.aiSummary && (
                    <p className="text-xs text-blue-400 mb-3 line-clamp-2">{document.aiSummary}</p>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleShare(document)}
                    >
                      <Share className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(document.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}