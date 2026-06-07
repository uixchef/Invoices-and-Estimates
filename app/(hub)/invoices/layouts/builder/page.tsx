import type { Metadata } from "next"

import { LayoutBuilderBody } from "@/components/invoices/builder/layout-builder-body"

export const metadata: Metadata = {
  title: "New layout | Invoice Layouts",
  description: "Generate an invoice layout with Invoice AI",
}

export default function LayoutBuilderPage() {
  return <LayoutBuilderBody />
}
