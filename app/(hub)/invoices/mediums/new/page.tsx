import type { Metadata } from "next"
import { CreateMediumPage } from "@/components/invoices/mediums/create-medium-page"

export const metadata: Metadata = {
  title: "New medium | Invoice Layouts",
  description: "Create a new document output medium",
}

export default function NewMediumPage() {
  return <CreateMediumPage />
}
