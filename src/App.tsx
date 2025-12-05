import './App.css'
import { useEffect } from 'react'
import { GameCanvas } from './ui/GameCanvas'
import { BuildToolbar } from './ui/hud/BuildToolbar'
import { Inspector } from './ui/hud/Inspector'
import { useGameStore } from './state/useGameStore'
import { loadLevel, type LevelTile } from './engine/levelLoader'
import campaign from './content/campaign.json'

function App() {
  const tick = useGameStore((s) => s.tick)
  const score = useGameStore((s) => s.score)
  const goal = useGameStore((s) => s.goal)
  const credits = useGameStore((s) => s.credits)
  const contract = useGameStore((s) => s.contract)
  const contractCompleted = useGameStore((s) => s.contract?.completed)
  const contracts = useGameStore((s) => s.contracts)
  const contractIndex = useGameStore((s) => s.contractIndex)

  const setGoalText = useGameStore((s) => s.setGoalText)
  const setAvailableBuilds = useGameStore((s) => s.setAvailableBuilds)
  const setContracts = useGameStore((s) => s.setContracts)
  const nextContract = useGameStore((s) => s.nextContract)
  const resetLevel = useGameStore((s) => s.resetLevel)
  const setContract = useGameStore((s) => s.setContract)

  const chapter = campaign.chapters?.[0]

  useEffect(() => {
    if (!chapter) return
    const layout = (chapter.layout as LevelTile[] | undefined) || []
    const contractsList =
      chapter.contracts?.map((c) => ({
        id: c.id,
        goal: c.goal,
        target: (c as any).target || 'one',
        required: (c as any).required || 5,
        delivered: 0,
        rewardPerUnit: (c as any).rewardPerUnit || 5,
        completed: false,
      })) || []

    loadLevel({
      layout,
      goal: contractsList[0]?.goal,
      contract: contractsList[0],
      availableBuilds: chapter.availableBuilds as string[] | undefined,
    })
    setContracts(contractsList)
    if (contractsList[0]?.goal) setGoalText(contractsList[0].goal)
    if (Array.isArray(chapter.availableBuilds)) {
      setAvailableBuilds(chapter.availableBuilds)
    }
  }, [chapter, setAvailableBuilds, setContracts, setGoalText])

  const handleNextContract = () => {
    if (!chapter) return
    resetLevel()
    const layout = (chapter.layout as LevelTile[] | undefined) || []
    const next = contracts[contractIndex + 1]
    if (next) {
      loadLevel({
        layout,
        goal: next.goal,
        contract: next,
        availableBuilds: chapter.availableBuilds as string[] | undefined,
      })
      setContract({ ...next, delivered: 0, completed: false })
      nextContract()
    }
  }

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

      {contractCompleted && (
        <div className="modal">
          <div className="modal-content">
            <h2>Contract Complete</h2>
            <p>
              {contractIndex + 1 < contracts.length ? 'Great work. Next contract?' : 'All contracts complete.'}
            </p>
            <div className="button-row">
              {contractIndex + 1 < contracts.length ? (
                <button className="btn" onClick={handleNextContract}>
                  Next Contract
                </button>
              ) : (
                <button className="btn" onClick={resetLevel}>
                  Replay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
