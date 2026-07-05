// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Question Session Types
export interface QuestionSession {
  id: string;
  userId: string;
  subjectId: string;
//   questions: Question[];
  answers: UserAnswer[];
  score: number;
  status: 'pending' | 'completed';
  startedAt: string;
  completedAt?: string;
}

export interface UserAnswer {
  questionId: number;
  answer: string | string[];
  isCorrect?: boolean;
  marks: number;
  timeTaken: number; // in seconds
}

// export interface SubjectWithQuestions extends Subject {
// //   questions: Question[];
// }

// Login/Register Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'candidate' | 'interviewer';
}