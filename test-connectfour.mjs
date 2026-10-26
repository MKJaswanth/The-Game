import { createBoard, dropDisc, winningCells, chooseBotColumn } from './client/src/games/connectfour/connectFour.js';

let board = createBoard();
const ok = (condition, message) => {
  console.log(condition ? `PASS ${message}` : `FAIL ${message}`);
  if (!condition) process.exitCode = 1;
};

for (let column = 0; column < 4; column += 1) {
  const move = dropDisc(board, column, 'red');
  board = move.board;
  if (column < 3) board = dropDisc(board, column, 'yellow').board;
}
ok(winningCells(board, 5, 3, 'red').length >= 4, 'horizontal four-in-a-row is detected');
ok(chooseBotColumn(createBoard()) === 3, 'bot prefers the center column on an empty board');

const blockBoard = createBoard();
for (let column = 0; column < 3; column += 1) {
  blockBoard[5][column] = 'red';
}
ok(chooseBotColumn(blockBoard) === 3, 'bot blocks a human winning move');
