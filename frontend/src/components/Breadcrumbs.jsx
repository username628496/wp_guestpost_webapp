import React from 'react'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumbs({ items, onNavigate }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <button
        onClick={() => onNavigate('index-checker')}
        className="flex items-center hover:text-gray-900 transition-colors"
        title="Home"
      >
        <Home className="w-4 h-4" />
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-900">{item.label}</span>
            ) : (
              <button
                onClick={() => item.onClick && item.onClick()}
                className="hover:text-gray-900 transition-colors"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
