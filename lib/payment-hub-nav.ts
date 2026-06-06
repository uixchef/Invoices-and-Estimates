const integrationsAppUrlDefault =
  "https://payment-integrations.vercel.app/integrations"

export const PAYMENTS_HUB_DEFAULTS = {
  overview:
    process.env.NEXT_PUBLIC_OVERVIEW_APP_URL ??
    "https://payment-dashboard-9byi.vercel.app/payment-hub",
  subscriptions:
    process.env.NEXT_PUBLIC_SUBSCRIPTIONS_APP_URL ??
    "https://subscription-pi-nine.vercel.app/subscriptions",
  integrations:
    process.env.NEXT_PUBLIC_INTEGRATIONS_APP_URL ??
    integrationsAppUrlDefault,
} as const

const NAV_CONTEXT_KEY = "payments-hub-nav-context"

export type PaymentsHubNavContext = {
  overview?: string
  subscriptions?: string
  integrations?: string
}

export type PaymentsHubNavUrls = {
  overview: string
  subscriptions: string
  integrations: string
}

function readNavContext(): PaymentsHubNavContext {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.sessionStorage.getItem(NAV_CONTEXT_KEY)
    if (!raw) return {}

    return JSON.parse(raw) as PaymentsHubNavContext
  } catch {
    return {}
  }
}

function writeNavContext(context: PaymentsHubNavContext) {
  if (typeof window === "undefined") return

  try {
    window.sessionStorage.setItem(NAV_CONTEXT_KEY, JSON.stringify(context))
  } catch {
    // Ignore storage failures in the prototype.
  }
}

function inferNavTargetFromUrl(url: string): Partial<PaymentsHubNavContext> {
  if (url.includes("/integrations")) {
    return { integrations: url }
  }

  if (url.includes("/subscriptions")) {
    return { subscriptions: url }
  }

  if (url.includes("/payment-hub") || url.includes("/invoices")) {
    return { overview: url }
  }

  return {}
}

export function syncPaymentsHubNav(patch: Partial<PaymentsHubNavContext>) {
  if (typeof window === "undefined") return

  const next = { ...readNavContext(), ...patch }

  try {
    const returnTo = new URLSearchParams(window.location.search).get("returnTo")
    if (returnTo) {
      Object.assign(next, inferNavTargetFromUrl(returnTo))
    }
  } catch {
    // Ignore malformed URLs in the prototype.
  }

  writeNavContext(next)
}

export function getPaymentsHubNav(): PaymentsHubNavUrls {
  const context = readNavContext()

  return {
    overview: context.overview || PAYMENTS_HUB_DEFAULTS.overview,
    subscriptions: context.subscriptions || PAYMENTS_HUB_DEFAULTS.subscriptions,
    integrations: context.integrations || PAYMENTS_HUB_DEFAULTS.integrations,
  }
}

export function resolvePaymentsHubNavUrls(
  app: "overview" | "subscriptions" | "integrations" | "invoices"
): PaymentsHubNavUrls {
  if (typeof window === "undefined") {
    return {
      overview: PAYMENTS_HUB_DEFAULTS.overview,
      subscriptions: PAYMENTS_HUB_DEFAULTS.subscriptions,
      integrations: PAYMENTS_HUB_DEFAULTS.integrations,
    }
  }

  const patch: Partial<PaymentsHubNavContext> = {}

  if (app === "overview") {
    patch.overview = `${window.location.origin}/payment-hub`
  } else if (app === "invoices") {
    patch.overview = `${window.location.origin}/invoices`
  } else if (app === "subscriptions") {
    patch.subscriptions = `${window.location.origin}/subscriptions`
  } else if (
    window.location.pathname === "/integrations" ||
    window.location.pathname.startsWith("/integrations/")
  ) {
    patch.integrations = `${window.location.origin}${window.location.pathname}`
  } else {
    patch.integrations = PAYMENTS_HUB_DEFAULTS.integrations
  }

  syncPaymentsHubNav(patch)
  return getPaymentsHubNav()
}
