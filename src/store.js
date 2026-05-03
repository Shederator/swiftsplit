/* ═══════════════════════════════════════════════════════════════
   HisabX — Supabase-Backed Data Store with Realtime
   ═══════════════════════════════════════════════════════════════ */

import { supabase } from './supabase.js';
import { generateId } from './utils.js';

class Store {
  constructor() {
    this._data = { user: null, members: [], groups: [], expenses: [], settlements: [], wagers: [] };
    this._listeners = [];
    this._channel = null;
    this._ready = false;
    this._refreshTimer = null;
  }

  /* ── Initialization ─────────────────────────────────────────── */

  async init() {
    const session = JSON.parse(localStorage.getItem('hisabx_session') || 'null');
    if (!session) return false;

    this._data.user = { id: session.id, name: session.name, upiId: session.upiId };
    await this._fetchAll();
    this._ready = true;
    this._setupRealtime();
    return true;
  }

  async _fetchAll() {
    const [membersR, groupsR, gmR, expensesR, esR, settlementsR, wagersR] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('groups').select('*'),
      supabase.from('group_members').select('*'),
      supabase.from('expenses').select('*').order('date', { ascending: true }),
      supabase.from('expense_splits').select('*'),
      supabase.from('settlements').select('*'),
      supabase.from('wager_challenges').select('*').order('created_at', { ascending: false }),
    ]);

    const members = membersR.data || [];
    const gm = gmR.data || [];
    const es = esR.data || [];

    this._data.members = members.map(m => ({ id: m.id, name: m.name, avatarPref: m.avatar_pref, upiId: m.upi_id }));

    // Ensure session upiId matches the db in case it was updated on another device
    const me = this._data.members.find(m => m.id === this._data.user.id);
    if (me && me.upiId !== this._data.user.upiId) {
      this._data.user.upiId = me.upiId;
      const currentSession = JSON.parse(localStorage.getItem('hisabx_session') || '{}');
      currentSession.upiId = me.upiId;
      localStorage.setItem('hisabx_session', JSON.stringify(currentSession));
    }

    this._data.groups = (groupsR.data || []).map(g => ({
      id: g.id, name: g.name, icon: g.icon,
      createdAt: g.created_at, lastActive: g.last_active,
      members: gm.filter(x => x.group_id === g.id).map(x => x.member_id)
    }));

    this._data.expenses = (expensesR.data || []).map(e => ({
      id: e.id, groupId: e.group_id, amount: Number(e.amount),
      description: e.description, category: e.category,
      paidBy: e.paid_by, splitMethod: e.split_method || 'equal',
      splitData: e.split_data || {}, date: e.date,
      splitBetween: es.filter(x => x.expense_id === e.id).map(x => x.member_id)
    }));

    this._data.settlements = (settlementsR.data || []).map(s => ({
      id: s.id, from: s.from_member, to: s.to_member,
      amount: Number(s.amount), groupId: s.group_id, date: s.date,
      status: s.status || 'confirmed',
      confirmedAt: s.confirmed_at || null
    }));

    this._data.wagers = (wagersR.data || []).map(w => ({
      id: w.id,
      challengerId: w.challenger_id,
      opponentId: w.opponent_id,
      amount: Number(w.amount),
      game: w.game || 'coinflip',
      status: w.status || 'pending',
      challengerReady: w.challenger_ready || false,
      opponentReady: w.opponent_ready || false,
      challengerChoice: w.challenger_choice || null,
      opponentChoice: w.opponent_choice || null,
      winnerId: w.winner_id || null,
      resultData: w.result_data || null,
      tttBoard: w.ttt_board || null,
      tttCurrentTurn: w.ttt_current_turn || null,
      createdAt: w.created_at,
      resolvedAt: w.resolved_at || null
    }));
  }

  /* ── Realtime ───────────────────────────────────────────────── */

  _setupRealtime() {
    if (this._channel) {
      supabase.removeChannel(this._channel);
    }

    this._channel = supabase.channel('hisabx-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => this._debouncedRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => this._debouncedRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => this._debouncedRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => this._debouncedRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' }, () => this._debouncedRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => this._debouncedRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wager_challenges' }, () => this._debouncedRefresh())
      .subscribe();
  }

  _debouncedRefresh() {
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(async () => {
      await this._fetchAll();
      this._notify();
    }, 300);
  }

  /* ── Subscriptions ──────────────────────────────────────────── */

  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  }

  _notify() {
    this._listeners.forEach(fn => fn(this._data));
  }

  /* ── Getters (synchronous from cache) ───────────────────────── */

  get data() { return this._data; }
  get user() { return this._data.user; }
  get members() { return this._data.members; }
  get groups() { return this._data.groups; }
  get expenses() { return this._data.expenses; }
  get settlements() { return this._data.settlements; }
  get wagers() { return this._data.wagers; }

  getMember(id) { return this.members.find(m => m.id === id); }
  getGroup(id) { return this.groups.find(g => g.id === id); }
  getGroupExpenses(gid) { return this.expenses.filter(e => e.groupId === gid).sort((a, b) => new Date(a.date) - new Date(b.date)); }
  getGroupSettlements(gid) { return this.settlements.filter(s => s.groupId === gid); }
  getGroupMembers(gid) {
    const g = this.getGroup(gid);
    if (!g) return [];
    return g.members.map(id => this.getMember(id)).filter(Boolean);
  }

  /* ── Mutations (async, write to Supabase + update cache) ───── */

  async addGroup(name, icon, memberIds) {
    const id = generateId();
    const now = new Date().toISOString();
    const allMembers = [this._data.user.id, ...memberIds];

    await supabase.from('groups').insert({ id, name, icon, created_at: now, last_active: now });
    await supabase.from('group_members').insert(allMembers.map(mid => ({ group_id: id, member_id: mid })));

    const group = { id, name, icon, members: allMembers, createdAt: now, lastActive: now };
    this._data.groups.push(group);
    this._notify();
    return group;
  }

  async addExpense(groupId, amount, description, category, paidBy, splitBetween, splitMethod = 'equal', splitData = null) {
    const id = generateId();
    const now = new Date().toISOString();

    await supabase.from('expenses').insert({
      id, group_id: groupId, amount: Number(amount), description, category,
      paid_by: paidBy, split_method: splitMethod,
      split_data: splitData || {}, date: now
    });
    await supabase.from('expense_splits').insert(splitBetween.map(mid => ({ expense_id: id, member_id: mid })));

    // Update group last_active
    if (groupId) {
      await supabase.from('groups').update({ last_active: now }).eq('id', groupId);
      const g = this.getGroup(groupId);
      if (g) g.lastActive = now;
    }

    const expense = { id, groupId, amount: Number(amount), description, category, paidBy, splitBetween, splitMethod, splitData, date: now };
    this._data.expenses.push(expense);
    this._notify();
    return expense;
  }

  async addSettlement(from, to, amount, groupId, status = 'pending') {
    const id = generateId();
    const now = new Date().toISOString();

    await supabase.from('settlements').insert({
      id, from_member: from, to_member: to,
      amount: Number(amount), group_id: groupId || null, date: now,
      status, confirmed_at: status === 'confirmed' ? now : null
    });

    const settlement = { id, from, to, amount: Number(amount), groupId, date: now, status, confirmedAt: status === 'confirmed' ? now : null };
    this._data.settlements.push(settlement);
    this._notify();
    return settlement;
  }

  async confirmSettlement(id) {
    const now = new Date().toISOString();
    const { error } = await supabase.from('settlements')
      .update({ status: 'confirmed', confirmed_at: now })
      .eq('id', id);
    if (error) throw error;

    const s = this._data.settlements.find(s => s.id === id);
    if (s) {
      s.status = 'confirmed';
      s.confirmedAt = now;
    }
    this._notify();
  }

  async rejectSettlement(id) {
    const { error } = await supabase.from('settlements')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) throw error;

    const s = this._data.settlements.find(s => s.id === id);
    if (s) s.status = 'rejected';
    this._notify();
  }

  /**
   * Returns all pending settlements where the current user is the RECEIVER.
   * Works across all groups — multi-group aware.
   */
  getPendingSettlementsForUser() {
    if (!this._data.user) return [];
    return this._data.settlements.filter(
      s => s.status === 'pending' && s.to === this._data.user.id
    );
  }

  /**
   * Returns pending settlements FROM current user TO a specific member.
   * Used to check if sender already has a pending payment to avoid duplicates.
   */
  getPendingSettlementsTo(memberId) {
    if (!this._data.user) return [];
    return this._data.settlements.filter(
      s => s.status === 'pending' && s.from === this._data.user.id && s.to === memberId
    );
  }

  /**
   * Returns pending settlements FROM a member TO the current user.
   * Used on receiver's balance-detail screen.
   */
  getPendingSettlementsFrom(memberId) {
    if (!this._data.user) return [];
    return this._data.settlements.filter(
      s => s.status === 'pending' && s.from === memberId && s.to === this._data.user.id
    );
  }

  /* ── Wager / Haggle Methods ────────────────────────────── */

  /** Create a new wager challenge (challenger proposes, status=pending) */
  async createWager(opponentId, amount, game = 'coinflip') {
    const id = generateId();
    const now = new Date().toISOString();
    const challengerId = this._data.user.id;

    const { error } = await supabase.from('wager_challenges').insert({
      id,
      challenger_id: challengerId,
      opponent_id: opponentId,
      amount: Number(amount),
      game,
      status: 'pending',
      challenger_ready: false,
      opponent_ready: false,
      challenger_choice: null,
      opponent_choice: null,
      winner_id: null,
      result_data: null,
      created_at: now
    });
    if (error) throw error;

    const wager = {
      id, challengerId, opponentId, amount: Number(amount),
      game, status: 'pending',
      challengerReady: false, opponentReady: false,
      challengerChoice: null, opponentChoice: null,
      winnerId: null, resultData: null, createdAt: now, resolvedAt: null
    };
    this._data.wagers.unshift(wager);
    this._notify();
    return wager;
  }

  /** Opponent accepts the wager (status pending → accepted) */
  async acceptWager(id) {
    const { error } = await supabase
      .from('wager_challenges')
      .update({ status: 'accepted' })
      .eq('id', id);
    if (error) throw error;
    const w = this._data.wagers.find(x => x.id === id);
    if (w) w.status = 'accepted';
    this._notify();
  }

  /** Either party cancels before the game starts */
  async cancelWager(id) {
    const { error } = await supabase
      .from('wager_challenges')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
    const w = this._data.wagers.find(x => x.id === id);
    if (w) w.status = 'cancelled';
    this._notify();
  }

  /** Mark a party as ready to flip (both must be ready before game runs) */
  async setWagerReady(id, side, choice = null) {
    // side = 'challenger' | 'opponent'
    const readyField = side === 'challenger' ? 'challenger_ready' : 'opponent_ready';
    const choiceField = side === 'challenger' ? 'challenger_choice' : 'opponent_choice';
    
    const updates = { [readyField]: true };
    if (choice) updates[choiceField] = choice;

    const { error } = await supabase
      .from('wager_challenges')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    
    const w = this._data.wagers.find(x => x.id === id);
    if (w) {
      if (side === 'challenger') {
        w.challengerReady = true;
        if (choice) w.challengerChoice = choice;
      } else {
        w.opponentReady = true;
        if (choice) w.opponentChoice = choice;
      }
    }
    this._notify();
    return w;
  }

  /** Resolve the wager: record winner, settle the balance */
  async resolveWager(id, winnerId, resultData) {
    const now = new Date().toISOString();
    const w = this._data.wagers.find(x => x.id === id);
    if (!w) throw new Error('Wager not found');
    if (w.status === 'resolved') return; // PROTECT AGAINST DOUBLE RESOLVE

    // Optimistically mark as resolved locally to prevent race conditions
    w.status = 'resolved';

    const { error } = await supabase
      .from('wager_challenges')
      .update({ status: 'resolved', winner_id: winnerId, result_data: resultData, resolved_at: now })
      .eq('id', id);
    if (error) {
      w.status = 'accepted'; // Rollback on error
      throw error;
    }

    // Create an expense: loser owes winner (only if not a draw)
    if (winnerId) {
      const loserId = winnerId === w.challengerId ? w.opponentId : w.challengerId;
      await this.addExpense(
        null, 
        w.amount, 
        'Haggle Wager', 
        'entertainment', 
        winnerId, 
        [loserId], 
        'exact', 
        { [loserId]: w.amount }
      );
    }

    if (w) {
      w.winnerId = winnerId;
      w.resultData = resultData;
      w.resolvedAt = now;
    }
    this._notify();
  }

  /** Get active wager between current user and a member (pending, accepted, or playing) */
  getActiveWager(memberId) {
    const uid = this._data.user?.id;
    if (!uid) return null;
    return this._data.wagers.find(w =>
      ['pending', 'accepted', 'playing'].includes(w.status) &&
      ((w.challengerId === uid && w.opponentId === memberId) ||
       (w.challengerId === memberId && w.opponentId === uid))
    ) || null;
  }

  /* ── Tic Tac Toe Methods ────────────────────────────────── */

  /** Initialize TTT board when both players are ready */
  async initTicTacToe(wagerId) {
    const w = this._data.wagers.find(x => x.id === wagerId);
    if (!w) throw new Error('Wager not found');

    const emptyBoard = Array(9).fill(null);
    const { error } = await supabase
      .from('wager_challenges')
      .update({
        ttt_board: emptyBoard,
        ttt_current_turn: w.challengerId,
        status: 'playing'
      })
      .eq('id', wagerId);
    if (error) throw error;

    w.tttBoard = emptyBoard;
    w.tttCurrentTurn = w.challengerId;
    w.status = 'playing';
    this._notify();
  }

  /** Place a move on the TTT board */
  async makeWagerMove(wagerId, cellIndex, playerId) {
    const w = this._data.wagers.find(x => x.id === wagerId);
    if (!w) throw new Error('Wager not found');
    if (!w.tttBoard) throw new Error('Board not initialized');
    if (w.tttCurrentTurn !== playerId) throw new Error('Not your turn');
    if (w.tttBoard[cellIndex] !== null) throw new Error('Cell occupied');

    const mark = playerId === w.challengerId ? 'X' : 'O';
    const newBoard = [...w.tttBoard];
    newBoard[cellIndex] = mark;

    // Switch turn
    const nextTurn = playerId === w.challengerId ? w.opponentId : w.challengerId;

    const { error } = await supabase
      .from('wager_challenges')
      .update({
        ttt_board: newBoard,
        ttt_current_turn: nextTurn
      })
      .eq('id', wagerId);
    if (error) throw error;

    // Optimistic local update
    w.tttBoard = newBoard;
    w.tttCurrentTurn = nextTurn;
    this._notify();
  }

  async deleteExpense(id) {
    await supabase.from('expenses').delete().eq('id', id);
    this._data.expenses = this._data.expenses.filter(e => e.id !== id);
    this._notify();
  }

  async addMember(name) {
    const id = generateId();
    await supabase.from('members').insert({ id, name });
    const member = { id, name };
    this._data.members.push(member);
    this._notify();
    return member;
  }

  async resetData() {
    // Clear all data from Supabase
    await supabase.from('expense_splits').delete().neq('expense_id', '');
    await supabase.from('expenses').delete().neq('id', '');
    await supabase.from('settlements').delete().neq('id', '');
    await supabase.from('group_members').delete().neq('group_id', '');
    await supabase.from('groups').delete().neq('id', '');
    // Keep current user's member record, delete others
    await supabase.from('members').delete().neq('id', this._data.user.id);

    this._data.groups = [];
    this._data.expenses = [];
    this._data.settlements = [];
    this._data.members = [{ id: this._data.user.id, name: this._data.user.name, avatarPref: null, upiId: this._data.user.upiId }];
    this._notify();
  }

  /* ── Avatar Uploads ─────────────────────────────────────────── */

  async updateUserAvatar(pref) {
    if (!this._data.user) return;
    const { error } = await supabase
      .from('members')
      .update({ avatar_pref: pref })
      .eq('id', this._data.user.id);
    if (error) throw error;
    // Local update
    const member = this._data.members.find(m => m.id === this._data.user.id);
    if (member) member.avatarPref = pref;
    this._notify();
  }

  async updateUpiId(upiId) {
    if (!this._data.user) return;
    
    // Update users table
    const { error: userErr } = await supabase
      .from('users')
      .update({ upi_id: upiId })
      .eq('id', this._data.user.id);
    if (userErr) throw userErr;

    // Update members table
    const { error: memberErr } = await supabase
      .from('members')
      .update({ upi_id: upiId })
      .eq('id', this._data.user.id);
    if (memberErr) throw memberErr;

    // Local update
    this._data.user.upiId = upiId;
    const member = this._data.members.find(m => m.id === this._data.user.id);
    if (member) member.upiId = upiId;

    // Session update
    const session = JSON.parse(localStorage.getItem('hisabx_session') || '{}');
    session.upiId = upiId;
    localStorage.setItem('hisabx_session', JSON.stringify(session));

    this._notify();
  }

  async uploadAvatarImage(file) {
    if (!this._data.user) throw new Error('Not logged in');
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png';
    const filename = `${this._data.user.id}_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('Avatars')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('Avatars')
      .getPublicUrl(filename);
      
    return publicUrl;
  }

  logout() {
    localStorage.removeItem('hisabx_session');
    if (this._channel) supabase.removeChannel(this._channel);
    this._data = { user: null, members: [], groups: [], expenses: [], settlements: [] };
    this._ready = false;
  }
}

export const store = new Store();
