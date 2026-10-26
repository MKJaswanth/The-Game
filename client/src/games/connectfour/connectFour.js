export const COLUMNS = 7;
export const ROWS = 6;

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
}

export function availableColumns(board) {
  return Array.from({ length: COLUMNS }, (_, column) => column)
    .filter((column) => board[0][column] === null);
}

export function dropDisc(board, column, disc) {
  const next = board.map((row) => [...row]);
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (next[row][column] === null) {
      next[row][column] = disc;
      return { board: next, row, column };
    }
  }
  return null;
}

export function winningCells(board, row, column, disc) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    const cells = [[row, column]];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = column + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r][c] === disc) {
        cells.push([r, c]);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return [];
}

export function chooseBotColumn(board, bot = 'yellow', human = 'red') {
  const columns = availableColumns(board);
  if (!columns.length) return null;

  const winningMove = columns.find((column) => {
    const move = dropDisc(board, column, bot);
    return move && winningCells(move.board, move.row, move.column, bot).length >= 4;
  });
  if (winningMove !== undefined) return winningMove;

  const blockingMove = columns.find((column) => {
    const move = dropDisc(board, column, human);
    return move && winningCells(move.board, move.row, move.column, human).length >= 4;
  });
  if (blockingMove !== undefined) return blockingMove;

  const preferred = [3, 2, 4, 1, 5, 0, 6];
  return preferred.find((column) => columns.includes(column)) ?? columns[0];
}
