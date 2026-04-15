import Link from 'next/link'
import {
  Clock,
  ScanLine,
  MessageSquare,
  LayoutDashboard,
  FileText,
  Wallet,
  ArrowRight,
  Check,
  Sparkles,
  Mail,
  ChevronRight,
} from 'lucide-react'
import { getCurrentYear } from '@/lib/tenant'
import { LANDING_LABELS } from './constants/labels'

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-morandi-primary leading-tight">
          {LANDING_LABELS.HERO_TITLE}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-morandi-secondary max-w-2xl mx-auto leading-relaxed">
          {LANDING_LABELS.HERO_SUBTITLE}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-morandi-gold px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-morandi-gold-hover transition-colors"
          >
            {LANDING_LABELS.CTA_PRIMARY}
            <ArrowRight size={18} />
          </Link>
          <a
            href={LANDING_LABELS.CTA_MAILTO}
            className="inline-flex items-center gap-2 rounded-lg border border-morandi-muted bg-card px-8 py-3.5 text-base font-semibold text-morandi-primary shadow-sm hover:bg-morandi-container/50 transition-colors"
          >
            {LANDING_LABELS.CTA_SECONDARY}
          </a>
        </div>
      </div>
      {/* Decorative gradient blob */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-status-warning-bg/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-morandi-container/40 blur-3xl" />
    </section>
  )
}

const PAIN_POINTS = [
  {
    icon: Clock,
    before: LANDING_LABELS.PAIN_1_BEFORE,
    after: LANDING_LABELS.PAIN_1_AFTER,
    description: LANDING_LABELS.PAIN_1_DESC,
  },
  {
    icon: ScanLine,
    before: LANDING_LABELS.PAIN_2_BEFORE,
    after: LANDING_LABELS.PAIN_2_AFTER,
    description: LANDING_LABELS.PAIN_2_DESC,
  },
  {
    icon: MessageSquare,
    before: LANDING_LABELS.PAIN_3_BEFORE,
    after: LANDING_LABELS.PAIN_3_AFTER,
    description: LANDING_LABELS.PAIN_3_DESC,
  },
] as const

function PainPointsSection() {
  return (
    <section className="bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-morandi-primary">
          {LANDING_LABELS.PAIN_SECTION_TITLE}
        </h2>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {PAIN_POINTS.map(point => (
            <div
              key={point.before}
              className="rounded-xl border border-border bg-morandi-container/50/50 p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-status-warning-bg text-status-warning">
                <point.icon size={24} />
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm">
                <span className="line-through text-morandi-muted">{point.before}</span>
                <ChevronRight size={14} className="text-morandi-muted" />
                <span className="font-semibold text-status-warning">{point.after}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-morandi-secondary">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: LANDING_LABELS.FEATURE_1_TITLE,
    description: LANDING_LABELS.FEATURE_1_DESC,
  },
  {
    icon: FileText,
    title: LANDING_LABELS.FEATURE_2_TITLE,
    description: LANDING_LABELS.FEATURE_2_DESC,
  },
  {
    icon: Wallet,
    title: LANDING_LABELS.FEATURE_3_TITLE,
    description: LANDING_LABELS.FEATURE_3_DESC,
  },
] as const

function FeaturesSection() {
  return (
    <section className="bg-morandi-container/50 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-morandi-primary">
          {LANDING_LABELS.FEATURES_TITLE}
        </h2>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {FEATURES.map(feature => (
            <div
              key={feature.title}
              className="rounded-xl bg-card border border-border p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-morandi-container text-morandi-primary">
                <feature.icon size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-morandi-primary">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-morandi-secondary">{feature.description}</p>
              {/* Screenshot placeholder */}
              <div className="mt-4 flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-border bg-morandi-container/50 text-sm text-morandi-muted">
                {LANDING_LABELS.LABEL_3045}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

interface PlanCardProps {
  name: string
  price: string
  period: string
  features: readonly string[]
  popular?: boolean
  badge?: string
}

function PlanCard({ name, price, period, features, popular, badge }: PlanCardProps) {
  return (
    <div
      className={`relative rounded-xl border p-6 ${
        popular
          ? 'border-status-warning/40 bg-status-warning-bg/30 shadow-lg ring-1 ring-amber-200'
          : 'border-border bg-card shadow-sm'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-morandi-gold px-4 py-1 text-xs font-semibold text-white">
          {LANDING_LABELS.PLAN_POPULAR}
        </span>
      )}
      {badge && (
        <span className="inline-block rounded-full bg-cat-pink-bg px-3 py-0.5 text-xs font-semibold text-cat-pink mb-3">
          {badge}
        </span>
      )}
      <h3 className="text-lg font-semibold text-morandi-primary">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-morandi-primary">{price}</span>
        <span className="text-sm text-morandi-secondary">{period}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map(feat => (
          <li key={feat} className="flex items-start gap-2 text-sm text-morandi-secondary">
            <Check size={16} className="mt-0.5 shrink-0 text-status-warning" />
            {feat}
          </li>
        ))}
      </ul>
      <Link
        href="/login"
        className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
          popular
            ? 'bg-morandi-gold text-white hover:bg-morandi-gold-hover'
            : 'border border-morandi-muted bg-card text-morandi-primary hover:bg-morandi-container/50'
        }`}
      >
        {LANDING_LABELS.PLAN_CTA}
      </Link>
    </div>
  )
}

function PricingSection() {
  return (
    <section className="bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-morandi-primary">
          {LANDING_LABELS.PRICING_TITLE}
        </h2>
        <p className="mt-3 text-center text-morandi-secondary">{LANDING_LABELS.PRICING_SUBTITLE}</p>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          <PlanCard
            name={LANDING_LABELS.PLAN_FREE_NAME}
            price={LANDING_LABELS.PLAN_FREE_PRICE}
            period={LANDING_LABELS.PLAN_FREE_PERIOD}
            features={LANDING_LABELS.PLAN_FREE_FEATURES}
          />
          <PlanCard
            name={LANDING_LABELS.PLAN_PRO_NAME}
            price={LANDING_LABELS.PLAN_PRO_PRICE}
            period={LANDING_LABELS.PLAN_PRO_PERIOD}
            features={LANDING_LABELS.PLAN_PRO_FEATURES}
            popular
          />
          <PlanCard
            name={LANDING_LABELS.PLAN_FOUNDER_NAME}
            price={LANDING_LABELS.PLAN_FOUNDER_PRICE}
            period={LANDING_LABELS.PLAN_FOUNDER_PERIOD}
            features={LANDING_LABELS.PLAN_FOUNDER_FEATURES}
            badge={LANDING_LABELS.PLAN_FOUNDER_BADGE}
          />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-morandi-container/50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-status-warning" />
              <span className="text-lg font-bold text-morandi-primary">
                {LANDING_LABELS.FOOTER_BRAND}
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-morandi-secondary">
              {LANDING_LABELS.FOOTER_DESCRIPTION}
            </p>
          </div>
          <div className="sm:text-right">
            <h4 className="text-sm font-semibold text-morandi-primary">
              {LANDING_LABELS.FOOTER_CONTACT_TITLE}
            </h4>
            <a
              href={`mailto:${LANDING_LABELS.FOOTER_EMAIL}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-morandi-secondary hover:text-status-warning transition-colors"
            >
              <Mail size={14} />
              {LANDING_LABELS.FOOTER_EMAIL}
            </a>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-morandi-muted">
          {LANDING_LABELS.FOOTER_COPYRIGHT.replace('{year}', getCurrentYear().toString())}
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <PainPointsSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </main>
  )
}
