export interface Supplement {
  name: string
  category: string
  benefits: string[]
  dosage: string
  timing: string
  brands: { name: string; price_range: string; availability: string }[]
  pros: string[]
  cons: string[]
  evidence_rating: 'Strong' | 'Moderate' | 'Weak' | 'Mixed'
  essential_for_lean_muscle: boolean
}

export const SUPPLEMENTS: Supplement[] = [
  {
    name: 'Whey Protein',
    category: 'Protein',
    benefits: [
      'Fast-absorbing complete protein',
      'Maximizes muscle protein synthesis post-workout',
      'Convenient way to hit daily protein target (1.6-2.2g/kg)',
      'Supports recovery between sessions',
    ],
    dosage: '25-40g per serving, 1-2 servings/day',
    timing: 'Post-workout within 2 hours, or anytime to meet protein goals',
    brands: [
      { name: 'Optimum Nutrition Gold Standard', price_range: '₹2,500-4,500/kg', availability: 'Amazon, GNC stores, local supplement shops' },
      { name: 'MuscleBlaze Biozyme', price_range: '₹2,000-3,500/kg', availability: 'Amazon, Flipkart, MuscleBlaze.com' },
      { name: 'MyProtein Impact Whey', price_range: '₹1,800-3,000/kg', availability: 'MyProtein.co.in, Amazon' },
      { name: 'AS-IT-IS Whey Protein', price_range: '₹1,500-2,200/kg', availability: 'Amazon (budget-friendly, unflavored)' },
    ],
    pros: ['Strong evidence for muscle building', 'Easy to digest', 'Great amino acid profile', 'Many flavors available'],
    cons: ['Can cause bloating if lactose intolerant (use isolate instead)', 'Quality varies by brand', 'Not necessary if you get enough protein from food'],
    evidence_rating: 'Strong',
    essential_for_lean_muscle: true,
  },
  {
    name: 'Creatine Monohydrate',
    category: 'Performance',
    benefits: [
      'Most researched supplement — proven to work',
      'Increases strength and power output by 5-15%',
      'Enhances muscle cell hydration and volume',
      'Improves high-intensity exercise performance',
      'May support cognitive function',
    ],
    dosage: '3-5g daily (no loading phase needed)',
    timing: 'Any time of day — consistency matters more than timing',
    brands: [
      { name: 'Creapure (gold standard source)', price_range: '₹800-1,500/300g', availability: 'Various brands use Creapure — check label' },
      { name: 'Optimum Nutrition Micronized Creatine', price_range: '₹1,200-1,800/300g', availability: 'Amazon, GNC' },
      { name: 'MuscleBlaze Creatine', price_range: '₹500-900/250g', availability: 'Amazon, Flipkart' },
      { name: 'AS-IT-IS Creatine Monohydrate', price_range: '₹400-700/250g', availability: 'Amazon (best value)' },
    ],
    pros: ['Cheapest effective supplement', 'Extremely well-researched (500+ studies)', 'No cycling needed', 'Safe for long-term use'],
    cons: ['Initial water weight gain (1-2kg — it\'s intracellular, not bloat)', 'Non-responders exist (~20%)', 'Must stay hydrated'],
    evidence_rating: 'Strong',
    essential_for_lean_muscle: true,
  },
  {
    name: 'Caffeine',
    category: 'Performance',
    benefits: [
      'Increases alertness and reduces perceived effort',
      'Boosts strength and endurance performance',
      'Enhances fat oxidation during exercise',
      'Widely available and cheap',
    ],
    dosage: '3-6mg/kg bodyweight (200-400mg for most people)',
    timing: '30-60 minutes pre-workout',
    brands: [
      { name: 'Black coffee', price_range: '₹0-20/serving', availability: 'Your kitchen' },
      { name: 'Caffeine tablets (generic)', price_range: '₹200-400/100 tabs', availability: 'Amazon, pharmacies' },
      { name: 'Pre-workout blends (contain caffeine + extras)', price_range: '₹1,500-3,000', availability: 'Amazon, supplement stores' },
    ],
    pros: ['Cheap and effective', 'Immediate noticeable effect', 'Fat burning support'],
    cons: ['Tolerance builds fast — cycle 2 weeks on/1 week off', 'Can disrupt sleep if taken after 2pm', 'Anxiety/jitters at high doses', 'Dependency risk'],
    evidence_rating: 'Strong',
    essential_for_lean_muscle: false,
  },
  {
    name: 'Fish Oil (Omega-3)',
    category: 'Health',
    benefits: [
      'Reduces inflammation and joint pain from heavy training',
      'Supports cardiovascular health',
      'May improve muscle protein synthesis',
      'Supports brain health and mood',
    ],
    dosage: '2-3g combined EPA+DHA daily',
    timing: 'With a meal containing fat for better absorption',
    brands: [
      { name: 'Carbamide Forte Triple Strength', price_range: '₹500-900/60 caps', availability: 'Amazon' },
      { name: 'HealthKart Omega 3', price_range: '₹400-700/60 caps', availability: 'Amazon, Flipkart, HealthKart.com' },
      { name: 'NOW Foods Ultra Omega-3', price_range: '₹1,200-1,800/90 caps', availability: 'Amazon, iHerb' },
    ],
    pros: ['Anti-inflammatory — helps recovery', 'Heart and brain health', 'Most people are deficient'],
    cons: ['Fish burps (use enteric-coated)', 'Quality varies hugely — check EPA/DHA content, not total fish oil', 'Takes weeks to see benefits'],
    evidence_rating: 'Strong',
    essential_for_lean_muscle: false,
  },
  {
    name: 'Vitamin D3',
    category: 'Health',
    benefits: [
      'Most Indians are deficient (70-90% of population)',
      'Supports testosterone levels and muscle function',
      'Immune system support',
      'Bone health and calcium absorption',
    ],
    dosage: '2000-5000 IU daily (get blood test first ideally)',
    timing: 'With a meal containing fat',
    brands: [
      { name: 'HealthKart HK Vitals D3', price_range: '₹300-500/60 caps', availability: 'Amazon, HealthKart.com' },
      { name: 'Carbamide Forte Vitamin D3', price_range: '₹250-400/60 tabs', availability: 'Amazon' },
      { name: 'Doctor\'s Best Vitamin D3', price_range: '₹600-1,000/120 caps', availability: 'Amazon, iHerb' },
    ],
    pros: ['Cheap', 'Fixes a very common deficiency', 'Supports hormones critical for muscle building'],
    cons: ['Can be toxic at very high doses — don\'t exceed 10,000 IU/day without medical supervision', 'Takes 2-3 months to normalize levels'],
    evidence_rating: 'Strong',
    essential_for_lean_muscle: false,
  },
  {
    name: 'Multivitamin',
    category: 'Health',
    benefits: [
      'Insurance policy for micronutrient gaps',
      'Supports overall health during intense training',
      'Can fill gaps from restricted diets',
    ],
    dosage: '1 tablet/day as directed on label',
    timing: 'With breakfast',
    brands: [
      { name: 'MuscleBlaze MB-Vite', price_range: '₹500-800/60 tabs', availability: 'Amazon, MuscleBlaze.com' },
      { name: 'Optimum Nutrition Opti-Men', price_range: '₹1,200-1,800/90 tabs', availability: 'Amazon, GNC' },
      { name: 'HealthKart HK Vitals Multivitamin', price_range: '₹400-600/60 tabs', availability: 'Amazon, HealthKart.com' },
    ],
    pros: ['Covers nutritional bases', 'Convenient', 'Supports immune system during heavy training'],
    cons: ['Not a substitute for real food', 'Many cheap ones use poor bioavailable forms', 'Expensive urine if diet is already solid'],
    evidence_rating: 'Moderate',
    essential_for_lean_muscle: false,
  },
  {
    name: 'Ashwagandha (KSM-66)',
    category: 'Recovery',
    benefits: [
      'Reduces cortisol (stress hormone) by 15-30%',
      'May increase testosterone by 10-15% in stressed individuals',
      'Improves sleep quality',
      'Enhances recovery and reduces exercise-induced muscle damage',
    ],
    dosage: '300-600mg KSM-66 extract daily',
    timing: 'Before bed (helps with sleep) or morning',
    brands: [
      { name: 'Himalaya Ashvagandha', price_range: '₹200-350/60 tabs', availability: 'Everywhere — pharmacies, Amazon, local stores' },
      { name: 'MuscleBlaze Ashwagandha', price_range: '₹400-600/60 caps', availability: 'Amazon, MuscleBlaze.com' },
      { name: 'Nutrabay KSM-66', price_range: '₹500-800/60 caps', availability: 'Amazon, Nutrabay.com' },
    ],
    pros: ['Traditional Indian herb with modern research backing', 'Stress reduction is legit', 'Affordable'],
    cons: ['Effects are subtle — not a magic pill', 'May cause drowsiness', 'Not for people on thyroid medication without consulting doctor', 'Cycle 8 weeks on / 2 weeks off'],
    evidence_rating: 'Moderate',
    essential_for_lean_muscle: false,
  },
  {
    name: 'BCAAs / EAAs',
    category: 'Recovery',
    benefits: [
      'Contains leucine — the main muscle-building amino acid trigger',
      'May reduce muscle soreness',
      'Can be used during fasted training',
    ],
    dosage: '5-10g BCAAs or 10-15g EAAs',
    timing: 'During or after workout',
    brands: [
      { name: 'Scivation Xtend', price_range: '₹1,800-2,800/30 servings', availability: 'Amazon, GNC' },
      { name: 'MuscleBlaze BCAA', price_range: '₹800-1,500/30 servings', availability: 'Amazon, MuscleBlaze.com' },
    ],
    pros: ['Good flavor makes you drink more water', 'Useful if you train fasted'],
    cons: ['WASTE OF MONEY if you eat enough protein (which you should)', 'Whey protein already contains all BCAAs', 'Expensive for what it is'],
    evidence_rating: 'Weak',
    essential_for_lean_muscle: false,
  },
  {
    name: 'Glutamine',
    category: 'Recovery',
    benefits: [
      'Gut health support',
      'Immune system during heavy training blocks',
      'Marketed for recovery (but evidence is weak for healthy people)',
    ],
    dosage: '5-10g daily',
    timing: 'Post-workout or before bed',
    brands: [
      { name: 'MuscleBlaze Glutamine', price_range: '₹600-1,000/250g', availability: 'Amazon, MuscleBlaze.com' },
      { name: 'Optimum Nutrition Glutamine', price_range: '₹1,200-1,800/300g', availability: 'Amazon, GNC' },
    ],
    pros: ['May help gut health', 'Safe'],
    cons: ['Body makes enough on its own', 'Very little evidence for muscle building in healthy people', 'Money better spent on creatine or protein'],
    evidence_rating: 'Weak',
    essential_for_lean_muscle: false,
  },
  {
    name: 'Citrulline Malate',
    category: 'Performance',
    benefits: [
      'Increases nitric oxide → better blood flow and muscle pumps',
      'Reduces fatigue during high-rep training',
      'May improve exercise capacity by 10-15%',
    ],
    dosage: '6-8g citrulline malate (2:1 ratio)',
    timing: '30-45 minutes pre-workout',
    brands: [
      { name: 'AS-IT-IS L-Citrulline', price_range: '₹700-1,200/250g', availability: 'Amazon' },
      { name: 'Nutrabay Citrulline Malate', price_range: '₹600-1,000/250g', availability: 'Amazon, Nutrabay.com' },
    ],
    pros: ['Noticeable pump effect', 'Solid research support', 'Good alternative to pre-workout blends'],
    cons: ['Sour taste (mix with juice)', 'Most pre-workouts underdose it — check if you\'re getting 6g+'],
    evidence_rating: 'Moderate',
    essential_for_lean_muscle: false,
  },
]

export const SUPPLEMENT_STACK_RECOMMENDATION = {
  title: 'Recommended Stack for Lean Muscle (Budget-Friendly)',
  essential: [
    { name: 'Creatine Monohydrate', monthly_cost: '₹200-400', reason: 'Non-negotiable. Best bang for buck.' },
    { name: 'Whey Protein', monthly_cost: '₹1,500-3,000', reason: 'Only if you can\'t hit protein from food. 1 scoop/day.' },
  ],
  recommended: [
    { name: 'Vitamin D3', monthly_cost: '₹150-250', reason: 'Most Indians are deficient. Get tested.' },
    { name: 'Fish Oil', monthly_cost: '₹300-500', reason: 'Joint health matters for longevity in lifting.' },
  ],
  optional: [
    { name: 'Caffeine (coffee)', monthly_cost: '₹0-300', reason: 'Free pre-workout. Don\'t overthink it.' },
    { name: 'Ashwagandha', monthly_cost: '₹200-400', reason: 'If stress/sleep is an issue.' },
  ],
  skip: [
    { name: 'BCAAs/EAAs', reason: 'Redundant if you eat enough protein.' },
    { name: 'Glutamine', reason: 'Body makes plenty. Save your money.' },
    { name: 'Fat burners', reason: 'Mostly caffeine + filler. Just drink coffee.' },
    { name: 'Testosterone boosters', reason: 'Don\'t work. Fix sleep, diet, and training instead.' },
    { name: 'Mass gainers', reason: 'Overpriced sugar + protein. Eat real food or make your own shake.' },
  ],
}
