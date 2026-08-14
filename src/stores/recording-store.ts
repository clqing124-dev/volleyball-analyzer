// ============================================================
// recording-store.ts — 记录向导状态管理（v2）
// ============================================================

import { create } from 'zustand';
import type { MatchMode, RallySide, RallyOutcome, SetData, Rally, Substitution } from '@/types';
import type { RallyAction } from '@/types/actions';
import { getNextStep, getOutcome, type StepKind } from '@/wizard/step-resolver';
import { db } from '@/db/volleyball-db';
import { v4 as uuid } from 'uuid';

type WizardStep = StepKind | 'rally_complete' | null;

interface RecordingState {
  matchId: string;
  setId: string;
  mode: MatchMode;
  setNumber: number;
  ourScore: number;
  opponentScore: number;
  targetScore: number;

  isRecording: boolean;
  currentSide: RallySide | null;
  nextSide: RallySide | null;
  currentStep: WizardStep;
  editingAction: RallyAction | null;
  pendingActions: RallyAction[];
  pendingRally: Rally | null;         // 回合结束后等待填暂停/换人
  completedRallies: Rally[];

  startRecording: (matchId: string, setId: string, mode: MatchMode,
    setNumber: number, ourScore: number, opponentScore: number,
    existingRallies?: Rally[]) => void;
  startRally: (side: RallySide) => void;
  startNextRally: () => void;
  commitAction: (action: RallyAction) => void;
  finalizeRally: (timeout: boolean, substitutions: Substitution[]) => Promise<void>;
  goBack: () => void;
  cancelRally: () => void;
  persistScore: () => Promise<void>;
  finishSet: (setId: string) => Promise<void>;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  matchId: '',
  setId: '',
  mode: 'own',
  setNumber: 1,
  ourScore: 0,
  opponentScore: 0,
  targetScore: 25,
  isRecording: false,
  currentSide: null,
  nextSide: null,
  currentStep: null,
  editingAction: null,
  pendingActions: [],
  pendingRally: null,
  completedRallies: [],

  startRecording: (matchId, setId, mode, setNumber, ourScore, opponentScore, existingRallies) => {
    set({
      matchId, setId, mode, setNumber, ourScore, opponentScore,
      targetScore: setNumber === 5 ? 15 : 25,
      isRecording: true,
      currentSide: null, nextSide: null, currentStep: null,
      editingAction: null, pendingActions: [], pendingRally: null,
      completedRallies: existingRallies || [],
    });
  },

  startRally: (side: RallySide) => {
    set({
      currentSide: side,
      nextSide: null,
      currentStep: side === 'serving' ? 'serve' : 'reception',
      editingAction: null,
      pendingActions: [],
      pendingRally: null,
    });
  },

  startNextRally: () => {
    const { nextSide, currentSide } = get();
    get().startRally(nextSide || currentSide || 'serving');
  },

  commitAction: (action: RallyAction) => {
    const state = get();
    const newPending = [...state.pendingActions, action];
    const nextStep = getNextStep(action);

    if (nextStep === 'end') {
      const outcome = getOutcome(action);
      const newOurScore = outcome === 'our_score' ? state.ourScore + 1 : state.ourScore;
      const newOpponentScore = outcome === 'their_score' ? state.opponentScore + 1 : state.opponentScore;

      const rally: Rally = {
        id: uuid(),
        setId: state.setId,
        matchId: state.matchId,
        rallyNumber: state.completedRallies.length + 1,
        side: state.currentSide!,
        actions: newPending,
        outcome,
        homeScoreAfter: newOurScore,
        awayScoreAfter: newOpponentScore,
        timeout: false,
        substitutions: [],
        timestamp: Date.now(),
      };

      const nextSide: RallySide = outcome === 'our_score' ? 'serving' : 'receiving';

      set({
        pendingActions: newPending,
        pendingRally: rally,
        currentStep: 'rally_complete',
        editingAction: null,
        nextSide,
      });
    } else {
      set({
        pendingActions: newPending,
        currentStep: nextStep,
        editingAction: null,
      });
    }
  },

  finalizeRally: async (timeout: boolean, substitutions: Substitution[]) => {
    const state = get();
    if (!state.pendingRally) return;

    const rally: Rally = { ...state.pendingRally, timeout, substitutions };
    try {
      await db.rallies.add(rally);
    } catch (e) {
      console.error('Failed to save rally:', e);
    }

    set({
      completedRallies: [...state.completedRallies, rally],
      pendingActions: [],
      pendingRally: null,
      currentStep: null,
      ourScore: rally.homeScoreAfter,
      opponentScore: rally.awayScoreAfter,
    });
  },

  goBack: () => {
    const { pendingActions, currentStep } = get();

    // 在回合完成界面返回 → 撤销最后一步终结动作
    if (currentStep === 'rally_complete') {
      const lastAction = pendingActions[pendingActions.length - 1];
      set({
        pendingActions: pendingActions.slice(0, -1),
        pendingRally: null,
        currentStep: lastAction.type,
        editingAction: lastAction,
      });
      return;
    }

    if (pendingActions.length === 0) {
      set({ currentStep: null, editingAction: null });
      return;
    }
    const lastAction = pendingActions[pendingActions.length - 1];
    set({
      pendingActions: pendingActions.slice(0, -1),
      currentStep: lastAction.type,
      editingAction: lastAction,
    });
  },

  cancelRally: () => {
    set({
      currentStep: null,
      editingAction: null,
      pendingActions: [],
      pendingRally: null,
    });
  },

  persistScore: async () => {
    const { setId, ourScore, opponentScore } = get();
    if (!setId) return;
    try {
      await db.sets.update(setId as any, { ourScore, opponentScore });
    } catch (e) {
      console.error('Failed to persist score:', e);
    }
  },

  finishSet: async (setId: string) => {
    try {
      await db.sets.update(setId as any, {
        isCompleted: true,
        ourScore: get().ourScore,
        opponentScore: get().opponentScore,
      });
    } catch (e) {
      console.error('Failed to finish set:', e);
    }
    set({ isRecording: false });
  },

  reset: () => {
    set({
      matchId: '', setId: '', mode: 'own', setNumber: 1,
      ourScore: 0, opponentScore: 0, targetScore: 25,
      isRecording: false, currentSide: null, nextSide: null,
      currentStep: null, editingAction: null,
      pendingActions: [], pendingRally: null, completedRallies: [],
    });
  },
}));
