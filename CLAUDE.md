# PulseCare: Personal Health and Fitness Companion

Read the portfolio-root `CLAUDE.md` first for global rules. This file is the brief for this project.

## What it is
A mobile-first health app: build workout routines, log sets and reps with a rest timer, track water, macros and vitals, and see weekly volume and personal records in charts.

## Stack
React Native with Expo (expo-sqlite, NativeWind, Victory Native or react-native-svg charts), TypeScript strict, exported to web with `expo export --platform web` and hosted on Netlify. If time is tight, ship as a React + Vite PWA with Dexie and tell the user. No Supabase, no Vercel, no Gemini/OpenAI.

## MVP (build first)
1. Routine builder and workout session: exercises, sets/reps/weight logging, rest timer.
2. Daily logging: hydration, macros and vitals (weight, resting HR) with simple targets.
3. Analytics: weekly volume chart, per-exercise weight progression, personal records.

## Phase 2
Exercise library with search, Photo progress log, Export CSV, Optional Neon sync.

## Data model (put in `types/`)
```ts
export interface Exercise { id: string; name: string; muscleGroup: string }
export interface Routine { id: string; name: string; exerciseIds: string[] }
export interface WorkoutSession { id: string; routineId: string | null; startedAt: string; endedAt: string | null }
export interface SetLog { id: string; sessionId: string; exerciseId: string; reps: number; weightKg: number; rpe: number | null }
export interface DailyLog { date: string; waterMl: number; kcal: number; proteinG: number; carbsG: number; fatG: number; weightKg: number | null; restingHr: number | null }
```

## Rules specific to this project
- Decide Expo vs PWA at step 1 (see root CLAUDE.md scope control) and state the choice in the README.
- Personal records are derived (estimated 1RM), not stored; test the maths.
- Keep SQL access in one `db/` layer; no queries inside components.
- Seed 6 weeks of realistic workout and daily log data.
- Seed realistic demo data so the app looks alive on first load without sign-up.

## Start here
1. Check Expo/Node versions and confirm Expo-web export works on Netlify (otherwise fall back to PWA and tell me).
2. Scaffold the app and commit.
3. Work through `PLAN.md` from step 3.
