/**
 * Profile Page
 *
 * Now supports SSR with cookie-based authentication.
 * The middleware handles route protection at the server level,
 * and the ProfilePageWrapper component handles client-side auth state.
 */

import ProfilePageWrapper from '@/components/profile/ProfilePageWrapper'

export default function ProfilePage() {
  return <ProfilePageWrapper />
}