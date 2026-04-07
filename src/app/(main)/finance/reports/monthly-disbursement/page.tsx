import { redirect } from 'next/navigation'

export default function MonthlyDisbursementRedirect() {
  redirect('/finance/reports?tab=disbursement')
}
