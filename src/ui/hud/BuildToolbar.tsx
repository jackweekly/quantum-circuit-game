import { useGameStore } from '../../state/useGameStore'
import { listGates } from '../../content/registry'

export function BuildToolbar() {
  const { selectedBuildId, interactionMode, setSelectedBuildId, setInteractionMode } = useGameStore()
  const gates = listGates()

  return (
    <div className="hud-bottom">
      <div className="toolbar-group">
        <button
          className={`tool-btn ${interactionMode === 'inspect' ? 'active' : ''}`}
          onClick={() => setInteractionMode('inspect')}
          title="Inspect"
        >
          🔍
        </button>
        <button
          className={`tool-btn ${interactionMode === 'erase' ? 'active' : ''}`}
          onClick={() => setInteractionMode('erase')}
          title="Erase"
        >
          ❌
        </button>
      </div>

      <div className="toolbar-group">
        <button
          className={`tool-btn ${selectedBuildId === 'source' ? 'active' : ''}`}
          onClick={() => setSelectedBuildId('source')}
          title="Source (spawns |0>)"
        >
          📥
        </button>
        <button
          className={`tool-btn ${selectedBuildId === 'sink' ? 'active' : ''}`}
          onClick={() => setSelectedBuildId('sink')}
          title="Sink (measures)"
        >
          📤
        </button>
        <button
          className={`tool-btn ${selectedBuildId === 'conveyor' ? 'active' : ''}`}
          onClick={() => setSelectedBuildId('conveyor')}
          title="Conveyor Belt"
        >
          ⮕
        </button>
      </div>

      <div className="toolbar-group">
        {gates.map((gate) => (
          <button
            key={gate.id}
            className={`tool-btn ${selectedBuildId === gate.id ? 'active' : ''}`}
            onClick={() => setSelectedBuildId(gate.id)}
            title={gate.name}
          >
            {gate.id.toUpperCase().slice(0, 2)}
          </button>
        ))}
      </div>
    </div>
  )
}
