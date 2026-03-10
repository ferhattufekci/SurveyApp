export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'Admin' | 'User';
  isActive: boolean;
}

export interface AuthState {
  token: string | null;
  user: { email: string; fullName: string; role: string } | null;
}

export interface AnswerOption {
  id: number;
  text: string;
  orderIndex: number;
}

export interface AnswerTemplate {
  id: number;
  name: string;
  isActive: boolean;
  options: AnswerOption[];
}

export interface QuestionListItem {
  id: number;
  text: string;
  isActive: boolean;
  answerTemplateId: number;
  answerTemplateName: string;
}

export interface Question {
  id: number;
  text: string;
  isActive: boolean;
  answerTemplate: AnswerTemplate;
}

export interface SurveyListItem {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  assignedUserCount: number;
  responseCount: number;
}

export interface SurveyQuestion {
  id: number;
  questionId: number;
  questionText: string;
  orderIndex: number;
  answerTemplate: AnswerTemplate;
}

export interface SurveyDetail {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  questions: SurveyQuestion[];
  assignedUserIds: number[];
}

export interface UserSurvey {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
}

export interface AnswerDetail {
  questionId: number;
  questionText: string;
  answerText: string;
}

export interface UserResponse {
  userId: number;
  userName: string;
  userEmail: string;
  submittedAt: string;
  answers: AnswerDetail[];
}

export interface SurveyReport {
  surveyId: number;
  title: string;
  totalAssigned: number;
  totalCompleted: number;
  totalPending: number;
  completedResponses: UserResponse[];
  pendingUsers: User[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export interface CreateAnswerTemplateRequest {
  name: string;
  options: string[];
}

export interface CreateQuestionRequest {
  text: string;
  answerTemplateId: number;
}

export interface CreateSurveyRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  questionIds: number[];
  userIds: number[];
}

export interface SubmitAnswer {
  questionId: number;
  answerOptionId: number;
}

export interface SubmitSurveyRequest {
  surveyId: number;
  answers: SubmitAnswer[];
}
