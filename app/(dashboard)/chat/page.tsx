import { redirect } from 'next/navigation'

// The AI assistant now lives at /chief-of-staff.
export default function ChatRedirect() {
  redirect('/chief-of-staff')
}
