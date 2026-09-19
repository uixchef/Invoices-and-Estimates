import type { Metadata } from "next"

import { LayoutBuilderBody } from "@/components/invoices/builder/layout-builder-body"
import { PRODUCT_NAME } from "@/lib/product-name"

export const metadata: Metadata = {
  title: "New layout | Invoice Layouts",
  description: `Generate an invoice layout with ${PRODUCT_NAME}`,
}

export default function LayoutBuilderPage() {
  return <LayoutBuilderBody />
}
