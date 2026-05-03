/* HisabX — Haggle Screen (React) — PRIMARY FLICKER FIX */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { formatCurrency } from '../utils.js';

const PHASE = { LOBBY: 'lobby', WAITING: 'waiting', READY: 'ready', FLIPPING: 'flipping', RESULT: 'result' };

function getHeadsSVG() {
  return <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="50%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#b45309"/></linearGradient><filter id="shadowH"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/></filter></defs><circle cx="50" cy="50" r="46" fill="url(#goldGrad)" filter="url(#shadowH)"/><circle cx="50" cy="50" r="38" fill="none" stroke="#fcd34d" strokeWidth="2" opacity="0.6"/><text x="50" y="66" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="46" fill="#fff" textAnchor="middle" style={{textShadow:'0 2px 4px rgba(180,83,9,0.6)'}}>H</text></svg>;
}
function getTailsSVG() {
  return <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f1f5f9"/><stop offset="50%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#475569"/></linearGradient><filter id="shadowT"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/></filter></defs><circle cx="50" cy="50" r="46" fill="url(#silverGrad)" filter="url(#shadowT)"/><circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="2" opacity="0.6"/><text x="50" y="66" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="46" fill="#fff" textAnchor="middle" style={{textShadow:'0 2px 4px rgba(71,85,105,0.6)'}}>T</text></svg>;
}

export default function HaggleScreen() {
  const { memberId, direction } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = store;
  const member = store.getMember(memberId);

  const initialWager = store.getActiveWager(memberId);
  const [phase, setPhase] = useState(() => {
    if (initialWager) return initialWager.status === 'accepted' ? PHASE.READY : PHASE.WAITING;
    return PHASE.LOBBY;
  });
  const [wagerId, setWagerId] = useState(initialWager?.id || null);
  const [wagerAmt, setWagerAmt] = useState(initialWager?.amount || 0);
  const [mySide, setMySide] = useState(() => initialWager ? (initialWager.challengerId === user.id ? 'challenger' : 'opponent') : 'challenger');
  const [flipResult, setFlipResult] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [wagerInput, setWagerInput] = useState('');
  const [sendingChallenge, setSendingChallenge] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);

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
      // Both ready → trigger flip
      if (updated.status === 'accepted' && updated.challengerReady && updated.opponentReady) {
        setPhase(prev => {
          if (prev === PHASE.READY) {
            triggerFlip(updated);
            return PHASE.FLIPPING;
          }
          return prev;
        });
      }
    });
    return unsub;
  }, [memberId, wagerId]);

  const triggerFlip = useCallback(async (wager) => {
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
  }, [user.id]);

  if (!member) return <div className="empty-state"><p>Member not found</p></div>;

  async function handleChallenge() {
    const amt = parseFloat(wagerInput);
    if (!amt || amt <= 0) { showToast('Enter a valid wager amount', 'error'); return; }
    setSendingChallenge(true);
    try {
      const w = await store.createWager(memberId, amt, 'coinflip');
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
      const w = store.wagers.find(x => x.id === wagerId);
      if (w && w.challengerReady && w.opponentReady) {
        setPhase(PHASE.FLIPPING);
        await triggerFlip(w);
      }
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
              <div className="haggle-game-option selected">
                <div className="haggle-game-icon"><span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 20 }}>monetization_on</span></div>
                <div className="haggle-game-info"><span className="haggle-game-name">Coin Flip</span><span className="haggle-game-desc">50/50 pure luck — heads or tails</span></div>
                <span className="material-symbols-outlined haggle-game-check">check_circle</span>
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
        {phase === PHASE.WAITING && (
          <div className="haggle-waiting stagger" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: '70vh', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, paddingBottom: 80 }}>
              <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="haggle-pulse-ring" style={{ position: 'absolute', inset: 0 }}></div>
                <div className="coin coin-idle" style={{ width: 80, height: 80, zIndex: 2 }}>
                  <div className="coin-face coin-heads">{getHeadsSVG()}</div>
                  <div className="coin-face coin-tails">{getTailsSVG()}</div>
                </div>
              </div>
              <h2 className="haggle-phase-title" style={{ marginTop: 40 }}>Challenge Sent!</h2>
              <p className="haggle-phase-desc" style={{ marginTop: 16 }}>Waiting for <strong>{member.name.split(' ')[0]}</strong> to accept your<br /><span className="haggle-amount-highlight">{amtFmt}</span> coin flip wager</p>
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
        )}

        {/* READY */}
        {phase === PHASE.READY && (() => {
          const w = store.wagers.find(x => x.id === wagerId);
          const iAmChallenger = w?.challengerId === user.id;
          const myReady = iAmChallenger ? w?.challengerReady : w?.opponentReady;
          const theirReady = iAmChallenger ? w?.opponentReady : w?.challengerReady;
          return (
            <div className="haggle-ready stagger">
              <div className="haggle-coin-preview">
                <div className="coin coin-idle"><div className="coin-face coin-heads">{getHeadsSVG()}</div><div className="coin-face coin-tails">{getTailsSVG()}</div></div>
              </div>
              <h2 className="haggle-phase-title">Both Players Ready?</h2>
              <p className="haggle-phase-desc">Wagering <span className="haggle-amount-highlight">{amtFmt}</span><br />Challenger gets <strong>Heads</strong> · You get <strong>Tails</strong></p>
              <div className="haggle-ready-status">
                <div className={`haggle-ready-player ${iAmChallenger ? (myReady ? 'is-ready' : '') : (theirReady ? 'is-ready' : '')}`}>
                  <Avatar member={store.getMember(w?.challengerId) || { name: 'Challenger', id: '' }} />
                  <span>{iAmChallenger ? 'You' : member.name.split(' ')[0]}</span>
                  <span className="haggle-ready-badge">{(iAmChallenger ? myReady : theirReady) ? '✅ Ready' : '⏳ Waiting'}</span>
                </div>
                <div className="haggle-ready-divider"></div>
                <div className={`haggle-ready-player ${!iAmChallenger ? (myReady ? 'is-ready' : '') : (theirReady ? 'is-ready' : '')}`}>
                  <Avatar member={store.getMember(w?.opponentId) || member} />
                  <span>{!iAmChallenger ? 'You' : member.name.split(' ')[0]}</span>
                  <span className="haggle-ready-badge">{(!iAmChallenger ? myReady : theirReady) ? '✅ Ready' : '⏳ Waiting'}</span>
                </div>
              </div>
              {!myReady ? (
                <button className="haggle-cta-btn" onClick={handleReady} disabled={readyLoading}>
                  {readyLoading ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Locking in…</> : <><span className="material-symbols-outlined">thumb_up</span> I'm Ready — Flip It!</>}
                </button>
              ) : (
                <div className="haggle-waiting-other"><div className="haggle-dots"><span></span><span></span><span></span></div><p>Waiting for {iAmChallenger ? member.name.split(' ')[0] : 'challenger'} to ready up…</p></div>
              )}
              <button className="haggle-cancel-btn" onClick={handleCancel} style={{ marginTop: 12 }}>Cancel Wager</button>
            </div>
          );
        })()}

        {/* FLIPPING */}
        {phase === PHASE.FLIPPING && (
          <div className="haggle-flipping">
            <p className="haggle-flip-label">Flipping…</p>
            <div className="coin coin-flip"><div className="coin-face coin-heads">{getHeadsSVG()}</div><div className="coin-face coin-tails">{getTailsSVG()}</div></div>
            <p className="haggle-flip-sub">The coin decides your fate</p>
          </div>
        )}

        {/* RESULT */}
        {phase === PHASE.RESULT && (() => {
          const iWon = winnerId === user.id;
          const resultColor = iWon ? 'var(--green)' : 'var(--red)';
          const resultBg = iWon ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
          return (
            <div className="haggle-result stagger" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '40px 0' }}>
              <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 30 }}>
                <div style={{ position: 'absolute', inset: -40, background: `radial-gradient(circle, ${resultColor} 0%, transparent 70%)`, opacity: 0.2, animation: 'pulse 2s infinite alternate' }}></div>
                <div className={`coin coin-settled coin-${flipResult}`} style={{ width: 140, height: 140 }}><div className="coin-face coin-heads">{getHeadsSVG()}</div><div className="coin-face coin-tails">{getTailsSVG()}</div></div>
              </div>
              <div style={{ background: resultBg, border: `1px solid ${resultColor}`, color: resultColor, padding: '8px 24px', borderRadius: 100, fontSize: 16, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 24, animation: 'scalePop 0.5s var(--ease-spring) forwards' }}>{iWon ? 'Victory!' : 'Defeat'}</div>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px 0', letterSpacing: '-0.03em' }}>{iWon ? `+${amtFmt}` : `-${amtFmt}`}</h2>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, maxWidth: 280, marginBottom: 40 }}>
                <p style={{ margin: 0, opacity: 0.8 }}>The coin landed <strong>{flipResult === 'heads' ? 'Heads' : 'Tails'}</strong></p>
                <p style={{ margin: '4px 0 0 0' }}>{iWon ? `You successfully won the haggle against ${member.name.split(' ')[0]}.` : `You lost the wager. Your debt to ${member.name.split(' ')[0]} increased.`}</p>
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
