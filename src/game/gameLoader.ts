export type SongData = {
  id: number
  title: string
  artist: string
  apiToken: string
  songUrl: string
  difficulty?: 'easy' | 'normal' | 'hard' | string
}

export type SongConfig = Pick<SongData, 'apiToken' | 'songUrl'>

const defaultSong: SongData = {
  id: 1,
  title: 'ストリートライト',
  artist: '加賀(ネギシャワーP)',
  apiToken: 'HmfsoBVch26BmLCm',
  songUrl: 'https://piapro.jp/t/ULcJ/20250205120202',
  difficulty: 'easy',
}

const colorVariations: Record<string, string> = {
  easy: 'rgba(57, 197, 187, 0.1)',
  normal: 'rgba(255, 165, 0, 0.1)',
  hard: 'rgba(255, 105, 180, 0.1)',
}

export const getAccentColor = (difficulty?: string | null) =>
  colorVariations[difficulty || ''] ?? colorVariations.easy

export function loadSongConfig() {
  const selectedSongData = safeParseSong(localStorage.getItem('selectedSong'))
  const songData = selectedSongData ?? defaultSong

  window.songConfig = {
    apiToken: songData.apiToken,
    songUrl: songData.songUrl,
  }

  const accentColor = getAccentColor(songData.difficulty)
  document.documentElement.style.setProperty('--bg-accent-color', accentColor)

  return { songData, accentColor }
}

function safeParseSong(raw: string | null): SongData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SongData
    if (parsed?.apiToken && parsed?.songUrl && parsed?.title && parsed?.artist) {
      return parsed
    }
  } catch {
    // ignore parse errors
  }
  return null
}

export function initLiveParticles(container: HTMLElement | null) {
  if (!container) return

  const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window
  const densityBase = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 8000))
  const densityFactor = isMobile ? 0.4 : 1
  const particleCount = Math.max(20, Math.floor(densityBase * densityFactor))

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    particle.style.position = 'absolute'
    particle.style.width = '2px'
    particle.style.height = '2px'
    particle.style.borderRadius = '50%'
    particle.style.backgroundColor = i % 3 === 0 ? '#39C5BB' : i % 3 === 1 ? '#FF69B4' : '#fff'
    particle.style.left = `${Math.random() * 100}%`
    particle.style.top = `${Math.random() * 100}%`
    particle.style.opacity = `${0.3 + Math.random() * 0.4}`
    particle.style.boxShadow = `0 0 ${2 + Math.random() * 3}px currentColor`
    particle.style.animation = `particleFloat ${3 + Math.random() * 4}s ease-in-out infinite`
    particle.style.animationDelay = `${Math.random() * 3}s`
    container.appendChild(particle)
  }

  const style = document.createElement('style')
  style.textContent = `
    @keyframes particleFloat {
      0%, 100% {
        transform: translateY(0) scale(1);
        opacity: 0.3;
      }
      50% {
        transform: translateY(-20px) scale(1.2);
        opacity: 0.7;
      }
    }
  `
  document.head.appendChild(style)
}
