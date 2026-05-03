import React, { useState, useEffect, useCallback, useRef } from 'react';
import { store } from '../store.js';
import { useStore } from '../hooks/useStore.js';

/* ─── Win Patterns ─── */
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function checkDraw(board) {
  return board.every(cell => cell !== null);
}

/* ─── X Mark SVG ─── */
function XMark() {
  return <div className="ttt-mark-x" />;
}

/* ─── O Mark SVG ─── */
function OMark() {
  return <div className="ttt-mark-o" />;
}

/* ─── Main Component ─── */
export default function TicTacToeGame({ wagerId, wager, userId, opponentName, onGameEnd }) {
  useStore(); // Re-render on store changes (realtime board updates)

  const [gameOver, setGameOver] = useState(false);
  const [winResult, setWinResult] = useState(null); // { mark, line } or null
  const [isDraw, setIsDraw] = useState(false);
  const [boardReady, setBoardReady] = useState(false);
  const resolvedRef = useRef(false);

  // Get live wager from store
  const liveWager = store.wagers.find(w => w.id === wagerId) || wager;
  const board = liveWager?.tttBoard || Array(9).fill(null);
  const currentTurn = liveWager?.tttCurrentTurn;
  const iAmChallenger = liveWager?.challengerId === userId;
  const myMark = iAmChallenger ? 'X' : 'O';
  const isMyTurn = currentTurn === userId;

  // Staggered cell entrance
  useEffect(() => {
    const timer = setTimeout(() => setBoardReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Check for win/draw on every board change
  useEffect(() => {
    if (gameOver) return;

    const result = checkWinner(board);
    if (result) {
      setWinResult(result);
      setGameOver(true);

      // Determine winner member ID
      const winnerId = result.mark === 'X' ? liveWager.challengerId : liveWager.opponentId;

      // Delay to let animation play, then resolve
      setTimeout(() => {
        if (!resolvedRef.current) {
          resolvedRef.current = true;
          onGameEnd(winnerId);
        }
      }, 2000);
      return;
    }

    if (checkDraw(board)) {
      setIsDraw(true);
      setGameOver(true);
      setTimeout(() => {
        if (!resolvedRef.current) {
          resolvedRef.current = true;
          onGameEnd(null); // draw
        }
      }, 2000);
    }
  }, [board, gameOver, liveWager, onGameEnd]);

  const handleCellClick = useCallback(async (index) => {
    if (gameOver || !isMyTurn || board[index] !== null) return;

    try {
      await store.makeWagerMove(wagerId, index, userId);
    } catch (e) {
      console.error('Failed to place move:', e);
    }
  }, [gameOver, isMyTurn, board, wagerId, userId]);

  const getCellClass = (index) => {
    const classes = ['ttt-cell'];
    if (boardReady) classes.push('ttt-cell-enter');
    if (board[index]) classes.push('ttt-cell-filled');
    if (!isMyTurn || board[index]) classes.push('ttt-cell-disabled');
    if (winResult?.line?.includes(index)) classes.push('ttt-cell-win');
    if (isDraw && board[index]) classes.push('ttt-cell-draw');
    return classes.join(' ');
  };

  // Determine banner classes
  let bannerClass = 'ttt-turn-banner ';
  if (gameOver) {
    if (isDraw) bannerClass += 'turn-draw';
    else bannerClass += winResult?.mark === 'X' ? 'turn-x' : 'turn-o';
  } else {
    bannerClass += currentTurn === liveWager.challengerId ? 'turn-x' : 'turn-o';
    if (isMyTurn) bannerClass += ' active-pulse';
  }

  return (
    <div className="ttt-container">
      {/* Turn Indicator */}
      <div className={bannerClass}>
        <span className="material-symbols-outlined">
          {gameOver ? (isDraw ? 'balance' : 'emoji_events') : (isMyTurn ? 'touch_app' : 'hourglass_top')}
        </span>
        {gameOver
          ? (isDraw ? "It's a Draw!" : (winResult?.mark === myMark ? 'You Win!' : `${opponentName} Wins!`))
          : (isMyTurn ? 'Your Turn' : `${opponentName}'s Turn`)
        }
      </div>

      {/* Player Labels */}
      <div className="ttt-status-bar">
        <div className={`ttt-player-score ${isMyTurn && !gameOver ? (iAmChallenger ? 'active-turn' : 'active-turn-o') : ''}`}>
          <span className={`ttt-player-mark ${iAmChallenger ? 'ttt-player-mark-x' : 'ttt-player-mark-o'}`}>{myMark}</span>
          <span className="ttt-player-label">You</span>
        </div>
        <span className="ttt-vs-divider">VS</span>
        <div className={`ttt-player-score ${!isMyTurn && !gameOver ? (iAmChallenger ? 'active-turn-o' : 'active-turn') : ''}`}>
          <span className={`ttt-player-mark ${iAmChallenger ? 'ttt-player-mark-o' : 'ttt-player-mark-x'}`}>{iAmChallenger ? 'O' : 'X'}</span>
          <span className="ttt-player-label">{opponentName}</span>
        </div>
      </div>

      {/* Board */}
      <div className={`ttt-board ${isDraw && gameOver ? 'ttt-board-draw' : ''}`}>
        {board.map((cell, i) => (
          <div
            key={i}
            className={getCellClass(i)}
            onClick={() => handleCellClick(i)}
            style={{ animationDelay: boardReady ? `${i * 40}ms` : undefined }}
          >
            {cell === 'X' && <XMark />}
            {cell === 'O' && <OMark />}
            {/* Hover ghost for empty cells */}
            {!cell && isMyTurn && !gameOver && (
              <div className="ttt-ghost">
                {myMark === 'X' ? <XMark /> : <OMark />}
              </div>
            )}
          </div>
        ))}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="ttt-game-over">
            <span className={`ttt-game-over-text ${
              isDraw ? 'ttt-game-over-draw' : (winResult?.mark === myMark ? 'ttt-game-over-win' : 'ttt-game-over-lose')
            }`}>
              {isDraw ? 'DRAW' : (winResult?.mark === myMark ? 'VICTORY' : 'DEFEAT')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
