import type { BridgeMode } from '../../runtime/bridge.ts'
import type { PauseReason } from '../../sim/scheduler.ts'
import type { AutosaveCadence } from '../store/settings.ts'

export const PAUSE_LABELS: Record<PauseReason, string> = {
  election: 'Elections',
  choice: 'Choices',
  investigation: 'Investigations',
  activityDone: 'Activity finished',
}

export const MODE_LABELS: Record<'starting' | BridgeMode, string> = {
  starting: 'Starting',
  worker: 'Worker',
  main: 'Main thread',
}

export const AUTOSAVE_LABELS: Record<AutosaveCadence, string> = {
  monthly: 'Every month',
  yearly: 'Every year',
  off: 'Off',
}
