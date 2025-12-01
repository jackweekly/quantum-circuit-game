import './App.css'
import { GameCanvas } from './ui/GameCanvas'
import { BuildToolbar } from './ui/hud/BuildToolbar'
import { useGameStore } from './state/useGameStore'

function App() {
  const tick = useGameStore((s) => s.tick)

  return (
    <div className="game-layout">
      <div className="hud-top">
        <div className="hud-title">
          Quantum Foundry <span style={{ opacity: 0.5 }}>// PROTOTYPE</span>
        </div>
        <div className="hud-stats">
          <span>TICK: {tick}</span>
          <span>QUBITS: 0</span>
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
