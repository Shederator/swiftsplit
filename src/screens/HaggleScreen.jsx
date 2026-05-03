import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import { useStore } from '../hooks/useStore.js';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { formatCurrency } from '../utils.js';
import TicTacToeGame from '../components/TicTacToeGame.jsx';

const PHASE = { LOBBY: 'lobby', WAITING: 'waiting', READY: 'ready', FLIPPING: 'flipping', PLAYING: 'playing', RESULT: 'result' };

function getHeadsSVG() {
  return <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="50%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#b45309"/></linearGradient><filter id="shadowH"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/></filter></defs><circle cx="50" cy="50" r="46" fill="url(#goldGrad)" filter="url(#shadowH)"/><circle cx="50" cy="50" r="38" fill="none" stroke="#fcd34d" strokeWidth="2" opacity="0.6"/><text x="50" y="66" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="46" fill="#fff" textAnchor="middle" style={{textShadow:'0 2px 4px rgba(180,83,9,0.6)'}}>H</text></svg>;
}
function getTailsSVG() {
  return <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f1f5f9"/><stop offset="50%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#475569"/></linearGradient><filter id="shadowT"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/></filter></defs><circle cx="50" cy="50" r="46" fill="url(#silverGrad)" filter="url(#shadowT)"/><circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="2" opacity="0.6"/><text x="50" y="66" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="46" fill="#fff" textAnchor="middle" style={{textShadow:'0 2px 4px rgba(71,85,105,0.6)'}}>T</text></svg>;
}

const RpsIcons = {
  rock: () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="rockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8"/>
          <stop offset="100%" stopColor="#475569"/>
        </linearGradient>
        <filter id="shadowRock"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4"/></filter>
      </defs>
      <path d="M 25 60 Q 20 40 40 25 Q 60 20 75 35 Q 85 50 75 70 Q 60 85 40 80 Q 20 75 25 60 Z" fill="url(#rockGrad)" filter="url(#shadowRock)"/>
      <path d="M 40 25 Q 50 40 45 60 Q 35 70 25 60" fill="none" stroke="#cbd5e1" strokeWidth="3" opacity="0.4"/>
      <path d="M 75 35 Q 60 45 55 65" fill="none" stroke="#cbd5e1" strokeWidth="3" opacity="0.4"/>
    </svg>
  ),
  paper: () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#e2e8f0"/>
        </linearGradient>
        <filter id="shadowPaper"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.3"/></filter>
      </defs>
      <path d="M 25 15 L 60 15 L 75 30 L 75 85 L 25 85 Z" fill="url(#paperGrad)" filter="url(#shadowPaper)"/>
      <polygon points="60,15 60,30 75,30" fill="#cbd5e1" />
      <line x1="35" y1="45" x2="65" y2="45" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round"/>
      <line x1="35" y1="55" x2="65" y2="55" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round"/>
      <line x1="35" y1="65" x2="50" y2="65" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  ),
  scissors: () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="sciHandle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#b91c1c"/>
        </linearGradient>
        <linearGradient id="sciBlade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc"/>
          <stop offset="100%" stopColor="#94a3b8"/>
        </linearGradient>
        <filter id="shadowSci"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4"/></filter>
      </defs>
      <path d="M 45 55 L 15 15 L 25 10 L 55 45 Z" fill="url(#sciBlade)" filter="url(#shadowSci)"/>
      <path d="M 55 55 L 85 15 L 75 10 L 45 45 Z" fill="url(#sciBlade)" filter="url(#shadowSci)"/>
      <circle cx="35" cy="70" r="16" fill="none" stroke="url(#sciHandle)" strokeWidth="12" filter="url(#shadowSci)"/>
      <circle cx="65" cy="70" r="16" fill="none" stroke="url(#sciHandle)" strokeWidth="12" filter="url(#shadowSci)"/>
      <circle cx="50" cy="50" r="5" fill="#334155"/>
    </svg>
  )
};

export default function HaggleScreen() {
  useStore(); // Force re-render on store updates (e.g. opponent readying up)
  const { memberId, direction } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = store;
  const member = store.getMember(memberId);

  const initialWager = store.getActiveWager(memberId);
  const [phase, setPhase] = useState(() => {
    if (initialWager) {
      if (initialWager.status === 'playing') return PHASE.PLAYING;
      if (initialWager.status === 'accepted') return PHASE.READY;
      return PHASE.WAITING;
    }
    return PHASE.LOBBY;
  });
  const [wagerId, setWagerId] = useState(initialWager?.id || null);
  const [wagerAmt, setWagerAmt] = useState(initialWager?.amount || 0);
  const [selectedGame, setSelectedGame] = useState(initialWager?.game || 'coinflip');
  const [mySide, setMySide] = useState(() => initialWager ? (initialWager.challengerId === user.id ? 'challenger' : 'opponent') : 'challenger');
  const [flipResult, setFlipResult] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [wagerInput, setWagerInput] = useState('');
  const [sendingChallenge, setSendingChallenge] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [rpsAnimState, setRpsAnimState] = useState('idle'); // 'idle', 'pumping', 'revealed'
  const flipTriggeredRef = React.useRef(false);

  // Subscribe to store updates for realtime wager changes
  useEffect(() => {
    const unsub = store.subscribe(() => {
      const updated = store.getActiveWager(memberId) || store.wagers.find(w => w.id === wagerId);
      if (!updated) return;
      setMySide(updated.challengerId === user.id ? 'challenger' : 'opponent');
      setWagerId(updated.id);
      setWagerAmt(updated.amount);

      if (updated.status === 'accepted') {
        setPhase(prev => {
          if (prev === PHASE.WAITING) return PHASE.READY;
          return prev;
        });
      }
      if (updated.status === 'cancelled') {
        showToast('Wager was cancelled', 'info');
        navigate(`/balance-detail/${memberId}/${direction}`);
        return;
      }
      // TTT: playing status means board is active
      if (updated.status === 'playing') {
        setPhase(prev => {
          if (prev === PHASE.READY || prev === PHASE.FLIPPING) return PHASE.PLAYING;
          return prev;
        });
      }
      // Both ready → trigger flip (coinflip/rps) or init TTT
      if (updated.status === 'accepted' && updated.challengerReady && updated.opponentReady) {
        const gameMode = updated.game || selectedGame;
        if (gameMode === 'tictactoe') {
          // Challenger inits the TTT board
          if (updated.challengerId === user.id) {
            store.initTicTacToe(updated.id).catch(e => console.error('TTT init failed:', e));
          }
          // Phase will transition via the 'playing' status handler above
        } else {
          setPhase(prev => {
            if (prev === PHASE.READY) return PHASE.FLIPPING;
            return prev;
          });
        }
      }
    });
    return unsub;
  }, [memberId, wagerId, direction, navigate, showToast, user.id]);

  const triggerGame = useCallback(async (wager) => {
    if (wager.game === 'rps') {
      const cChoice = wager.challengerChoice;
      const oChoice = wager.opponentChoice;
      
      let winner = null;
      if (cChoice !== oChoice) {
        if (
          (cChoice === 'rock' && oChoice === 'scissors') ||
          (cChoice === 'paper' && oChoice === 'rock') ||
          (cChoice === 'scissors' && oChoice === 'paper')
        ) {
          winner = wager.challengerId;
        } else {
          winner = wager.opponentId;
        }
      }
      
      setFlipResult({ challengerMove: cChoice, opponentMove: oChoice, winner });
      setWinnerId(winner);
      setRpsAnimState('pumping');
      
      setTimeout(() => {
        setRpsAnimState('revealed');
      }, 1800);
      
      await new Promise(r => setTimeout(r, 3500));
      if (user.id === wager.challengerId) {
        try { await store.resolveWager(wager.id, winner, { game: 'rps', challengerMove: cChoice, opponentMove: oChoice }); } catch(e) {}
      }
      setPhase(PHASE.RESULT);
    } else {
      const seed = wager.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const result = seed % 2 === 0 ? 'heads' : 'tails';
      const winner = result === 'heads' ? wager.challengerId : wager.opponentId;
      setFlipResult(result);
      setWinnerId(winner);
      await new Promise(r => setTimeout(r, 3200));
      if (user.id === wager.challengerId) {
        try { await store.resolveWager(wager.id, winner, { flip: result }); } catch(e) {}
      }
      setPhase(PHASE.RESULT);
    }
  }, [user.id]);

  useEffect(() => {
    if (phase === PHASE.FLIPPING && !flipTriggeredRef.current) {
      flipTriggeredRef.current = true;
      const w = store.wagers.find(x => x.id === wagerId);
      if (w) triggerGame(w);
    }
  }, [phase, wagerId, triggerGame]);

  if (!member) return <div className="empty-state"><p>Member not found</p></div>;

  async function handleChallenge() {
    const amt = parseFloat(wagerInput);
    if (!amt || amt <= 0) { showToast('Enter a valid wager amount', 'error'); return; }
    setSendingChallenge(true);
    try {
      const w = await store.createWager(memberId, amt, selectedGame);
      setWagerId(w.id); setWagerAmt(w.amount); setMySide('challenger'); setPhase(PHASE.WAITING);
    } catch(e) { showToast('Failed to send challenge', 'error'); }
    setSendingChallenge(false);
  }
  async function handleAccept() {
    try { await store.acceptWager(wagerId); setPhase(PHASE.READY); } catch(e) { showToast('Failed to accept wager', 'error'); }
  }
  async function handleCancel() {
    try { await store.cancelWager(wagerId); showToast('Wager cancelled', 'info'); navigate(`/balance-detail/${memberId}/${direction}`); } catch(e) { showToast('Error cancelling wager', 'error'); }
  }
  async function handleReady() {
    setReadyLoading(true);
    try {
      await store.setWagerReady(wagerId, mySide);
    } catch(e) { showToast('Error readying up', 'error'); }
    setReadyLoading(false);
  }

  const amtFmt = formatCurrency(wagerAmt);

  return (
    <div className="haggle-screen">
      {/* Header */}
      <div className="haggle-header">
        <button className="btn-icon" onClick={() => navigate(`/balance-detail/${memberId}/${direction}`)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="haggle-header-title">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--amber)' }}>casino</span> Haggle
        </span>
        <div style={{ width: 40 }}></div>
      </div>
      <div className="haggle-body">
        {/* LOBBY */}
        {phase === PHASE.LOBBY && (
          <div className="haggle-lobby stagger" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24, flex: 1, position: 'relative', paddingBottom: 100 }}>
            <div className="haggle-vs-row">
              <div className="haggle-player">
                <Avatar member={store.getMember(user.id) || { name: user.name, id: user.id }} sizeClass="avatar-md" />
                <span className="haggle-player-name">You</span>
                <span className="haggle-player-tag">Challenger</span>
              </div>
              <div className="haggle-vs-badge">VS</div>
              <div className="haggle-player">
                <Avatar member={member} sizeClass="avatar-md" />
                <span className="haggle-player-name">{member.name.split(' ')[0]}</span>
                <span className="haggle-player-tag">Opponent</span>
              </div>
            </div>
            <div className="haggle-amount-card">
              <div className="haggle-card-label"><span className="material-symbols-outlined">payments</span> Wager Amount</div>
              <div className="haggle-amount-row">
                <span className="haggle-currency">₹</span>
                <input type="number" className="haggle-amount-input" placeholder="0" min="1" inputMode="numeric" value={wagerInput} onChange={e => setWagerInput(e.target.value)} />
              </div>
              <p className="haggle-card-hint"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span> Winner's debt gets cleared by this amount</p>
            </div>
            <div className="haggle-game-card">
              <div className="haggle-card-label"><span className="material-symbols-outlined">videogame_asset</span> Choose Minigame</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={`haggle-game-option ${selectedGame === 'coinflip' ? 'selected' : ''}`} onClick={() => setSelectedGame('coinflip')}>
                  <div className="haggle-game-icon"><span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 20 }}>monetization_on</span></div>
                  <div className="haggle-game-info"><span className="haggle-game-name">Coin Flip</span><span className="haggle-game-desc">50/50 pure luck — heads or tails</span></div>
                  {selectedGame === 'coinflip' && <span className="material-symbols-outlined haggle-game-check">check_circle</span>}
                </div>
                <div className={`haggle-game-option ${selectedGame === 'rps' ? 'selected' : ''}`} onClick={() => setSelectedGame('rps')}>
                  <div className="haggle-game-icon" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 20 }}>back_hand</span>
                  </div>
                  <div className="haggle-game-info"><span className="haggle-game-name">Stone Paper Scissors</span><span className="haggle-game-desc">Classic battle — choose your move</span></div>
                  {selectedGame === 'rps' && <span className="material-symbols-outlined haggle-game-check">check_circle</span>}
                </div>
                <div className={`haggle-game-option ${selectedGame === 'tictactoe' ? 'selected' : ''}`} onClick={() => setSelectedGame('tictactoe')}>
                  <div className="haggle-game-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 20 }}>grid_3x3</span>
                  </div>
                  <div className="haggle-game-info"><span className="haggle-game-name">Tic Tac Toe</span><span className="haggle-game-desc">Strategic battle — outsmart your opponent</span></div>
                  {selectedGame === 'tictactoe' && <span className="material-symbols-outlined haggle-game-check">check_circle</span>}
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%' }}>
              <button className="haggle-cta-btn" onClick={handleChallenge} disabled={sendingChallenge}>
                {sendingChallenge ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Sending…</> : <><span className="material-symbols-outlined">send</span> Challenge {member.name.split(' ')[0]}</>}
              </button>
            </div>
          </div>
        )}

        {/* WAITING */}
        {phase === PHASE.WAITING && (() => {
          const w = store.wagers.find(x => x.id === wagerId);
          const gameMode = w?.game || selectedGame;
          return (
          <div className="haggle-waiting stagger" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: '70vh', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, paddingBottom: 80 }}>
              <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="haggle-pulse-ring" style={{ position: 'absolute', inset: 0 }}></div>
                {gameMode === 'rps' ? (
                  <div style={{ width: 80, height: 80, zIndex: 2 }}>{RpsIcons.rock()}</div>
                ) : (
                  <div className="coin coin-idle" style={{ width: 80, height: 80, zIndex: 2 }}>
                    <div className="coin-face coin-heads">{getHeadsSVG()}</div>
                    <div className="coin-face coin-tails">{getTailsSVG()}</div>
                  </div>
                )}
              </div>
              <h2 className="haggle-phase-title" style={{ marginTop: 40 }}>Challenge Sent!</h2>
              <p className="haggle-phase-desc" style={{ marginTop: 16 }}>Waiting for <strong>{member.name.split(' ')[0]}</strong> to accept your<br /><span className="haggle-amount-highlight">{amtFmt}</span> {gameMode === 'rps' ? 'Stone Paper Scissors' : gameMode === 'tictactoe' ? 'Tic Tac Toe' : 'coin flip'} wager</p>
              <div className="haggle-dots" style={{ marginTop: 24 }}><span></span><span></span><span></span></div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%' }}>
              {mySide === 'opponent' ? (
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                  <button className="haggle-reject-btn" onClick={handleCancel}>Decline</button>
                  <button className="haggle-cta-btn" onClick={handleAccept} style={{ flex: 1, width: 'auto' }}><span className="material-symbols-outlined">casino</span> Accept Wager</button>
                </div>
              ) : (
                <button className="haggle-cancel-btn" onClick={handleCancel} style={{ width: '100%' }}>Cancel Challenge</button>
              )}
            </div>
          </div>
          );
        })()}

        {/* READY */}
        {phase === PHASE.READY && (() => {
          const w = store.wagers.find(x => x.id === wagerId);
          const iAmChallenger = w?.challengerId === user.id;
          const myReady = iAmChallenger ? w?.challengerReady : w?.opponentReady;
          const theirReady = iAmChallenger ? w?.opponentReady : w?.challengerReady;
          const gameMode = w?.game || selectedGame;
          return (
            <div className="haggle-ready stagger">
              <div className="haggle-coin-preview">
                {gameMode === 'tictactoe' ? (
                  <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.1)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#22c55e' }}>grid_3x3</span>
                  </div>
                ) : gameMode === 'rps' ? (
                  <div style={{ width: 100, height: 100, display: 'flex' }}>
                    <div style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }}>{RpsIcons.rock()}</div>
                    <div style={{ width: '100%', height: '100%', position: 'absolute', opacity: 0.6 }}>{RpsIcons.rock()}</div>
                  </div>
                ) : (
                  <div className="coin coin-idle"><div className="coin-face coin-heads">{getHeadsSVG()}</div><div className="coin-face coin-tails">{getTailsSVG()}</div></div>
                )}
              </div>
              <h2 className="haggle-phase-title">Both Players Ready?</h2>
              {gameMode === 'tictactoe' ? (
                <p className="haggle-phase-desc">Wagering <span className="haggle-amount-highlight">{amtFmt}</span><br />Challenger plays <strong style={{ color: '#f59e0b' }}>X</strong> · Opponent plays <strong style={{ color: '#a855f7' }}>O</strong></p>
              ) : gameMode === 'rps' ? (
                <p className="haggle-phase-desc">Wagering <span className="haggle-amount-highlight">{amtFmt}</span><br />Choose your move to battle it out.</p>
              ) : (
                <p className="haggle-phase-desc">Wagering <span className="haggle-amount-highlight">{amtFmt}</span><br />Challenger gets <strong>Heads</strong> · You get <strong>Tails</strong></p>
              )}
              <div className="haggle-ready-status">
                <div className={`haggle-ready-player ${iAmChallenger ? (myReady ? 'is-ready' : '') : (theirReady ? 'is-ready' : '')}`}>
                  <Avatar member={store.getMember(w?.challengerId) || { name: 'Challenger', id: '' }} />
                  <span>{iAmChallenger ? 'You' : member.name.split(' ')[0]}</span>
                  <span className={`haggle-ready-badge ${(iAmChallenger ? myReady : theirReady) ? 'ready' : 'waiting'}`}>
                    {(iAmChallenger ? myReady : theirReady) ? (
                      <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span> Ready</>
                    ) : (
                      <><span className="material-symbols-outlined" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>progress_activity</span> Waiting</>
                    )}
                  </span>
                </div>
                <div className="haggle-ready-divider"></div>
                <div className={`haggle-ready-player ${!iAmChallenger ? (myReady ? 'is-ready' : '') : (theirReady ? 'is-ready' : '')}`}>
                  <Avatar member={store.getMember(w?.opponentId) || member} />
                  <span>{!iAmChallenger ? 'You' : member.name.split(' ')[0]}</span>
                  <span className={`haggle-ready-badge ${(!iAmChallenger ? myReady : theirReady) ? 'ready' : 'waiting'}`}>
                    {(!iAmChallenger ? myReady : theirReady) ? (
                      <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span> Ready</>
                    ) : (
                      <><span className="material-symbols-outlined" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>progress_activity</span> Waiting</>
                    )}
                  </span>
                </div>
              </div>
              {!myReady ? (
                gameMode === 'rps' ? (
                  <div className="rps-selection-grid" style={{ width: '100%', marginTop: 24 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>Choose Your Move</div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button className="rps-choice-btn" onClick={() => store.setWagerReady(wagerId, mySide, 'rock')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0', width: 90, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}>
                        <div style={{ width: 40, height: 40 }}>{RpsIcons.rock()}</div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>ROCK</span>
                      </button>
                      <button className="rps-choice-btn" onClick={() => store.setWagerReady(wagerId, mySide, 'paper')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0', width: 90, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}>
                        <div style={{ width: 40, height: 40 }}>{RpsIcons.paper()}</div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>PAPER</span>
                      </button>
                      <button className="rps-choice-btn" onClick={() => store.setWagerReady(wagerId, mySide, 'scissors')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0', width: 90, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}>
                        <div style={{ width: 40, height: 40 }}>{RpsIcons.scissors()}</div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>SCISSORS</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="haggle-cta-btn" onClick={() => handleReady()} disabled={readyLoading}>
                    {readyLoading ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Locking in…</> : <><span className="material-symbols-outlined">thumb_up</span> {gameMode === 'tictactoe' ? "I'm Ready — Let's Play!" : "I'm Ready — Flip It!"}</>}
                  </button>
                )
              ) : (
                <div className="haggle-waiting-other" style={{ marginTop: 24 }}><div className="haggle-dots"><span></span><span></span><span></span></div><p>Waiting for {iAmChallenger ? member.name.split(' ')[0] : 'challenger'} to ready up…</p></div>
              )}
              <button className="haggle-cancel-btn" onClick={handleCancel} style={{ marginTop: 12 }}>Cancel Wager</button>
            </div>
          );
        })()}

        {/* FLIPPING */}
        {phase === PHASE.FLIPPING && (() => {
          const w = store.wagers.find(x => x.id === wagerId);
          const iAmChallenger = w?.challengerId === user.id;
          const gameMode = w?.game || selectedGame;
          
          if (gameMode === 'rps') {
            const getIcon = (move) => RpsIcons[move] ? RpsIcons[move]() : RpsIcons.rock();
            const myMove = iAmChallenger ? flipResult?.challengerMove : flipResult?.opponentMove;
            const theirMove = !iAmChallenger ? flipResult?.challengerMove : flipResult?.opponentMove;

            return (
              <div className="haggle-flipping" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p className="haggle-flip-label" style={{ marginBottom: 40 }}>{rpsAnimState === 'pumping' ? 'Rock... Paper... Scissors...' : 'Shoot!'}</p>
                <div className="rps-arena" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 300, padding: '0 20px' }}>
                  <div className={`rps-hand-container rps-hand-left ${rpsAnimState === 'pumping' ? 'pumping' : 'revealed'}`}>
                    {rpsAnimState === 'pumping' ? (
                      <div style={{ width: 100, height: 100 }}>{RpsIcons.rock()}</div>
                    ) : (
                      <div style={{ width: 100, height: 100 }} className="rps-reveal-left">{myMove ? getIcon(myMove) : RpsIcons.rock()}</div>
                    )}
                    <div style={{ textAlign: 'center', marginTop: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>You</div>
                  </div>
                  
                  <div className={`rps-hand-container rps-hand-right ${rpsAnimState === 'pumping' ? 'pumping' : 'revealed'}`}>
                    {rpsAnimState === 'pumping' ? (
                      <div style={{ width: 100, height: 100, transform: 'scaleX(-1)' }}>{RpsIcons.rock()}</div>
                    ) : (
                      <div style={{ width: 100, height: 100 }} className="rps-reveal-right">{theirMove ? getIcon(theirMove) : RpsIcons.rock()}</div>
                    )}
                    <div style={{ textAlign: 'center', marginTop: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>{member.name.split(' ')[0]}</div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="haggle-flipping">
              <p className="haggle-flip-label">Flipping…</p>
              <div className="coin coin-flip"><div className="coin-face coin-heads">{getHeadsSVG()}</div><div className="coin-face coin-tails">{getTailsSVG()}</div></div>
              <p className="haggle-flip-sub">The coin decides your fate</p>
            </div>
          );
        })()}

        {/* PLAYING (Tic Tac Toe) */}
        {phase === PHASE.PLAYING && (() => {
          const w = store.wagers.find(x => x.id === wagerId);
          const handleTttEnd = async (tttWinnerId) => {
            setWinnerId(tttWinnerId);
            const iAmChallenger = w?.challengerId === user.id;
            const myMark = iAmChallenger ? 'X' : 'O';
            const theirMark = iAmChallenger ? 'O' : 'X';
            setFlipResult({ game: 'tictactoe', myMark, theirMark, winner: tttWinnerId });
            // Only challenger resolves
            if (user.id === w?.challengerId) {
              try {
                await store.resolveWager(w.id, tttWinnerId, { game: 'tictactoe', board: w.tttBoard });
              } catch(e) { console.error('Resolve failed:', e); }
            }
            setPhase(PHASE.RESULT);
          };
          return (
            <div className="haggle-flipping" style={{ padding: '20px 0' }}>
              <TicTacToeGame
                wagerId={wagerId}
                wager={w}
                userId={user.id}
                opponentName={member.name.split(' ')[0]}
                onGameEnd={handleTttEnd}
              />
            </div>
          );
        })()}

        {/* RESULT */}
        {phase === PHASE.RESULT && (() => {
          const w = store.wagers.find(x => x.id === wagerId);
          const gameMode = w?.game || selectedGame;
          const iAmChallenger = w?.challengerId === user.id;
          const iWon = winnerId === user.id;
          const isDraw = winnerId === null;
          const resultColor = isDraw ? 'var(--text-tertiary)' : (iWon ? 'var(--green)' : 'var(--red)');
          const resultBg = isDraw ? 'rgba(255, 255, 255, 0.05)' : (iWon ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)');
          return (
            <div className="haggle-result stagger" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '40px 0' }}>
              <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: -40, background: `radial-gradient(circle, ${resultColor} 0%, transparent 70%)`, opacity: 0.2, animation: 'pulse 2s infinite alternate' }}></div>
                
                {gameMode === 'tictactoe' ? (
                  <div style={{ width: 140, height: 140, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDraw ? 'rgba(255,255,255,0.05)' : (iWon ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'), borderRadius: 'var(--radius-2xl)', border: `1px solid ${isDraw ? 'rgba(255,255,255,0.1)' : (iWon ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)')}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 64, color: isDraw ? 'var(--text-secondary)' : (iWon ? '#22c55e' : '#ef4444') }}>grid_3x3</span>
                  </div>
                ) : gameMode === 'rps' ? (
                  <div style={{ width: 140, height: 140, zIndex: 2, transform: 'scale(1.2)' }}>
                    {isDraw ? RpsIcons[flipResult?.challengerMove]() : (iWon ? (iAmChallenger ? RpsIcons[flipResult?.challengerMove]() : RpsIcons[flipResult?.opponentMove]()) : (iAmChallenger ? RpsIcons[flipResult?.opponentMove]() : RpsIcons[flipResult?.challengerMove]()))}
                  </div>
                ) : (
                  <div className={`coin coin-settled coin-${flipResult}`} style={{ width: 140, height: 140, zIndex: 2 }}><div className="coin-face coin-heads">{getHeadsSVG()}</div><div className="coin-face coin-tails">{getTailsSVG()}</div></div>
                )}
              </div>
              <div style={{ background: resultBg, border: `1px solid ${resultColor}`, color: resultColor, padding: '8px 24px', borderRadius: 100, fontSize: 16, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 24, animation: 'scalePop 0.5s var(--ease-spring) forwards' }}>{isDraw ? "It's a Draw" : (iWon ? 'Victory!' : 'Defeat')}</div>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px 0', letterSpacing: '-0.03em' }}>{isDraw ? "₹0" : (iWon ? `+${amtFmt}` : `-${amtFmt}`)}</h2>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, maxWidth: 280, marginBottom: 40 }}>
                {gameMode === 'tictactoe' ? (
                  <p style={{ margin: 0, opacity: 0.8 }}>Tic Tac Toe — {isDraw ? 'the board filled up' : 'strategic victory'}</p>
                ) : gameMode === 'rps' ? (
                  <p style={{ margin: 0, opacity: 0.8 }}><strong>{iAmChallenger ? flipResult?.challengerMove : flipResult?.opponentMove}</strong> vs <strong>{!iAmChallenger ? flipResult?.challengerMove : flipResult?.opponentMove}</strong></p>
                ) : (
                  <p style={{ margin: 0, opacity: 0.8 }}>The coin landed <strong>{flipResult === 'heads' ? 'Heads' : 'Tails'}</strong></p>
                )}
                <p style={{ margin: '4px 0 0 0' }}>{isDraw ? "Both played the same move. No debts were changed." : (iWon ? `You successfully won the haggle against ${member.name.split(' ')[0]}.` : `You lost the wager. Your debt to ${member.name.split(' ')[0]} increased.`)}</p>
              </div>
              <button className="haggle-cta-btn" onClick={() => navigate('/balances')} style={{ marginTop: 'auto', width: '100%', background: iWon ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)', borderColor: 'transparent', boxShadow: iWon ? '0 4px 20px rgba(34,197,94,0.3)' : '0 4px 20px rgba(239,68,68,0.3)', color: '#fff' }}>
                <span className="material-symbols-outlined">account_balance_wallet</span> Return to Balances
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
