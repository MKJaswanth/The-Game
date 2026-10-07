export const GAMES_CATALOG = [
  {
    id: 'snake',
    title: 'Snake',
    icon: '🐍',
    description: 'Classic arcade survival. Eat food, grow longer, avoid collisions, and aim for the top high score.',
    playerCount: '1 Player (Solo)',
    category: 'SOLO ARCADE',
    badgeVariant: 'primary',
    isAvailable: true,
    supportsSolo: true,
    minPlayers: 1,
    maxPlayers: 1
  },
  {
    id: 'trivia',
    title: 'Trivia Battle',
    icon: '🧠',
    description: 'Fast-paced multiplayer quiz showdown. Answer correctly and rapidly to rack up speed bonuses.',
    playerCount: 'Solo or 2–8 Players',
    category: 'MULTIPLAYER QUIZ',
    badgeVariant: 'accent',
    isAvailable: true,
    supportsSolo: true,
    minPlayers: 1,
    maxPlayers: 8
  },
  {
    id: 'wordscramble',
    title: 'Word Scramble',
    icon: '🔤',
    description: 'Race against friends or play solo to unscramble letters into words before the timer runs out.',
    playerCount: 'Solo or 2–6 Players',
    category: 'SPEED PUZZLE',
    badgeVariant: 'success',
    isAvailable: true,
    supportsSolo: true,
    minPlayers: 2,
    maxPlayers: 6
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    icon: '❌⭕',
    description: 'Head-to-head tactical duel. Outsmart your teammate in a quick turn-based match with instant rematch.',
    playerCount: '2 Players',
    category: '1V1 BATTLE',
    badgeVariant: 'warning',
    isAvailable: true,
    minPlayers: 2,
    maxPlayers: 2
  },
  {
    id: 'uno',
    title: 'UNO',
    icon: '🃏',
    description: 'The beloved card game of colors, skips, and wild draws.',
    playerCount: '2–6 Players',
    category: 'CARD GAME',
    isAvailable: false
  },
  {
    id: 'flappy',
    title: 'Flappy Race',
    icon: '🐦',
    description: 'Competitive obstacle racing — who will fly the furthest?',
    playerCount: '1–4 Players',
    category: 'ARCADE RACE',
    isAvailable: false
  },
  {
    id: 'chess',
    title: 'Chess',
    icon: '♟️',
    description: 'Grandmaster tactics with a timed team clock.',
    playerCount: '2 Players',
    category: 'STRATEGY',
    isAvailable: false
  },
  {
    id: 'emoji',
    title: 'Emoji Guessing',
    icon: '🤔',
    description: 'Decipher movies, songs, and phrases written in emoji code.',
    playerCount: '2–8 Players',
    category: 'PARTY GAME',
    isAvailable: false
  }
];
