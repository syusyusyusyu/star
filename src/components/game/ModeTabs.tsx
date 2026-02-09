import { useState } from 'react'
import { PlayMode } from '../../types/game'

type ModeTabsProps = {
  value: PlayMode
  onChange: (mode: PlayMode) => void
}

const tabs: { value: PlayMode; label: string; shortLabel: string }[] = [
  { value: 'cursor', label: 'カーソルモード', shortLabel: 'カーソル' },
  { value: 'body', label: 'ボディモード', shortLabel: 'ボディ' },
  { value: 'mobile', label: 'モバイルモード', shortLabel: 'モバイル' },
  { value: 'face', label: 'フェイスモード', shortLabel: 'フェイス' },
]

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(max-width: 820px)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  )
}

const ModeTabs = ({ value, onChange }: ModeTabsProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = isMobileDevice()
  const visibleTabs = isMobile
    ? tabs.filter((t) => t.value === 'mobile' || t.value === 'face')
    : tabs.filter((t) => t.value !== 'mobile' && t.value !== 'face')

  const effectiveValue = visibleTabs.some((t) => t.value === value)
    ? value
    : visibleTabs[0]?.value ?? value

  if (isMobile) {
    const currentTab = visibleTabs.find((t) => t.value === effectiveValue) ?? visibleTabs[0]
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs sm:text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors sm:min-w-[140px] sm:px-3 sm:gap-2 justify-between"
        >
          <span>{currentTab.shortLabel}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full right-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 flex flex-col py-1 animate-fade-in">
              {visibleTabs.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`px-4 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                    effectiveValue === option.value ? 'text-miku bg-miku/10' : 'text-gray-300'
                  }`}
                >
                  {option.shortLabel}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-black/30 border border-white/10 px-1 py-1 shadow-[0_0_20px_rgba(0,0,0,0.35)] backdrop-blur max-w-full overflow-x-auto">
      {visibleTabs.map((tab) => {
        const active = tab.value === effectiveValue
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`relative px-3 sm:px-5 py-2 text-xs sm:text-base font-semibold transition-all duration-200 rounded-full ${
              active
                ? 'bg-white/10 text-white shadow-[0_0_12px_rgba(57,197,187,0.45)] border border-miku/60'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="relative z-10">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ModeTabs
