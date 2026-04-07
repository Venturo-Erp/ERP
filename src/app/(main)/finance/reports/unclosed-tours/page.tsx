import { redirect } from 'next/navigation'

export default function UnclosedToursRedirect() {
  redirect('/finance/reports?tab=unclosed')
}
