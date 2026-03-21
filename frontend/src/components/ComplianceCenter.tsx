import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { complianceService } from '../services/compliance'
import { useClients } from '../contexts/ClientContext'

export const ComplianceCenter: React.FC = () => {
  const { clients } = useClients()
  const [selectedClient, setSelectedClient] = useState('')
  const [notices, setNotices] = useState<any[]>([])
  const [calendarItems, setCalendarItems] = useState<any[]>([])
  const [noticeType, setNoticeType] = useState('gst')
  const [noticeStatus, setNoticeStatus] = useState('open')
  const [noticeFile, setNoticeFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    if (!selectedClient) return
    setLoading(true)
    try {
      const [noticesData, calendarData] = await Promise.all([
        complianceService.getNotices(selectedClient),
        complianceService.getComplianceCalendar(),
      ])
      setNotices(noticesData)
      setCalendarItems(calendarData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedClient && clients.length > 0) {
      setSelectedClient(String(clients[0].id))
    }
  }, [clients, selectedClient])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient])

  const handleCreateNotice = async () => {
    if (!selectedClient || !noticeFile) {
      alert('Please select client and choose notice file')
      return
    }

    const formData = new FormData()
    formData.append('client_id', selectedClient)
    formData.append('type', noticeType)
    formData.append('status', noticeStatus)
    formData.append('file', noticeFile)

    try {
      setLoading(true)
      await complianceService.createNotice(formData)
      setNoticeFile(null)
      await loadData()
      alert('Notice uploaded successfully')
    } catch (error) {
      console.error(error)
      alert('Failed to upload notice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Compliance & Notices</h1>
        <p className="text-gray-400">Track filings, deadlines, and notices in one place.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">Client Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full max-w-md px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.businessName} ({client.name})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Upload Notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={noticeType}
              onChange={(e) => setNoticeType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
            >
              <option value="gst">GST</option>
              <option value="income_tax">Income Tax</option>
            </select>

            <select
              value={noticeStatus}
              onChange={(e) => setNoticeStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <Input type="file" onChange={(e) => setNoticeFile(e.target.files?.[0] || null)} />
            <Button onClick={handleCreateNotice} disabled={loading}>Upload Notice</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Compliance Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {calendarItems.length === 0 && <p className="text-gray-400">No compliance items available.</p>}
              {calendarItems.map((item) => (
                <div key={item.id} className="bg-gray-800/40 rounded p-3">
                  <p className="text-white text-sm font-medium">{item.title}</p>
                  <p className="text-gray-400 text-xs">Due: {item.due_date}</p>
                  <p className="text-gray-400 text-xs">Status: {item.is_completed ? 'Completed' : 'Pending'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">Notices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {notices.length === 0 && <p className="text-gray-400">No notices found.</p>}
            {notices.map((notice) => (
              <div key={notice.id} className="bg-gray-800/40 rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{notice.type?.toUpperCase()} Notice</p>
                  <p className="text-gray-400 text-xs">Status: {notice.status}</p>
                  <p className="text-gray-400 text-xs">Created: {new Date(notice.created_at).toLocaleDateString()}</p>
                </div>
                {notice.file_url && (
                  <a
                    href={notice.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-sm underline"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ComplianceCenter
