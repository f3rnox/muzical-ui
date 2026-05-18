import type { RepeatMode } from '@/types/repeat-mode'

/** User defaults for player controls and end-of-track behavior. */
export type PlaybackPreferences = {
  repeatMode: RepeatMode
  shuffle: boolean
  playbackRate: number
  rememberVolume: boolean
  volume: number
  seekStepSmallSec: number
  seekStepLargeSec: number
  autoAdvanceOnEnd: boolean
}
