"use client"

import { usePathname } from "next/navigation"
import { CreateMediumHeader } from "@/components/invoices/mediums/create-medium-header"
import {
  HubToastProvider,
  HubToastViewport,
} from "@/components/payment-hub/hub-toast"
import { Sidebar } from "@/components/payment-hub/Sidebar"
import { Topbar } from "@/components/payment-hub/Topbar"
import { LayoutPreviewPanel } from "@/components/invoices/layout-preview-panel"
import { CreateWithAiProvider } from "@/lib/create-with-ai-context"
import { LayoutPreviewProvider } from "@/lib/layout-preview-context"
import { MediumEditorProvider } from "@/lib/medium-editor-context"
import { isMediumEditorRoute } from "@/lib/medium-routes"
import { MediumsStoreProvider } from "@/lib/mediums-store"

/**
 * Payment Hub shell: left nav + top bar + scrollable main column.
 * Medium create/edit uses a focused full-width layout without sidebar or payments nav.
 */
export function PaymentHubShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isMediumEditor = isMediumEditorRoute(pathname)

  return (
    <HubToastProvider>
      <MediumsStoreProvider>
        <CreateWithAiProvider>
        <LayoutPreviewProvider>
        {isMediumEditor ? (
          <MediumEditorProvider>
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#ECEEF2] text-foreground">
              <CreateMediumHeader />
              <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <HubToastViewport />
                {children}
              </main>
            </div>
          </MediumEditorProvider>
        ) : (
          <div className="flex h-full min-h-0 overflow-x-visible bg-slate-100/70 text-foreground">
            <Sidebar />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
              <Topbar />

              <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#ECEEF2]">
                <HubToastViewport />
                {children}
              </main>
            </div>
          </div>
        )}
        <LayoutPreviewPanel />
        </LayoutPreviewProvider>
        </CreateWithAiProvider>
      </MediumsStoreProvider>
    </HubToastProvider>
  )
}
