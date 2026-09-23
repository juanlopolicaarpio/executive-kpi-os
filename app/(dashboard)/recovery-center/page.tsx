import { redirect } from 'next/navigation'

// The Recovery Center has been merged into Initiatives. A recovery plan is no
// longer a separate object — it is an initiative with initiativeType
// 'recovery', so it carries the same budget, ROI, mandatory results submission
// and institutional memory as any campaign. See lib/initiatives/lifecycle.ts.
export default function RecoveryCenterRedirect() {
  redirect('/initiatives')
}
