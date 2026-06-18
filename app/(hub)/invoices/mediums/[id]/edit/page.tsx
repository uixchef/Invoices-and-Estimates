import type { Metadata } from "next"

import { EditMediumPageClient } from "@/components/invoices/mediums/edit-medium-page-client"
import { getMediumById } from "@/lib/mediums-data"

type EditMediumPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: EditMediumPageProps): Promise<Metadata> {
  const { id } = await params
  const medium = getMediumById(id)

  return {
    title: medium ? `${medium.name} | Invoice Layouts` : "Edit paper type | Invoice Layouts",
    description: "Edit paper type settings",
  }
}

export default async function EditMediumPage({ params }: EditMediumPageProps) {
  const { id } = await params

  return <EditMediumPageClient mediumId={id} />
}
