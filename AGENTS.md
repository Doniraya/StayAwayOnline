# Stay Away Online - AI Agent Guidelines

Welcome to the codebase of "Stay Away Online", a web-based adaptation of the multiplayer board game "Stay Away" (Нечто). 

## 1. Tech Stack & Architecture
- **Backend:** Node.js, Express, Socket.io, TypeScript.
- **Frontend:** React, Vite, Tailwind, Framer Motion.
- **State Management:** The game is driven by a strict State Machine located in `stay-away-backend/src/game/GameEngine.ts`.
- **Communication:** WebSockets (Socket.io) broadcast the sanitized state (`getSanitizedState`) to clients. DO NOT leak hidden cards or roles to the global room log or state!

## 2. Core Game Rules (STRICT DOMAIN KNOWLEDGE)
When writing game logic, strictly adhere to the official physical board game rules:

### Roles & Infection Mechanics
- **Roles:** `HUMAN`, `INFECTED`, `THING`.
- **Infection Rule:** ONLY the `THING` can infect a `HUMAN` by passing the `INFECTED` card during a trade.
- **INFECTED Constraint:** An `INFECTED` player CANNOT pass the `INFECTED` card to a `HUMAN`. They can only pass it back to the `THING`.
- **HUMAN Constraint:** A `HUMAN` can NEVER pass an `INFECTED` card.
- **Hand Size:** A player must ALWAYS have exactly 4 cards in their hand at the start and end of their turn.

### Turn Phases (`room.phase`)
1. `DRAW`: Player draws 1 card from the deck. (If PANIC card is drawn, it is played immediately and discarded).
2. `PLAY_OR_DISCARD`: Player must play 1 card (applying its effect) OR discard 1 card face down.
3. `TRADE`: Player offers 1 card face down to the next player.
4. `TRADE_ACCEPT`: The receiving player gives 1 card face down in return.

### Obstacles (Must be checked during interactions)
- **Quarantine (`QUARANTINE`):** Lasts for 3 turns. A quarantined player CANNOT trade cards, play action cards, or be targeted by most action cards.
- **Barred Door (`BARRED_DOOR`):** Placed between two adjacent players. Prevents trading, changing seats, and Flamethrower attacks between them.

## 3. Coding Conventions for Jules (AI Agent)
- **TypeScript Strictness:** DO NOT use `any`. Always create or update interfaces in `types/game.ts`.
- **Immutability:** When modifying arrays (like deck or hand), avoid mutating original state references directly if it causes side effects. Use spread operators where applicable.
- **Randomness:** Use `crypto.randomInt` and Fisher-Yates for any deck shuffling or random player selection. DO NOT use `Math.random()`.
- **Logs:** Update `room.log` with user-friendly Russian messages, but NEVER include secret information (like secret infections or hidden card names during trade).

## 4. Your Role
Act as an expert Senior TypeScript Developer. Before writing logic for new cards or fixing bugs, consult the "Core Game Rules" section to ensure you do not break the board game's balance.
