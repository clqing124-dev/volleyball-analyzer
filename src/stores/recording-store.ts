// ============================================================
// recording-store.ts — 记录向导状态管理（重构版）
// ============================================================

import { create } from 'zustand';
import type { MatchMode, RallySide, RallyOutcome, SetData, Rally } from '@/types';
import type { RallyAction } from '@/types/actions';
import { getNextStep, getOutcome, type StepKind } from '@/wizard/step-resolver';
import { db } from '@/db/volleyball-db';
import { v4 as uuid } from 'uuid';

interface RecordingState {
  // 比赛上下文
  matchId: string;
  setId: string;
  mode: MatchMode;
  setNumber: number;
  ourScore: number;
  opponentScore: number;
  targetScore: number;

  // 回合向导
  isRecording: boolean;
  currentSide: RallySide | null;
  nextSide: RallySide | null;         // 自动判断下一回合的发球/接发
  currentStep: StepKind | null;       // null = 回合未开始或已结束
  editingAction: RallyAction | null;  // 返回上一环节时用于回填
  pendingActions: RallyAction[];      // 当前回合已完成动作
  completedRallies: Rally[];          // 本局已完成回合

  // 动作
  startRecording: (matchId: string, setId: string, mode: MatchMode,
    setNumber: number, ourScore: number, opponentScore: number,
    existingRallies?: Rally[]) => void;
  startRally: (side: RallySide) => void;
  startNextRally: () => void;
  commitAction: (action: RallyAction) => Promise<void>;
  goBack: () => void;
  cancelRally: () => void;
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
  completedRallies: [],

  startRecording: (matchId, setId, mode, setNumber, ourScore, opponentScore, existingRallies) => {
    set({
      matchId,
      setId,
      mode,
      setNumber,
      ourScore,
      opponentScore,
      targetScore: setNumber === 5 ? 15 : 25,
      isRecording: true,
      currentSide: null,
      nextSide: null,
      currentStep: null,
      editingAction: null,
      pendingActions: [],
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
    });
  },

  startNextRally: () => {
    const { nextSide, currentSide } = get();
    const side = nextSide || currentSide || 'serving';
    get().startRally(side);
  },

  commitAction: async (action: RallyAction) => {
    const state = get();
    const newPending = [...state.pendingActions, action];
    const nextStep = getNextStep(action);

    if (nextStep === 'end') {
      // 回合结束
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
        timestamp: Date.now(),
      };

      try {
        await db.rallies.add(rally);
      } catch (e) {
        console.error('Failed to save rally:', e);
      }

      // 自动判断下一回合发球/接发：得分发球，丢分接发
      const nextSide: RallySide = outcome === 'our_score' ? 'serving' : 'receiving';

      set({
        completedRallies: [...state.completedRallies, rally],
        pendingActions: [],
        currentStep: null,
        editingAction: null,
        ourScore: newOurScore,
        opponentScore: newOpponentScore,
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

  goBack: () => {
    const { pendingActions } = get();
    if (pendingActions.length === 0) {
      // 回到回合开始（选择发球/接发）
      set({ currentStep: null, editingAction: null });
      return;
    }
    const lastAction = pendingActions[pendingActions.length - 1];
    set({
      pendingActions: pendingActions.slice(0, -1),
      currentStep: lastAction.type,
      editingAction: lastAction,  // 用于回填
    });
  },

  cancelRally: () => {
    set({
      currentStep: null,
      editingAction: null,
      pendingActions: [],
    });
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
      completedRallies: [],
    });
  },
}));
