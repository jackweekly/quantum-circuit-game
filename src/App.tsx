import './App.css'
import { GameCanvas } from './ui/GameCanvas'
import { BuildToolbar } from './ui/hud/BuildToolbar'
import { Inspector } from './ui/hud/Inspector'
import { useGameStore } from './state/useGameStore'
import { useEffect } from 'react'
import { loadLevel, type LevelTile } from './engine/levelLoader'
import campaign from './content/campaign.json'

function App() {
  const tick = useGameStore((s) => s.tick)
  const score = useGameStore((s) => s.score)
  const goal = useGameStore((s) => s.goal)
  const credits = useGameStore((s) => s.credits)
  const contract = useGameStore((s) => s.contract)
  const setContract = useGameStore((s) => s.setContract)
  const setGoalText = useGameStore((s) => s.setGoalText)
  const setAvailableBuilds = useGameStore((s) => s.setAvailableBuilds)
  const resetLevel = useGameStore((s) => s.resetLevel)

  useEffect(() => {
    const chapter = campaign.chapters?.[0]
    if (chapter) {
      const layout = (chapter.layout as LevelTile[] | undefined) || []
      const firstContract = chapter.contracts?.[0] as
        | (typeof chapter.contracts)[0] & {
            target?: 'zero' | 'one' | 'plus'
            required?: number
            rewardPerUnit?: number
          }
        | undefined
      loadLevel({
        layout,
        goal: firstContract?.goal,
        contract: firstContract
          ? {
              id: firstContract.id,
              goal: firstContract.goal,
              target: firstContract.target || 'one',
              required: firstContract.required || 5,
              rewardPerUnit: firstContract.rewardPerUnit || 5,
            }
          : undefined,
      })
      if (firstContract?.goal) setGoalText(firstContract.goal)
      if (firstContract) {
        setContract({
          id: firstContract.id,
          goal: firstContract.goal,
          target: firstContract.target || 'one',
          required: firstContract.required || 5,
          delivered: 0,
          rewardPerUnit: firstContract.rewardPerUnit || 5,
        })
      }
      if (Array.isArray(chapter.availableBuilds)) {
        setAvailableBuilds(chapter.availableBuilds)
      }
    }
  }, [setContract, setGoalText, setAvailableBuilds])

  return (
    <div className="shell">
      <header className="top-bar">
        <div className="logo">
          Quantum Foundry <span className="dim">// PROTOTYPE</span>
        </div>
        <div className="top-stats">
          <div className="pill">Credits: {credits}</div>
          <div className="pill">Score: {score}</div>
          <div className="pill">Tick: {tick}</div>
        </div>
      </header>

      <main className="workspace">
        <aside className="left-rail">
          <div className="panel compact">
            <div className="panel-title">Contract</div>
            <div className="goal-text">{goal}</div>
            {contract && (
              <>
                <div className="progress-row">
                  <span>
                    {contract.delivered}/{contract.required} ({contract.target})
                  </span>
                  <span className="dim">+{contract.rewardPerUnit}c each</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, (contract.delivered / contract.required) * 100)}%`,
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="panel">
            <div className="panel-title">Build</div>
            <BuildToolbar />
          </div>

          <div className="panel compact">
            <div className="panel-title">Tips</div>
            <div className="tip">Middle-drag to pan, scroll to zoom.</div>
            <div className="tip">Rotate with the arrow buttons in the build bar.</div>
            <div className="tip">Place conveyors then gates; sinks pay on correct outputs.</div>
            <button className="pill" onClick={resetLevel}>
              Reset Level
            </button>
          </div>
        </aside>

        <section className="viewport">
          <GameCanvas />
          <Inspector />
        </section>
      </main>
    </div>
  )
}

export default App
