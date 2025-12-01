import './App.css'
import { GameCanvas } from './ui/GameCanvas'
import { BuildToolbar } from './ui/hud/BuildToolbar'
import { useGameStore } from './state/useGameStore'
import { useEffect } from 'react'
import { loadLevel, type LevelTile } from './engine/levelLoader'
import campaign from './content/campaign.json'

function App() {
  const tick = useGameStore((s) => s.tick)
  const score = useGameStore((s) => s.score)
  const goal = useGameStore((s) => s.goal)

  useEffect(() => {
    const chapter = campaign.chapters?.[0]
    if (chapter) {
      const layout = (chapter.layout as LevelTile[] | undefined) || []
      loadLevel({ layout, goal: chapter.contracts?.[0]?.goal })
    }
  }, [])

  return (
    <div className="game-layout">
      <div className="hud-top">
        <div className="hud-title">
          Quantum Foundry <span style={{ opacity: 0.5 }}>// PROTOTYPE</span>
        </div>
        <div className="hud-stats">
          <span>Goal: {goal}</span>
          <span>Score: {score}</span>
          <span>TICK: {tick}</span>
        </div>
      </div>

      <div className="viewport">
        <GameCanvas />
      </div>

      <BuildToolbar />
    </div>
  )
}

export default App
