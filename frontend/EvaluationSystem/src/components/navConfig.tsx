
//this is nachaine page is not included iin anyhting

export interface NavItems {
  id: string;
  label: string;
  icon: string;
}

export const navItems: NavItems[] = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "subjects", label: "Subjects", icon: "subject" },
  { id: "questions", label: "Question Bank", icon: "question" },
  { id: "interviews", label: "Interviews", icon: "interview" },
  { id: "candidates", label: "Candidates", icon: "candidate" },
  { id: "evaluation", label: "Evaluation", icon: "evaluate" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "users", label: "Users", icon: "users" },
];

