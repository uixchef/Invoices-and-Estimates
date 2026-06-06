import { PaymentHubShell } from "@/components/payment-hub/payment-hub-shell"

// Topbar reads client pathname for active tabs; keep hub segment dynamic.
export const dynamic = "force-dynamic"

export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PaymentHubShell>{children}</PaymentHubShell>
}
