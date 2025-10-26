import React from 'react'
import { Link, Wrench, Clock } from 'lucide-react'

export default function TextHomePage() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">TextHome</h1>
          <p className="text-sm text-gray-500 mt-1">Thêm hàng loạt textlink vào homepage</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Main Content */}
          <div className="px-8 py-12 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mb-4">
              <Wrench className="w-8 h-8 text-blue-600" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tính Năng Đang Phát Triển
            </h2>

            {/* Timeline */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm mb-6">
              <Clock className="w-4 h-4" />
              Dự kiến: Chưa xác định
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Tính năng <strong>TextHome</strong> cho phép bạn thêm hàng loạt textlink vào homepage của các websites một cách nhanh chóng và hiệu quả.
            </p>

            {/* Features List */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <Link className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Tính năng chính:</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Thêm nhiều textlink cùng lúc vào homepage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Quản lý danh sách textlink theo từng website</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Tùy chỉnh anchor text và target URL</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Preview và kiểm tra trước khi apply</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Tích hợp với WordPress để update tự động</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Bạn có ý tưởng hoặc đề xuất cho tính năng này?
              </p>
              <a
                href="https://t.me/matthew191123"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
                Gửi Feedback
              </a>
            </div>
          </div>

          {/* Footer Note */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Trong thời gian chờ đợi, bạn có thể sử dụng <strong>Index Checker</strong> và <strong>WordPress Editor</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
