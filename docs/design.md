# Quantum Circuit Game — Design Primer

## Player fantasy and wrapper
- You are the CTO of a Quantum Foundry serving shifting clients:
  - Sci-fi megacity infrastructure.
  - Research lab prototypes.
  - Shady corp with odd contracts.
- Each level is a contract with flavor (teleportation relay, fault-tolerant memory cell).

## Campaign chapters (early access roadmap)
- Chapter 0 — Classical warmup: AND/OR/NOT only; learn routing without quantum load.
- Chapter 1 — Superposition: |0>, |1>, |+>, H; efficiency puzzles.
- Chapter 2 — Entanglement: CNOT, Bell, GHZ; “shared keys” missions.
- Chapter 3 — Interference/phase: S, T, kickback.
- Chapter 4 — Measurement & error: collapse, noise, correction pieces.
- Chapter X — Free sandbox: unlimited parts, no goals.

## Win conditions and scoring
- Multi-objective medals: throughput (circuits/min), resource use (tiles/energy), fidelity/correctness.
- Challenge modifiers per contract: “no teleporters”, “max 3 control linkers”, etc.

## Teaching without walls of text
- Micro-puzzles inside levels (side terminals with quick questions).
- “Explain this” overlay per gate/bundle with 2–3 panel analogies.
- Error messaging that teaches: e.g., “works classically but never entangles qubits 0 and 1.”

## Simulation modes
- Arcade: symbolic, cartoon Bloch previews; forgiving fidelity.
- Expert: up to 3–4 qubits with real matrices/statevectors and circuit diagrams.
- Backend interface: `runCircuit(backend, circuit)` with backend ids `arcade | expert | remote` for future real QC.

## Content-driven design
- Gates, tooltips, levels, goals live in JSON (see `src/content/`).
- Gate registry fields: id, name, matrix (optional), category, unlockedAtChapter, tooltipKey.
- Enables fast iteration and a future level editor/Workshop.

## Performance guardrails
- Fixed timestep, capped particles/overdraw, perf overlay with tick time/draw calls/entities.
- “Stress test” level to benchmark integrated GPUs/Steam Deck.

## Modes and future co-op
- Campaign teaching mode vs. endless factory (random contracts).
- Command layer for actions (place/remove/change direction) to allow future co-op/network sync.

## Analytics (research-grade angle)
- Log anonymized events: struggle points, restart causes, convergent solutions.
- Outputs: learning insights for papers/blogs and funder-friendly impact stories.
