'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
} from 'react'

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
    YT?: {
      Player: new (
        element: HTMLElement,
        config: Record<string, unknown>,
      ) => YoutubePlayerInstance
      PlayerState: {
        ENDED: number
        PAUSED: number
        CUED: number
        PLAYING: number
      }
    }
  }
}

type YoutubePlayerInstance = {
  destroy: () => void
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  loadVideoById: (videoId: string) => void
}

export type HiddenYoutubePlayerHandle = {
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
}

type HiddenYoutubePlayerProps = {
  videoId: string | null
  isPlaying: boolean
  volume: number
  onReady?: () => void
  onEnded?: () => void
  onError?: (message: string) => void
  onDuration?: (seconds: number) => void
}

/**
 * Off-screen YouTube iframe player (200×200 minimum) for audio-only streaming.
 */
function HiddenYoutubePlayer(
  props: HiddenYoutubePlayerProps,
  ref: Ref<HiddenYoutubePlayerHandle>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YoutubePlayerInstance | null>(null)
  const isPlayingRef = useRef(props.isPlaying)
  const onReadyRef = useRef(props.onReady)
  const onEndedRef = useRef(props.onEnded)
  const onErrorRef = useRef(props.onError)
  const onDurationRef = useRef(props.onDuration)

  useLayoutEffect(() => {
    isPlayingRef.current = props.isPlaying
  }, [props.isPlaying])

  useLayoutEffect(() => {
    onReadyRef.current = props.onReady
    onEndedRef.current = props.onEnded
    onErrorRef.current = props.onError
    onDurationRef.current = props.onDuration
  }, [props.onDuration, props.onEnded, props.onError, props.onReady])

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number): void {
      const player = playerRef.current
      if (!player) return
      try {
        player.seekTo(seconds, true)
      } catch {
        /* ignore */
      }
    },
    getCurrentTime(): number {
      try {
        const t = playerRef.current?.getCurrentTime()
        return Number.isFinite(t) && (t as number) >= 0 ? (t as number) : 0
      } catch {
        return 0
      }
    },
    getDuration(): number {
      try {
        const d = playerRef.current?.getDuration()
        return Number.isFinite(d) && (d as number) > 0 ? (d as number) : 0
      } catch {
        return 0
      }
    },
  }))

  useEffect(() => {
    const videoId = props.videoId?.trim()
    if (!videoId) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {
          /* ignore */
        }
        playerRef.current = null
      }
      return undefined
    }

    const syncDuration = (player: YoutubePlayerInstance): void => {
      try {
        const d = player.getDuration()
        if (Number.isFinite(d) && d > 0) onDurationRef.current?.(d)
      } catch {
        /* ignore */
      }
    }

    const mountPlayer = (): void => {
      if (!window.YT?.Player || !containerRef.current) return
      const existing = playerRef.current
      if (existing) {
        try {
          existing.loadVideoById(videoId)
          existing.setVolume(Math.round(props.volume * 100))
          syncDuration(existing)
          if (isPlayingRef.current) existing.playVideo()
          else existing.pauseVideo()
        } catch {
          try {
            existing.destroy()
          } catch {
            /* ignore */
          }
          playerRef.current = null
          mountPlayer()
        }
        return
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '200',
        width: '200',
        videoId,
        playerVars: {
          autoplay: isPlayingRef.current ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: { target: YoutubePlayerInstance }) => {
            try {
              event.target.setVolume(Math.round(props.volume * 100))
              syncDuration(event.target)
            } catch {
              /* ignore */
            }
            onReadyRef.current?.()
            if (isPlayingRef.current) {
              try {
                event.target.playVideo()
              } catch {
                /* ignore */
              }
            }
          },
          onStateChange: (event: { data: number; target: YoutubePlayerInstance }) => {
            const YT = window.YT
            if (!YT) return
            if (event.data === YT.PlayerState.ENDED) {
              onEndedRef.current?.()
              return
            }
            if (
              isPlayingRef.current &&
              (event.data === YT.PlayerState.CUED || event.data === YT.PlayerState.PAUSED)
            ) {
              try {
                event.target.playVideo()
              } catch {
                /* ignore */
              }
            }
            if (event.data === YT.PlayerState.PLAYING) {
              syncDuration(event.target)
            }
          },
          onError: () => {
            onErrorRef.current?.('YouTube playback failed for this track.')
          },
        },
      })
    }

    if (window.YT?.Player) {
      mountPlayer()
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const script = document.createElement('script')
        script.id = 'youtube-iframe-api'
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        document.body.appendChild(script)
      }
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        mountPlayer()
        if (typeof previous === 'function') previous()
      }
    }

    return (): void => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {
          /* ignore */
        }
        playerRef.current = null
      }
    }
  }, [props.videoId, props.volume])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !props.videoId?.trim()) return
    try {
      if (props.isPlaying) player.playVideo()
      else player.pauseVideo()
    } catch {
      /* ignore */
    }
  }, [props.isPlaying, props.videoId])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !props.videoId?.trim()) return
    try {
      player.setVolume(Math.round(props.volume * 100))
    } catch {
      /* ignore */
    }
  }, [props.volume, props.videoId])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed top-0 left-[-9999px] h-[200px] w-[200px] overflow-hidden opacity-0"
      aria-hidden
      tabIndex={-1}
    />
  )
}

export default forwardRef(HiddenYoutubePlayer)
