// ============================================================
// action-format.ts — 动作的展示与格式化
// ============================================================

import type { RallyAction } from '@/types/actions';
import {
  SERVE_TYPE_LABELS, SERVE_RESULT_LABELS, RECEPTION_QUALITY_LABELS,
  SET_QUALITY_LABELS, TOUCH_QUALITY_LABELS, ATTACK_TYPE_LABELS,
  ATTACK_LINE_LABELS, ATTACK_RESULT_LABELS, BLOCK_EFFECT_LABELS,
  TRANSITION_RESULT_LABELS,
} from '@/types/actions';

export type Field = { label: string; value: string };

export function formatAction(a: RallyAction): { title: string; fields: Field[] } {
  const raw: [string, string][] = [];
  let title = '';

  switch (a.type) {
    case 'serve':
      title = '发球';
      raw.push(['发球球员', a.playerNumber ? `${a.playerNumber}号` : '未记录']);
      raw.push(['发球方式', SERVE_TYPE_LABELS[a.serveType]]);
      raw.push(['发球落点', a.landingZone ? `${a.landingZone}号位` : '未记录']);
      raw.push(['是否发到追发人', a.targetedPlayer === undefined ? '未知' : a.targetedPlayer ? '是' : '否']);
      raw.push(['发球结果', SERVE_RESULT_LABELS[a.result]]);
      break;

    case 'reception':
      title = '一传';
      raw.push(['接一传球员', a.playerNumber ? `${a.playerNumber}号` : '未记录']);
      raw.push(['接球位置', a.position ? `${a.position}号位` : '未记录']);
      raw.push(['到位程度', RECEPTION_QUALITY_LABELS[a.quality]]);
      break;

    case 'set':
      title = '二传（一攻）';
      raw.push(['传给几号位', a.positionTo ? `${a.positionTo}号位` : '未记录']);
      raw.push(['进攻球员', a.attackerNumber ? `${a.attackerNumber}号` : '未记录']);
      raw.push(['是否到位', SET_QUALITY_LABELS[a.quality]]);
      break;

    case 'attack':
      title = `进攻（第${a.attackNumber}次）`;
      raw.push(['传球是否到位', a.setQuality ? TOUCH_QUALITY_LABELS[a.setQuality] : '未记录']);
      raw.push(['对方拦网', a.opponentBlock === 'formed' ? '形成' : a.opponentBlock === 'not_formed' ? '未形成' : '未记录']);
      raw.push(['进攻方式', a.attackType ? ATTACK_TYPE_LABELS[a.attackType] : '未记录']);
      raw.push(['进攻线路', a.attackLine ? ATTACK_LINE_LABELS[a.attackLine] : '未记录']);
      raw.push(['进攻结果', ATTACK_RESULT_LABELS[a.result]]);
      break;

    case 'block_defense_transition':
      title = '拦防串联';
      raw.push(['拦网效果', a.blockEffect ? BLOCK_EFFECT_LABELS[a.blockEffect] : '未记录']);
      raw.push(['第一次触球', a.firstTouch ? TOUCH_QUALITY_LABELS[a.firstTouch] : '未记录']);
      raw.push(['第二次触球', a.secondTouch ? TOUCH_QUALITY_LABELS[a.secondTouch] : '未记录']);
      raw.push(['第三次触球位置', a.thirdTouchPosition ? `${a.thirdTouchPosition}号位` : '未记录']);
      raw.push(['第三次触球球员', a.thirdTouchPlayer ? `${a.thirdTouchPlayer}号` : '未记录']);
      raw.push(['串联结果', TRANSITION_RESULT_LABELS[a.result]]);
      break;
  }

  return { title, fields: raw.map(([label, value]) => ({ label, value })) };
}
