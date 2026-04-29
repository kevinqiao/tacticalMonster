# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time PVE tactical RPG ("Tactical Monster") with a multi-game platform. Players build teams and battle bosses on hexagonal grids. The project includes a tournament/matchmaking system supporting multiple game types (solitaire, ludo, etc.).

**Tactical Monster and the casual multi-game platform are separate products.** Economy, stamina, and tournament rules for the casual platform are documented in [`docs/casual-platform-system-design.md`](docs/casual-platform-system-design.md) only; do not conflate them with Tactical Monster’s `tacticalMonster` / `tournament` configs (coins, energy, stage stamina, etc.).

**Casual platform default:** competitive modes are **PVE asynchronous tournaments** (same challenge, leaderboard by score/time — see §0.1 in that doc), not real-time PvP unless a feature is explicitly scoped as such.

## Commands

```bash
# Dev server (Vite, port 3000)
npm run dev

# Production build
npm run build

# Frontend tests (Vitest, watch mode) - covers tactical monster battle tests
npm run test:vitest

# Run a single test file
npx vitest run src/component/battle/games/tacticalMonster/battle/__tests__/someFile.test.ts

# Test with coverage
npm run test:vitest:coverage

# Legacy Jest tests (CI mode)
npm test

# Deploy Convex backend
npx convex dev
```

## Architecture

### System design principles

Cross-cutting product and implementation conventions are documented in [`docs/system-design-principles.md`](docs/system-design-principles.md): **player account level gating**, **loot / chest / stage design**, and **recommended client navigation / IA** (see also [`docs/tactical-monster-loot-and-chest-design.md`](docs/tactical-monster-loot-and-chest-design.md) for loot detail).

### Tech Stack
- **Frontend:** React 18 + TypeScript, Three.js (via React Three Fiber/Drei), GSAP animations, Pixi.js (legacy 2D)
- **Backend:** Convex (serverless functions, real-time subscriptions, database)
- **Auth:** Clerk
- **Build:** Vite 5.4, Vitest for testing
- **Styling:** TailwindCSS + styled-components

### Path Aliases (configured in vite.config.ts and tsconfig.json)
`@` → `src/`, `util` → `src/util/`, `service` → `src/service/`, `model` → `src/model/`, `component` → `src/component/`, `animate` → `src/animate/`

The `convex/*` alias has special handling: `convex/server`, `convex/react`, `convex/values` resolve to the npm package; all other `convex/*` paths resolve to `src/convex/`.

### Key Directories
- `src/component/battle/games/tacticalMonster/` — Main game (battle, team deployment, configs, types)
  - `battle/` — 2D battle system (Pixi.js, legacy)
  - `battle3d/` — 3D battle system (Three.js, active — `USE_3D_BATTLE = true`)
  - `team/` — Team selection and deployment UI
  - `config/` — Monster, skill, boss, and stage configuration data; **`stageRuleConfigs` / `pedagogyByRuleId` / `stageRuleTypes` here re-export Convex** (`src/convex/tacticalMonster/convex/data/` and `types/`) to avoid duplicate static tables. Run `npm run verify:tm-config-shims` after editing shims.
  - `types/` — Frontend type definitions (CombatTypes, gameTypes, backendResponseTypes)
- `src/convex/tacticalMonster/` — Backend services
  - `convex/service/game/` — Core game orchestration (GameService, GamePhaseService, GameActionService)
  - `convex/service/skill/` — Skill system (SkillManager, StatusEffectProcessor, damageCalculator, effects/)
  - `convex/dao/` — Data access objects
  - `convex/types/` — Backend type definitions
- `src/service/` — Global React Context managers (PageManager, UserManager, TournamentManager, ModalManager)
- `src/convex/` — All Convex backend code (tacticalMonster, tournament, solitaire, ludo, sso)

### Data Flow: Combat Loop

1. `CombatManager` (React Context) holds game state and an **event queue**
2. Backend generates events (turn start, action result, phase change) pushed via Convex real-time subscriptions
3. `useEventHandler3D` processes events sequentially from the queue
4. Each event triggers GSAP animations (movement, skill effects, damage numbers)
5. Player actions go through `useCombatActHandler3D` → backend validation → StateChanges response → UI update

### Critical Patterns

**Ref-based sprite management:** Characters stored in `charactersRef` (not React state) so GSAP can animate directly without triggering re-renders. Only re-render on game ID change.

**Event queue processing:** Events are processed one at a time; each animation must complete before the next event is dequeued. This prevents race conditions in state updates.

**Type adapter pattern:** `getCharactersFromGameModel()` converts backend `GameModel` to frontend `MonsterSprite[]`, decoupling rendering from backend schema.

**Coordinate systems:** Three coordinate spaces — logical hex (q, r), screen pixels, and 3D world (x, y, z). Conversion utilities in `battle/utils/coordinateUtils.ts` and `battle3d/utils/coordinate3DUtils.ts`.

**Dual rendering:** 2D (Pixi.js) and 3D (Three.js) battle views share the same `CombatManager` and event processing. Toggle via `USE_3D_BATTLE` flag in `PlayTacticalMonster.tsx`.

### App Initialization
`index.tsx` → `App.tsx` → nested providers (Convex → Clerk → PageManager → UserManager → ModalManager → TournamentManager) → `MainApp` → page routing via `PageManager`

### Testing
Vitest is configured for tactical monster battle tests only (see `vitest.config.ts`). Test utilities in `battle/__tests__/testUtils.ts` provide `createTestCharacter()`, `createTestStateChanges()`, `createTestPhaseChanges()`. Convex backend tests require the Convex environment and are excluded from Vitest.
