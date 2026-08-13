// ============================================================
// recording-store.ts — 记录向导状态管理 (Zustand)
// ============================================================

import { create } from 'zustand';
import type { MatchMode, RallySide, RallyOutcome, SetData, Rally } from '@/types';
import type { RallyAction } from '@/types/actions';
import {
  getStartingStep,
  getNextStep,
  isBlockDefenseTerminalInOpponent,
  isServeTerminalResult,
  type WizardStep,
  type StepResult,
} from '@/wizard/step-resolver';
import { isServeTerminal, isAttackTerminal, isFinalEffectTerminal } from '@/types/actions';
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
  currentStep: WizardStep | null;
  pendingActions: RallyAction[];      // 当前回合正在构建的动作
  completedRallies: Rally[];          // 本局已完成回合

  // 动作
  startRecording: (matchId: string, setId: string, mode: MatchMode,
    setNumber: number, ourScore: number, opponentScore: number,
    existingRallies?: Rally[]) => void;
  startRally: (side: RallySide) => void;
  recordAction: (action: RallyAction) => void;
  advanceStep: (result: StepResult) => void;
  completeRally: (outcome: RallyOutcome) => Promise<void>;
  undoLastAction: () => void;
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
  currentStep: null,
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
      currentStep: null,
      pendingActions: [],
      completedRallies: existingRallies || [],
    });
  },

  startRally: (side: RallySide) => {
    const step = getStartingStep(side);
    set({
      currentSide: side,
      currentStep: step,
      pendingActions: [],
    });
  },

  recordAction: (action: RallyAction) => {
    set((state) => ({
      pendingActions: [...state.pendingActions, action],
    }));
  },

  advanceStep: (result: StepResult) => {
    const { currentStep, mode, currentSide } = get();
    if (!currentStep || !currentSide) return;

    // 判断是否终结
    if (result.isTerminal) {
      set({
        currentStep: {
          kind: 'rally_complete',
          isFirstExchange: currentStep.isFirstExchange,
          exchangeNumber: currentStep.exchangeNumber,
        },
      });
      return;
    }

    // 对手模式特殊判断：拦防步骤的终结逻辑
    // （对手模式没有 finalEffect，但 block_kill 可终结）
    // 这个判断在 advanceStep 被调用前由调用方在 action 提交时处理

    const nextStep = getNextStep(currentStep, result, mode, currentSide);
    set({ currentStep: nextStep });
  },

  completeRally: async (outcome: RallyOutcome) => {
    const state = get();
    const { ourScore, opponentScore, setId, matchId, pendingActions, completedRallies, currentSide } = state;

    const newOurScore = outcome === 'our_score' ? ourScore + 1 : ourScore;
    const newOpponentScore = outcome === 'their_score' ? opponentScore + 1 : opponentScore;

    const rally: Rally = {
      id: uuid(),
      setId,
      matchId,
      rallyNumber: completedRallies.length + 1,
      side: currentSide!,
      actions: [...pendingActions],
      outcome,
      homeScoreAfter: newOurScore,
      awayScoreAfter: newOpponentScore,
      timestamp: Date.now(),
    };

    // 保存到 IndexedDB
    try {
      await db.rallies.add(rally);
    } catch (e) {
      console.error('Failed to save rally:', e);
    }

    set({
      completedRallies: [...completedRallies, rally],
      pendingActions: [],
      currentStep: null,
      currentSide: null,
      ourScore: newOurScore,
      opponentScore: newOpponentScore,
    });
  },

  undoLastAction: () => {
    set((state) => ({
      pendingActions: state.pendingActions.slice(0, -1),
    }));
  },

  cancelRally: () => {
    set({
      currentStep: null,
      currentSide: null,
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
      currentStep: null,
      pendingActions: [],
      completedRallies: [],
    });
  },
}));
