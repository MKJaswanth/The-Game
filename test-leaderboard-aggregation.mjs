import { recordScore, inMemoryScores } from './server/src/routes/scores.js';
import express from './server/node_modules/express/index.js';
import leaderboardRouter from './server/src/routes/leaderboard.js';
import assert from 'node:assert/strict';

// Setup isolated express app to test the router
const app = express();
app.use(express.json());
app.use('/api/leaderboard', leaderboardRouter);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/leaderboard`;

  try {
    console.log('Testing leaderboard aggregation...');

    // Clear test inMemoryScores
    inMemoryScores.length = 0;

    // Record multiple scores for Alice across different games
    await recordScore('Alice', 'snake', 100, true);
    await recordScore('Alice', 'trivia', 50, false);
    await recordScore('Alice', 'snake', 40, false);

    // Record score for Bob
    await recordScore('Bob', 'snake', 120, true);
    await recordScore('Bob', 'trivia', 10, false);

    // Record score for Charlie
    await recordScore('Charlie', 'snake', 60, false);

    // 1. Test Global Leaderboard: /api/leaderboard
    const globalRes = await fetch(baseUrl);
    const globalData = await globalRes.json();
    assert.equal(globalData.success, true);
    const globalRows = globalData.leaderboard;

    console.log('Global Leaderboard Rows:', JSON.stringify(globalRows, null, 2));

    // Alice total score: 100 + 50 + 40 = 190 (3 games)
    // Bob total score: 120 + 10 = 130 (2 games)
    // Charlie total score: 60 (1 game)
    assert.equal(globalRows.length, 3, 'Should have exactly 3 unique player rows');
    assert.equal(globalRows[0].nickname, 'Alice');
    assert.equal(globalRows[0].score, 190, 'Alice total score should aggregate all 3 matches');
    assert.equal(globalRows[0].gamesPlayed, 3, 'Alice should have 3 games played');
    assert.equal(globalRows[0].rank, 1);

    assert.equal(globalRows[1].nickname, 'Bob');
    assert.equal(globalRows[1].score, 130, 'Bob total score should aggregate both matches');
    assert.equal(globalRows[1].gamesPlayed, 2, 'Bob should have 2 games played');
    assert.equal(globalRows[1].rank, 2);

    assert.equal(globalRows[2].nickname, 'Charlie');
    assert.equal(globalRows[2].score, 60);
    assert.equal(globalRows[2].gamesPlayed, 1);
    assert.equal(globalRows[2].rank, 3);

    // 2. Test Game Tab: /api/leaderboard/snake
    const snakeRes = await fetch(`${baseUrl}/snake`);
    const snakeData = await snakeRes.json();
    assert.equal(snakeData.success, true);
    const snakeRows = snakeData.leaderboard;

    console.log('Snake Leaderboard Rows:', JSON.stringify(snakeRows, null, 2));

    // In Snake: Bob highest is 120, Alice highest is 100, Charlie is 60
    assert.equal(snakeRows.length, 3, 'Each player should appear once with their best score in snake');
    assert.equal(snakeRows[0].nickname, 'Bob');
    assert.equal(snakeRows[0].score, 120);
    assert.equal(snakeRows[0].rank, 1);

    assert.equal(snakeRows[1].nickname, 'Alice');
    assert.equal(snakeRows[1].score, 100);
    assert.equal(snakeRows[1].rank, 2);

    assert.equal(snakeRows[2].nickname, 'Charlie');
    assert.equal(snakeRows[2].score, 60);
    assert.equal(snakeRows[2].rank, 3);

    // 3. Test Game Tab: /api/leaderboard/trivia
    const triviaRes = await fetch(`${baseUrl}/trivia`);
    const triviaData = await triviaRes.json();
    assert.equal(triviaData.success, true);
    const triviaRows = triviaData.leaderboard;

    console.log('Trivia Leaderboard Rows:', JSON.stringify(triviaRows, null, 2));

    // In Trivia: Alice highest is 50, Bob is 10
    assert.equal(triviaRows.length, 2);
    assert.equal(triviaRows[0].nickname, 'Alice');
    assert.equal(triviaRows[0].score, 50);

    assert.equal(triviaRows[1].nickname, 'Bob');
    assert.equal(triviaRows[1].score, 10);

    console.log('ALL LEADERBOARD AGGREGATION TESTS PASSED!');
    if (server.closeAllConnections) server.closeAllConnections();
    server.close();
    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    console.error('Test failed:', err);
    if (server.closeAllConnections) server.closeAllConnections();
    server.close();
    setTimeout(() => process.exit(1), 100);
  }
});
