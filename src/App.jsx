import { Routes, Route } from 'react-router-dom'
import IndexPage from './pages/IndexPage'
import GamePage from './pages/GamePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/game" element={<GamePage />} />
    </Routes>
  )
}

export default App
