import type { Exercise } from '../types'

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const

/** The exercises every install starts with. People can add their own. */
export const EXERCISE_LIBRARY: readonly Exercise[] = [
  { id: 'bench-press', name: 'Bench press', muscleGroup: 'Chest' },
  { id: 'incline-db-press', name: 'Incline dumbbell press', muscleGroup: 'Chest' },
  { id: 'cable-fly', name: 'Cable fly', muscleGroup: 'Chest' },
  { id: 'push-up', name: 'Push-up', muscleGroup: 'Chest' },
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back' },
  { id: 'barbell-row', name: 'Barbell row', muscleGroup: 'Back' },
  { id: 'lat-pulldown', name: 'Lat pulldown', muscleGroup: 'Back' },
  { id: 'seated-row', name: 'Seated cable row', muscleGroup: 'Back' },
  { id: 'pull-up', name: 'Pull-up', muscleGroup: 'Back' },
  { id: 'squat', name: 'Back squat', muscleGroup: 'Legs' },
  { id: 'leg-press', name: 'Leg press', muscleGroup: 'Legs' },
  { id: 'romanian-deadlift', name: 'Romanian deadlift', muscleGroup: 'Legs' },
  { id: 'walking-lunge', name: 'Walking lunge', muscleGroup: 'Legs' },
  { id: 'leg-curl', name: 'Leg curl', muscleGroup: 'Legs' },
  { id: 'calf-raise', name: 'Standing calf raise', muscleGroup: 'Legs' },
  { id: 'overhead-press', name: 'Overhead press', muscleGroup: 'Shoulders' },
  { id: 'lateral-raise', name: 'Lateral raise', muscleGroup: 'Shoulders' },
  { id: 'face-pull', name: 'Face pull', muscleGroup: 'Shoulders' },
  { id: 'biceps-curl', name: 'Biceps curl', muscleGroup: 'Arms' },
  { id: 'hammer-curl', name: 'Hammer curl', muscleGroup: 'Arms' },
  { id: 'triceps-pushdown', name: 'Triceps pushdown', muscleGroup: 'Arms' },
  { id: 'skull-crusher', name: 'Skull crusher', muscleGroup: 'Arms' },
  { id: 'cable-crunch', name: 'Cable crunch', muscleGroup: 'Core' },
  { id: 'hanging-leg-raise', name: 'Hanging leg raise', muscleGroup: 'Core' },
]
