export interface FitnessExercise {
  name: string;
  sets?: number;
  reps?: string;     // "8-12" | "30 seconds" | "To failure"
  rest_seconds?: number;
  description: string;
  muscles_targeted: string[];
}

export interface FitnessDay {
  day: string;           // "Monday" … "Sunday"
  session_type: string;  // "Strength" | "HIIT" | "Rest" | "Cardio Intervals" …
  duration_minutes: number;
  exercises: FitnessExercise[];
}

export interface FitnessWeek {
  week: number;
  days: FitnessDay[];
}

export interface FitnessWorkoutPlan {
  title: string;
  summary: string;
  duration_weeks: number;
  days_per_week: number;
  weekly_schedule: FitnessWeek[];
}

export interface FitnessOnboardingSelections {
  goal: string;
  level: string;
  equipment: string[];
  days_per_week: number;
  workout_duration: number;
  focus_areas: string[];
  medical_conditions: string[];
  age: number;
  weight: number;
  height: number;
  gender: string;
}
