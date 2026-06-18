import type { Metadata } from "next"
import { CreateMediumPage } from "@/components/invoices/mediums/create-medium-page"

export const metadata: Metadata = {
  title: "New paper type | Invoice Layouts",
  description: "Create a new paper type",
}

export default function NewMediumPage() {
  return <CreateMediumPage />
}
