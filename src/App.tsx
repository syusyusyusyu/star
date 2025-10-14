import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import IndexPage from './pages/IndexPage'
import GamePage from './pages/GamePage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </Router>
  )
}

export default App
