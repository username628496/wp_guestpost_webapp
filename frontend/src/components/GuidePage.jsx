import React, { useState } from 'react'
import { Search, FileEdit, Settings, CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronRight, AlertCircle, FileText, Key } from 'lucide-react'

export default function GuidePage() {
  const [expandedSection, setExpandedSection] = useState('index-checker')

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Hướng Dẫn Sử Dụng</h1>
          <p className="text-sm text-gray-500 mt-1">Tài liệu hướng dẫn chi tiết về Guest Post Tool</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-4">
          {/* Index Checker Section */}
          <GuideSection
            id="index-checker"
            icon={<Search className="w-5 h-5 text-blue-600" />}
            title="Index Checker"
            isExpanded={expandedSection === 'index-checker'}
            onToggle={() => toggleSection('index-checker')}
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  Cách sử dụng:
                </h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">1.</span>
                    <span>Nhập domain cần kiểm tra (VD: <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">example.com</code>)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">2.</span>
                    <span>Hệ thống tự động crawl sitemap và lấy tất cả URLs (tối đa 500 URLs)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">3.</span>
                    <span>Tool sẽ kiểm tra từng URL xem đã được Google index chưa</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">4.</span>
                    <div className="space-y-2">
                      <span>Kết quả hiển thị theo trạng thái:</span>
                      <div className="space-y-1.5 ml-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span><strong className="text-green-700">Indexed</strong> - URL đã được Google index</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-amber-600" />
                          <span><strong className="text-amber-700">Not Indexed</strong> - URL chưa được index</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span><strong className="text-red-700">Error</strong> - Lỗi khi kiểm tra</span>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">5.</span>
                    <span>Export kết quả ra file CSV theo từng loại (All / Indexed / Not Indexed)</span>
                  </li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Tính năng chính:
                </h4>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Tự động crawl sitemap.xml từ domain</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Kiểm tra hàng loạt URLs cùng lúc (batch processing)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Filter và group kết quả theo domain và status</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Export CSV với nhiều options (all/indexed/not_indexed)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Lưu lịch sử kiểm tra để xem lại sau</span>
                  </li>
                </ul>
              </div>
            </div>
          </GuideSection>

          {/* WordPress Editor Section */}
          <GuideSection
            id="wordpress-editor"
            icon={<FileEdit className="w-5 h-5 text-purple-600" />}
            title="WordPress Editor"
            isExpanded={expandedSection === 'wordpress-editor'}
            onToggle={() => toggleSection('wordpress-editor')}
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  Cách sử dụng:
                </h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-semibold text-purple-600 flex-shrink-0">1.</span>
                    <div>
                      <span>Vào trang <strong>My WordPress Sites</strong> để cấu hình WordPress site:</span>
                      <ul className="mt-1 ml-4 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">→</span>
                          <span>Nhập Site URL (VD: <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">https://yourdomain.com</code>)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">→</span>
                          <span>Nhập Username WordPress</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">→</span>
                          <span>Tạo và nhập Application Password từ WordPress dashboard</span>
                        </li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-purple-600 flex-shrink-0">2.</span>
                    <span>Từ trang Index Checker, chọn các URLs đã indexed (checkbox)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-purple-600 flex-shrink-0">3.</span>
                    <span>Click <strong>"Mở WordPress Editor"</strong> ở sidebar</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-purple-600 flex-shrink-0">4.</span>
                    <span>Editor tự động fetch posts từ WordPress theo các URLs đã chọn</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-purple-600 flex-shrink-0">5.</span>
                    <span>Chỉnh sửa content trực tiếp trong bảng (spreadsheet style với TinyMCE)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-purple-600 flex-shrink-0">6.</span>
                    <span>Click <strong>"Save All Changes"</strong> để lưu toàn bộ lên WordPress</span>
                  </li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Các trường có thể edit:</h4>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span><strong>Title</strong> - Tiêu đề bài viết</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span><strong>Content</strong> - Nội dung HTML (TinyMCE)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span><strong>Excerpt</strong> - Tóm tắt ngắn</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span><strong>Status</strong> - publish, draft, pending</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span><strong>Categories</strong> - Danh mục bài viết</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span><strong>Tip:</strong> Tạo snapshot để backup trước khi save</span>
                  </li>
                </ul>
              </div>
            </div>
          </GuideSection>

          {/* WordPress Sites Management */}
          <GuideSection
            id="wp-sites"
            icon={<Settings className="w-5 h-5 text-green-600" />}
            title="Quản Lý WordPress Sites"
            isExpanded={expandedSection === 'wp-sites'}
            onToggle={() => toggleSection('wp-sites')}
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-600" />
                  Cách tạo Application Password:
                </h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600 flex-shrink-0">1.</span>
                    <span>Login vào WordPress dashboard của bạn</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600 flex-shrink-0">2.</span>
                    <span>Vào <strong>Users → Profile</strong> (hoặc <strong>Users → Your Profile</strong>)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600 flex-shrink-0">3.</span>
                    <span>Scroll xuống phần <strong>"Application Passwords"</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600 flex-shrink-0">4.</span>
                    <span>Nhập tên application (VD: "Guest Post Tool")</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600 flex-shrink-0">5.</span>
                    <span>Click <strong>"Add New Application Password"</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600 flex-shrink-0">6.</span>
                    <span>Copy password (format: <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">xxxx xxxx xxxx xxxx</code>)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600 flex-shrink-0">7.</span>
                    <span>Paste vào form "Add WordPress Site" trong Guest Post Tool</span>
                  </li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Quản lý nhiều sites:</h4>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Bạn có thể thêm nhiều WordPress sites</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Mỗi lúc chỉ có 1 site được đánh dấu "Active"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Editor sẽ sử dụng site đang active</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Chuyển đổi giữa các sites bằng cách click vào site card</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Lưu ý quan trọng:
                </h4>
                <p className="text-sm text-gray-700">
                  Application Password <strong>KHÁC</strong> với password đăng nhập WordPress. Nó an toàn hơn và có thể thu hồi bất cứ lúc nào từ WordPress dashboard mà không ảnh hưởng đến password chính.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-gray-600" />
                Câu Hỏi Thường Gặp (FAQ)
              </h3>
            </div>

            <div className="divide-y divide-gray-200">
              <FAQItem
                question="Tool này sử dụng API nào để check index?"
                answer="Tool sử dụng Serper.dev API - một Google Search API wrapper hiệu quả và cost-effective để kiểm tra index status."
              />
              <FAQItem
                question="Có giới hạn số lượng URLs check được không?"
                answer="Mỗi lần crawl sitemap tối đa 500 URLs. Nếu domain có nhiều hơn, bạn cần chạy nhiều lần hoặc input URLs trực tiếp."
              />
              <FAQItem
                question="Editor có tự động save không?"
                answer="Không. Bạn phải click 'Save All Changes' để lưu lên WordPress. Tuy nhiên, changes được cache trong browser nên không mất khi refresh."
              />
              <FAQItem
                question="Làm sao để backup trước khi edit WordPress?"
                answer="Click 'Create Snapshot' trong Editor. Snapshot sẽ lưu toàn bộ trạng thái hiện tại và có thể restore từ WP History."
              />
              <FAQItem
                question="Có thể sử dụng tool cho nhiều WordPress sites cùng lúc?"
                answer="Có! Bạn có thể thêm nhiều sites và chuyển đổi giữa chúng. Editor sẽ tự động sử dụng site đang active."
              />
              <FAQItem
                question="Application Password có hết hạn không?"
                answer="Không, Application Password không tự động hết hạn. Bạn có thể thu hồi thủ công từ WordPress dashboard bất cứ lúc nào."
              />
            </div>
          </div>

          {/* Support Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Cần Hỗ Trợ Thêm?</h3>
            <p className="text-sm text-gray-600 mb-4 max-w-2xl mx-auto">
              Nếu bạn gặp vấn đề hoặc có câu hỏi chưa được giải đáp, vui lòng liên hệ qua Telegram để được hỗ trợ.
            </p>
            <a
              href="https://t.me/matthew191123"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
              Liên Hệ Dev (@matthew191123)
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Guide Section Component (Collapsible)
function GuideSection({ icon, title, isExpanded, onToggle, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-gray-400">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  )
}

// FAQ Item Component
function FAQItem({ question, answer }) {
  return (
    <div className="px-6 py-3 hover:bg-gray-50 transition-colors">
      <h4 className="text-sm font-semibold text-gray-900 mb-1">
        {question}
      </h4>
      <p className="text-sm text-gray-600">{answer}</p>
    </div>
  )
}
