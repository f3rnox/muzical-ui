import { DEFAULT_PLAYBACK_VOLUME } from '@/lib/playback/playback-preference-storage-keys'
import type { PlaybackPreferences } from '@/types/playback-preferences'

/**
 * Factory defaults for playback preferences on a fresh install.
 */
export default function defaultPlaybackPreferences(): PlaybackPreferences {
  return {
    repeatMode: 'all',
    shuffle: false,
    playbackRate: 1,
    rememberVolume: false,
    volume: DEFAULT_PLAYBACK_VOLUME,
    seekStepSmallSec: 5,
    seekStepLargeSec: 30,
    autoAdvanceOnEnd: true,
  }
}
