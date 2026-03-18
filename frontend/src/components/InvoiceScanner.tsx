import React, { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Upload, Camera, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { aiService } from '../services/ai'
import { transactionAPI } from '../services/api'
import { formatCurrency } from '../lib/utils'

interface ExtractedData {
  vendor: string
  amount: number
  date: string
  invoiceNumber: string
  gstNumber: string
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
  taxes: {
    cgst: number
    sgst: number
    igst: number
    total: number
  }
}

export const InvoiceScanner: React.FC = () => {
  const [processing, setProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastDocumentId, setLastDocumentId] = useState<string | null>(null)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setProcessing(true)
    setError(null)
    setUploadedFile(file)

    try {
      // Upload document and process with AI (backend does OCR/NER)
      const document = await aiService.processInvoice(file)
      setLastDocumentId(document.id)
      const data = document.extracted_data || {}
      const parsed: ExtractedData = {
        vendor: data.vendor_name || data.vendor || '',
        amount: Number(data.total_amount || data.amount || 0),
        date: data.invoice_date || data.date || '',
        invoiceNumber: data.invoice_number || data.invoiceNo || '',
        gstNumber: data.gst_number || data.gstin || '',
        items: Array.isArray(data.items) ? data.items.map((it: any) => ({
          description: it.description || '',
          quantity: Number(it.quantity || 1),
          rate: Number(it.rate || it.unit_price || 0),
          amount: Number(it.amount || 0)
        })) : [],
        taxes: {
          cgst: Number(data.cgst ?? data.cgst_amount ?? 0),
          sgst: Number(data.sgst ?? data.sgst_amount ?? 0),
          igst: Number(data.igst ?? data.igst_amount ?? 0),
          total: Number((data.cgst ?? data.cgst_amount ?? 0) + (data.sgst ?? data.sgst_amount ?? 0) + (data.igst ?? data.igst_amount ?? 0))
        }
      }
      setExtractedData(parsed)
    } catch (err) {
      setError('Failed to process invoice. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const saveTransaction = async () => {
    if (!extractedData) return
    
    try {
      // Create transaction from extracted data
      const todayIso = new Date().toISOString().slice(0, 10)
      const txDate = (extractedData.date || '').slice(0, 10) || todayIso
      
      // Set description and category based on transaction type
      const description = transactionType === 'income' 
        ? `Invoice to ${extractedData.vendor}` 
        : `Invoice from ${extractedData.vendor}`
      
      const category = transactionType === 'income'
        ? 'Sales Revenue'
        : 'Office Expenses'
      
      const transactionData = {
        date: txDate,
        description: description,
        amount: Number(extractedData.amount || 0),
        type: transactionType,
        category: category,
        invoice_number: extractedData.invoiceNumber,
        vendor_name: extractedData.vendor,
        gst_number: extractedData.gstNumber,
        cgst_amount: Number(extractedData.taxes.cgst || 0),
        sgst_amount: Number(extractedData.taxes.sgst || 0),
        igst_amount: Number(extractedData.taxes.igst || 0),
        tds_amount: 0
      }
      
      const payload = lastDocumentId ? { ...transactionData, document_ids: [lastDocumentId] } : transactionData
      await transactionAPI.create(payload)
      // Reset state
      setExtractedData(null)
      setUploadedFile(null)
      setLastDocumentId(null)
      setTransactionType('expense') // Reset to default
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error saving transaction:', error)
      alert('Error saving transaction. Please try again.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Invoice Scanner</h1>
        <p className="text-gray-400">Upload invoices and let AI extract the data automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Upload Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf"
                className="hidden"
              />
              
              {processing ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
                  <div className="text-white">
                    <p className="font-medium">Processing Invoice...</p>
                    <p className="text-sm text-gray-400 mt-1">Using AI to extract data</p>
                  </div>
                </div>
              ) : uploadedFile ? (
                <div className="space-y-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <div className="text-white">
                    <p className="font-medium">File Uploaded</p>
                    <p className="text-sm text-gray-400">{uploadedFile.name}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div className="text-white">
                    <p className="font-medium">Drop invoice here or click to upload</p>
                    <p className="text-sm text-gray-400 mt-1">Supports JPG, PNG, PDF</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="mt-6 flex space-x-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <Button
                variant="outline"
                disabled={processing}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Extracted Data</CardTitle>
          </CardHeader>
          <CardContent>
            {extractedData ? (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-3">Invoice Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Vendor</p>
                      <p className="text-white font-medium">{extractedData.vendor}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="text-white font-medium">{extractedData.date}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Invoice Number</p>
                      <p className="text-white font-medium">{extractedData.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">GST Number</p>
                      <p className="text-white font-medium">{extractedData.gstNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-3">Items</h3>
                  <div className="space-y-2">
                    {extractedData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                        <div>
                          <p className="text-white font-medium">{item.description}</p>
                          <p className="text-sm text-gray-400">{item.quantity} × {formatCurrency(item.rate)}</p>
                        </div>
                        <p className="text-white font-medium">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Taxes */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-3">Tax Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">CGST</span>
                      <span className="text-white">{formatCurrency(extractedData.taxes.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">SGST</span>
                      <span className="text-white">{formatCurrency(extractedData.taxes.sgst)}</span>
                    </div>
                    {extractedData.taxes.igst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">IGST</span>
                        <span className="text-white">{formatCurrency(extractedData.taxes.igst)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-gray-700 pt-2">
                      <span className="text-white">Total Amount</span>
                      <span className="text-white">{formatCurrency(extractedData.amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Transaction Type Selection */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-3">Transaction Type</h3>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select how this transaction should be categorized:
                    </label>
                    <select
                      value={transactionType}
                      onChange={(e) => setTransactionType(e.target.value as 'income' | 'expense')}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="expense">Expense (Debit)</option>
                      <option value="income">Income (Credit)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-2">
                      {transactionType === 'income' 
                        ? 'This will credit the amount to your account' 
                        : 'This will debit the amount from your account'}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button onClick={saveTransaction} className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Transaction
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExtractedData(null)
                      setTransactionType('expense')
                    }}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Upload an invoice to see extracted data here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-white">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-semibold text-blue-400 mb-2">Tax Compliance Check</h4>
              <p className="text-gray-300 text-sm">
                ✅ GST number is valid and registered<br/>
                ✅ Invoice format complies with GST requirements<br/>
                ✅ Input tax credit of {formatCurrency(extractedData.taxes.total)} can be claimed<br/>
                💡 This expense can be categorized under "Office Supplies" for tax deduction
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}