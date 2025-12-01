import './App.css'

function App() {
  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Quantum Foundry · Early Planning Build</p>
          <h1>Shapez-style factory for quantum circuits</h1>
          <p className="lede">
            Build conveyor-first factories that assemble gate sequences and qubit bundles,
            then ship them as contracts for a sci-fi megacity, research lab, or shady corp.
          </p>
        </div>
        <div className="cta-row">
          <button className="cta primary">Start Sandbox (WIP)</button>
          <button className="cta ghost">View Design Doc</button>
        </div>
      </header>

      <section className="panel">
        <h2>Campaign arc</h2>
        <ol className="list">
          <li>
            <strong>Chapter 0 — Classical warmup:</strong> AND/OR/NOT only; teach routing.
          </li>
          <li>
            <strong>Chapter 1 — Superposition:</strong> |0⟩, |1⟩, |+⟩, H; efficiency puzzles.
          </li>
          <li>
            <strong>Chapter 2 — Entanglement:</strong> CNOT, Bell, GHZ; “shared keys” contracts.
          </li>
          <li>
            <strong>Chapter 3 — Interference:</strong> S/T/phase kickback optimization.
          </li>
          <li>
            <strong>Chapter 4 — Measurement & error:</strong> noise, collapse, correction.
          </li>
          <li>
            <strong>Chapter X — Free sandbox:</strong> unlimited parts; player inventions.
          </li>
        </ol>
      </section>

      <section className="panel grid">
        <div>
          <h3>Simulation tracks</h3>
          <ul className="list">
            <li>Arcade: symbolic, cartoon Bloch previews.</li>
            <li>Expert: small statevectors (up to 4 qubits), circuit diagrams.</li>
            <li>Backend swap hook: `runCircuit(backend, circuit)` for future remote QC.</li>
          </ul>
        </div>
        <div>
          <h3>Systems to build</h3>
          <ul className="list">
            <li>Gate registry fed by content JSON, not hardcoded enums.</li>
            <li>Contract goals with throughput/resource/fidelity medals.</li>
            <li>Challenge modifiers (no teleporters, max control linkers).</li>
            <li>Micro-puzzles and “Explain this” overlays for teaching.</li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <h3>Technical to-do (MVP)</h3>
        <ul className="list">
          <li>Grid + conveyor tick loop in <code>src/engine</code>.</li>
          <li>Minimal Pixi render layer for tiles/items.</li>
          <li>State store (Zustand) for placements, inventory, time control.</li>
          <li>Content-driven levels in <code>src/content</code> (chapters, gates, tooltips).</li>
          <li>Inspector UI with small sim preview for a selected bundle.</li>
        </ul>
      </section>
    </main>
  )
}

export default App
