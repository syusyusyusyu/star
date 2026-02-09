import { memo, useState } from 'react'
import ModeTabs from './ModeTabs'
import RankingPanel from './RankingPanel'
import type { PlayMode } from '../../types/game'

type RankingModalProps = {
  open: boolean
  onClose: () => void
  mode: PlayMode
  onModeChange: (mode: PlayMode) => void
  songId: string
}

const RankingModal = memo(function RankingModal({ open, onClose, mode, onModeChange, songId }: RankingModalProps) {
  const [period, setPeriod] = useState<'all' | 'weekly' | 'daily'>('all')
  const [speed, setSpeed] = useState<number | undefined>(undefined)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex flex-col gap-3 p-4 sm:p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-miku/20 p-2.5 sm:p-3 rounded-xl flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-miku" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-gray-400 uppercase tracking-[0.2em]">Global Ranking</p>
                <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight">ランキング</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition border border-white/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 relative z-10">
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs sm:text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors sm:min-w-[110px] sm:px-3 sm:gap-2 justify-between"
              >
                <span className="truncate">
                  {period === 'all' && '全期間'}
                  {period === 'weekly' && '週間'}
                  {period === 'daily' && '24時間'}
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsDropdownOpen(false)} 
                  />
                  <div className="absolute top-full right-0 mt-2 w-32 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 flex flex-col py-1 animate-fade-in">
                    {[
                      { value: 'all', label: '全期間' },
                      { value: 'weekly', label: '週間' },
                      { value: 'daily', label: '24時間' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setPeriod(option.value as any)
                          setIsDropdownOpen(false)
                        }}
                        className={`px-4 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                          period === option.value ? 'text-miku bg-miku/10' : 'text-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}
                className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs sm:text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors sm:min-w-[110px] sm:px-3 sm:gap-2 justify-between"
              >
                <span className="truncate">
                  {speed === undefined && '全コース'}
                  {speed === 8 && '8秒（難）'}
                  {speed === 10 && '10秒（普）'}
                  {speed === 12 && '12秒（易）'}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-500 transition-transform ${isSpeedDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isSpeedDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsSpeedDropdownOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-36 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 flex flex-col py-1 animate-fade-in">
                    {[
                      { value: undefined as number | undefined, label: '全コース' },
                      { value: 8, label: '8秒（難）' },
                      { value: 10, label: '10秒（普）' },
                      { value: 12, label: '12秒（易）' },
                    ].map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSpeed(option.value)
                          setIsSpeedDropdownOpen(false)
                        }}
                        className={`px-4 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                          speed === option.value ? 'text-miku bg-miku/10' : 'text-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <ModeTabs value={mode} onChange={onModeChange} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-[#0a0a0a] to-[#111] min-h-[500px]">
          <RankingPanel
            songId={songId}
            mode={mode}
            period={period}
            speed={speed}
            className="!bg-transparent !border-none !shadow-none p-0 h-full"
          />
        </div>
      </div>
    </div>
  )
})

export default RankingModal
