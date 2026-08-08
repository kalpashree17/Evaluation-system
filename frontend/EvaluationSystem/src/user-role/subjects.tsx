import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/icon";
import { icons } from "../components/icons";

interface Subject {
  id: number;
  name: string;
  shortDescription: string;
  totalTopics: number;
  totalQuestions: number;
  progress: number;
  tags: string[];
  duration: string;
  difficulty: string;
}

const subjects: Subject[] = [
  { 
    id: 1, 
    name: "React", 
    shortDescription: "Modern UI development with React hooks, context, and state management",
    totalTopics: 15,
    totalQuestions: 85,
    progress: 68,
    tags: ["frontend", "javascript", "hooks"],
    duration: "60 min",
    difficulty: "Mixed"
  },
  { 
    id: 2, 
    name: "Node.js", 
    shortDescription: "Server-side JavaScript with Express, APIs, and database integration",
    totalTopics: 12,
    totalQuestions: 64,
    progress: 45,
    tags: ["backend", "javascript", "api"],
    duration: "60 min",
    difficulty: "Mixed"
  },
  { 
    id: 3, 
    name: "DSA", 
    shortDescription: "Data structures, algorithms, and problem-solving techniques",
    totalTopics: 20,
    totalQuestions: 120,
    progress: 72,
    tags: ["algorithms", "data-structures", "logic"],
    duration: "90 min",
    difficulty: "Mixed"
  },
  { 
    id: 4, 
    name: "DBMS", 
    shortDescription: "Database management, SQL, normalization, and query optimization",
    totalTopics: 10,
    totalQuestions: 48,
    progress: 33,
    tags: ["database", "sql", "design"],
    duration: "45 min",
    difficulty: "Mixed"
  },
  { 
    id: 5, 
    name: "Python", 
    shortDescription: "Python programming for web, data science, and automation",
    totalTopics: 14,
    totalQuestions: 72,
    progress: 90,
    tags: ["scripting", "ml", "automation"],
    duration: "60 min",
    difficulty: "Mixed"
  },
  { 
    id: 6, 
    name: "Java", 
    shortDescription: "Object-oriented programming with Java, Spring Boot, and microservices",
    totalTopics: 18,
    totalQuestions: 90,
    progress: 55,
    tags: ["oop", "enterprise", "spring"],
    duration: "75 min",
    difficulty: "Mixed"
  },
];

export default function SubjectsCard() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const colors = [
    "from-violet-500 to-indigo-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-pink-500 to-rose-500",
    "from-red-500 to-orange-500",
  ];

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleContinueLearning = (e: React.MouseEvent, subjectId: number) => {
    e.stopPropagation();
    navigate(`/subject/${subjectId}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold">Subject Management</h1>
          <p className="text-slate-400 mt-1">Manage interview subjects and their configurations</p>
        </div>
        {/* <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">
          <Icon d={icons.plus} size={16} />New Subject
        </button> */}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search subjects by name, description, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[#141928] border border-[#1e2943] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          Showing {filteredSubjects.length} of {subjects.length} subjects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSubjects.map((s, i) => {
          const isSelected = selected === s.id;
          const gradientColor = colors[i % colors.length];
          
          return (
            <div 
              key={s.id} 
              onClick={() => setSelected(isSelected ? null : s.id)}
              className={`bg-[#141928] border rounded-2xl p-5 cursor-pointer transition-all hover:border-violet-500/50 ${
                isSelected ? "border-violet-500" : "border-[#1e2943]"
              }`}
            >
              {/* Subject Header with Icon and Name side by side */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${gradientColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon d={icons.subject} size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{s.name}</h3>
                    <p className="text-slate-400 text-xs line-clamp-1">{s.shortDescription}</p>
                  </div>
                </div>
                <span className="text-slate-400 text-xs bg-[#0f1623] px-2 py-1 rounded-lg flex-shrink-0">{s.duration}</span>
              </div>

              {/* Stats: Topics and Questions */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-[#0f1623] rounded-xl p-2.5 text-center">
                  <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Topics</p>
                  <p className="text-white text-base font-bold">{s.totalTopics}</p>
                </div>
                <div className="bg-[#0f1623] rounded-xl p-2.5 text-center">
                  <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Questions</p>
                  <p className="text-white text-base font-bold">{s.totalQuestions}</p>
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-medium">Progress</span>
                  <span className="text-white text-xs font-bold">{s.progress}%</span>
                </div>
                <div className="w-full bg-[#0f1623] rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${gradientColor} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${s.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {s.tags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                    {t}
                  </span>
                ))}
              </div>

              {/* Continue Learning Button */}
              <button 
                className="mt-3 w-full py-2 px-4 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                onClick={(e) => handleContinueLearning(e, s.id)}
              >
                <span>Continue Learning</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              {/* Selected Actions */}
              {/* {isSelected && (
                <div className="mt-3 pt-3 border-t border-[#1e2943] grid grid-cols-2 gap-2">
                  <button 
                    className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Edit subject:', s.id);
                    }}
                  >
                    Edit Subject
                  </button>
                  <button 
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/subject/${s.id}`);
                    }}
                  >
                    View Details
                  </button>
                  <button 
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Add questions:', s.id);
                    }}
                  >
                    Add Questions
                  </button>
                  <button 
                    className="text-xs text-red-400 hover:text-red-300 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Delete subject:', s.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )} */}
            </div>
          );
        })}

        {/* No results message */}
        {filteredSubjects.length === 0 && (
          <div className="col-span-1 md:col-span-2 bg-[#141928] border border-[#1e2943] rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-bold mb-2">No subjects found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your search terms or clear the search filter</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}