export type TrainingLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;

export type CoachTraineeProfile = {
    id: string;
    traineeId: string;
    trainerId: string;
    coachAssessedLevel: TrainingLevel;
    coachNotes: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type GetTraineeCoachProfileResponse = {
    profile: CoachTraineeProfile | null;
};

export type UpsertTraineeCoachProfileBody = {
    coachAssessedLevel?: TrainingLevel;
    coachNotes?: string | null;
};

export type UpsertTraineeCoachProfileResponse = {
    profile: CoachTraineeProfile;
};