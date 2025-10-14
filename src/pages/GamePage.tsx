import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function GamePage() {
  const location = useLocation()
  
  useEffect(() => {
    // URLパラメータを保持してgame.htmlにリダイレクト
    window.location.href = `/game.html${location.search}`
  }, [location.search])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gradientStart to-darkBg text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">ゲームをロード中...</h1>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-miku-400 mx-auto"></div>
      </div>
    </div>
  )
}

export default GamePage
