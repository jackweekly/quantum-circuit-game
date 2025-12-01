import { useEffect, useState } from 'react'
import { worldGrid } from '../../engine/grid'
import { worldItems } from '../../engine/items'

interface InspectInfo {
  x: number
  y: number
  tileKind?: string
  tileDir?: string
  gateId?: string
  locked?: boolean
  items: {
    id: number
    systemId: string
    qubitIndex: number
    prob1: number
  }[]
}

export function Inspector() {
  const [inspect, setInspect] = useState<InspectInfo | null>(null)

  useEffect(() => {
    function handleClick(e: Event) {
      const detail = (e as any)
      const x = detail.x
      const y = detail.y
      if (typeof x !== 'number' || typeof y !== 'number') return
      const tile = worldGrid.get(x, y)
      const items = worldItems
        .getItemsAt(x, y)
        .map((it) => {
          const sys = worldItems.systems.get(it.systemId)
          const prob1 = sys ? sys.getExcitationProbability() : 0
          return { id: it.id, systemId: it.systemId, qubitIndex: it.qubitIndex, prob1 }
        })
      setInspect({
        x,
        y,
        tileKind: tile?.kind,
        tileDir: tile?.direction,
        gateId: tile?.gateId,
        locked: tile?.locked,
        items,
      })
    }
    window.addEventListener('inspector-click', handleClick)
    return () => window.removeEventListener('inspector-click', handleClick)
  }, [])

  if (!inspect) return null

  return (
    <div className="inspector">
      <div className="inspector-row">
        <strong>Coord:</strong> {inspect.x},{inspect.y}
      </div>
      <div className="inspector-row">
        <strong>Tile:</strong> {inspect.tileKind || 'none'} {inspect.tileDir ? `(${inspect.tileDir})` : ''}
      </div>
      {inspect.gateId && (
        <div className="inspector-row">
          <strong>Gate:</strong> {inspect.gateId}
        </div>
      )}
      {inspect.locked && (
        <div className="inspector-row">
          <strong>Locked</strong>
        </div>
      )}
      <div className="inspector-row">
        <strong>Items:</strong> {inspect.items.length}
      </div>
      {inspect.items.map((it) => (
        <div key={it.id} className="inspector-row small">
          #{it.id} sys:{it.systemId} q:{it.qubitIndex} p(|1|)={it.prob1.toFixed(2)}
        </div>
      ))}
    </div>
  )
}
