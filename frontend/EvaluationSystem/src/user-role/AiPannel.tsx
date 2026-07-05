import { useEffect, useState, useRef } from "react";
import {
  Button,
  Select,
  message,
  Progress,
  Tag,
  Avatar,
  Badge,
  ConfigProvider,
  theme as antdTheme,
} from "antd";
import {
  RobotOutlined,
  UserOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  BarChartOutlined,
  BulbOutlined,
  SolutionOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

// ==================== INTERFACES ====================

interface Question {
  id: string;
  category: "technical" | "behavioral" | "problem_solving" | "general";
  question: string;
  difficulty: "easy" | "medium" | "hard";
  expected_keywords: string[];
  time_limit_seconds?: number;
}

interface EvaluationCriteria {
  category: string;
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
}

interface InterviewResponse {
  questionId: string;
  answer: string;
  timeSpent: number;
}

interface EvaluationResult {
  overallScore: number;
  maxScore: number;
  criteria: EvaluationCriteria[];
  summary: string;
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}

interface Message {
  id: string;
  type: "interviewer" | "candidate" | "system";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
  question?: Question;
  evaluation?: EvaluationResult;
  isTyping?: boolean;
}

interface InterviewSession {
  id: string;
  candidateName: string;
  jobRole: string;
  experienceLevel: "entry" | "mid" | "senior" | "lead";
  questions: Question[];
  currentQuestionIndex: number;
  startTime: Date;
  status: any; 
  responses: InterviewResponse[];
}

// ==================== MOCK QUESTION BANK ====================

const QUESTION_TEMPLATES: Record<
  Question["category"],
  { text: (role: string) => string; keywords: string[]; difficulty: Question["difficulty"] }[]
> = {
  technical: [
    {
      text: (role) => `Walk me through how you would design a scalable architecture for a ${role} project handling high traffic.`,
      keywords: ["scalability", "load balancing", "caching", "database", "architecture"],
      difficulty: "hard",
    },
    {
      text: (role) => `What tools and practices do you rely on daily as a ${role}, and why?`,
      keywords: ["tools", "workflow", "testing", "version control", "best practices"],
      difficulty: "easy",
    },
    {
      text: () => `Explain a time you had to optimize slow-performing code. What was your process?`,
      keywords: ["performance", "profiling", "optimization", "bottleneck", "benchmark"],
      difficulty: "medium",
    },
  ],
  behavioral: [
    {
      text: () => `Tell me about a time you disagreed with a teammate's approach. How did you handle it?`,
      keywords: ["communication", "conflict", "compromise", "team", "respect"],
      difficulty: "medium",
    },
    {
      text: () => `Describe a project that failed or fell short. What did you learn?`,
      keywords: ["failure", "lesson", "accountability", "improvement", "reflection"],
      difficulty: "medium",
    },
  ],
  problem_solving: [
    {
      text: (role) => `You inherit a legacy system as a ${role} with no documentation. How do you approach understanding and improving it?`,
      keywords: ["documentation", "investigation", "refactor", "risk", "plan"],
      difficulty: "hard",
    },
    {
      text: () => `How would you prioritize tasks when everything is marked urgent?`,
      keywords: ["prioritization", "impact", "deadline", "stakeholders", "tradeoff"],
      difficulty: "easy",
    },
  ],
  general: [
    {
      text: (role) => `Why are you interested in this ${role} role, and what draws you to it?`,
      keywords: ["motivation", "interest", "growth", "goals", "fit"],
      difficulty: "easy",
    },
    {
      text: () => `Where do you see yourself professionally in the next few years?`,
      keywords: ["growth", "career", "goals", "learning", "development"],
      difficulty: "easy",
    },
  ],
};

const TIME_LIMITS: Record<Question["difficulty"], number> = {
  easy: 30,
  medium: 45,
  hard: 60,
};

const generateSession = (
  candidateName: string,
  jobRole: string,
  experienceLevel: InterviewSession["experienceLevel"]
): InterviewSession => {
  const plan: Question["category"][] = ["general", "technical", "technical", "problem_solving", "behavioral"];

  const questions: Question[] = plan.map((category, idx) => {
    const options = QUESTION_TEMPLATES[category];
    const template = options[idx % options.length];
    let difficulty = template.difficulty;

    if (experienceLevel === "entry" && difficulty === "hard") difficulty = "medium";
    if ((experienceLevel === "senior" || experienceLevel === "lead") && difficulty === "easy" && category !== "general") {
      difficulty = "medium";
    }

    return {
      id: `q-${idx}-${Date.now()}`,
      category,
      question: template.text(jobRole || "this"),
      difficulty,
      expected_keywords: template.keywords,
      time_limit_seconds: TIME_LIMITS[difficulty],
    };
  });

  return {
    id: `session-${Date.now()}`,
    candidateName,
    jobRole,
    experienceLevel,
    questions,
    currentQuestionIndex: 0,
    startTime: new Date(),
    status: "in_progress",
    responses: [],
  };
};

// ==================== SETUP SCREEN ====================

const SetupScreen = ({
  onStart,
}: {
  onStart: (name: string, role: string, level: InterviewSession["experienceLevel"]) => void;
}) => {
  const [candidateName, setCandidateName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<InterviewSession["experienceLevel"]>("mid");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const handleStart = () => {
    if (!candidateName.trim() || !jobRole.trim()) {
      message.warning("Please fill in your name and job role");
      return;
    }
    onStart(candidateName.trim(), jobRole.trim(), experienceLevel);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-purple-600/30 blur-lg animate-pulse" />
            <div className="relative w-11 h-11 rounded-full border border-purple-500/50 bg-black flex items-center justify-center">
              <RobotOutlined className="text-purple-400 text-lg" />
            </div>
          </div>
          <div>
            <div className="text-purple-300 font-semibold tracking-tight text-lg leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              AI Interview
            </div>
            <div className="text-purple-700 text-xs mt-1">Begin your interview session</div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-purple-500 mb-1.5">
              Your name
            </label>
            <input
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
              placeholder="Jordan Lee"
              className="w-full bg-transparent border-0 border-b border-purple-900 text-purple-200 px-0 py-2 text-base outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-purple-500 mb-1.5">
              Role you're interviewing for
            </label>
            <input
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
              placeholder="Full Stack Developer"
              className="w-full bg-transparent border-0 border-b border-purple-900 text-purple-200 px-0 py-2 text-base outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-purple-500 mb-1.5">
              Experience level
            </label>
            <Select
              value={experienceLevel}
              onChange={(value) => setExperienceLevel(value)}
              size="large"
              variant="borderless"
              className="w-full custom-dark-select"
              options={[
                { label: "Entry level", value: "entry" },
                { label: "Mid level", value: "mid" },
                { label: "Senior level", value: "senior" },
                { label: "Lead / Manager", value: "lead" },
              ]}
            />
          </div>

          <Button
            type="primary"
            size="large"
            block
            onClick={handleStart}
            icon={<ArrowRightOutlined />}
            iconPosition="end"
            className="bg-purple-700! hover:bg-purple-600! border-0! rounded-lg! h-11! font-medium! mt-2!"
          >
            Begin interview
          </Button>
        </div>
      </div>
    </div>
  );
};

// ==================== WAV ENCODER ====================

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = samples.length * bytesPerSample;
  const bufferLength = 44 + dataLength;

  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

// ==================== HELPERS ====================

let msgCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++msgCounter}-${Date.now()}`;

function stopMediaTracks(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}

function closeAudioContext(ctx: AudioContext | null) {
  if (!ctx) return;
  ctx.close().catch(() => {});
}

// ==================== MAIN COMPONENT ====================

export const AIInterviewEvaluation = () => {
  // ===== STATE =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // ===== COUNTDOWN STATE =====
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);

  // ===== AUDIO RECORDING STATE =====
  const [isRecording, setIsRecording] = useState(false);
  const [audioResponses, setAudioResponses] = useState<Record<string, Blob>>({});
  const [recordingDuration, setRecordingDuration] = useState(0);
  // ===== INTERVIEW PHASE =====
  const [phase, setPhase] = useState<"countdown" | "question" | "recording" | "idle">("idle");

  // ===== REFS =====
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const perQuestionEvalsRef = useRef<Record<string, EvaluationResult>>({});
  const responsesRef = useRef<InterviewResponse[]>([]);
  const questionStartRef = useRef<number>(0);

  // Audio recording refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawPcmRef = useRef<Float32Array[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleRateRef = useRef<number>(48000);

  // ===== SCROLL TO BOTTOM =====
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ===== STOP RECORDING TRACKS =====
  const stopRecordingTracks = () => {
    stopMediaTracks(streamRef.current);
    streamRef.current = null;
    closeAudioContext(audioContextRef.current);
    audioContextRef.current = null;
  };

  useEffect(() => {
    const timer = timerRef.current;
    return () => {
      if (timer) clearInterval(timer);
      stopRecordingTracks();
    };
  }, []);

  // ===== START RECORDING =====
  const startRecording = async () => {
    if (!session) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      sampleRateRef.current = audioCtx.sampleRate;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      rawPcmRef.current = [];

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        rawPcmRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      const currentQ = session.questions[currentQuestionIndex];
      const timeLimit = currentQ.time_limit_seconds || 30;

      setIsRecording(true);
      setPhase("recording");
      setTimeRemaining(timeLimit);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          setTimeRemaining(timeLimit - next);
          if (next >= timeLimit) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

    } catch (error) {
      console.error("Failed to start recording:", error);
      message.error("Microphone access denied or unavailable.");
      setPhase("question");
    }
  };

  // ===== STOP RECORDING =====
  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);

    // Collect raw PCM data
    const rawChunks = rawPcmRef.current;
    rawPcmRef.current = [];

    // Calculate total length
    let totalLength = 0;
    for (const chunk of rawChunks) {
      totalLength += chunk.length;
    }

    if (totalLength === 0) {
      stopRecordingTracks();
      setPhase("idle");
      moveToNextQuestion();
      return;
    }

    // Combine all chunks
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of rawChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Encode as WAV
    const sampleRate = sampleRateRef.current;
    const wavBuffer = encodeWav(combined, sampleRate);
    const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

    stopRecordingTracks();

    // Store in state
    const currentQ = session!.questions[currentQuestionIndex];
    setAudioResponses((prev) => ({ ...prev, [currentQ.id]: wavBlob }));

    // Record response time
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000); // eslint-disable-line react-hooks/purity
    responsesRef.current.push({ questionId: currentQ.id, answer: "", timeSpent });

    setPhase("idle");

    // Move to next question
    setTimeout(() => moveToNextQuestion(), 800);
  };

  // ===== COUNTDOWN =====
  const startCountdown = () => {
    setShowCountdown(true);
    setCountdownValue(3);
    setPhase("countdown");

    const interval = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowCountdown(false);
          setPhase("idle");
          showFirstQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ===== SHOW FIRST QUESTION =====
  const showFirstQuestion = () => {
    if (!session) return;

    const firstQ = session.questions[0];
    const questionMessage: Message = {
      id: nextId("q"),
      type: "interviewer",
      content: `**Question 1/${session.questions.length}** (${firstQ.category.replace("_", " ")})\n\n${firstQ.question}\n\n_${firstQ.difficulty} difficulty_ — _You have ${firstQ.time_limit_seconds} seconds to respond_`,
      timestamp: new Date(),
      question: firstQ,
    };

    setMessages((prev) => [...prev, questionMessage]);
    questionStartRef.current = Date.now(); // eslint-disable-line react-hooks/purity
    setPhase("question");

    // Wait 2 seconds after displaying question, then start recording
    setTimeout(() => {
      startRecording();
    }, 2000);
  };

  // ===== INITIALIZE INTERVIEW =====
  const initializeInterview = (
    candidateName: string,
    jobRole: string,
    experienceLevel: InterviewSession["experienceLevel"]
  ) => {
    const sessionData = generateSession(candidateName, jobRole, experienceLevel);
    perQuestionEvalsRef.current = {};
    responsesRef.current = [];

    setSession(sessionData);
    setTotalQuestions(sessionData.questions.length);
    setCurrentQuestionIndex(0);
    setShowEvaluation(false);
    setEvaluationResult(null);
    setAudioResponses({});

    const welcomeMessage: Message = {
      id: nextId("welcome"),
      type: "system",
      content: `**Welcome, ${candidateName}**\n\nYou'll be asked ${sessionData.questions.length} questions. Each question will be displayed, then your microphone will automatically activate to record your response.\n\nGood luck!`,
      timestamp: new Date(),
    };

    setMessages([welcomeMessage]);

    // Start countdown after welcome message
    setTimeout(() => startCountdown(), 2000);
  };

  // ===== MOVE TO NEXT QUESTION =====
  const moveToNextQuestion = () => {
    if (!session) return;

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= session.questions.length) {
      completeInterview();
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    const nextQ = session.questions[nextIndex];

    const questionMessage: Message = {
      id: nextId("q"),
      type: "interviewer",
      content: `**Question ${nextIndex + 1}/${session.questions.length}** (${nextQ.category.replace("_", " ")})\n\n${nextQ.question}\n\n_${nextQ.difficulty} difficulty_ — _You have ${nextQ.time_limit_seconds} seconds to respond_`,
      timestamp: new Date(),
      question: nextQ,
    };

    setMessages((prev) => [...prev, questionMessage]);
    questionStartRef.current = Date.now(); // eslint-disable-line react-hooks/purity
    setPhase("question");

    // Wait 2 seconds after displaying question, then start recording
    setTimeout(() => {
      startRecording();
    }, 2000);
  };

  // ===== COMPLETE INTERVIEW =====
  const completeInterview = () => {
    if (!session) return;

    stopRecordingTracks();
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setSession((prev) => (prev ? { ...prev, status: "completed", responses: responsesRef.current } : prev));
    setPhase("idle");

    const completionMessage: Message = {
      id: nextId("complete"),
      type: "system",
      content: `**Interview complete**\n\nAll questions have been answered. Your audio responses have been recorded.\n\nTotal audio responses: ${Object.keys(audioResponses).length}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, completionMessage]);
  };

  // ===== FORMAT MESSAGE CONTENT =====
  const formatMessageContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("•")) {
        return (
          <div key={i} className="flex items-start gap-2 ml-2">
            <span className="text-purple-400">•</span>
            <span>{line.substring(1)}</span>
          </div>
        );
      }
      if (line.startsWith("_") && line.endsWith("_")) {
        return (
          <div key={i} className="text-indigo-500/70 text-sm italic ml-0.5">
            {line.replace(/_/g, "")}
          </div>
        );
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <div key={i} className="font-semibold mt-2 text-purple-200">
            {line.replace(/\*\*/g, "")}
          </div>
        );
      }
      if (line.startsWith("---")) {
        return <hr key={i} className="my-2 border-indigo-900/60" />;
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <div key={i} className="leading-relaxed">
          {line}
        </div>
      );
    });
  };

  // ===== GET DIFFICULTY COLOR =====
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "green";
      case "medium":
        return "gold";
      case "hard":
        return "magenta";
      default:
        return "purple";
    }
  };

  // ===== GET CATEGORY ICON =====
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "technical":
        return <ThunderboltOutlined />;
      case "behavioral":
        return <SolutionOutlined />;
      case "problem_solving":
        return <BulbOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  // ===== RENDER EVALUATION PANEL =====
  const renderEvaluationPanel = () => {
    if (!evaluationResult) return null;
    const pct = Math.round((evaluationResult.overallScore / evaluationResult.maxScore) * 100);

    return (
      <div className="mt-4 rounded-2xl border border-purple-900/60 bg-[#0a0510] p-5 shadow-[0_0_40px_-15px_rgba(168,85,247,0.35)]">
        <div className="flex items-center gap-3 mb-4">
          <BarChartOutlined className="text-xl text-purple-400" />
          <h2 className="text-base font-semibold text-purple-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Interview Evaluation
          </h2>
          <Badge count={`${evaluationResult.overallScore}/${evaluationResult.maxScore}`} color="#7c3aed" />
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-purple-400">
            <span>Overall score</span>
            <span className="font-semibold text-purple-200">{pct}%</span>
          </div>
          <Progress
            percent={pct}
            showInfo={false}
            strokeColor={{ "0%": "#7c3aed", "100%": "#d946ef" }}
            trailColor="#1a1025"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {evaluationResult.criteria.map((criterion, idx) => (
            <div key={idx} className="bg-black/60 border border-purple-900/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-purple-300 capitalize">{criterion.category}</span>
                <Tag color={criterion.score / criterion.maxScore > 0.7 ? "purple" : "magenta"}>
                  {criterion.score}/{criterion.maxScore}
                </Tag>
              </div>
              <p className="text-xs text-purple-500/80 mt-1">{criterion.feedback}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-purple-300 mb-2">
              <CheckCircleOutlined className="mr-1 text-purple-400" /> Strengths
            </h4>
            <ul className="text-sm text-purple-400/90 space-y-1">
              {evaluationResult.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fuchsia-300 mb-2">
              <CloseCircleOutlined className="mr-1 text-fuchsia-400" /> Areas to improve
            </h4>
            <ul className="text-sm text-purple-400/90 space-y-1">
              {evaluationResult.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-fuchsia-400">✗</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-purple-950/40 rounded-lg border border-purple-900/50">
          <p className="text-sm text-purple-300">{evaluationResult.summary}</p>
        </div>

        {evaluationResult.recommendations.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold text-purple-300 mb-1">
              <BulbOutlined className="mr-1" /> Recommendations
            </h4>
            <ul className="text-sm text-purple-400/90 space-y-1">
              {evaluationResult.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-500">→</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ===== RENDER RECORDING INDICATOR =====
  const renderRecordingIndicator = () => {
    if (!isRecording) return null;

    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-950/30 border border-red-800/40 rounded-xl">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-red-300 text-sm font-medium">Recording your answer...</span>
        <span className="text-red-400/70 text-xs ml-auto">
          {timeRemaining !== null && (
            <>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")} remaining</>
          )}
        </span>
      </div>
    );
  };

  // ===== MAIN RENDER =====
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: "#a855f7",
          colorBgBase: "#000000",
          colorBgContainer: "#000000",
          colorTextBase: "#d8b4fe",
          colorBorder: "#3b0764",
          borderRadius: 8,
        },
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .custom-dark-select .ant-select-selector {
          background-color: #000 !important;
          border: none !important;
          border-bottom: 1px solid #3b0764 !important;
          border-radius: 0 !important;
          color: #d8b4fe !important;
          padding-left: 0 !important;
        }
        .custom-dark-select .ant-select-arrow { color: #7e22ce; }

        @keyframes countdown-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .countdown-number {
          animation: countdown-pulse 1s ease-in-out;
        }
      `}</style>

      <div className="w-full h-full bg-[#0d1221] p-0!" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="w-full max-w-full h-full flex flex-col">
          {/* Header */}
          <div className="bg-black border-b border-purple-950 px-6 py-3 shrink-0">
            <div className="w-full mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-purple-600/25 blur-md" />
                  <div className="relative w-9 h-9 rounded-full border border-purple-700/60 bg-black flex items-center justify-center">
                    <RobotOutlined className="text-purple-400" />
                  </div>
                </div>
                <div>
                  <h1 className="text-base font-semibold text-purple-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    AI Interview Evaluator
                  </h1>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-purple-600">
                      {session ? `Question ${currentQuestionIndex + 1}/${totalQuestions}` : "Ready"}
                    </p>
                    {timeRemaining !== null && timeRemaining > 0 && !isRecording && (
                      <span className="flex items-center gap-1 text-xs text-fuchsia-400">
                        <ClockCircleOutlined />
                        {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")}
                      </span>
                    )}
                    {isRecording && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <span className="animate-pulse">●</span> Recording
                      </span>
                    )}
                    {session && (
                      <Tag color={session.status === "completed" ? "purple" : "geekblue"}>
                        {session.status === "completed" ? "Completed" : "In progress"}
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
              {session && session.status === "completed" && !showEvaluation && (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => setShowEvaluation(true)}
                  className="bg-purple-700! border-0!"
                >
                  View evaluation
                </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 relative">
            {!session ? (
              <SetupScreen onStart={initializeInterview} />
            ) : (
              <div className="w-full md:w-[70%] mx-auto space-y-5">
                {/* Countdown Overlay */}
                {showCountdown && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-purple-400 text-lg mb-4 font-light tracking-widest uppercase">
                      Your interview starts in
                    </div>
                    <div className="countdown-number text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-fuchsia-500">
                      {countdownValue}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {!showCountdown && (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.type === "candidate" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 border ${
                            msg.type === "candidate"
                              ? "bg-purple-800/40 border-purple-600/50 text-purple-100"
                              : msg.type === "system"
                              ? "bg-fuchsia-950/20 border-fuchsia-800/40"
                              : "bg-[#0a0510] border-purple-900/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {msg.type === "interviewer" && (
                              <Avatar icon={<RobotOutlined />} className="bg-purple-800! mt-0.5 shrink-0" size="small" />
                            )}
                            {msg.type === "candidate" && (
                              <Avatar icon={<UserOutlined />} className="bg-fuchsia-800! mt-0.5 shrink-0" size="small" />
                            )}
                            {msg.type === "system" && (
                              <div className="w-6 h-6 bg-fuchsia-900/40 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                                <RobotOutlined className="text-fuchsia-400 text-sm" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="whitespace-pre-wrap text-sm leading-relaxed text-purple-300">
                                {formatMessageContent(msg.content)}
                              </div>

                              {msg.question && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Tag color="purple" className="text-xs capitalize">
                                    {getCategoryIcon(msg.question.category)} {msg.question.category.replace("_", " ")}
                                  </Tag>
                                  <Tag color={getDifficultyColor(msg.question.difficulty)} className="text-xs">
                                    {msg.question.difficulty}
                                  </Tag>
                                  {msg.question.time_limit_seconds && (
                                    <Tag color="magenta" className="text-xs">
                                      <ClockCircleOutlined /> {msg.question.time_limit_seconds}s
                                    </Tag>
                                  )}
                                </div>
                              )}

                              {msg.timestamp && (
                                <div className="text-xs mt-1 text-purple-700">{dayjs(msg.timestamp).format("HH:mm")}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Recording indicator shown after question message */}
                    {isRecording && phase === "recording" && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] w-full">{renderRecordingIndicator()}</div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}

                {showEvaluation && renderEvaluationPanel()}
              </div>
            )}
          </div>

          {/* Audio indicator bar when recording */}
          {session && session.status !== "completed" && !showCountdown && (
            <div className="shrink-0 px-4 pb-6 pt-2">
              <div className="w-full md:w-[70%] mx-auto">
                {isRecording ? (
                  <div className="flex items-center justify-center gap-3 bg-[#0a0510] rounded-2xl border border-red-900/60 p-4">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
                    </span>
                    <span className="text-red-300 font-medium">Recording audio response...</span>
                    <div className="flex items-end gap-[3px] h-6 ml-2">
                      <span className="w-1 bg-red-400 rounded-full animate-bounce" style={{ height: "40%", animationDelay: "0ms" }} />
                      <span className="w-1 bg-red-400 rounded-full animate-bounce" style={{ height: "70%", animationDelay: "100ms" }} />
                      <span className="w-1 bg-red-400 rounded-full animate-bounce" style={{ height: "50%", animationDelay: "200ms" }} />
                      <span className="w-1 bg-red-400 rounded-full animate-bounce" style={{ height: "90%", animationDelay: "300ms" }} />
                      <span className="w-1 bg-red-400 rounded-full animate-bounce" style={{ height: "30%", animationDelay: "400ms" }} />
                    </div>
                    <span className="text-red-400/70 text-sm ml-auto">
                      {timeRemaining !== null && (
                        <>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")}</>
                      )}
                    </span>
                  </div>
                ) : phase === "question" ? (
                  <div className="flex items-center justify-center gap-2 bg-[#0a0510] rounded-2xl border border-purple-900/60 p-4">
                    <LoadingOutlined className="text-purple-400 text-lg" />
                    <span className="text-purple-400 text-sm">Preparing microphone...</span>
                  </div>
                ) : phase === "idle" && session.status !== "completed" ? (
                  <div className="flex items-center justify-center gap-2 bg-[#0a0510] rounded-2xl border border-purple-900/40 p-3">
                    <span className="text-purple-600 text-sm">Processing response...</span>
                  </div>
                ) : null}

                {/* Show audio responses summary when no recording */}
                {!isRecording && Object.keys(audioResponses).length > 0 && (
                  <div className="mt-2 flex justify-center gap-2">
                    <span className="text-xs text-purple-600">
                      {Object.keys(audioResponses).length} audio response(s) recorded
                    </span>
                    {Object.entries(audioResponses).map(([qId, blob]) => (
                      <Tag key={qId} color="purple" className="text-xs cursor-pointer"
                        onClick={() => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `response-${qId}.wav`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download Q{currentQuestionIndex + 1}.wav
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
};

export default AIInterviewEvaluation;
