import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { FileText, Calculator, Calendar, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { complianceService } from '../services/compliance'
import { useClients } from '../contexts/ClientContext'

interface TaxCalculation {
  grossIncome: number
  totalDeductions: number
  taxableIncome: number
  incomeTax: number
  healthCess: number
  totalTaxLiability: number
  effectiveTaxRate: number
}

interface GSTCalculation {
  taxableAmount: number
  gstRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalGst: number
  totalAmount: number
}

export const TaxFilingAssistant: React.FC = () => {
  const { clients } = useClients()
  const [activeTab, setActiveTab] = useState<'gst' | 'itr' | 'tds'>('gst')
  const [loading, setLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState('all')
  
  // GST Form State
  const [gstForm, setGstForm] = useState({
    period: new Date().toISOString().slice(0, 7), // YYYY-MM format
    taxableAmount: '',
    gstRate: '18',
    transactionType: 'intrastate' as 'intrastate' | 'interstate'
  })
  const [gstResult, setGstResult] = useState<GSTCalculation | null>(null)

  // ITR Form State
  const [itrForm, setItrForm] = useState({
    assessmentYear: '2024-25',
    itrFormType: 'ITR1',
    incomeAmount: '',
    deductions80c: '',
    deductions80d: '',
    otherDeductions: '',
    taxPaid: ''
  })
  const [itrResult, setItrResult] = useState<TaxCalculation | null>(null)

  // TDS Form State
  const [tdsForm, setTdsForm] = useState({
    paymentType: 'professional_services',
    amount: '',
    panAvailable: true
  })

  const handleGSTCalculation = async () => {
    if (!gstForm.taxableAmount || !gstForm.gstRate) return

    setLoading(true)
    try {
      const clientId = selectedClient !== 'all' ? selectedClient : undefined
      const result = await complianceService.calculateGST({
        taxable_amount: parseFloat(gstForm.taxableAmount),
        gst_rate: parseFloat(gstForm.gstRate),
        transaction_type: gstForm.transactionType
      }, clientId)
      
      // Transform API response from snake_case to camelCase
      const transformedResult: GSTCalculation = {
        taxableAmount: result.taxable_amount ?? result.taxableAmount ?? 0,
        gstRate: result.gst_rate ?? result.gstRate ?? 0,
        cgstAmount: result.cgst_amount ?? result.cgstAmount ?? 0,
        sgstAmount: result.sgst_amount ?? result.sgstAmount ?? 0,
        igstAmount: result.igst_amount ?? result.igstAmount ?? 0,
        totalGst: result.total_gst ?? result.totalGst ?? 0,
        totalAmount: result.total_amount ?? result.totalAmount ?? 0
      }
      setGstResult(transformedResult)
    } catch (error) {
      console.error('Error calculating GST:', error)
      // Fallback calculation with proper number validation
      const taxableAmount = parseFloat(gstForm.taxableAmount) || 0
      const gstRate = parseFloat(gstForm.gstRate) || 0
      
      if (taxableAmount <= 0 || gstRate <= 0) {
        alert('Please enter valid taxable amount and GST rate')
        setLoading(false)
        return
      }
      
      const totalGst = (taxableAmount * gstRate) / 100
      
      const fallbackResult: GSTCalculation = {
        taxableAmount: Number(taxableAmount.toFixed(2)),
        gstRate: Number(gstRate.toFixed(2)),
        cgstAmount: gstForm.transactionType === 'intrastate' ? Number((totalGst / 2).toFixed(2)) : 0,
        sgstAmount: gstForm.transactionType === 'intrastate' ? Number((totalGst / 2).toFixed(2)) : 0,
        igstAmount: gstForm.transactionType === 'interstate' ? Number(totalGst.toFixed(2)) : 0,
        totalGst: Number(totalGst.toFixed(2)),
        totalAmount: Number((taxableAmount + totalGst).toFixed(2))
      }
      setGstResult(fallbackResult)
    } finally {
      setLoading(false)
    }
  }

  const handleITRCalculation = async () => {
    if (!itrForm.incomeAmount) return

    setLoading(true)
    try {
      const clientId = selectedClient !== 'all' ? selectedClient : undefined
      const result = await complianceService.calculateTax({
        income_amount: parseFloat(itrForm.incomeAmount),
        calculation_type: 'income_tax',
        assessment_year: itrForm.assessmentYear,
        deductions_80c: parseFloat(itrForm.deductions80c) || 0,
        deductions_80d: parseFloat(itrForm.deductions80d) || 0,
        other_deductions: parseFloat(itrForm.otherDeductions) || 0
      }, clientId)
      
      // Transform API response from snake_case to camelCase
      const transformedResult: TaxCalculation = {
        grossIncome: result.gross_income ?? result.grossIncome ?? 0,
        totalDeductions: result.total_deductions ?? result.totalDeductions ?? 0,
        taxableIncome: result.taxable_income ?? result.taxableIncome ?? 0,
        incomeTax: result.income_tax ?? result.incomeTax ?? 0,
        healthCess: result.health_cess ?? result.healthCess ?? 0,
        totalTaxLiability: result.total_tax_liability ?? result.totalTaxLiability ?? 0,
        effectiveTaxRate: result.effective_tax_rate ?? result.effectiveTaxRate ?? 0
      }
      setItrResult(transformedResult)
    } catch (error) {
      console.error('Error calculating tax:', error)
      // Fallback calculation with proper number validation
      const grossIncome = parseFloat(itrForm.incomeAmount) || 0
      const deductions80c = Math.min(parseFloat(itrForm.deductions80c) || 0, 150000)
      const deductions80d = parseFloat(itrForm.deductions80d) || 0
      const otherDeductions = parseFloat(itrForm.otherDeductions) || 0
      
      if (grossIncome <= 0) {
        alert('Please enter a valid income amount')
        setLoading(false)
        return
      }
      
      const totalDeductions = deductions80c + deductions80d + otherDeductions
      const taxableIncome = Math.max(0, grossIncome - totalDeductions)
      
      // Simple tax calculation (FY 2023-24 rates)
      let incomeTax = 0
      if (taxableIncome > 1000000) {
        incomeTax = 112500 + (taxableIncome - 1000000) * 0.3
      } else if (taxableIncome > 500000) {
        incomeTax = 12500 + (taxableIncome - 500000) * 0.2
      } else if (taxableIncome > 250000) {
        incomeTax = (taxableIncome - 250000) * 0.05
      }
      
      const healthCess = incomeTax * 0.04
      const totalTaxLiability = incomeTax + healthCess
      const effectiveTaxRate = grossIncome > 0 ? (totalTaxLiability / grossIncome) * 100 : 0
      
      const fallbackResult: TaxCalculation = {
        grossIncome: Number(grossIncome.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),
        taxableIncome: Number(taxableIncome.toFixed(2)),
        incomeTax: Number(incomeTax.toFixed(2)),
        healthCess: Number(healthCess.toFixed(2)),
        totalTaxLiability: Number(totalTaxLiability.toFixed(2)),
        effectiveTaxRate: Number(effectiveTaxRate.toFixed(2))
      }
      setItrResult(fallbackResult)
    } finally {
      setLoading(false)
    }
  }

  const handleFileITR = async () => {
    if (!itrResult) {
      alert('Please calculate tax first before filing ITR')
      return
    }

    if (!itrForm.incomeAmount) {
      alert('Please enter income amount')
      return
    }

    setLoading(true)
    try {
      // Calculate due date (typically July 31st of the assessment year)
      const assessmentYear = itrForm.assessmentYear
      const year = parseInt(assessmentYear.split('-')[0])
      const dueDate = new Date(year, 6, 31) // July 31st (month is 0-indexed)
      
      const filingData = {
        assessment_year: assessmentYear,
        itr_form: itrForm.itrFormType,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'draft',
        gross_total_income: itrResult.grossIncome,
        total_deductions: itrResult.totalDeductions,
        taxable_income: itrResult.taxableIncome,
        tax_computed: itrResult.totalTaxLiability,
        tax_paid: parseFloat(itrForm.taxPaid) || 0,
        refund_amount: Math.max(0, (parseFloat(itrForm.taxPaid) || 0) - itrResult.totalTaxLiability)
      }

      const result = await complianceService.fileITR(filingData)
      
      // Create a downloadable JSON file with ITR data
      const dataStr = JSON.stringify({
        ...filingData,
        acknowledgment_number: result.acknowledgment_number || 'Pending',
        filing_id: result.id,
        calculated_at: new Date().toISOString()
      }, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `itr-${assessmentYear}-${itrForm.itrFormType}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      alert(`ITR ${itrForm.itrFormType} for ${assessmentYear} has been filed successfully!`)
    } catch (error) {
      console.error('Error filing ITR:', error)
      alert('Error filing ITR. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateGSTR3B = async () => {
    setLoading(true)
    try {
      const clientId = selectedClient !== 'all' ? selectedClient : undefined
      const result = await complianceService.generateGSTR3B(gstForm.period, clientId)
      console.log('GSTR-3B Data:', result)
      
      // Create a downloadable JSON file with GST data
      const dataStr = JSON.stringify(result, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gstr3b-${gstForm.period}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      alert('GSTR-3B data generated and downloaded successfully!')
    } catch (error) {
      console.error('Error generating GSTR-3B:', error)
      // Generate mock GSTR-3B data
      const mockGSTR3B = {
        period: gstForm.period,
        gstin: "27AABCU9603R1ZX",
        business_name: "Sample Business",
        outward_supplies: {
          taxable_value: 100000,
          cgst: 9000,
          sgst: 9000,
          igst: 0,
          cess: 0
        },
        inward_supplies: {
          taxable_value: 50000,
          cgst: 4500,
          sgst: 4500,
          igst: 0,
          cess: 0
        },
        input_tax_credit: {
          cgst: 4500,
          sgst: 4500,
          igst: 0,
          cess: 0
        },
        net_tax_payable: {
          cgst: 4500,
          sgst: 4500,
          igst: 0,
          cess: 0
        }
      }
      
      const dataStr = JSON.stringify(mockGSTR3B, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gstr3b-${gstForm.period}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      alert('GSTR-3B data generated with sample data!')
    } finally {
      setLoading(false)
    }
  }

  const getTDSRate = (paymentType: string, panAvailable: boolean) => {
    const rates: { [key: string]: { withPAN: number; withoutPAN: number } } = {
      professional_services: { withPAN: 10, withoutPAN: 20 },
      rent: { withPAN: 10, withoutPAN: 20 },
      commission: { withPAN: 5, withoutPAN: 20 },
      interest: { withPAN: 10, withoutPAN: 20 }
    }
    
    const rate = rates[paymentType] || rates.professional_services
    return panAvailable ? rate.withPAN : rate.withoutPAN
  }

  const calculateTDS = () => {
    if (!tdsForm.amount) return 0
    const amount = parseFloat(tdsForm.amount) || 0
    if (amount <= 0) return 0
    const rate = getTDSRate(tdsForm.paymentType, tdsForm.panAvailable)
    return Number(((amount * rate) / 100).toFixed(2))
  }

  const tabs = [
    { id: 'gst', label: 'GST Returns', icon: FileText },
    { id: 'itr', label: 'ITR Filing', icon: Calculator },
    { id: 'tds', label: 'TDS Calculator', icon: DollarSign }
  ]

  const renderGSTTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">GST Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Taxable Amount</label>
              <Input
                type="number"
                value={gstForm.taxableAmount}
                onChange={(e) => setGstForm(prev => ({ ...prev, taxableAmount: e.target.value }))}
                placeholder="Enter taxable amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">GST Rate (%)</label>
              <select
                value={gstForm.gstRate}
                onChange={(e) => setGstForm(prev => ({ ...prev, gstRate: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Type</label>
              <select
                value={gstForm.transactionType}
                onChange={(e) => setGstForm(prev => ({ ...prev, transactionType: e.target.value as any }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="intrastate">Intrastate (CGST + SGST)</option>
                <option value="interstate">Interstate (IGST)</option>
              </select>
            </div>

            <Button onClick={handleGSTCalculation} disabled={loading} className="w-full">
              {loading ? 'Calculating...' : 'Calculate GST'}
            </Button>
          </CardContent>
        </Card>

        {gstResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">GST Calculation Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Taxable Amount:</span>
                <span className="text-white font-medium">{formatCurrency(gstResult.taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">GST Rate:</span>
                <span className="text-white font-medium">{gstResult.gstRate}%</span>
              </div>
              {gstResult.cgstAmount > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">CGST:</span>
                    <span className="text-white font-medium">{formatCurrency(gstResult.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">SGST:</span>
                    <span className="text-white font-medium">{formatCurrency(gstResult.sgstAmount)}</span>
                  </div>
                </>
              )}
              {gstResult.igstAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">IGST:</span>
                  <span className="text-white font-medium">{formatCurrency(gstResult.igstAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Total GST:</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(gstResult.totalGst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Total Amount:</span>
                  <span className="text-blue-400 font-semibold">{formatCurrency(gstResult.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">GSTR-3B Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Return Period</label>
              <Input
                type="month"
                value={gstForm.period}
                onChange={(e) => setGstForm(prev => ({ ...prev, period: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerateGSTR3B} disabled={loading} className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                {loading ? 'Generating...' : 'Generate GSTR-3B'}
              </Button>
            </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">GSTR-3B Features</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Automatic calculation from transaction data</li>
              <li>• Input tax credit optimization</li>
              <li>• Compliance validation</li>
              <li>• Ready-to-file format</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderITRTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Income Tax Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Assessment Year</label>
              <select
                value={itrForm.assessmentYear}
                onChange={(e) => setItrForm(prev => ({ ...prev, assessmentYear: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024-25">AY 2024-25</option>
                <option value="2023-24">AY 2023-24</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">ITR Form Type</label>
              <select
                value={itrForm.itrFormType}
                onChange={(e) => setItrForm(prev => ({ ...prev, itrFormType: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ITR1">ITR-1 (Sahaj) - For Salaried Individuals</option>
                <option value="ITR2">ITR-2 - For Individuals & HUFs</option>
                <option value="ITR3">ITR-3 - For Business/Profession</option>
                <option value="ITR4">ITR-4 (Sugam) - For Presumptive Business</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Gross Total Income</label>
              <Input
                type="number"
                value={itrForm.incomeAmount}
                onChange={(e) => setItrForm(prev => ({ ...prev, incomeAmount: e.target.value }))}
                placeholder="Enter total income"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Deductions u/s 80C</label>
              <Input
                type="number"
                value={itrForm.deductions80c}
                onChange={(e) => setItrForm(prev => ({ ...prev, deductions80c: e.target.value }))}
                placeholder="Max ₹1,50,000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Deductions u/s 80D</label>
              <Input
                type="number"
                value={itrForm.deductions80d}
                onChange={(e) => setItrForm(prev => ({ ...prev, deductions80d: e.target.value }))}
                placeholder="Health insurance premium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Other Deductions</label>
              <Input
                type="number"
                value={itrForm.otherDeductions}
                onChange={(e) => setItrForm(prev => ({ ...prev, otherDeductions: e.target.value }))}
                placeholder="Other eligible deductions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tax Already Paid (TDS/Advance Tax)</label>
              <Input
                type="number"
                value={itrForm.taxPaid}
                onChange={(e) => setItrForm(prev => ({ ...prev, taxPaid: e.target.value }))}
                placeholder="Enter tax already paid"
              />
            </div>

            <Button onClick={handleITRCalculation} disabled={loading} className="w-full">
              {loading ? 'Calculating...' : 'Calculate Tax'}
            </Button>
          </CardContent>
        </Card>

        {itrResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Tax Calculation Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Gross Income:</span>
                <span className="text-white font-medium">{formatCurrency(itrResult.grossIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Deductions:</span>
                <span className="text-white font-medium">{formatCurrency(itrResult.totalDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Taxable Income:</span>
                <span className="text-white font-medium">{formatCurrency(itrResult.taxableIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Income Tax:</span>
                <span className="text-white font-medium">{formatCurrency(itrResult.incomeTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Health & Education Cess:</span>
                <span className="text-white font-medium">{formatCurrency(itrResult.healthCess)}</span>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Total Tax Liability:</span>
                  <span className="text-red-400 font-semibold">{formatCurrency(itrResult.totalTaxLiability)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Effective Tax Rate:</span>
                  <span className="text-blue-400 font-semibold">{itrResult.effectiveTaxRate.toFixed(2)}%</span>
                </div>
                {parseFloat(itrForm.taxPaid) > 0 && (
                  <>
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-400">Tax Paid:</span>
                      <span className="text-white font-medium">{formatCurrency(parseFloat(itrForm.taxPaid) || 0)}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-white font-semibold">
                        {parseFloat(itrForm.taxPaid) >= itrResult.totalTaxLiability ? 'Refund Amount:' : 'Tax Payable:'}
                      </span>
                      <span className={`font-semibold ${
                        parseFloat(itrForm.taxPaid) >= itrResult.totalTaxLiability ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(Math.abs((parseFloat(itrForm.taxPaid) || 0) - itrResult.totalTaxLiability))}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <Button 
                  onClick={handleFileITR} 
                  disabled={loading} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {loading ? 'Filing...' : 'File ITR'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">ITR Filing Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-white mb-3">Required Documents</h4>
              <div className="space-y-2">
                {[
                  'Form 16 / Salary Certificate',
                  'Bank Interest Certificates',
                  'Investment Proofs (80C)',
                  'Health Insurance Premium Receipts',
                  'House Property Details',
                  'Capital Gains Statements'
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-white mb-3">Important Dates</h4>
              <div className="space-y-2">
                {[
                  { event: 'ITR Filing Due Date', date: '31st July 2024' },
                  { event: 'Audit Cases Due Date', date: '31st October 2024' },
                  { event: 'Revised Return Due Date', date: '31st December 2024' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-gray-300 text-sm">{item.event}</span>
                    <span className="text-blue-400 text-sm font-medium">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTDSTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">TDS Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payment Type</label>
              <select
                value={tdsForm.paymentType}
                onChange={(e) => setTdsForm(prev => ({ ...prev, paymentType: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="professional_services">Professional Services</option>
                <option value="rent">Rent</option>
                <option value="commission">Commission</option>
                <option value="interest">Interest</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payment Amount</label>
              <Input
                type="number"
                value={tdsForm.amount}
                onChange={(e) => setTdsForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter payment amount"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="panAvailable"
                checked={tdsForm.panAvailable}
                onChange={(e) => setTdsForm(prev => ({ ...prev, panAvailable: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="panAvailable" className="text-sm text-gray-300">
                PAN Available
              </label>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">TDS Rate:</span>
                <span className="text-white font-medium">
                  {getTDSRate(tdsForm.paymentType, tdsForm.panAvailable)}%
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">TDS Amount:</span>
                <span className="text-red-400 font-semibold">
                  {formatCurrency(calculateTDS())}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">Net Payment:</span>
                <span className="text-green-400 font-semibold">
                  {formatCurrency((parseFloat(tdsForm.amount) || 0) - calculateTDS())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">TDS Rates Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { type: 'Professional Services', withPAN: '10%', withoutPAN: '20%', section: '194J' },
                { type: 'Rent (>₹2.4L)', withPAN: '10%', withoutPAN: '20%', section: '194I' },
                { type: 'Commission/Brokerage', withPAN: '5%', withoutPAN: '20%', section: '194H' },
                { type: 'Interest (>₹5K)', withPAN: '10%', withoutPAN: '20%', section: '194A' }
              ].map((rate, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">{rate.type}</p>
                      <p className="text-xs text-gray-400">Section {rate.section}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 text-sm">With PAN: {rate.withPAN}</p>
                      <p className="text-red-400 text-sm">Without PAN: {rate.withoutPAN}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">TDS Compliance Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400 mb-2" />
              <h4 className="font-medium text-yellow-400 mb-1">Monthly TDS</h4>
              <p className="text-sm text-gray-300">Due by 7th of next month</p>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <Calendar className="w-6 h-6 text-blue-400 mb-2" />
              <h4 className="font-medium text-blue-400 mb-1">Quarterly TDS</h4>
              <p className="text-sm text-gray-300">Due by 31st of next month</p>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <FileText className="w-6 h-6 text-green-400 mb-2" />
              <h4 className="font-medium text-green-400 mb-1">TDS Certificates</h4>
              <p className="text-sm text-gray-300">Issue within 15 days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Tax Filing Assistant</h1>
        <p className="text-gray-400">Automated GST, ITR, and TDS calculations and filing assistance</p>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.businessName} ({client.name})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'gst' && renderGSTTab()}
      {activeTab === 'itr' && renderITRTab()}
      {activeTab === 'tds' && renderTDSTab()}
    </div>
  )
}