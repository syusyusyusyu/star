import { useEffect } from 'react'

export default function GamePage() {
  useEffect(() => {
    // game.htmlにリダイレクト
    window.location.href = '/game.html'
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="text-center">
        <div className="animate-pulse mb-4">Loading game...</div>
        <div className="text-sm text-gray-400">ゲームページに移動中...</div>
      </div>
    </div>
  )
}
