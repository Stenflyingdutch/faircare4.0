import { Timestamp } from 'firebase/firestore';

export type FirestoreDate = Timestamp;

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

export interface QuizAnswer {
  familyId: string;
  userId: string;
  category: string;
  questionId: string;
  doesIt: string;
  thinksAboutIt: string;
  satisfaction: 'unhappy' | 'neutral' | 'happy';
  updatedAt: FirestoreDate;
}

export interface ResultItem {
  resultId: string;
  familyId: string;
  userIds: string[];
  scoresPerUser: Record<string, {
    taskLoadScore: number;
    mentalLoadScore: number;
    satisfactionScore: number;
  }>;
  mismatchQuestions: Array<{
    questionId: string;
    category: string;
    prompt: string;
    mismatchScore: number;
    dissatisfactionScore: number;
    conflictScore: number;
  }>;
  conflictQuestions: Array<{
    questionId: string;
    category: string;
    prompt: string;
    mismatchScore: number;
    dissatisfactionScore: number;
    conflictScore: number;
  }>;
  topConflictCategories: Array<{
    category: string;
    score: number;
  }>;
  createdAt: FirestoreDate;
}

export interface TaskCard {
  taskCardId: string;
  familyId: string;
  category: string;
  title: string;
  description: string;
  thinkingTasks: string[];
  doingTasks: string[];
  relevanceStatus: 'active' | 'discarded';
  ownershipStatus: 'unassigned' | 'assigned' | 'discarded';
  assignedTo: string | null;
  suggestedOwner: string | null;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface TaskAssignment {
  assignmentId: string;
  familyId: string;
  taskCardId: string;
  assignedToUserId: string;
  dueDate: string;
  createdAt: FirestoreDate;
}

export interface TodoItem {
  todoId: string;
  familyId: string;
  title: string;
  done: boolean;
  createdAt: FirestoreDate;
}

export interface MentalLoadItem {
  mentalLoadItemId: string;
  familyId: string;
  title: string;
  ownerUserId: string;
  createdAt: FirestoreDate;
}

export interface Checkin {
  checkinId: string;
  familyId: string;
  userId: string;
  mood: string;
  note: string;
  createdAt: FirestoreDate;
}
