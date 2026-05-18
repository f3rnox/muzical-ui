import { redirect } from 'next/navigation'

/**
 * Deep link to the YouTube browse tab on the home page.
 */
export default function YoutubePage() {
  redirect('/?view=youtube')
}
