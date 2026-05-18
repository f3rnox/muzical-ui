import { redirect } from 'next/navigation'

/** Legacy route; MusicBrainz lives in the player browse panel. */
export default function MusicBrainzPage() {
  redirect('/?view=musicbrainz')
}
