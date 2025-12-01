# Quantum Circuit Game

Shapez.io-inspired factory builder for assembling quantum circuits. Build conveyors, gate printers, control linkers, and synchronizers to satisfy contracts for a Quantum Foundry serving a sci-fi megacity, research labs, and shady clients.

## Stack
- Vite + React + TypeScript
- Pixi.js for render layer (to be wired)
- Zustand for game state

## Repo layout
- `src/engine/` — tick loop, grid systems (stubbed).
- `src/sim/` — circuit backends with swappable `runCircuit(backend, circuit)` interface.
- `src/content/` — JSON for gates and campaign contracts (content-driven).
- `docs/design.md` — campaign/teaching/analytics plan.

## Getting started
```
npm install --cache .npm-cache
npm run dev
```

## Near-term MVP checklist
- Grid + conveyor tick loop and Pixi render pass.
- Placement UI and basic inventory.
- Gate registry loading from content JSON.
- Output compiler with throughput/resource/fidelity medals.
- Inspector with small sim preview (arcade and expert modes).
