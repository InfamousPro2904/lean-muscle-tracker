import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module from 'node:module'
import path from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const sourcePath = path.join(root, 'src', 'lib', 'lean-muscle-routine.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText

const routineModule = new Module(sourcePath)
routineModule.filename = sourcePath
routineModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
routineModule._compile(compiled, sourcePath)

const {
  LEAN_MUSCLE_ROUTINE_NAME,
  LEAN_MUSCLE_WEEKLY_ROUTINES,
  OLD_BRO_SPLIT_ROUTINE_NAMES,
} = routineModule.exports

assert.equal(LEAN_MUSCLE_ROUTINE_NAME, 'Lean Muscle - Dumbbell Upper / Gym Lower')
assert.equal(LEAN_MUSCLE_WEEKLY_ROUTINES.length, 7)
assert.deepEqual(
  LEAN_MUSCLE_WEEKLY_ROUTINES.map((routine) => routine.day_of_week[0]),
  [1, 2, 3, 4, 5, 6, 0],
)

const byName = new Map(LEAN_MUSCLE_WEEKLY_ROUTINES.map((routine) => [routine.name, routine]))

assert.deepEqual([...OLD_BRO_SPLIT_ROUTINE_NAMES], [
  'Chest/Tri',
  'Back/Bi',
  'Legs',
  'Shoulders',
  'Arms/Core',
])

for (const oldName of OLD_BRO_SPLIT_ROUTINE_NAMES) {
  assert.equal(byName.has(oldName), false, `${oldName} should not remain in the default routine`)
}

assert.equal(byName.get('Upper A - Dumbbell').exercises.length, 7)
assert.equal(byName.get('Lower A - Gym Squat Focus').exercises.length, 6)
assert.equal(byName.get('Upper B - Dumbbell').exercises.length, 7)
assert.equal(byName.get('Rest').exercises.length, 0)
assert.equal(byName.get('Lower B - Gym Hinge Focus').exercises.length, 7)
assert.equal(LEAN_MUSCLE_WEEKLY_ROUTINES[5].name, 'Rest')
assert.equal(LEAN_MUSCLE_WEEKLY_ROUTINES[5].exercises.length, 0)
assert.equal(byName.get('Optional Recovery + Core').exercises.length, 3)

for (const routine of LEAN_MUSCLE_WEEKLY_ROUTINES.filter((item) => item.split_type === 'upper_body')) {
  for (const exercise of routine.exercises) {
    assert.match(
      exercise.exercise_name,
      /Dumbbell|Push-Up|Hammer Curl/i,
      `${exercise.exercise_name} must stay dumbbell/bodyweight only`,
    )
  }
}

const allExercises = LEAN_MUSCLE_WEEKLY_ROUTINES.flatMap((routine) => routine.exercises)
assert.equal(
  allExercises.find((exercise) => exercise.exercise_name === 'Dumbbell Skull Crusher').muscle_group,
  'Triceps',
)
assert.equal(
  allExercises.find((exercise) => exercise.exercise_name === 'Romanian Deadlift').muscle_group,
  'Hamstrings/Glutes',
)
assert.deepEqual(
  byName.get('Optional Recovery + Core').exercises.map((exercise) => exercise.muscle_group),
  ['Cardio', 'Mobility', 'Core'],
)

console.log('Routine data validated')
