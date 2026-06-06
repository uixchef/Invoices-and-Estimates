export type MercadoPagoCountry = {
  code: string
  label: string
}

/** Mercado Pago account countries supported in settings. */
export const MERCADO_PAGO_COUNTRIES: MercadoPagoCountry[] = [
  { code: "AR", label: "Argentina" },
  { code: "BR", label: "Brazil" },
  { code: "CL", label: "Chile" },
  { code: "CO", label: "Colombia" },
  { code: "MX", label: "Mexico" },
  { code: "PE", label: "Peru" },
  { code: "UY", label: "Uruguay" },
  { code: "US", label: "United States of America" },
]
