// Evidence-based exercise presets
// Sources: ACSM 2026, Schoenfeld Krieger, PMC449729, Calatayud 2020, ACE Triceps Study,
//          Kinoshita 2023, McAllister 2014, PMC7039033, Coratella 2023, and 12 other primary sources.

export type EquipmentType = 'machine' | 'free_weight' | 'bodyweight'
export type MotionType =
  | 'press' | 'fly' | 'push' | 'pull_vertical' | 'pull_horizontal'
  | 'curl' | 'extension_elbow' | 'extension_knee' | 'hip_hinge'
  | 'hip_thrust' | 'squat' | 'raise' | 'crunch' | 'rotation'

export interface ExerciseVariant {
  name: string
  sets: string
  reps: string
  rest_seconds: string
  tempo: string
  cues: string[]
  motion: MotionType
}

export interface ExerciseEntry {
  key: string
  label: string
  emg_note?: string
  machine?: ExerciseVariant
  free_weight?: ExerciseVariant
  bodyweight?: ExerciseVariant
}

export interface MuscleGroup {
  id: string
  label: string
  anatomy_note: string
  emg_source: string
  exercises: ExerciseEntry[]
  volume_min: number
  volume_optimal: string
  volume_note: string
  /** Front-view SVG muscle region IDs that get highlighted */
  front_regions: string[]
  /** Back-view SVG muscle region IDs that get highlighted */
  back_regions: string[]
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: 'chest',
    label: 'Chest',
    anatomy_note: 'Pectoralis major: clavicular head (upper chest) + sternocostal head (mid/lower). Pectoralis minor (deep, depresses scapula). Upper chest is typically underdeveloped.',
    emg_source: 'Barnett et al. 1995; PMC7706677 Calatayud 2020; NSCA Pressing Angle Study',
    front_regions: ['chest'],
    back_regions: [],
    volume_min: 10,
    volume_optimal: '12–16',
    volume_note: 'Split across upper/mid/lower angle variations',
    exercises: [
      {
        key: 'upper_chest',
        label: 'Upper Chest',
        emg_note: 'Incline 30–45° maximises clavicular head activation (Barnett 1995)',
        machine: {
          name: 'Incline Chest Press Machine',
          sets: '3–4', reps: '8–12', rest_seconds: '90', tempo: '3-1-2',
          motion: 'press',
          cues: [
            'Set incline to 30–45° — clavicular head best activated here',
            'Press handles up and slightly inward; do not let elbows flare past 75°',
            'Full lockout at top; controlled 3s eccentric',
          ],
        },
        free_weight: {
          name: 'Incline Dumbbell Press',
          sets: '3–4', reps: '8–12', rest_seconds: '90', tempo: '3-1-2',
          motion: 'press',
          cues: [
            'Incline 30–45°; neutral grip reduces anterior shoulder impingement',
            'Dumbbells allow full adduction at top — greater pec stretch throughout',
            'Lower to lower chest; drive up and slightly inward',
          ],
        },
        bodyweight: {
          name: 'Incline Push-Up (feet elevated)',
          sets: '3–4', reps: '12–20', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'push',
          cues: [
            'Feet on bench/chair; hands on floor — body angle mimics decline press → hits upper chest',
            'Keep elbows ~45° from torso; full range of motion',
            'Add resistance band across back for progressive overload',
          ],
        },
      },
      {
        key: 'mid_chest',
        label: 'Mid Chest',
        emg_note: 'Flat cable fly provides constant tension unlike flat dumbbell fly (Calatayud 2020)',
        machine: {
          name: 'Flat Cable Fly (standing or bench)',
          sets: '3', reps: '12–15', rest_seconds: '60', tempo: '2-1-3',
          motion: 'fly',
          cues: [
            'Cable provides constant tension — dumbbell tension drops at bottom of fly',
            'Slight elbow bend maintained throughout; "hug a tree" arc',
            'Squeeze at peak contraction; feel deep pec stretch at start of movement',
          ],
        },
        free_weight: {
          name: 'Flat Bench Press (Barbell or Dumbbell)',
          sets: '3–4', reps: '6–10', rest_seconds: '90–120', tempo: '3-0-2',
          motion: 'press',
          cues: [
            'Retract scapulae and create arch — protects shoulder and increases pec activation',
            'Bar touches lower chest/nipple line; elbows 45–70° from torso',
            'Dumbbell version: allows deeper stretch; use if shoulder pain with bar',
          ],
        },
        bodyweight: {
          name: 'Push-Up (standard)',
          sets: '3–4', reps: '15–25', rest_seconds: '60', tempo: '3-1-2',
          motion: 'push',
          cues: [
            'Hands slightly wider than shoulders; elbows track 45° from torso',
            'Full chest-to-floor range; pause at bottom for stretch stimulus',
            'Progress: weighted vest → ring push-up for increased instability demand',
          ],
        },
      },
      {
        key: 'lower_chest',
        label: 'Lower Chest',
        emg_note: 'Decline angle or high cable fly shifts load to sternal/lower fibres',
        machine: {
          name: 'Decline Press Machine or High Cable Crossover',
          sets: '3', reps: '10–12', rest_seconds: '90', tempo: '3-1-2',
          motion: 'press',
          cues: [
            'High cable: pull handles down-and-across from high pulley to hip level',
            'Decline press: -15 to -30° angle; feet secured',
            'Lower pec emphasis requires downward pressing or crossover trajectory',
          ],
        },
        free_weight: {
          name: 'Dips (chest-focused)',
          sets: '3–4', reps: '8–12', rest_seconds: '90–120', tempo: '3-1-2',
          motion: 'push',
          cues: [
            'Lean forward 30–45° — shifts load from triceps to lower pec',
            'Lower until slight shoulder stretch (not impingement); full push to lockout',
            'ACE Study: dips 87% tricep activation — also significant lower pec engagement',
            'Add weight via belt once bodyweight reps exceed 15',
          ],
        },
        bodyweight: {
          name: 'Decline Push-Up or Archer Push-Up',
          sets: '3', reps: '12–15', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'push',
          cues: [
            'Feet elevated on bench/chair — shifts emphasis to lower pec and anterior delt',
            'Archer push-up: alternate side-to-side lateral weight shift for unilateral overload',
          ],
        },
      },
    ],
  },
  {
    id: 'back',
    label: 'Back',
    anatomy_note: 'Latissimus dorsi (width), Rhomboids + Mid/Lower Trapezius (thickness/retraction), Teres major, Spinal erectors. Vertical pulls target lats; horizontal pulls target rhomboids and traps.',
    emg_source: 'PMC449729 Lat Variations Study; Edelburg Wisconsin Thesis; SuppVersity EMG Series Back',
    front_regions: [],
    back_regions: ['lats', 'traps'],
    volume_min: 10,
    volume_optimal: '14–20',
    volume_note: 'Split between vertical pulls (lats) and horizontal pulls (thickness)',
    exercises: [
      {
        key: 'lats_vertical',
        label: 'Lats — Vertical Pull',
        emg_note: 'Wide pronated grip to anterior head produces greatest lat activation (PMC449729)',
        machine: {
          name: 'Lat Pulldown (Cable)',
          sets: '3–4', reps: '8–12', rest_seconds: '90', tempo: '2-1-3',
          motion: 'pull_vertical',
          cues: [
            'Wide pronated grip anterior (front) to head — greater lat activation than behind-neck',
            'Lean back 10–15° at hip; pull bar to upper chest',
            'Squeeze shoulder blades down and back at bottom; do not shrug at top',
            'Control the eccentric — lat stretch at top is critical',
          ],
        },
        free_weight: {
          name: 'Pull-Up / Chin-Up',
          sets: '3–4', reps: '6–10', rest_seconds: '120', tempo: '3-1-2',
          motion: 'pull_vertical',
          cues: [
            'Pull-ups show highest lat activation vs lat pulldowns (EMG: ~120% more — Wisconsin thesis)',
            'Dead hang start — full elbow extension at bottom for maximum lat stretch',
            'Pull elbows down and back; chin clears bar or chest touches bar',
            'Band assistance or eccentric-only for beginners',
          ],
        },
        bodyweight: {
          name: 'Resistance Band Pull-Down or Doorframe Pull-Up',
          sets: '3–4', reps: '10–15', rest_seconds: '60–90', tempo: '2-1-3',
          motion: 'pull_vertical',
          cues: [
            'Attach band overhead; mimic lat pulldown motor pattern',
            'Inverted row under a table is a viable horizontal pull substitute',
          ],
        },
      },
      {
        key: 'back_horizontal',
        label: 'Back Thickness — Horizontal Pull',
        emg_note: 'Scapular retraction at end produces highest lat activation: 37% MVC (PMC449729)',
        machine: {
          name: 'Seated Cable Row (V-Bar or Wide Bar)',
          sets: '3–4', reps: '8–12', rest_seconds: '90', tempo: '2-1-3',
          motion: 'pull_horizontal',
          cues: [
            'Retract scapulae fully at end of pull; hold 1s — peak rhomboid/mid-trap contraction',
            'Keep torso upright (10° lean max); avoid excessive body swing',
            'Row to lower sternum/upper abdomen; elbows pass ribcage',
          ],
        },
        free_weight: {
          name: 'Bent-Over Barbell Row (Overhand or Underhand)',
          sets: '3–4', reps: '6–10', rest_seconds: '120', tempo: '2-1-3',
          motion: 'pull_horizontal',
          cues: [
            'Hip hinge to ~45° torso angle — flat back, braced core',
            'Overhand: more rhomboid/trap; underhand (Yates row): more lower lat',
            'Pull bar to lower abdomen; lead with elbows, keep them close to torso',
          ],
        },
        bodyweight: {
          name: 'Inverted Row (Supine Row under bar/table)',
          sets: '3–4', reps: '10–15', rest_seconds: '60–90', tempo: '2-1-3',
          motion: 'pull_horizontal',
          cues: [
            'Adjust angle to control difficulty: more horizontal = harder; more vertical = easier',
            'Feet elevated on bench increases load',
            'Squeeze shoulder blades together at top; hold 1s',
          ],
        },
      },
      {
        key: 'rear_delts_traps',
        label: 'Rear Delts + Lower Traps',
        emg_note: 'Y-raise at 30° arm angle hits lower trap best (Edelburg thesis)',
        machine: {
          name: 'Reverse Fly Machine or Face Pull (Cable)',
          sets: '3', reps: '12–15', rest_seconds: '60', tempo: '2-1-2',
          motion: 'raise',
          cues: [
            'Face pull: rope at forehead level with external shoulder rotation — trains rear delt + lower trap',
            'Greatest lower trap activation: I/Y/T raises (Edelburg EMG thesis)',
            'Keep elbows above shoulders during face pull',
          ],
        },
        free_weight: {
          name: 'Dumbbell Y/I/T Raises (prone incline bench)',
          sets: '3', reps: '12–15', rest_seconds: '60', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Y-raise at 30° arm angle from torso hits lower trap best',
            'Use light load — postural/isolation movements',
            'Chest-supported row eliminates lower back compensation',
          ],
        },
        bodyweight: {
          name: 'Band Pull-Aparts or Prone Y-T-W Raises',
          sets: '3', reps: '15–20', rest_seconds: '45–60', tempo: '2-1-2',
          motion: 'raise',
          cues: [
            'Band pull-aparts: arms straight, pull band to chest width, focus on shoulder blade retraction',
            'Prone YTW on floor: lie face down, perform each letter with arms — no equipment needed',
          ],
        },
      },
    ],
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    anatomy_note: 'Deltoid: anterior (front), lateral (side — visual roundness), posterior (rear). The lateral head is most undertrained and gives the capped shoulder appearance.',
    emg_source: 'Calatayud et al. 2020 PMC7706677: Shoulder Press = highest anterior (33.3% MVIC); Lateral Raise = highest lateral (30.3%)',
    front_regions: ['shoulders'],
    back_regions: ['rear_delts'],
    volume_min: 10,
    volume_optimal: '12–16',
    volume_note: 'Lateral delts often need isolated volume beyond pressing; rear delts need dedicated work',
    exercises: [
      {
        key: 'anterior_deltoid',
        label: 'Anterior Deltoid',
        emg_note: 'Shoulder press = highest anterior deltoid activation (33.3% MVIC — Calatayud 2020)',
        machine: {
          name: 'Seated Shoulder Press Machine',
          sets: '3–4', reps: '8–12', rest_seconds: '90–120', tempo: '3-0-2',
          motion: 'press',
          cues: [
            'Press to full lockout; keep core braced, avoid lumbar hyperextension',
            'Lower handles to chin level — do not go below ear height',
          ],
        },
        free_weight: {
          name: 'Dumbbell or Barbell Overhead Press',
          sets: '3–4', reps: '8–12', rest_seconds: '90–120', tempo: '3-0-2',
          motion: 'press',
          cues: [
            'Seated reduces energy leak for hypertrophy focus vs standing',
            'Dumbbell neutral grip (hammer) reduces anterior shoulder impingement risk',
            'Press slightly in front of head — natural shoulder arc',
          ],
        },
        bodyweight: {
          name: 'Pike Push-Up or Handstand Push-Up',
          sets: '3–4', reps: '8–15', rest_seconds: '90', tempo: '3-0-2',
          motion: 'push',
          cues: [
            'Pike push-up: hips high, head between hands, lower head toward floor',
            'Wall handstand push-up: feet against wall — highest loading version',
            'Elevate feet on chair to progressively increase shoulder angle',
          ],
        },
      },
      {
        key: 'lateral_deltoid',
        label: 'Lateral Deltoid',
        emg_note: 'Lateral raise = 30.3% MVIC lateral head vs shoulder press 27.9% (Calatayud 2020)',
        machine: {
          name: 'Cable Lateral Raise (single-arm, low pulley)',
          sets: '3–4', reps: '12–15', rest_seconds: '60', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Cable provides constant tension across full ROM vs dumbbells',
            'Lean slightly into cable for greater peak contraction angle',
            'Raise to shoulder height (90°) — above 90° shifts to upper trap',
            'Pinky slightly higher than thumb at peak (internal humeral rotation = more lateral stretch)',
          ],
        },
        free_weight: {
          name: 'Dumbbell Lateral Raise',
          sets: '3–4', reps: '12–15', rest_seconds: '60', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Slight forward lean (10–15°) pre-loads the lateral head at longer muscle length',
            'Control the eccentric — slow lower is where most hypertrophic stimulus occurs',
            'Drop sets: 12 heavy, immediately drop 30–40% for 8 more',
          ],
        },
        bodyweight: {
          name: 'Band Lateral Raise',
          sets: '3', reps: '15–20', rest_seconds: '45–60', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Stand on resistance band; perform lateral raise as normal',
            'Band provides increasing resistance through ROM — different stimulus than free weights',
          ],
        },
      },
      {
        key: 'posterior_deltoid',
        label: 'Posterior Deltoid',
        emg_note: 'Lateral raise activates posterior deltoid most (24% MVIC) among exercises tested (Calatayud 2020)',
        machine: {
          name: 'Reverse Pec Deck or Face Pull (Cable)',
          sets: '3–4', reps: '12–15', rest_seconds: '60', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Face pull at eye level: pull to forehead with external shoulder rotation',
            'Reverse pec deck: elbows at shoulder height; lead with elbows not hands',
          ],
        },
        free_weight: {
          name: 'Dumbbell Rear Delt Fly (Prone or Bent-Over)',
          sets: '3', reps: '12–15', rest_seconds: '60', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Lie face down on incline bench (30°) to isolate rear delt without lower back stress',
            'Raise arms to shoulder height in T position; pinch blades at top for 1s',
          ],
        },
        bodyweight: {
          name: 'Band Face Pull or TRX Rear Delt Fly',
          sets: '3', reps: '15–20', rest_seconds: '45–60', tempo: '2-1-2',
          motion: 'raise',
          cues: [
            'Attach band to door anchor at eye level; mimic face pull',
            'TRX Y-fly: lean back, perform Y-raise — excellent rear delt + lower trap combination',
          ],
        },
      },
    ],
  },
  {
    id: 'biceps',
    label: 'Biceps',
    anatomy_note: 'Long head (outer peak), short head (inner fullness), brachialis (arm thickness), brachioradialis (forearm). Long head is most stretched when shoulder is extended behind the body (incline curl).',
    emg_source: 'Coratella 2023: Supinated grip = highest activation; PMC6047503: Incline curl; Marcolin 2018: EZ-bar',
    front_regions: ['biceps'],
    back_regions: [],
    volume_min: 8,
    volume_optimal: '10–14',
    volume_note: 'Back rows + pull-ups provide indirect volume — count partial credit',
    exercises: [
      {
        key: 'overall_biceps',
        label: 'Overall Biceps',
        emg_note: 'EZ-bar shows higher bicep + brachioradialis activation than dumbbell curl (Marcolin 2018)',
        machine: {
          name: 'Preacher Curl Machine or Cable Preacher Curl',
          sets: '3', reps: '10–12', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'curl',
          cues: [
            'Preacher curl is isolation-focused — arm fixed on pad eliminates compensation',
            'Cable preacher curl provides constant tension across full ROM',
            'Stop just short of full elbow extension to maintain tension',
          ],
        },
        free_weight: {
          name: 'EZ-Bar Curl or Barbell Curl',
          sets: '3–4', reps: '8–12', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'curl',
          cues: [
            'EZ-bar curl: higher bicep brachii + brachioradialis activation than dumbbell (Marcolin 2018)',
            'Full supination at top — do not let wrists pronate',
            'Keep elbows pinned to sides; avoid swinging',
            'Supinated grip throughout maximises bicep activation (Coratella 2023)',
          ],
        },
        bodyweight: {
          name: 'Incline Dumbbell Curl or Chin-Up',
          sets: '3', reps: '10–15', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'curl',
          cues: [
            'Incline dumbbell curl: 45–60° bench; shoulder extended — long head at maximum stretch',
            'PMC6047503: Incline curl maintains high EMG (~95% max RMS) throughout full ROM',
            'Chin-up provides heavy compound bicep stimulus — treat as mass builder',
          ],
        },
      },
      {
        key: 'brachialis',
        label: 'Brachialis / Brachioradialis',
        emg_note: 'Neutral/hammer grip shifts emphasis from bicep brachii to brachialis and brachioradialis',
        free_weight: {
          name: 'Hammer Curl (Neutral Grip)',
          sets: '3', reps: '10–12', rest_seconds: '60', tempo: '2-1-2',
          motion: 'curl',
          cues: [
            'Neutral/hammer grip shifts emphasis to brachialis and brachioradialis',
            'Brachialis sits beneath bicep — growing it pushes bicep up creating peak illusion',
            'Can be done alternating or simultaneously; cable hammer curl provides constant tension',
          ],
        },
      },
    ],
  },
  {
    id: 'triceps',
    label: 'Triceps',
    anatomy_note: 'Three heads: long head (largest, crosses shoulder — needs overhead stretch), lateral head (outer horseshoe), medial head (deep, always active). Long head most undertrained.',
    emg_source: 'ACE Triceps Study: Triangle push-up 100%, kickbacks 87%, dips 87%, overhead ext 76%. German 2011: overhead position best for long head.',
    front_regions: [],
    back_regions: ['triceps'],
    volume_min: 10,
    volume_optimal: '12–20',
    volume_note: 'Pressing movements count as partial volume; Baz-Valle 2022: may benefit from >20 direct sets',
    exercises: [
      {
        key: 'triceps_compound',
        label: 'Overall Triceps — Compound',
        emg_note: 'Triangle push-up = 100% baseline; bench dip 87%; cable pushdown 74% (ACE Study)',
        machine: {
          name: 'Cable Pushdown (Rope or Bar)',
          sets: '3–4', reps: '8–12', rest_seconds: '90', tempo: '3-0-2',
          motion: 'extension_elbow',
          cues: [
            'Rope attachment: higher long head activation (81%) vs bar (75%) — ACE Study',
            'Spread rope apart at bottom for greater lateral head contraction',
            'Keep elbows pinned to sides; only forearm moves',
          ],
        },
        free_weight: {
          name: 'Close-Grip Bench Press',
          sets: '3–4', reps: '6–10', rest_seconds: '90–120', tempo: '3-0-2',
          motion: 'press',
          cues: [
            'Grip shoulder-width (not too close — wrist strain risk); elbows 45–60° from torso',
            'Lower bar to lower chest — increases tricep ROM vs regular bench',
            'CGBP provides heavy compound overload for tricep mass',
          ],
        },
        bodyweight: {
          name: 'Triangle (Diamond) Push-Up or Dip',
          sets: '3–4', reps: '10–20', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'push',
          cues: [
            'Triangle/diamond push-up: hands form triangle under chest — HIGHEST overall tricep activation (ACE: 100%)',
            'Bench dip: hands behind, feet forward — 87% ACE study',
            'Parallel bar dip (torso upright): tricep-focused version',
          ],
        },
      },
      {
        key: 'long_head_isolation',
        label: 'Long Head Isolation',
        emg_note: 'Overhead position fully stretches long head — essential for complete tricep development',
        machine: {
          name: 'Overhead Triceps Extension (Cable, rope overhead)',
          sets: '3', reps: '10–15', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'extension_elbow',
          cues: [
            'Overhead position stretches long head (crosses shoulder joint)',
            'ACE Study: overhead extension 76% combined, 81% long head activation',
            'Face away from stack, extend arms overhead; keep elbows stationary',
          ],
        },
        free_weight: {
          name: 'Skull Crusher (EZ-Bar or Dumbbell)',
          sets: '3', reps: '10–12', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'extension_elbow',
          cues: [
            'Lower bar to forehead level or behind head for more long head stretch',
            'Behind-head version places long head at longer muscle length',
            'Incline skull crusher adds additional long head stretch',
          ],
        },
        bodyweight: {
          name: 'Triceps Extension with Band',
          sets: '3', reps: '12–15', rest_seconds: '45–60', tempo: '3-1-2',
          motion: 'extension_elbow',
          cues: [
            'Attach band below, extend arms overhead — mimics cable overhead extension',
            'Incline kickback: long head activation ~20% better than flat kickback (German EMG study)',
          ],
        },
      },
    ],
  },
  {
    id: 'quadriceps',
    label: 'Quadriceps',
    anatomy_note: 'Vastus lateralis (outer quad), vastus medialis (VMO, teardrop), rectus femoris (crosses hip and knee), vastus intermedius (deep). Squat builds VL; leg extension essential for rectus femoris.',
    emg_source: 'PMC11235860 squat variations; RP Strength quad review; Community Strength hack squat vs leg press',
    front_regions: ['quads'],
    back_regions: [],
    volume_min: 10,
    volume_optimal: '12–16',
    volume_note: 'Include leg extension for rectus femoris — squats alone leave it understimulated',
    exercises: [
      {
        key: 'quad_compound',
        label: 'Primary Compound',
        emg_note: 'Hack squat: 15–20% higher quad activation vs leg press; deep knee flexion with back support',
        machine: {
          name: 'Hack Squat Machine',
          sets: '3–4', reps: '8–12', rest_seconds: '120', tempo: '3-1-2',
          motion: 'squat',
          cues: [
            'Hack squat: 15–20% higher quad activation vs leg press',
            'Full depth (thigh below parallel) for maximum quad stretch',
            'Drive through entire foot; toes 15–30° out',
          ],
        },
        free_weight: {
          name: 'Barbell Back Squat or Front Squat',
          sets: '3–4', reps: '6–10', rest_seconds: '120–180', tempo: '3-1-2',
          motion: 'squat',
          cues: [
            'Back squat: greatest overall quad EMG (up to 74% MVC during ascent)',
            'Front squat: greater knee-dominant emphasis due to more upright torso',
            'High-bar: more quad dominant; low-bar: more hip/posterior chain dominant',
            'Brace core (360° pressure) before descent; maintain neutral spine',
          ],
        },
        bodyweight: {
          name: 'Bulgarian Split Squat (RFESS)',
          sets: '3–4', reps: '10–15 per leg', rest_seconds: '90', tempo: '3-1-2',
          motion: 'squat',
          cues: [
            'Rear foot elevated split squat — best single-leg quad exercise',
            'Front foot further forward = more hip/glute; closer = more upright/quad dominant',
            'Controlled descent until rear knee nearly touches floor',
          ],
        },
      },
      {
        key: 'quad_isolation',
        label: 'Quad Isolation — Rectus Femoris',
        emg_note: 'Leg extension essential for rectus femoris — squats show no significant RF growth in some studies (StrengthLog 2023)',
        machine: {
          name: 'Leg Extension Machine',
          sets: '3', reps: '12–15', rest_seconds: '60–90', tempo: '2-1-3',
          motion: 'extension_knee',
          cues: [
            'Lean back slightly to place rectus femoris at longer stretch (hip extension)',
            'Full extension with 1s squeeze at top; slow 3s eccentric',
            'Seated: foot pad behind ankle — do not position above ankle',
          ],
        },
        free_weight: {
          name: 'Leg Press (low-narrow foot placement)',
          sets: '3–4', reps: '10–15', rest_seconds: '90–120', tempo: '3-1-2',
          motion: 'extension_knee',
          cues: [
            'Low narrow foot placement = greater quad emphasis; high wide = glute/hamstring',
            'Leg press allows heavier loading than hack squat — useful as secondary overload',
            'Do not lock knees at top — maintain slight flexion to keep quads under tension',
          ],
        },
      },
    ],
  },
  {
    id: 'hamstrings',
    label: 'Hamstrings',
    anatomy_note: 'Biceps femoris long+short head (outer), semitendinosus + semimembranosus (inner). RDL = semimembranosus hypertrophy; Nordic curl = semitendinosus hypertrophy (Journal of Applied Physiology 2025).',
    emg_source: 'McAllister 2014; PMC7046193 deadlift EMG; Journal of Applied Physiology 2025 Nordic vs RDL selective hypertrophy',
    front_regions: [],
    back_regions: ['hamstrings'],
    volume_min: 8,
    volume_optimal: '10–14',
    volume_note: 'Combine hip-hinge (RDL) + knee-flexion (leg curl/Nordic) for all hamstring heads',
    exercises: [
      {
        key: 'hamstring_hip_hinge',
        label: 'Hip-Dominant Hamstrings',
        emg_note: 'RDL selectively hypertrophies semimembranosus (+11.2%); Nordic selectively hypertrophies semitendinosus (+24.4%) — Journal of Applied Physiology 2025',
        machine: {
          name: 'Seated or Lying Leg Curl Machine',
          sets: '3–4', reps: '10–12', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'curl',
          cues: [
            'Seated leg curl: hip flexed — hamstring at longer length — greater hypertrophy stimulus',
            'Control the eccentric (3s) — hamstrings respond well to eccentric overload',
            'Foot plantarflexion (toes pointed) = greater biceps femoris; dorsiflexion = greater semimembranosus',
          ],
        },
        free_weight: {
          name: 'Romanian Deadlift (RDL) — Barbell or Dumbbell',
          sets: '3–4', reps: '8–12', rest_seconds: '90–120', tempo: '3-1-2',
          motion: 'hip_hinge',
          cues: [
            'RDL = greatest eccentric hamstring activation — hip hinge until strong hamstring stretch (~mid-shin)',
            'Soft knee bend throughout; push hips back, not forward knee travel',
            'Bar/dumbbells stay close to legs throughout; neutral spine',
            'Journal of Applied Physiology 2025: RDL selectively hypertrophies semimembranosus (+11.2%)',
          ],
        },
        bodyweight: {
          name: 'Nordic Hamstring Curl',
          sets: '3', reps: '4–8', rest_seconds: '90–120', tempo: '5-0-1',
          motion: 'curl',
          cues: [
            'Kneel on pad, feet anchored; lower body toward floor controlling descent with hamstrings',
            'HIGHEST eccentric hamstring load of any exercise',
            'Journal of Applied Physiology 2025: Nordic selectively hypertrophies semitendinosus (+24.4%)',
            'Beginners: assisted nordic (use hands to push off floor on way down)',
          ],
        },
      },
    ],
  },
  {
    id: 'glutes',
    label: 'Glutes',
    anatomy_note: 'Gluteus maximus (primary hip extensor), gluteus medius (hip abductor — pelvic stability), gluteus minimus (deep abductor). Hip thrust best for glute max at shortened position; squats for stretched position.',
    emg_source: 'PMC7039033: Step-ups 104–169% MVIC; Hip thrust 65–105% MVIC; Deadlift 64–88% MVIC; Squat 59% MVIC. Frontiers 2025: combined hip extension best (SMD 0.71).',
    front_regions: [],
    back_regions: ['glutes'],
    volume_min: 8,
    volume_optimal: '10–16',
    volume_note: 'Hip thrust + squat combination produces most complete glute development (Frontiers 2025)',
    exercises: [
      {
        key: 'glute_hip_extension',
        label: 'Primary Hip Extension',
        emg_note: 'Hip thrust 65–105% MVIC; step-ups 104–169% MVIC glute max (PMC7039033)',
        machine: {
          name: 'Smith Machine Hip Thrust or Leg Press (high/wide)',
          sets: '3–4', reps: '10–15', rest_seconds: '90', tempo: '3-1-2',
          motion: 'hip_thrust',
          cues: [
            'Leg press: high wide foot placement shifts emphasis to glutes and hamstrings',
            'Smith machine hip thrust: barbell across hips, upper back on bench, drive to full extension',
            'Glute squeeze and posterior pelvic tilt at top — do not hyperextend lumbar',
          ],
        },
        free_weight: {
          name: 'Barbell Hip Thrust',
          sets: '3–4', reps: '10–15', rest_seconds: '90–120', tempo: '3-1-2',
          motion: 'hip_thrust',
          cues: [
            'Hip thrust: 65–105% MVIC glute max — highest activation at shortened (top) position',
            'Upper back on bench, barbell across hip crease with pad; plant feet so shins vertical at top',
            'Drive through full foot, squeeze glutes maximally at top; hold 1–2s',
            '2023 research: hip thrust and squat elicit similar gluteal hypertrophy',
          ],
        },
        bodyweight: {
          name: 'Glute Bridge (single-leg) or Step-Up',
          sets: '3–4', reps: '15–25 / 10–12 per leg', rest_seconds: '60', tempo: '2-2-1',
          motion: 'hip_thrust',
          cues: [
            'Step-up variations: HIGHEST glute EMG ever recorded — 104–169% MVIC (PMC7039033)',
            'Step height causing ~90° knee flexion for maximum glute stretch',
            'Bodyweight hip thrust/glute bridge: two-leg → single-leg → banded → weighted progression',
          ],
        },
      },
      {
        key: 'glute_medius',
        label: 'Gluteus Medius',
        emg_note: 'Primary hip abductor — important for functional stability and visual roundness (side profile)',
        machine: {
          name: 'Hip Abduction Machine',
          sets: '3', reps: '15–20', rest_seconds: '60', tempo: '2-1-2',
          motion: 'raise',
          cues: [
            'Glute medius: primary hip abductor — important for stability and visual side-profile roundness',
            'Seated or lying hip abduction machine isolates glute med effectively',
          ],
        },
        bodyweight: {
          name: 'Lateral Band Walk or Clamshell',
          sets: '3', reps: '15–20', rest_seconds: '45–60', tempo: '2-1-2',
          motion: 'raise',
          cues: [
            'Loop band above knees for lateral band walk — maintain tension at all times',
            'Clamshell: side-lying, knees 90°, rotate top knee open while keeping feet together',
            'Fire hydrant: quadruped, raise leg to side — glute med + minimus activation',
          ],
        },
      },
    ],
  },
  {
    id: 'calves',
    label: 'Calves',
    anatomy_note: 'Gastrocnemius (biarticular — crosses knee and ankle; two heads) + Soleus (monoarticular — crosses only ankle). Standing raises for gastrocnemius; seated raises for soleus.',
    emg_source: 'Kinoshita et al. 2023 PMC10753835: Standing = lateral gastrocnemius +12.4% vs seated +1.7%. PMID 37015016: Partial ROM at stretched position superior for gastrocnemius.',
    front_regions: [],
    back_regions: ['calves'],
    volume_min: 8,
    volume_optimal: '12–16',
    volume_note: 'Prioritise standing raises for gastrocnemius; calves need higher rep ranges (10–20)',
    exercises: [
      {
        key: 'gastrocnemius',
        label: 'Gastrocnemius — Standing',
        emg_note: 'Standing is BY FAR superior to seated for gastrocnemius hypertrophy: 12.4% vs 1.7% growth (Kinoshita 2023)',
        machine: {
          name: 'Standing Calf Raise Machine',
          sets: '4–5', reps: '10–15', rest_seconds: '90', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Full plantarflexion at top; FULL stretch at bottom (heel below platform)',
            'Slow eccentric (3s) — critical for calf development',
            'Research (PMID 37015016): partial ROM biased to stretched position produces GREATER growth (15.2% vs 6.7% full ROM)',
          ],
        },
        free_weight: {
          name: 'Dumbbell or Barbell Standing Calf Raise',
          sets: '4–5', reps: '10–15', rest_seconds: '90', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Single-leg dumbbell calf raise: greater ROM and focus on each leg individually',
            'Keep slight knee flexion — maintains some gastrocnemius tension',
          ],
        },
        bodyweight: {
          name: 'Single-Leg Bodyweight Calf Raise (on step)',
          sets: '3–4', reps: '15–25 per leg', rest_seconds: '45–60', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Single-leg bodyweight raise: ~50–80% of body weight as load — sufficient stimulus',
            'Full stretch at bottom — heel well below step level',
            'Hold peak contraction 1–2s',
          ],
        },
      },
      {
        key: 'soleus',
        label: 'Soleus — Seated',
        emg_note: 'Knee bent at 90° = gastrocnemius slack = isolated soleus training (Kinoshita 2023)',
        machine: {
          name: 'Seated Calf Raise Machine',
          sets: '3', reps: '12–15', rest_seconds: '60–90', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Knee bent 90° = gastrocnemius slack = isolated soleus training',
            'Kinoshita 2023: Soleus responds equally to standing and seated (~2.5% growth both)',
            'Full ROM: deep stretch at bottom, full plantarflexion at top',
          ],
        },
        free_weight: {
          name: 'Seated Dumbbell Calf Raise (on knee)',
          sets: '3', reps: '12–15', rest_seconds: '60', tempo: '2-1-3',
          motion: 'raise',
          cues: [
            'Dumbbell on quad close to knee; bend knee 90°; perform from step',
            'Soleus is primarily slow-twitch — responds well to higher reps and sustained tension',
          ],
        },
      },
    ],
  },
  {
    id: 'core_abs',
    label: 'Core & Abs',
    anatomy_note: 'Rectus abdominis (six-pack — trunk flexion), External/Internal Obliques (rotation + lateral flexion), Transverse abdominis (deep stabiliser). Progressive overload required for hypertrophy — treat abs like any other muscle.',
    emg_source: 'PMC9505236: Ab wheel rollout highest RA activation (63% upper RA, 53% lower RA MVIC). PMC7345922 Systematic Review. ACE: Bicycle crunch effective for obliques.',
    front_regions: ['abs', 'obliques'],
    back_regions: [],
    volume_min: 6,
    volume_optimal: '8–12',
    volume_note: 'Core also trained during compounds — direct ab work can be lower volume; progressive overload required',
    exercises: [
      {
        key: 'rectus_abdominis',
        label: 'Rectus Abdominis',
        emg_note: 'Ab wheel rollout: HIGHEST RA activation (63% upper RA, 53% lower RA MVIC — PMC9505236)',
        machine: {
          name: 'Cable Crunch (kneeling) or Ab Machine',
          sets: '3–4', reps: '12–20', rest_seconds: '60', tempo: '2-1-2',
          motion: 'crunch',
          cues: [
            'Cable crunch allows progressive overload — key to abdominal hypertrophy',
            'Pull elbows toward knees; focus on spinal flexion, not hip flexion',
            'Hold peak contraction 1s for maximum RA activation; hips stay stationary',
          ],
        },
        free_weight: {
          name: 'Ab Wheel Rollout',
          sets: '3', reps: '8–15', rest_seconds: '60–90', tempo: '3-0-3',
          motion: 'crunch',
          cues: [
            'Ab wheel rollout: HIGHEST RA activation in research (PMC9505236: 63% upper RA)',
            'Roll out slowly — keep abs braced; do not let hips sag',
            'Beginners: partial rollout (45° from knees); progress to full extension',
          ],
        },
        bodyweight: {
          name: 'Hanging Leg Raise or Dragon Flag',
          sets: '3', reps: '10–15', rest_seconds: '60–90', tempo: '3-1-2',
          motion: 'crunch',
          cues: [
            'Posterior pelvic tilt at top maximises RA contraction vs hip flexor dominance',
            'Dragon flag: full body lever on bench — extreme RA + oblique demand; advanced only',
            'Knees bent easier; straight legs harder; toes-to-bar hardest progression',
          ],
        },
      },
      {
        key: 'obliques',
        label: 'Obliques',
        emg_note: 'Cable woodchop: rotational movement is the primary oblique function',
        machine: {
          name: 'Cable Woodchop (High-to-Low or Low-to-High)',
          sets: '3', reps: '12–15 per side', rest_seconds: '60', tempo: '2-0-2',
          motion: 'rotation',
          cues: [
            'High-to-low: emphasises external oblique on pulling side',
            'Hips stay facing forward — rotation comes from thoracic spine and core',
          ],
        },
        free_weight: {
          name: 'Pallof Press or Dumbbell Side Bend',
          sets: '3', reps: '12–15 per side', rest_seconds: '60', tempo: '2-1-2',
          motion: 'rotation',
          cues: [
            'Pallof press: anti-rotation — forces obliques to resist rotation (excellent core stability)',
            'Dumbbell side bend: lateral flexion trains external oblique',
          ],
        },
        bodyweight: {
          name: 'Bicycle Crunch or Side Plank',
          sets: '3', reps: '20–30 / 30–60s', rest_seconds: '45–60', tempo: 'controlled',
          motion: 'crunch',
          cues: [
            'Bicycle crunch: one of most effective oblique + RA exercises per ACE research',
            'Side plank: high internal oblique activation (>87% collective core — PMC7345922)',
            'Loaded plank (weight on back) for hypertrophy intent',
          ],
        },
      },
    ],
  },
]

export const VOLUME_TARGETS: Record<string, { min: number; optimal: string; note: string }> = {
  chest:     { min: 10, optimal: '12–16', note: 'Split across upper/mid/lower angle variations' },
  back:      { min: 10, optimal: '14–20', note: 'Split between vertical pulls (lats) and horizontal pulls (thickness)' },
  shoulders: { min: 10, optimal: '12–16', note: 'Lateral delts often need isolated volume beyond pressing' },
  biceps:    { min: 8,  optimal: '10–14', note: 'Back rows + pull-ups provide indirect volume' },
  triceps:   { min: 10, optimal: '12–20', note: 'Pressing movements count as partial volume' },
  quadriceps:{ min: 10, optimal: '12–16', note: 'Include leg extension for rectus femoris' },
  hamstrings:{ min: 8,  optimal: '10–14', note: 'Combine hip-hinge (RDL) + knee-flexion (leg curl/Nordic)' },
  glutes:    { min: 8,  optimal: '10–16', note: 'Hip thrust + squat combination most complete (Frontiers 2025)' },
  calves:    { min: 8,  optimal: '12–16', note: 'Prioritise standing raises for gastrocnemius hypertrophy' },
  core_abs:  { min: 6,  optimal: '8–12',  note: 'Core also trained during compound lifts' },
}

export const KEY_EVIDENCE: { key: string; title: string; body: string }[] = [
  {
    key: 'load_independence',
    title: 'Load Independence',
    body: 'Hypertrophy occurs across 30–100% 1RM when effort is sufficient. Moderate loads (70–85% 1RM) with controlled proximity to failure are optimal for hypertrophy. (ACSM 2026 + PMID 33433148)',
  },
  {
    key: 'failure_training',
    title: 'Training to Failure',
    body: 'Training to absolute failure does not reliably produce superior hypertrophy vs stopping 1–3 RIR. Getting close to failure matters; grinding every set does not consistently outperform. (PMID 36334240 + ACSM 2026)',
  },
  {
    key: 'stretch_position',
    title: 'Stretch Position Superiority',
    body: 'Training at longer muscle lengths may produce superior hypertrophy. Evidence strongest for gastrocnemius: partial ROM at stretched position = 15.2% vs 6.7% full ROM. (PMC10801605 + PMID 37015016)',
  },
  {
    key: 'progressive_overload',
    title: 'Progressive Overload',
    body: 'Load and rep progression produce equivalent hypertrophy over 8 weeks. Double progression (increase weight when top of rep range reached) is the most practical implementation. (PMC9528903)',
  },
]
