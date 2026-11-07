/**
 * Broker-style margin protection thresholds.
 * Never assume 100% is stop-out — defaults mirror common retail CFD brokers.
 *
 * Override with env:
 *   MARGIN_CALL_LEVEL=100
 *   STOP_OUT_LEVEL=50
 */
export const MARGIN_CALL_LEVEL = Number(process.env.MARGIN_CALL_LEVEL || 100)
export const STOP_OUT_LEVEL = Number(process.env.STOP_OUT_LEVEL || 50)

export type MarginAlert =
  | { level: 'ok' }
  | { level: 'margin_call'; marginLevel: number; threshold: number; message: string }
  | { level: 'stop_out'; marginLevel: number; threshold: number; message: string }

export function evaluateMarginLevel(marginLevel: number | null, usedMargin: number): MarginAlert {
  if (usedMargin <= 0 || marginLevel == null || !Number.isFinite(marginLevel)) {
    return { level: 'ok' }
  }
  if (marginLevel <= STOP_OUT_LEVEL) {
    return {
      level: 'stop_out',
      marginLevel,
      threshold: STOP_OUT_LEVEL,
      message: `Stop-out: margin level ${marginLevel.toFixed(2)}% ≤ ${STOP_OUT_LEVEL}%`,
    }
  }
  if (marginLevel <= MARGIN_CALL_LEVEL) {
    return {
      level: 'margin_call',
      marginLevel,
      threshold: MARGIN_CALL_LEVEL,
      message: `Margin call: margin level ${marginLevel.toFixed(2)}% ≤ ${MARGIN_CALL_LEVEL}%`,
    }
  }
  return { level: 'ok' }
}
