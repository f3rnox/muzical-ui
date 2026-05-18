import { Suspense } from 'react'
import MusicPlayer from '@/components/MusicPlayer'

export default function Home() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Suspense fallback={null}>
        <MusicPlayer />
      </Suspense>
    </div>
  )
}
