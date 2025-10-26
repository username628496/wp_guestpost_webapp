import React, { useState } from 'react'
import { Lock, Mail, User, AlertCircle, ArrowLeft, Key, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050"

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [step, setStep] = useState(1) // 1: Request reset, 2: Enter token
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setError('')

    if (!username || !email) {
      setError('Vui lòng nhập username và email')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('Email đã được gửi! Check email của bạn.')
        setStep(2)
      } else {
        setError(data.error || 'Không thể gửi email')
        toast.error(data.error || 'Không thể gửi email')
      }
    } catch (error) {
      console.error('[ForgotPassword] Error:', error)
      setError('Lỗi kết nối đến server')
      toast.error('Lỗi kết nối đến server')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (!resetToken || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Password xác nhận không khớp')
      return
    }

    if (newPassword.length < 6) {
      setError('Password phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          reset_token: resetToken,
          new_password: newPassword
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('Password đã được reset! Đang quay về login...')

        // Show instruction for admin
        if (data.new_hash) {
          console.log('='.repeat(80))
          console.log('⚠️  ADMIN: Cập nhật .env với ADMIN_PASSWORD_HASH:')
          console.log(data.new_hash)
          console.log('='.repeat(80))
        }

        setTimeout(() => {
          onBackToLogin()
        }, 2000)
      } else {
        setError(data.error || 'Không thể reset password')
        toast.error(data.error || 'Không thể reset password')
      }
    } catch (error) {
      console.error('[ForgotPassword] Error:', error)
      setError('Lỗi kết nối đến server')
      toast.error('Lỗi kết nối đến server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quên Mật Khẩu</h1>
          <p className="text-gray-600">
            {step === 1 ? 'Nhập thông tin để nhận email reset' : 'Nhập token từ email để reset password'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Step 1: Request Reset */}
          {step === 1 && (
            <form onSubmit={handleRequestReset} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}

              {/* Username Input */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập username"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="hoangphihongchoibet@gmail.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    <span>Gửi Email Reset</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Enter Token & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}

              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Email đã được gửi đến <strong>{email}</strong>.
                  Vui lòng check email và nhập token ở dưới.
                </p>
              </div>

              {/* Reset Token Input */}
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                  Reset Token
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="token"
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Paste token từ email"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* New Password Input */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập password mới (tối thiểu 6 ký tự)"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập lại password mới"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Đang reset...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>

              {/* Resend Email */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Chưa nhận được email? Gửi lại
              </button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={onBackToLogin}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại đăng nhập</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            © 2025 Guest Post Tool. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
