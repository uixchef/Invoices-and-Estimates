"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { CreateMediumForm } from "@/components/invoices/mediums/create-medium-form"
import { MediumLivePreview } from "@/components/invoices/mediums/medium-live-preview"
import { DEFAULT_MEDIUM_FORM, type MediumFormState } from "@/lib/medium-form"
import { useMediumEditor } from "@/lib/medium-editor-context"

type MediumEditorPageProps = {
  initialState?: MediumFormState
  pageTitle?: string
}

export function MediumEditorPage({
  initialState = DEFAULT_MEDIUM_FORM,
  pageTitle = "New medium",
}: MediumEditorPageProps) {
  const pathname = usePathname()
  const { formState, setFormState, initializeEditor } = useMediumEditor()
  const initPayloadRef = useRef({ initialState, pageTitle })
  const initializedPathRef = useRef<string | null>(null)

  initPayloadRef.current = { initialState, pageTitle }

  useEffect(() => {
    if (initializedPathRef.current === pathname) {
      return
    }

    initializedPathRef.current = pathname
    initializeEditor(initPayloadRef.current)
  }, [initializeEditor, pathname])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <section
        aria-labelledby="medium-editor-heading"
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-white p-6 shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]"
      >
        <h2 id="medium-editor-heading" className="sr-only">
          {pageTitle}
        </h2>

        <div className="mx-auto grid min-h-0 w-full max-w-[1360px] flex-1 grid-cols-1 gap-8 min-[1360px]:grid-cols-[minmax(0,704px)_624px] min-[1360px]:items-stretch min-[1360px]:justify-center">
          <div className="min-h-0 w-full max-w-[704px] overflow-y-auto">
            <CreateMediumForm state={formState} onChange={setFormState} />
          </div>
          <MediumLivePreview state={formState} />
        </div>
      </section>
    </div>
  )
}

export function CreateMediumPage() {
  return <MediumEditorPage />
}
