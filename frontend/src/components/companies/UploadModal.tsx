'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { companiesApi } from '@/lib/api'

interface UploadModalProps {
  onClose: () => void
  onSuccess: () => void
}

interface UploadResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const data = await companiesApi.upload(file)
      const normalized: UploadResult = {
        total: data?.total ?? 0,
        imported: data?.imported ?? 0,
        skipped: data?.skipped ?? 0,
        errors: Array.isArray(data?.errors) ? data.errors : [],
      }
      setResult(normalized)
      if (normalized.imported > 0) {
        setTimeout(onSuccess, 1500)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }, [onSuccess])

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Upload Companies</h2>
            <p className="text-sm text-gray-500 mt-0.5">Import from Excel spreadsheet</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Format info */}
          <div className="bg-blue-50 rounded-xl p-4 mb-5">
            <p className="text-blue-800 text-sm font-medium mb-2">Required Excel Columns:</p>
            <div className="grid grid-cols-2 gap-1">
              {['Company Name', 'Company Size', 'Email', 'Contact Person', 'Industry', 'Country'].map(col => (
                <div key={col} className="flex items-center gap-1.5 text-blue-700 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {col}
                </div>
              ))}
            </div>
            <p className="text-blue-600 text-xs mt-2">Size values: small / medium / large</p>
          </div>

          {/* Dropzone */}
          {!result && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-gray-600 text-sm font-medium">Uploading & parsing...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {acceptedFiles.length > 0 ? (
                    <FileSpreadsheet className="w-12 h-12 text-green-500" />
                  ) : (
                    <Upload className="w-12 h-12 text-blue-400" />
                  )}
                  {isDragActive ? (
                    <p className="text-blue-600 font-medium">Drop your file here...</p>
                  ) : (
                    <>
                      <p className="text-gray-700 font-medium">
                        {acceptedFiles.length > 0
                          ? acceptedFiles[0].name
                          : 'Drop Excel file or click to browse'
                        }
                      </p>
                      <p className="text-gray-400 text-sm">.xlsx or .xls files supported</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className={`rounded-xl p-4 ${result.imported > 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className={`w-5 h-5 ${result.imported > 0 ? 'text-green-500' : 'text-yellow-500'}`} />
                  <span className={`font-semibold ${result.imported > 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                    Upload Complete
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{result.total}</div>
                    <div className="text-xs text-gray-500">Total Rows</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                    <div className="text-xs text-gray-500">Imported</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
                    <div className="text-xs text-gray-500">Skipped</div>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-700 text-sm font-medium">Errors ({result.errors.length})</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-0.5">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-red-600 text-xs">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 bg-red-50 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            Close
          </button>
          {result && (
            <button
              onClick={onSuccess}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm transition-colors"
            >
              View Companies
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
