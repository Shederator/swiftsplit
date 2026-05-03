/* ═══════════════════════════════════════════════════════════════
   HisabX — Haggle Screen (Wager Lobby + Coinflip Minigame)
   ═══════════════════════════════════════════════════════════════ */

import { store } from '../store.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, renderAvatar } from '../utils.js';
import { navigate } from '../router.js';

/* ── Phase constants ─────────────────────────────────────────── */
const PHASE = {
  LOBBY:    'lobby',     // challenger picks amount & game
  WAITING:  'waiting',   // waiting for opponent to accept
  READY:    'ready',     // both accepted, press READY to flip
  FLIPPING: 'flipping',  // coin animating
  RESULT:   'result',    // winner shown
};

export default function haggleScreen(container, params) {
  const { memberId, direction } = params;
  const { user } = store;
  const member   = store.getMember(memberId);

  if (!member) {
    container.innerHTML = `<div class="empty-state"><p>Member not found</p></div>`;
    return;
  }

  const isChallenger = true; // The person who tapped Haggle is always challenger
  // Check if there's already an active wager between these two
  let activeWager = store.getActiveWager(memberId);

  // Determine my side if I'm joining an existing wager
  let mySide = 'challenger';
  if (activeWager) {
    mySide = activeWager.challengerId === user.id ? 'challenger' : 'opponent';
  }

  // State
  let phase    = activeWager
    ? (activeWager.status === 'accepted' ? PHASE.READY : PHASE.WAITING)
    : PHASE.LOBBY;
  let wagerId  = activeWager?.id || null;
  let wagerAmt = activeWager?.amount || 0;
  let flipResult = null; // 'heads' | 'tails'
  let winnerId   = null;

  /* ── Realtime subscription ───────────────────────────────── */
  let unsubscribe = null;

  function subscribeToUpdates() {
    unsubscribe = store.subscribe(() => {
      const updated = store.getActiveWager(memberId) ||
        store.wagers.find(w => w.id === wagerId);
      if (!updated) return;

      mySide  = updated.challengerId === user.id ? 'challenger' : 'opponent';
      wagerId = updated.id;
      wagerAmt = updated.amount;

      if (updated.status === 'accepted' && phase === PHASE.WAITING) {
        phase = PHASE.READY;
        render();
      } else if (phase === PHASE.READY) {
        render(); // Re-render to instantly update the ready/waiting badges
      }

      if (updated.status === 'cancelled' && phase !== PHASE.RESULT) {
        showToast('Wager was cancelled', 'info');
        navigate(`/balance-detail/${memberId}/${direction}`);
      }

      // Both ready → trigger flip
      if (updated.status === 'accepted' && updated.challengerReady && updated.opponentReady && phase === PHASE.READY) {
        startFlip(updated);
      }
    });
  }

  subscribeToUpdates();

  /* ── Coin flip logic ─────────────────────────────────────── */
  async function startFlip(wager) {
    phase = PHASE.FLIPPING;
    render();

    // Deterministic result seeded from wager id
    const seed   = wager.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    flipResult   = seed % 2 === 0 ? 'heads' : 'tails';
    // challenger always picks heads
    winnerId     = flipResult === 'heads' ? wager.challengerId : wager.opponentId;

    await new Promise(r => setTimeout(r, 3200)); // let animation play

    // Only one party resolves (challenger, to avoid double-write)
    if (user.id === wager.challengerId) {
      try {
        await store.resolveWager(wager.id, winnerId, { flip: flipResult });
      } catch(e) { /* opponent may have already resolved */ }
    }

    phase = PHASE.RESULT;
    render();
  }

  /* ── Render ──────────────────────────────────────────────── */
  function render() {
    container.innerHTML = buildHTML();
    attachEvents();
  }

  function buildHTML() {
    return `
      <div class="haggle-screen">
        ${buildHeader()}
        <div class="haggle-body">
          ${phase === PHASE.LOBBY    ? buildLobby()    : ''}
          ${phase === PHASE.WAITING  ? buildWaiting()  : ''}
          ${phase === PHASE.READY    ? buildReady()    : ''}
          ${phase === PHASE.FLIPPING ? buildFlipping() : ''}
          ${phase === PHASE.RESULT   ? buildResult()   : ''}
        </div>
      </div>
    `;
  }

  function buildHeader() {
    return `
      <div class="haggle-header">
        <button class="btn-icon" id="haggle-back">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <span class="haggle-header-title">
          <span class="material-symbols-outlined" style="font-size:18px;color:var(--amber)">casino</span>
          Haggle
        </span>
        <div style="width:40px"></div>
      </div>
    `;
  }

  /* ── SVGs ────────────────────────────────────────────────── */
  function getHeadsSVG() {
    return `<svg width="100%" height="100%" viewBox="0 0 100 100"><defs><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></linearGradient><filter id="shadowH"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/></filter></defs><circle cx="50" cy="50" r="46" fill="url(#goldGrad)" filter="url(#shadowH)"/><circle cx="50" cy="50" r="38" fill="none" stroke="#fcd34d" stroke-width="2" opacity="0.6"/><text x="50" y="66" font-family="system-ui, sans-serif" font-weight="900" font-size="46" fill="#fff" text-anchor="middle" style="text-shadow: 0 2px 4px rgba(180,83,9,0.6)">H</text></svg>`;
  }

  function getTailsSVG() {
    return `<svg width="100%" height="100%" viewBox="0 0 100 100"><defs><linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="50%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#475569"/></linearGradient><filter id="shadowT"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/></filter></defs><circle cx="50" cy="50" r="46" fill="url(#silverGrad)" filter="url(#shadowT)"/><circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" stroke-width="2" opacity="0.6"/><text x="50" y="66" font-family="system-ui, sans-serif" font-weight="900" font-size="46" fill="#fff" text-anchor="middle" style="text-shadow: 0 2px 4px rgba(71,85,105,0.6)">T</text></svg>`;
  }

  function buildLobby() {
    return `
      <div class="haggle-lobby stagger" style="width:100%;display:flex;flex-direction:column;gap:24px;flex:1;position:relative;padding-bottom:100px;">
        
        <!-- Players -->
        <div class="haggle-vs-row">
          <div class="haggle-player">
            ${renderAvatar(store.getMember(user.id) || { name: user.name, id: user.id }, 'avatar-md')}
            <span class="haggle-player-name">You</span>
            <span class="haggle-player-tag">Challenger</span>
          </div>
          <div class="haggle-vs-badge">VS</div>
          <div class="haggle-player">
            ${renderAvatar(member, 'avatar-md')}
            <span class="haggle-player-name">${member.name.split(' ')[0]}</span>
            <span class="haggle-player-tag">Opponent</span>
          </div>
        </div>

        <!-- Amount -->
        <div class="haggle-amount-card">
          <div class="haggle-card-label">
            <span class="material-symbols-outlined">payments</span>
            Wager Amount
          </div>
          <div class="haggle-amount-row">
            <span class="haggle-currency">₹</span>
            <input id="wager-amount" type="number" class="haggle-amount-input"
              placeholder="0" min="1" inputmode="numeric" />
          </div>
          <p class="haggle-card-hint">
            <span class="material-symbols-outlined" style="font-size:16px">info</span>
            Winner's debt gets cleared by this amount
          </p>
        </div>

        <!-- Game -->
        <div class="haggle-game-card">
          <div class="haggle-card-label">
            <span class="material-symbols-outlined">videogame_asset</span>
            Choose Minigame
          </div>
          <div class="haggle-game-option selected" id="game-coinflip">
            <div class="haggle-game-icon">
              <span class="material-symbols-outlined" style="color:#fff;font-size:20px">monetization_on</span>
            </div>
            <div class="haggle-game-info">
              <span class="haggle-game-name">Coin Flip</span>
              <span class="haggle-game-desc">50/50 pure luck — heads or tails</span>
            </div>
            <span class="material-symbols-outlined haggle-game-check">check_circle</span>
          </div>
        </div>

        <div style="position:absolute;bottom:0;left:0;right:0;width:100%">
          <button class="haggle-cta-btn" id="challenge-btn">
            <span class="material-symbols-outlined">send</span>
            Challenge ${member.name.split(' ')[0]}
          </button>
        </div>
      </div>
    `;
  }

  function buildWaiting() {
    const amtFmt = formatCurrency(wagerAmt);
    return `
      <div class="haggle-waiting stagger" style="flex:1;display:flex;flex-direction:column;width:100%;min-height:70vh;position:relative">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding-bottom:80px">
          
          <div style="position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center">
            <div class="haggle-pulse-ring" style="position:absolute;inset:0"></div>
            <div class="coin coin-idle" style="width:80px;height:80px;z-index:2">
              <div class="coin-face coin-heads">${getHeadsSVG()}</div>
              <div class="coin-face coin-tails">${getTailsSVG()}</div>
            </div>
          </div>

          <h2 class="haggle-phase-title" style="margin-top:40px">Challenge Sent!</h2>
          <p class="haggle-phase-desc" style="margin-top:16px">
            Waiting for <strong>${member.name.split(' ')[0]}</strong> to accept your<br>
            <span class="haggle-amount-highlight">${amtFmt}</span> coin flip wager
          </p>
          <div class="haggle-dots" style="margin-top:24px">
            <span></span><span></span><span></span>
          </div>
        </div>

        <div style="position:absolute;bottom:0;left:0;right:0;width:100%">
          ${mySide === 'opponent' ? `
          <div style="display:flex;gap:12px;width:100%">
            <button class="haggle-reject-btn" id="reject-wager-btn">Decline</button>
            <button class="haggle-cta-btn" id="accept-wager-btn" style="flex:1;width:auto">
              <span class="material-symbols-outlined">casino</span>
              Accept Wager
            </button>
          </div>` : `
          <button class="haggle-cancel-btn" id="cancel-wager-btn" style="width:100%">
            Cancel Challenge
          </button>`}
        </div>
      </div>
    `;
  }

  function buildReady() {
    const amtFmt = formatCurrency(wagerAmt);
    const w = store.wagers.find(x => x.id === wagerId);
    const iAmChallenger = w?.challengerId === user.id;
    const myReady       = iAmChallenger ? w?.challengerReady : w?.opponentReady;
    const theirReady    = iAmChallenger ? w?.opponentReady   : w?.challengerReady;

    return `
      <div class="haggle-ready stagger">
        <div class="haggle-coin-preview">
          <div class="coin coin-idle">
            <div class="coin-face coin-heads">${getHeadsSVG()}</div>
            <div class="coin-face coin-tails">${getTailsSVG()}</div>
          </div>
        </div>

        <h2 class="haggle-phase-title">Both Players Ready?</h2>
        <p class="haggle-phase-desc">
          Wagering <span class="haggle-amount-highlight">${amtFmt}</span><br>
          Challenger gets <strong>Heads</strong> · You get <strong>Tails</strong>
        </p>

        <div class="haggle-ready-status">
          <div class="haggle-ready-player ${iAmChallenger ? (myReady ? 'is-ready' : '') : (theirReady ? 'is-ready' : '')}">
            ${renderAvatar(store.getMember(w?.challengerId) || { name: 'Challenger', id: '' }, '')}
            <span>${iAmChallenger ? 'You' : member.name.split(' ')[0]}</span>
            <span class="haggle-ready-badge">${(iAmChallenger ? myReady : theirReady) ? '✅ Ready' : '⏳ Waiting'}</span>
          </div>
          <div class="haggle-ready-divider"></div>
          <div class="haggle-ready-player ${!iAmChallenger ? (myReady ? 'is-ready' : '') : (theirReady ? 'is-ready' : '')}">
            ${renderAvatar(store.getMember(w?.opponentId) || member, '')}
            <span>${!iAmChallenger ? 'You' : member.name.split(' ')[0]}</span>
            <span class="haggle-ready-badge">${(!iAmChallenger ? myReady : theirReady) ? '✅ Ready' : '⏳ Waiting'}</span>
          </div>
        </div>

        ${!myReady ? `
        <button class="haggle-cta-btn" id="ready-btn">
          <span class="material-symbols-outlined">thumb_up</span>
          I'm Ready — Flip It!
        </button>` : `
        <div class="haggle-waiting-other">
          <div class="haggle-dots"><span></span><span></span><span></span></div>
          <p>Waiting for ${iAmChallenger ? member.name.split(' ')[0] : 'challenger'} to ready up…</p>
        </div>`}

        <button class="haggle-cancel-btn" id="cancel-wager-btn" style="margin-top:12px">
          Cancel Wager
        </button>
      </div>
    `;
  }

  function buildFlipping() {
    return `
      <div class="haggle-flipping">
        <p class="haggle-flip-label">Flipping…</p>
        <div class="coin coin-flip">
          <div class="coin-face coin-heads">${getHeadsSVG()}</div>
          <div class="coin-face coin-tails">${getTailsSVG()}</div>
        </div>
        <p class="haggle-flip-sub">The coin decides your fate</p>
      </div>
    `;
  }

  function buildResult() {
    const iWon = winnerId === user.id;
    const amtFmt = formatCurrency(wagerAmt);
    const winnerMember = store.getMember(winnerId);

    // Modern glowing result design
    const resultColor = iWon ? 'var(--green)' : 'var(--red)';
    const resultBg = iWon ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    const resultText = iWon ? 'Victory!' : 'Defeat';

    return `
      <div class="haggle-result stagger" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;padding:40px 0;">
        
        <div style="position:relative;width:140px;height:140px;margin-bottom:30px">
          <!-- Ambient glow -->
          <div style="position:absolute;inset:-40px;background:radial-gradient(circle, ${resultColor} 0%, transparent 70%);opacity:0.2;animation:pulse 2s infinite alternate"></div>
          
          <!-- Settled Coin -->
          <div class="coin coin-settled coin-${flipResult}" style="width:140px;height:140px">
            <div class="coin-face coin-heads">${getHeadsSVG()}</div>
            <div class="coin-face coin-tails">${getTailsSVG()}</div>
          </div>
        </div>

        <div style="background:${resultBg};border:1px solid ${resultColor};color:${resultColor};padding:8px 24px;border-radius:100px;font-size:16px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px;animation:scalePop 0.5s var(--ease-spring) forwards;">
          ${resultText}
        </div>

        <h2 style="font-size:36px;font-weight:800;color:var(--text-primary);margin:0 0 12px 0;letter-spacing:-0.03em;">
          ${iWon ? `+${amtFmt}` : `-${amtFmt}`}
        </h2>
        
        <div style="text-align:center;color:var(--text-secondary);font-size:15px;line-height:1.6;max-width:280px;margin-bottom:40px">
          <p style="margin:0;opacity:0.8">The coin landed <strong>${flipResult === 'heads' ? 'Heads' : 'Tails'}</strong></p>
          <p style="margin:4px 0 0 0">
            ${iWon
              ? `You successfully won the haggle against ${member.name.split(' ')[0]}.`
              : `You lost the wager. Your debt to ${member.name.split(' ')[0]} increased.`}
          </p>
        </div>

        <button class="haggle-cta-btn" id="done-btn" style="margin-top:auto;width:100%;background:${iWon ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};border-color:transparent;box-shadow:0 4px 20px ${iWon ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'};color:#fff;">
          <span class="material-symbols-outlined">account_balance_wallet</span>
          Return to Balances
        </button>
      </div>
    `;
  }

  /* ── Events ──────────────────────────────────────────────── */
  function attachEvents() {
    container.querySelector('#haggle-back')?.addEventListener('click', () => {
      navigate(`/balance-detail/${memberId}/${direction}`);
    });

    // LOBBY → send challenge
    container.querySelector('#challenge-btn')?.addEventListener('click', async () => {
      const inp = container.querySelector('#wager-amount');
      const amt = parseFloat(inp?.value);
      if (!amt || amt <= 0) {
        showToast('Enter a valid wager amount', 'error');
        return;
      }
      const btn = container.querySelector('#challenge-btn');
      btn.disabled = true;
      btn.innerHTML = `<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Sending…`;
      try {
        const w = await store.createWager(memberId, amt, 'coinflip');
        wagerId  = w.id;
        wagerAmt = w.amount;
        mySide   = 'challenger';
        phase    = PHASE.WAITING;
        render();
      } catch(e) {
        showToast('Failed to send challenge', 'error');
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined">send</span> Challenge ${member.name.split(' ')[0]}`;
      }
    });

    // WAITING → opponent accepts
    container.querySelector('#accept-wager-btn')?.addEventListener('click', async () => {
      const btn = container.querySelector('#accept-wager-btn');
      btn.disabled = true;
      try {
        await store.acceptWager(wagerId);
        phase = PHASE.READY;
        render();
      } catch(e) {
        showToast('Failed to accept wager', 'error');
        btn.disabled = false;
      }
    });

    // WAITING → opponent rejects
    container.querySelector('#reject-wager-btn')?.addEventListener('click', async () => {
      try {
        await store.cancelWager(wagerId);
        showToast('Wager declined', 'info');
        navigate(`/balance-detail/${memberId}/${direction}`);
      } catch(e) {
        showToast('Error declining wager', 'error');
      }
    });

    // CANCEL
    container.querySelector('#cancel-wager-btn')?.addEventListener('click', async () => {
      try {
        await store.cancelWager(wagerId);
        showToast('Wager cancelled', 'info');
        navigate(`/balance-detail/${memberId}/${direction}`);
      } catch(e) {
        showToast('Error cancelling wager', 'error');
      }
    });

    // READY
    container.querySelector('#ready-btn')?.addEventListener('click', async () => {
      const btn = container.querySelector('#ready-btn');
      btn.disabled = true;
      btn.innerHTML = `<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Locking in…`;
      try {
        const updated = await store.setWagerReady(wagerId, mySide);
        // Check if both are now ready
        const w = store.wagers.find(x => x.id === wagerId);
        if (w && w.challengerReady && w.opponentReady) {
          await startFlip(w);
        } else {
          render(); // show waiting for other player
        }
      } catch(e) {
        showToast('Error readying up', 'error');
        btn.disabled = false;
      }
    });

    // RESULT → done
    container.querySelector('#done-btn')?.addEventListener('click', () => {
      navigate('/balances');
    });
  }

  // Initial render
  render();

  // Return cleanup
  return () => {
    if (unsubscribe) unsubscribe();
  };
}
