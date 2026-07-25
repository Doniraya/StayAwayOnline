const { performance } = require('perf_hooks');

const N = 10; // Realistic number of players for this game
const players = Array.from({ length: N }, (_, i) => ({ id: `player_${i}`, name: `Player ${i}` }));
const activePlayerId = `player_${N - 1}`;

const iterations = 100000; // Simulating many re-renders

// Baseline: findIndex every time
const startBaseline = performance.now();
let resultBaseline = 0;
for (let i = 0; i < iterations; i++) {
  const index = players.findIndex(p => p.id === activePlayerId);
  if (index !== -1) {
    resultBaseline += index;
  }
}
const endBaseline = performance.now();

// Optimized: use memoized index
const startOptimized = performance.now();
let resultOptimized = 0;
const memoizedIndex = players.findIndex(p => p.id === activePlayerId);
for (let i = 0; i < iterations; i++) {
  const index = memoizedIndex;
  if (index !== -1) {
    resultOptimized += index;
  }
}
const endOptimized = performance.now();

console.log(`Baseline (O(N) search on every loop): ${(endBaseline - startBaseline).toFixed(2)} ms`);
console.log(`Optimized (O(1) with memoized index): ${(endOptimized - startOptimized).toFixed(2)} ms`);
