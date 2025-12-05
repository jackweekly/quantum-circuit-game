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
    }
  }, [setContract, setGoalText])

  return (
    <div className="game-layout">
      <div className="hud-top">
        <div className="hud-title">
          Quantum Foundry <span style={{ opacity: 0.5 }}>// PROTOTYPE</span>
        </div>
        <div className="hud-stats">
          <span>Goal: {goal}</span>
          {contract && (
            <span>
              Contract: {contract.delivered}/{contract.required} ({contract.target})
            </span>
          )}
          <span>Credits: {credits}</span>
          <span>Score: {score}</span>
          <span>TICK: {tick}</span>
        </div>
      </div>

      <div className="viewport">
        <GameCanvas />
        <Inspector />
      </div>

      <BuildToolbar />
    </div>
  )
}

export default App
