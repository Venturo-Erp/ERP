import { redirect } from 'next/navigation'

export default function MonthlyIncomeRedirect() {
  redirect('/finance/reports?tab=income')
}
