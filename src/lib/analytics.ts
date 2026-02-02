import { db, type WorkoutSession, type WorkoutSet } from "./db";

export interface SessionSummary {
  session: WorkoutSession;
  totalVolume: number;
  totalSets: number;
  durationMinutes: number;
}

export async function getSessionSummaries(): Promise<SessionSummary[]> {
  const sessions = await db.workoutSessions
    .filter((s) => !!s.completedAt)
    .reverse()
    .toArray();

  const allSets = await db.workoutSets.toArray();
  const setsBySession = new Map<number, WorkoutSet[]>();
  for (const set of allSets) {
    const list = setsBySession.get(set.sessionId) ?? [];
    list.push(set);
    setsBySession.set(set.sessionId, list);
  }

  return sessions.map((session) => {
    const sets = setsBySession.get(session.id!) ?? [];
    const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const durationMinutes =
      session.completedAt && session.startedAt
        ? Math.round(
            (new Date(session.completedAt).getTime() -
              new Date(session.startedAt).getTime()) /
              60000
          )
        : 0;

    return {
      session,
      totalVolume,
      totalSets: sets.length,
      durationMinutes,
    };
  });
}

export type TimeRange = "7d" | "30d" | "90d" | "180d" | "1y" | "all";

export function filterByTimeRange(
  summaries: SessionSummary[],
  range: TimeRange
): SessionSummary[] {
  if (range === "all") return summaries;

  const now = Date.now();
  const days: Record<Exclude<TimeRange, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "180d": 180,
    "1y": 365,
  };
  const cutoff = now - days[range] * 24 * 60 * 60 * 1000;

  return summaries.filter(
    (s) => new Date(s.session.startedAt).getTime() >= cutoff
  );
}

export function computeAverageVolume(summaries: SessionSummary[]): number {
  if (summaries.length === 0) return 0;
  const total = summaries.reduce((sum, s) => sum + s.totalVolume, 0);
  return Math.round(total / summaries.length);
}

export interface TrendPoint {
  date: string;
  volume: number;
  label: string;
}

export function buildTrendData(summaries: SessionSummary[]): TrendPoint[] {
  // Oldest first for chart
  return [...summaries].reverse().map((s) => {
    const d = new Date(s.session.startedAt);
    return {
      date: d.toISOString().slice(0, 10),
      volume: Math.round(s.totalVolume),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
}

export interface ExerciseStrengthPoint {
  date: string;
  label: string;
  maxWeight: number;
  bestSetVolume: number; // weight * reps for best set
}

export async function getExerciseStrengthCurve(
  exerciseId: number,
  range: TimeRange = "all"
): Promise<ExerciseStrengthPoint[]> {
  const sessions = await db.workoutSessions
    .filter((s) => !!s.completedAt)
    .toArray();

  const sets = await db.workoutSets
    .where("exerciseId")
    .equals(exerciseId)
    .toArray();

  // Group sets by session
  const sessionMap = new Map(sessions.map((s) => [s.id!, s]));
  const setsBySession = new Map<number, typeof sets>();
  for (const set of sets) {
    const list = setsBySession.get(set.sessionId) ?? [];
    list.push(set);
    setsBySession.set(set.sessionId, list);
  }

  // Build data points per session
  const points: ExerciseStrengthPoint[] = [];
  for (const [sessionId, sessionSets] of setsBySession) {
    const session = sessionMap.get(sessionId);
    if (!session) continue;

    const maxWeight = Math.max(...sessionSets.map((s) => s.weight));
    const bestSetVolume = Math.max(
      ...sessionSets.map((s) => s.weight * s.reps)
    );
    const d = new Date(session.startedAt);

    points.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      maxWeight,
      bestSetVolume,
    });
  }

  // Sort chronologically and apply time range filter
  points.sort((a, b) => a.date.localeCompare(b.date));

  if (range !== "all") {
    const now = Date.now();
    const days: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "1y": 365,
    };
    const cutoff = now - (days[range] ?? 365) * 24 * 60 * 60 * 1000;
    return points.filter((p) => new Date(p.date).getTime() >= cutoff);
  }

  return points;
}

export interface PlateauAlert {
  exerciseId: number;
  exerciseName: string;
  stalledSessions: number;
  lastWeight: number;
  lastReps: number;
}

export interface MoodEnergyInsight {
  mood: number;
  energy: number;
  avgVolume: number;
  sessionCount: number;
}

export async function getMoodEnergyInsights(): Promise<MoodEnergyInsight[]> {
  const sessions = await db.workoutSessions
    .filter(
      (s) =>
        !!s.completedAt && s.mood !== undefined && s.energy !== undefined
    )
    .toArray();

  if (sessions.length === 0) return [];

  const allSets = await db.workoutSets.toArray();
  const setsBySession = new Map<number, typeof allSets>();
  for (const set of allSets) {
    const list = setsBySession.get(set.sessionId) ?? [];
    list.push(set);
    setsBySession.set(set.sessionId, list);
  }

  // Group by mood+energy combination
  const groups = new Map<
    string,
    { totalVolume: number; count: number; mood: number; energy: number }
  >();

  for (const session of sessions) {
    const key = `${session.mood}-${session.energy}`;
    const sets = setsBySession.get(session.id!) ?? [];
    const volume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

    if (!groups.has(key)) {
      groups.set(key, {
        totalVolume: 0,
        count: 0,
        mood: session.mood!,
        energy: session.energy!,
      });
    }
    const g = groups.get(key)!;
    g.totalVolume += volume;
    g.count++;
  }

  return Array.from(groups.values()).map((g) => ({
    mood: g.mood,
    energy: g.energy,
    avgVolume: Math.round(g.totalVolume / g.count),
    sessionCount: g.count,
  }));
}

// ── Streak tracking (B3) ──

export interface StreakData {
  currentStreak: number; // consecutive weeks with ≥1 workout
  longestStreak: number;
  workoutDates: string[]; // ISO date strings of all completed workouts
}

export async function getStreakData(): Promise<StreakData> {
  const sessions = await db.workoutSessions
    .filter((s) => !!s.completedAt)
    .toArray();

  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, workoutDates: [] };
  }

  // Collect unique workout dates
  const workoutDates = [
    ...new Set(
      sessions.map((s) =>
        new Date(s.startedAt).toISOString().slice(0, 10)
      )
    ),
  ].sort();

  // Calculate week-based streaks
  // A "week" is Mon-Sun. Streak counts consecutive weeks with ≥1 workout.
  const weekSet = new Set<string>();
  for (const dateStr of workoutDates) {
    const d = new Date(dateStr);
    // Get ISO week start (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    weekSet.add(monday.toISOString().slice(0, 10));
  }

  const sortedWeeks = [...weekSet].sort();
  if (sortedWeeks.length === 0) {
    return { currentStreak: 0, longestStreak: 0, workoutDates };
  }

  let currentStreak = 1;
  let longestStreak = 1;
  let streak = 1;

  for (let i = 1; i < sortedWeeks.length; i++) {
    const prevDate = new Date(sortedWeeks[i - 1]);
    const currDate = new Date(sortedWeeks[i]);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 7) {
      streak++;
    } else {
      streak = 1;
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  // Check if current week is in the set for currentStreak
  const now = new Date();
  const today = now.getDay();
  const mondayDiff = now.getDate() - today + (today === 0 ? -6 : 1);
  const thisMonday = new Date(now);
  thisMonday.setDate(mondayDiff);
  const thisMondayStr = thisMonday.toISOString().slice(0, 10);

  // Also check last week (streak is still active if last workout was last week)
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastMondayStr = lastMonday.toISOString().slice(0, 10);

  if (weekSet.has(thisMondayStr) || weekSet.has(lastMondayStr)) {
    // Count backwards from the most recent active week
    const startWeek = weekSet.has(thisMondayStr) ? thisMondayStr : lastMondayStr;
    currentStreak = 1;
    let checkDate = new Date(startWeek);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 7);
      const key = checkDate.toISOString().slice(0, 10);
      if (weekSet.has(key)) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  return { currentStreak, longestStreak, workoutDates };
}

export async function detectPlateaus(
  minStalledSessions = 3
): Promise<PlateauAlert[]> {
  const exercises = await db.exercises.toArray();
  const sessions = await db.workoutSessions
    .filter((s) => !!s.completedAt)
    .reverse()
    .toArray();
  const allSets = await db.workoutSets.toArray();

  // Group sets by exercise -> session (ordered by date)
  const setsByExercise = new Map<number, Map<number, typeof allSets>>();
  for (const set of allSets) {
    if (!setsByExercise.has(set.exerciseId)) {
      setsByExercise.set(set.exerciseId, new Map());
    }
    const sessionSets = setsByExercise.get(set.exerciseId)!;
    if (!sessionSets.has(set.sessionId)) {
      sessionSets.set(set.sessionId, []);
    }
    sessionSets.get(set.sessionId)!.push(set);
  }

  const sessionDateMap = new Map(sessions.map((s) => [s.id!, s.startedAt]));
  const exerciseMap = new Map(exercises.map((e) => [e.id!, e]));
  const alerts: PlateauAlert[] = [];

  for (const [exerciseId, sessionSetsMap] of setsByExercise) {
    // Get session IDs ordered by date (most recent first)
    const orderedSessionIds = [...sessionSetsMap.keys()]
      .filter((id) => sessionDateMap.has(id))
      .sort((a, b) => {
        const da = new Date(sessionDateMap.get(a)!).getTime();
        const dateB = new Date(sessionDateMap.get(b)!).getTime();
        return dateB - da; // most recent first
      });

    if (orderedSessionIds.length < minStalledSessions) continue;

    // Check if max weight hasn't increased across recent sessions
    let stalledCount = 0;
    let referenceMax = 0;
    let referenceReps = 0;

    for (
      let i = 0;
      i < orderedSessionIds.length && i < minStalledSessions + 1;
      i++
    ) {
      const sets = sessionSetsMap.get(orderedSessionIds[i])!;
      const maxWeight = Math.max(...sets.map((s) => s.weight));
      const maxReps = Math.max(
        ...sets.filter((s) => s.weight === maxWeight).map((s) => s.reps)
      );

      if (i === 0) {
        referenceMax = maxWeight;
        referenceReps = maxReps;
        stalledCount = 1;
      } else if (maxWeight >= referenceMax) {
        // Not progressing if weight is same or less
        if (maxWeight === referenceMax && maxReps <= referenceReps) {
          stalledCount++;
        } else {
          break; // progressed in weight or reps
        }
      } else {
        stalledCount++;
      }
    }

    if (stalledCount >= minStalledSessions) {
      const exercise = exerciseMap.get(exerciseId);
      if (exercise) {
        alerts.push({
          exerciseId,
          exerciseName: exercise.name,
          stalledSessions: stalledCount,
          lastWeight: referenceMax,
          lastReps: referenceReps,
        });
      }
    }
  }

  return alerts;
}
