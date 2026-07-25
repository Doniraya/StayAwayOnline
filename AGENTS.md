# Stay Away Online (Нечто) — Developer & Agent Guide

This repository contains the web adaptation of the official board game **"Stay Away!" ("Нечто из глубокой бездны")**.
All game mechanics, logic, and card effects MUST strictly follow the official PDF board game rules.

---

## 🎲 Core Game Rules & Canonical Logic

### 1. Roles & Win Conditions
- **HUMAN**: Initial role for all players except one. Goal: Identify and destroy The Thing with a Flamethrower.
- **THING**: One player receives the `THING` card at the start. Goal: Infect or eliminate all Humans.
- **INFECTED**: A Human who receives an `INFECTED` card from `THING` becomes `INFECTED`. Goal: Protect The Thing and defeat Humans.
- **Victory**: 
  - Humans win if `THING` is dead.
  - Thing/Infected win if 0 Humans remain alive.

### 2. Card Trading & Infection Rules (CRITICAL)
- **ONLY `THING` CAN INFECT HUMANS**: If `THING` passes an `INFECTED` card to a `HUMAN`, the Human's role changes to `INFECTED`.
- **Infected Player Restrictions**: An `INFECTED` player can ONLY pass an `INFECTED` card to `THING`. They MUST NOT pass an `INFECTED` card to a `HUMAN`.
- **Human Restrictions**: A `HUMAN` CANNOT pass an `INFECTED` card to anyone.
- **Infected Card Retention**: An `INFECTED` player MUST keep at least one `INFECTED` card in their hand at all times and cannot discard/trade their last one.
- **NO SPOILERS**: Infection state changes MUST BE SECRET. NEVER log infection role changes to public chat/game logs.

### 3. Deck Building & Deal Rules
- **Starting Hand Deal**: Each player receives 4 cards.
- **STRICT RULE**: `INFECTED` cards and `PANIC` cards MUST NOT be present in initial starting hands.
- Starting hands are dealt strictly from Stay Away event cards (excluding `INFECTED`).
- Remaining Stay Away cards + `INFECTED` cards + `PANIC` cards are combined and shuffled AFTER initial dealing to form the main draw deck.

### 4. Turn Structure & Hand Limits
- Each player has a hand of **exactly 4 cards** at the start and end of their turn.
- Turn phases:
  1. `DRAW`: Draw 1 card from deck. (If Panic card is drawn, resolve/discard immediately).
  2. `PLAY_OR_DISCARD`: Play 1 Event card or Discard 1 card.
  3. `TRADE`: Offer 1 card to the adjacent player (by direction). The target responds (`TRADE_ACCEPT`) with 1 card or a Defense card (`NO_THANKS`).
- **Defense Cards (`NO_THANKS`, `MISS`, `NO_BARBECUE`)**: Playing a defense card immediately discards it and draws a replacement card from the deck to maintain 4 cards in hand.

### 5. Obstacles
- **Quarantine (`QUARANTINE`)**: Lasts for 3 turns. A player in Quarantine CANNOT trade cards, play event cards, or be targeted by actions (except special cards/panic). They draw cards face-down as normal.
- **Barred Door (`BARRED_DOOR`)**: Blocks all direct actions, card trades, and seat swaps between adjacent neighbors separated by the door.

---

## 🛠️ Technical Architecture & Coding Guidelines

### Stack
- **Backend**: Node.js, Express, Socket.io, TypeScript (`stay-away-backend/`).
- **Frontend**: React 18, Vite, Tailwind CSS v4, TypeScript (`stay-away-frontend/`).

### Code Standards
1. **Cryptographic Randomness**: ALWAYS use `secureShuffleInPlace()` or `crypto.randomInt()` for shuffling decks and picking random elements. NEVER use `Math.random() - 0.5`.
2. **Type Safety**: NO `any` types. Keep TypeScript strictly typed. Always update `src/types/game.ts` when adding new state properties.
3. **State Sanitization**: Public states sent to clients MUST use `getSanitizedState()`. Players must only see their own hand and role (unless `GAME_OVER` or explicit card effects like `WHISKEY`/`ANALYSIS`).
4. **Performance**: Avoid memory allocation overhead in frequent broadcast loops. Use `useMemo` for React render cycles where appropriate.
