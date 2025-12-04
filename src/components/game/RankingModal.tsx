import { memo } from 'react'
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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-4">
            <div className="bg-miku/20 p-3 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-miku" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-[0.2em]">Global Ranking</p>
              <h2 className="text-2xl font-bold text-white">ランキング</h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ModeTabs value={mode} onChange={onModeChange} />
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition border border-white/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-[#0a0a0a] to-[#111] min-h-[500px]">
          <RankingPanel
            songId={songId}
            mode={mode}
            className="!bg-transparent !border-none !shadow-none p-0 h-full"
          />
        </div>
      </div>
    </div>
  )
})

export default RankingModal
