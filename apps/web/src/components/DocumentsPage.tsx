'use client'

import { useEffect, useState } from 'react'
import { FileText, Upload, ShieldCheck, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'

type DocType = 'PASSPORT' | 'NATIONAL_ID' | 'DRIVING_LICENSE'

type KycDoc = {
  id: string
  docType: string
  fileName: string
  mimeType: string
  createdAt: string
}

type KycData = {
  fullName: string
  email: string
  phoneNumber?: string | null
  status: string
  kycStatus: string
  dateOfBirth?: string | null
  address?: string | null
  country?: string | null
  nationality?: string | null
  idType?: string | null
  idNumber?: string | null
  documents: KycDoc[]
}

const DOC_LABELS: Record<DocType, string> = {
  PASSPORT: 'Passport',
  NATIONAL_ID: 'National ID',
  DRIVING_LICENSE: 'Driving licence',
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export default function DocumentsPage() {
  const { accessToken, user, setCredentials } = useAuthStore()
  const [kyc, setKyc] = useState<KycData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [dateOfBirth, setDateOfBirth] = useState('')
  const [address, setAddress] = useState('')
  const [country, setCountry] = useState('')
  const [nationality, setNationality] = useState('')
  const [idType, setIdType] = useState<DocType>('PASSPORT')
  const [idNumber, setIdNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [uploadType, setUploadType] = useState<DocType>('PASSPORT')

  const load = async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<{ data: KycData }>('/account/kyc', accessToken)
      const data = res.data
      setKyc(data)
      setDateOfBirth(data.dateOfBirth || '')
      setAddress(data.address || '')
      setCountry(data.country || '')
      setNationality(data.nationality || '')
      setIdType((data.idType as DocType) || 'PASSPORT')
      setIdNumber(data.idNumber || '')
      setPhoneNumber(data.phoneNumber || '')
      if (user) {
        setCredentials({
          user: { ...user, status: data.status, kycStatus: data.kycStatus },
          accessToken,
          refreshToken: useAuthStore.getState().refreshToken || accessToken,
        })
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load KYC')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await apiClient.post(
        '/account/kyc',
        {
          dateOfBirth,
          address,
          country,
          nationality,
          idType,
          idNumber,
          phoneNumber: phoneNumber || undefined,
        },
        accessToken
      )
      setMessage('KYC details saved. Upload at least one ID document if you have not yet.')
      await load()
    } catch (err: any) {
      setError(err?.message || 'Could not save KYC')
    } finally {
      setSaving(false)
    }
  }

  const onUpload = async (file: File | null) => {
    if (!file || !accessToken) return
    if (file.size > 2.5 * 1024 * 1024) {
      setError('File too large (max 2.5MB)')
      return
    }
    setUploading(true)
    setError(null)
    setMessage(null)
    try {
      const dataUrl = await fileToBase64(file)
      await apiClient.post(
        '/account/kyc/documents',
        {
          docType: uploadType,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataBase64: dataUrl,
        },
        accessToken
      )
      setMessage(`${DOC_LABELS[uploadType]} uploaded. Waiting for admin review.`)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (!accessToken) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0e27] text-[#94a3b8] p-6">
        Sign in to complete KYC and upload your ID documents.
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0e27] p-3 sm:p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-[#6366f1]" />
            KYC verification
          </h1>
          <p className="text-sm text-[#94a3b8]">
            New accounts stay pending until you submit KYC and an admin approves trading.
          </p>
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-4 flex flex-wrap gap-3 text-sm">
          <Badge
            label="Account"
            value={kyc?.status || user?.status || 'PENDING'}
            tone={kyc?.status === 'ACTIVE' ? 'green' : 'yellow'}
          />
          <Badge
            label="KYC"
            value={kyc?.kycStatus || user?.kycStatus || 'REQUIRED'}
            tone={
              kyc?.kycStatus === 'APPROVED'
                ? 'green'
                : kyc?.kycStatus === 'SUBMITTED'
                  ? 'blue'
                  : kyc?.kycStatus === 'REJECTED'
                    ? 'red'
                    : 'yellow'
            }
          />
          <Badge label="Documents" value={`${kyc?.documents?.length ?? 0} uploaded`} tone="blue" />
        </div>

        {message && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-[#94a3b8] py-10 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading KYC…
          </div>
        ) : (
          <>
            <form
              onSubmit={saveProfile}
              className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-4 sm:p-5 space-y-3"
            >
              <h2 className="text-lg font-semibold text-white">Personal details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Date of birth">
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full rounded-lg border border-[#1e293b] bg-[#0d1230] text-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-lg border border-[#1e293b] bg-[#0d1230] text-white px-3 py-2 text-sm"
                    placeholder="+1…"
                  />
                </Field>
                <Field label="Country">
                  <input
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-[#1e293b] bg-[#0d1230] text-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Nationality">
                  <input
                    required
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full rounded-lg border border-[#1e293b] bg-[#0d1230] text-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="ID type">
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as DocType)}
                    className="w-full rounded-lg border border-[#1e293b] bg-[#0d1230] text-white px-3 py-2 text-sm"
                  >
                    <option value="PASSPORT">Passport</option>
                    <option value="NATIONAL_ID">National ID</option>
                    <option value="DRIVING_LICENSE">Driving licence</option>
                  </select>
                </Field>
                <Field label="ID number">
                  <input
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full rounded-lg border border-[#1e293b] bg-[#0d1230] text-white px-3 py-2 text-sm"
                  />
                </Field>
              </div>
              <Field label="Residential address">
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-[#1e293b] bg-[#0d1230] text-white px-3 py-2 text-sm resize-none"
                />
              </Field>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#6366f1] text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save KYC details'}
              </button>
            </form>

            <div className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-4 sm:p-5 space-y-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Upload className="h-5 w-5" /> Upload ID document
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Upload passport, national ID, or driving licence (JPG / PNG / PDF, max 2.5MB).
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as DocType)}
                  className="w-full sm:max-w-[220px] rounded-lg border border-[#1e293b] bg-[#0d1230] text-white px-3 py-2 text-sm"
                >
                  <option value="PASSPORT">Passport</option>
                  <option value="NATIONAL_ID">National ID</option>
                  <option value="DRIVING_LICENSE">Driving licence</option>
                </select>
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#6366f1]/50 bg-[#6366f1]/10 text-sm text-[#a5b4fc] cursor-pointer hover:bg-[#6366f1]/20">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Choose file'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => void onUpload(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="space-y-2 pt-2">
                {(kyc?.documents || []).length === 0 ? (
                  <p className="text-sm text-[#64748b]">No documents uploaded yet.</p>
                ) : (
                  kyc!.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border border-[#1e293b] bg-[#0d1230] px-3 py-2"
                    >
                      <FileText className="h-5 w-5 text-[#94a3b8] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white truncate">{doc.fileName}</div>
                        <div className="text-[11px] text-[#64748b]">
                          {DOC_LABELS[doc.docType as DocType] || doc.docType} ·{' '}
                          {new Date(doc.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] uppercase tracking-wide text-[#64748b]">{label}</span>
      {children}
    </label>
  )
}

function Badge({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'green' | 'yellow' | 'blue' | 'red'
}) {
  const colors = {
    green: 'bg-green-500/15 text-green-300 border-green-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30',
    blue: 'bg-indigo-500/15 text-indigo-200 border-indigo-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
  }
  return (
    <div className={`rounded-lg border px-3 py-1.5 ${colors[tone]}`}>
      <div className="text-[10px] uppercase opacity-70">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  )
}
