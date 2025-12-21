import { PlayMode } from '../../types/game'

type ModeTabsProps = {
  value: PlayMode
  onChange: (mode: PlayMode) => void
}

const tabs: { value: PlayMode; label: string }[] = [
  { value: 'cursor', label: 'マウスモード' },
  { value: 'body', label: 'カメラモード' },
  { value: 'mobile', label: 'モバイルモード' },
]

const ModeTabs = ({ value, onChange }: ModeTabsProps) => {
  const visibleTabs = tabs
  const effectiveValue = visibleTabs.some((t) => t.value === value)
    ? value
    : visibleTabs[0]?.value ?? value

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
