'use client'

import { useState } from 'react'
import {
  Pill, Star, CheckCircle, XCircle, ChevronDown, ChevronUp, Search, Shield,
} from 'lucide-react'
import {
  SUPPLEMENTS,
  SUPPLEMENT_STACK_RECOMMENDATION,
  type Supplement,
} from '@/lib/supplements-data'

const CATEGORIES = ['All', 'Protein', 'Performance', 'Health', 'Recovery'] as const

const EVIDENCE_COLORS: Record<string, string> = {
  Strong: 'badge-green',
  Moderate: 'badge-blue',
  Weak: 'badge-yellow',
  Mixed: 'badge-red',
}

const TIER_CONFIG = {
  essential: { label: 'Essential', border: 'border-green-500/40', bg: 'bg-green-500/5', badge: 'badge-green', icon: 'text-green-400' },
  recommended: { label: 'Recommended', border: 'border-blue-500/40', bg: 'bg-blue-500/5', badge: 'badge-blue', icon: 'text-blue-400' },
  optional: { label: 'Optional', border: 'border-yellow-500/40', bg: 'bg-yellow-500/5', badge: 'badge-yellow', icon: 'text-yellow-400' },
  skip: { label: 'Skip', border: 'border-red-500/40', bg: 'bg-red-500/5', badge: 'badge-red', icon: 'text-red-400' },
}

export default function SupplementsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const stack = SUPPLEMENT_STACK_RECOMMENDATION

  const toggleCard = (name: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const filteredSupplements = SUPPLEMENTS.filter((s) => {
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="text-white max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Pill className="w-7 h-7 text-green-400" />
          <h1 className="text-2xl md:text-3xl font-bold">Supplements Guide</h1>
        </div>
        <p className="text-gray-400">Evidence-based supplement recommendations for lean muscle building</p>
      </div>

      {/* ── Recommended Stack Section ── */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-1">{stack.title}</h2>
        <p className="text-gray-500 text-sm mb-6">Prioritised tiers — spend your money where it matters most.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Essential Tier */}
          <div className={`card ${TIER_CONFIG.essential.border} ${TIER_CONFIG.essential.bg}`}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className={`w-5 h-5 ${TIER_CONFIG.essential.icon}`} />
              <h3 className="font-semibold text-green-400">Essential</h3>
              <span className="badge-green">Tier 1</span>
            </div>
            <div className="space-y-3">
              {stack.essential.map((item) => (
                <div key={item.name} className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 ml-6 mt-0.5">{item.reason}</p>
                  </div>
                  <span className="text-xs text-green-400 font-medium whitespace-nowrap">{item.monthly_cost}/mo</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Tier */}
          <div className={`card ${TIER_CONFIG.recommended.border} ${TIER_CONFIG.recommended.bg}`}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className={`w-5 h-5 ${TIER_CONFIG.recommended.icon}`} />
              <h3 className="font-semibold text-blue-400">Recommended</h3>
              <span className="badge-blue">Tier 2</span>
            </div>
            <div className="space-y-3">
              {stack.recommended.map((item) => (
                <div key={item.name} className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 ml-6 mt-0.5">{item.reason}</p>
                  </div>
                  <span className="text-xs text-blue-400 font-medium whitespace-nowrap">{item.monthly_cost}/mo</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Tier */}
          <div className={`card ${TIER_CONFIG.optional.border} ${TIER_CONFIG.optional.bg}`}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className={`w-5 h-5 ${TIER_CONFIG.optional.icon}`} />
              <h3 className="font-semibold text-yellow-400">Optional</h3>
              <span className="badge-yellow">Tier 3</span>
            </div>
            <div className="space-y-3">
              {stack.optional.map((item) => (
                <div key={item.name} className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 ml-6 mt-0.5">{item.reason}</p>
                  </div>
                  <span className="text-xs text-yellow-400 font-medium whitespace-nowrap">{item.monthly_cost}/mo</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skip Tier */}
          <div className={`card ${TIER_CONFIG.skip.border} ${TIER_CONFIG.skip.bg}`}>
            <div className="flex items-center gap-2 mb-4">
              <XCircle className={`w-5 h-5 ${TIER_CONFIG.skip.icon}`} />
              <h3 className="font-semibold text-red-400">Skip These</h3>
              <span className="badge-red">Save Money</span>
            </div>
            <div className="space-y-3">
              {stack.skip.map((item) => (
                <div key={item.name} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-sm">{item.name}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── All Supplements Section ── */}
      <div>
        <h2 className="text-xl font-semibold mb-6">All Supplements</h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Category Tabs */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={activeCategory === cat ? 'tab-active' : 'tab-inactive'}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search supplements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>

        {/* Supplements Grid */}
        {filteredSupplements.length === 0 ? (
          <div className="card text-center py-12">
            <Pill className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No supplements found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSupplements.map((supplement) => (
              <SupplementCard
                key={supplement.name}
                supplement={supplement}
                expanded={expandedCards.has(supplement.name)}
                onToggle={() => toggleCard(supplement.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SupplementCard({
  supplement,
  expanded,
  onToggle,
}: {
  supplement: Supplement
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="card-hover cursor-pointer" onClick={onToggle}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{supplement.name}</h3>
            <span className={EVIDENCE_COLORS[supplement.evidence_rating]}>
              {supplement.evidence_rating}
            </span>
            {supplement.essential_for_lean_muscle && (
              <span className="badge-green flex items-center gap-1">
                <Star className="w-3 h-3" />
                Essential
              </span>
            )}
          </div>
          {!expanded && (
            <div className="mt-1.5">
              <span className="text-xs text-gray-500">{supplement.category}</span>
              <span className="text-xs text-gray-600 mx-2">&middot;</span>
              <span className="text-xs text-gray-400">{supplement.benefits[0]}</span>
            </div>
          )}
        </div>
        <button className="text-gray-500 hover:text-white transition-colors flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-5 space-y-5" onClick={(e) => e.stopPropagation()}>
          {/* Category & Timing */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Category:</span>{' '}
              <span className="text-gray-300">{supplement.category}</span>
            </div>
            <div>
              <span className="text-gray-500">Dosage:</span>{' '}
              <span className="text-gray-300">{supplement.dosage}</span>
            </div>
            <div>
              <span className="text-gray-500">Timing:</span>{' '}
              <span className="text-gray-300">{supplement.timing}</span>
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Benefits</h4>
            <ul className="space-y-1.5">
              {supplement.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-2">Pros</h4>
              <ul className="space-y-1.5">
                {supplement.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2">Cons</h4>
              <ul className="space-y-1.5">
                {supplement.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Brands Table */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Brands</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#262626]">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Brand</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Price Range</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {supplement.brands.map((brand, i) => (
                    <tr key={i} className="border-b border-[#1a1a1a]">
                      <td className="py-2 pr-4 text-gray-300">{brand.name}</td>
                      <td className="py-2 pr-4 text-green-400 whitespace-nowrap">{brand.price_range}</td>
                      <td className="py-2 text-gray-400">{brand.availability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
