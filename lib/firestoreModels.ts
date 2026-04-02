import { Timestamp } from 'firebase/firestore';

export type FirestoreDate = Timestamp;

export interface AnonymousQuizSession {
  sessionId: string;
  childrenCount: number;
  childrenAgeGroups: string[];
  pairOrHouseholdContext: string;
  inviteToken: string | null;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface QuizAnswer {
  answerId: string;
  anonymousQuizSession: string;
  userId: string | null;
  questionId: string;
  category: string;
  answer: 'ich' | 'fifty' | 'partner';
  stressLevel: number | null;
  updatedAt: FirestoreDate;
}

export interface PairOrHouseholdContext {
  householdId: string;
  initiatorUser: string | null;
  partnerUser: string | null;
  inviteToken: string;
  inviteStatus: 'pending' | 'accepted' | 'completed';
  childrenCount: number;
  childrenAgeGroups: string[];
  createdAt: FirestoreDate;
}

export interface IndividualResult {
  resultId: string;
  userId: string;
  pairOrHouseholdContext: string;
  mentalLoadShare: number;
  summaryBullets: string[];
  createdAt: FirestoreDate;
}

export interface SharedResult {
  resultId: string;
  pairOrHouseholdContext: string;
  initiatorShare: number;
  partnerShare: number;
  differingPerceptionAreas: string[];
  missingOwnershipAreas: string[];
  createdAt: FirestoreDate;
}

export interface Goal {
  goalId: string;
  pairOrHouseholdContext: string;
  label: string;
  goalStatus: 'active' | 'reached' | 'partial' | 'not_reached';
  createdAt: FirestoreDate;
}

export interface TaskItem {
  taskId: string;
  pairOrHouseholdContext: string;
  title: string;
  taskOwner: string | null;
  createdAt: FirestoreDate;
}

export interface WeeklyReview {
  weeklyReviewId: string;
  pairOrHouseholdContext: string;
  startedAt: FirestoreDate;
  completedAt: FirestoreDate | null;
  notificationState: 'scheduled' | 'shown' | 'dismissed';
}

export interface WeeklyReviewAnswer {
  answerId: string;
  weeklyReviewId: string;
  section: 'good' | 'difficult' | 'changes';
  values: string[];
  createdAt: FirestoreDate;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  familyId: string | null;
  createdAt: FirestoreDate;
}

export interface Family {
  familyId: string;
  name: string;
  inviteCode: string;
  memberIds: string[];
  createdAt: FirestoreDate;
}

export interface ChildProfile {
  childId: string;
  familyId: string;
  name: string;
  birthDate: string;
  createdAt: FirestoreDate;
}
