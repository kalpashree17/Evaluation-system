import { useEffect, useState, useRef } from "react";
import {
  Button,
  Select,
  message,
  Progress,
  Tag,
  Avatar,
  Badge,
} from "antd";
import {
  RobotOutlined,
  UserOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  BarChartOutlined,
  BulbOutlined,
  SolutionOutlined,
  ArrowRightOutlined,
  AudioOutlined,
  AudioFilled,
  SoundOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../utils/axiosInstance";

// ==================== INTERFACES ====================

interface Question {
  id: string;
  category: "technical" | "behavioral" | "problem_solving" | "general";
  question: string;
  difficulty: "easy" | "medium" | "hard";
  expected_keywords: string[];
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

interface Skill {
  _id: string;
  name: string;
}

interface InterviewSession {
  id: string;
  candidateName: string;
  jobRole: string;
  experienceLevel: "entry" | "mid" | "senior" | "lead";
  skills: string[];
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



const generateSession = (
  candidateName: string,
  jobRole: string,
  experienceLevel: InterviewSession["experienceLevel"],
  skills: string[] = []
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
    };
  });

  return {
    id: `session-${Date.now()}`,
    candidateName,
    jobRole,
    experienceLevel,
    skills,
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
  onStart: (
    name: string,
    jobRole: string,
    level: InterviewSession["experienceLevel"],
    skills: string[]
  ) => void;
}) => {
  const [candidateName, setCandidateName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<InterviewSession["experienceLevel"]>("mid");
  const [skillOptions, setSkillOptions] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await api.get('/skills');
        setSkillOptions(response.data?.data || []);
      } catch {
        // Silently fail – skills field is optional
      }
    };
    fetchSkills();
  }, []);

const handleStart = () => {
  if (!candidateName.trim()) {
    message.warning("Please fill in your name");
    return;
  }
  onStart(candidateName.trim(), jobRole.trim(), experienceLevel, selectedSkills);
};

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative w-12 h-12 shrink-0">
              <span className="absolute inset-0 rounded-xl bg-violet-600/30 blur-lg animate-pulse" />
              <div className="relative w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <RobotOutlined className="text-white text-lg" />
              </div>
            </div>
            <div>
              <div className="text-white font-bold text-lg tracking-tight">
                AI Interview
              </div>
              <div className="text-slate-500 text-xs mt-0.5">Begin your interview session</div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5 font-medium">
                Your name
              </label>
              <input
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                // onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
                placeholder="Jordan Lee"
                className="w-full bg-[#0d1221] border border-[#1e2943] text-white placeholder-slate-600 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>

           

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5 font-medium">
                Skills interested in
              </label>
              <Select
                mode="multiple"
                value={selectedSkills}
                onChange={(value) => setSelectedSkills(value)}
                size="large"
              

                  className="w-full! bg-[#0d1221]! border! border-[#1e2943]! text-white! placeholder-slate-600! px-4! py-2.5! rounded-xl! text-sm! outline-none! focus:border-violet-500/50! transition-colors!"
              
                // popupClassName="bg-[#141928]! border! border-[#1e2943]! text-white!"
                options={skillOptions.map((s) => ({ label: s.name, value: s.name }))}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5 font-medium">
                Experience level
              </label>
              <Select
                value={experienceLevel}
                onChange={(value) => setExperienceLevel(value)}
                size="large"
              
                className="w-full! bg-[#0d1221]! border! border-[#1e2943]! text-white! placeholder-slate-600! px-4! py-2.5! rounded-xl! text-sm! outline-none! focus:border-violet-500/50! transition-colors!"
                options={[
                  { label: "Entry level", value: "entry" },
                  { label: "Mid level", value: "mid" },
                  { label: "Senior level", value: "senior" },
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
              className="!bg-linear-to-r !from-violet-600 !to-indigo-600 !border-0 !rounded-xl !h-11 !font-semibold !shadow-lg !shadow-violet-500/20 hover:!shadow-violet-500/40 !transition-all !mt-2"
            >
              Begin interview
            </Button>
          </div>
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

// ==================== PER-QUESTION REVIEW GENERATOR ====================

function generateReview(question: Question, timeSpent: number): EvaluationResult {
  const score = Math.min(10, Math.max(3, Math.round(timeSpent / 6)));

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (timeSpent >= 20) {
    strengths.push("Provided a detailed response");
  } else {
    weaknesses.push("Consider providing more detail");
  }

  if (timeSpent >= 15) {
    strengths.push("Good response length");
  } else {
    weaknesses.push("Response could be more comprehensive");
  }

  if (question.category === "technical" && timeSpent >= 25) {
    strengths.push("Demonstrated technical depth");
  }

  if (question.category === "behavioral" && timeSpent >= 20) {
    strengths.push("Showed strong communication skills");
  }

  if (timeSpent < 10) {
    weaknesses.push("Answer was too brief");
  }

  return {
    overallScore: score,
    maxScore: 10,
    criteria: [
      {
        category: "Completeness",
        score: Math.min(10, Math.max(1, Math.round(timeSpent / 5))),
        maxScore: 10,
        feedback: timeSpent >= 20 ? "Good coverage of the topic" : "Consider elaborating further",
        strengths: [],
        areasForImprovement: [],
      },
      {
        category: "Relevance",
        score: Math.min(10, Math.max(6, score)),
        maxScore: 10,
        feedback: "Response was on topic",
        strengths: [],
        areasForImprovement: [],
      },
    ],
    summary: `You spoke for ${timeSpent} seconds. ${timeSpent >= 20 ? "Good depth in your response." : "Try to elaborate more in future answers."}`,
    recommendations: timeSpent < 15 ? ["Try to provide more detailed answers with examples"] : ["Keep up the good level of detail"],
    strengths,
    weaknesses,
  };
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

  // ===== COUNTDOWN STATE =====
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  // ===== AUDIO RECORDING STATE =====
  const [isRecording, setIsRecording] = useState(false);
  const [audioResponses, setAudioResponses] = useState<Record<string, Blob>>({});
  const [recordingDuration, setRecordingDuration] = useState(0);
  // ===== INTERVIEW PHASE =====
  // "ready"    -> welcome message shown, waiting for candidate to click the mic to begin
  // "countdown"-> 3..2..1 countdown running
  // "question" -> a question is displayed, waiting for candidate to click mic to answer
  // "recording"-> actively recording the candidate's answer
  // "idle"     -> transitional / processing state
  const [phase, setPhase] = useState<"ready" | "countdown" | "question" | "recording" | "idle">("idle");

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

  // Waveform visualization refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
    analyserRef.current = null;
  };

  // ===== WAVEFORM DRAW LOOP =====
  const drawWaveform = () => {
    const analyser = analyserRef.current;
    const canvas = waveformCanvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barCount = 40;
    const step = Math.max(1, Math.floor(bufferLength / barCount));
    const gap = 3;
    const barWidth = width / barCount - gap;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      let count = 0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < bufferLength) {
          sum += dataArray[idx];
          count++;
        }
      }
      const avg = count > 0 ? sum / count : 0;
      // A little easing so quiet moments still show a small idle bar
      const normalized = avg / 255;
      const barHeight = Math.max(3, normalized * height);

      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(1, "#94a3b8");
      ctx.fillStyle = gradient;

      const radius = Math.min(barWidth / 2, 3);
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(x, y, barWidth, barHeight, radius);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  const stopWaveformLoop = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const canvas = waveformCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    const timer = timerRef.current;
    return () => {
      if (timer) clearInterval(timer);
      stopWaveformLoop();
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

      // Analyser node powers the live waveform visualization
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      rawPcmRef.current = [];

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        rawPcmRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      source.connect(analyser);

      setIsRecording(true);
      setPhase("recording");
      setRecordingDuration(0);

      // Kick off the live waveform render loop
      animationFrameRef.current = requestAnimationFrame(drawWaveform);

      // No time limit — user speaks freely until they click Stop
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
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

    stopWaveformLoop();
    setIsRecording(false);

    // Collect raw PCM data
    const rawChunks = rawPcmRef.current;
    rawPcmRef.current = [];

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

    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of rawChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const sampleRate = sampleRateRef.current;
    const wavBuffer = encodeWav(combined, sampleRate);
    const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

    stopRecordingTracks();

    const currentQ = session!.questions[currentQuestionIndex];
    setAudioResponses((prev) => ({ ...prev, [currentQ.id]: wavBlob }));

    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);
    responsesRef.current.push({ questionId: currentQ.id, answer: "", timeSpent });

    setPhase("idle");

    // Generate and show per-question review
    const review = generateReview(currentQ, timeSpent);
    const reviewMessage: Message = {
      id: nextId("review"),
      type: "system",
      content: `Answer Review — Question ${currentQuestionIndex + 1}/${session!.questions.length}`,
      timestamp: new Date(),
      evaluation: review,
    };
    setMessages((prev) => [...prev, reviewMessage]);

    setTimeout(() => moveToNextQuestion(), 2500);
  };

  // ===== TOGGLE RECORDING (used once the interview is underway, to answer a question) =====
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ===== EXPLICIT STOP BUTTON (ends the recording, distinct from the mic toggle) =====
  const handleStopClick = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  // ===== CANDIDATE CLICKS THE MIC ON THE WELCOME SCREEN TO KICK OFF THE INTERVIEW =====
  const handleBeginInterviewClick = () => {
    if (phase !== "ready") return;
    startCountdown();
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
      content: `Question ${1}/${session.questions.length}`,
      timestamp: new Date(),
      question: firstQ,
    };

    setMessages((prev) => [...prev, questionMessage]);
    questionStartRef.current = Date.now();
    setPhase("question");
  };

  // ===== INITIALIZE INTERVIEW =====
  const initializeInterview = (
    candidateName: string,
    jobRole: string,
    experienceLevel: InterviewSession["experienceLevel"],
    skills: string[] = []
  ) => {
    const sessionData = generateSession(candidateName, jobRole, experienceLevel, skills);
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
      content: `Welcome, ${candidateName}!`,
      timestamp: new Date(),
    };

    setMessages([welcomeMessage]);

    // Wait for the candidate to click the microphone below instead of
    // auto-starting the countdown.
    setPhase("ready");
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
      content: `Question ${nextIndex + 1}/${session.questions.length}`,
      timestamp: new Date(),
      question: nextQ,
    };

    setMessages((prev) => [...prev, questionMessage]);
    questionStartRef.current = Date.now();
    setPhase("question");
  };

  // ===== COMPLETE INTERVIEW =====
  const completeInterview = () => {
    if (!session) return;

    stopWaveformLoop();
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
      content: `Interview complete!`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, completionMessage]);
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
      <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <BarChartOutlined className="text-white text-sm" />
          </div>
          <h2 className="text-white font-bold text-base">Interview Evaluation</h2>
          <Badge count={`${evaluationResult.overallScore}/${evaluationResult.maxScore}`} color="#7c3aed" />
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-sm text-slate-400 mb-1">
            <span>Overall score</span>
            <span className="font-semibold text-white">{pct}%</span>
          </div>
          <Progress
            percent={pct}
            showInfo={false}
            strokeColor={{ "0%": "#7c3aed", "100%": "#6366f1" }}
            trailColor="#0d1221"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {evaluationResult.criteria.map((criterion, idx) => (
            <div key={idx} className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-slate-200 capitalize text-sm">{criterion.category}</span>
                <Tag color={criterion.score / criterion.maxScore > 0.7 ? "purple" : "magenta"}>
                  {criterion.score}/{criterion.maxScore}
                </Tag>
              </div>
              <p className="text-xs text-slate-500">{criterion.feedback}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
              <CheckCircleOutlined /> Strengths
            </h4>
            <ul className="text-sm text-slate-400 space-y-1.5">
              {evaluationResult.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-1.5">
              <CloseCircleOutlined /> Areas to improve
            </h4>
            <ul className="text-sm text-slate-400 space-y-1.5">
              {evaluationResult.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">✗</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 bg-[#0d1221] border border-[#1e2943] rounded-xl mb-4">
          <p className="text-sm text-slate-300">{evaluationResult.summary}</p>
        </div>

        {evaluationResult.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <BulbOutlined className="text-amber-400" /> Recommendations
            </h4>
            <ul className="text-sm text-slate-400 space-y-1.5">
              {evaluationResult.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-violet-500 mt-0.5">→</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ===== START-INTERVIEW MIC BUTTON (shown right after the welcome message) =====
  const renderStartInterviewMic = () => {
    if (phase !== "ready") return null;

    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <button
          onClick={handleBeginInterviewClick}
          className="relative group cursor-pointer bg-transparent border-0"
        >
          <span className="absolute inset-0 rounded-full bg-violet-500/20 group-hover:scale-125 transition-all duration-500" />
          <div className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg bg-linear-to-br from-violet-600 to-indigo-600 shadow-violet-500/30 group-hover:shadow-violet-500/50 group-hover:scale-105">
            <AudioOutlined className="text-white text-3xl" />
          </div>
        </button>

        <div className="text-center">
          <p className="text-slate-300 text-sm font-medium mb-1">Click the microphone below to start your interview</p>
          <p className="text-slate-500 text-xs">We'll count you in, then ask the first question</p>
        </div>
      </div>
    );
  };

  // ===== MICROPHONE BUTTON (used to answer each question) =====
  const renderMicButton = () => {
    if (phase !== "question" && phase !== "recording") return null;

    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex items-center gap-5">
          <button
            onClick={handleMicClick}
            className="relative group cursor-pointer bg-transparent border-0"
          >
            <span className={`absolute inset-0 rounded-full transition-all duration-500 ${
              isRecording
                ? "bg-rose-500/20 animate-ping scale-150"
                : "bg-violet-500/20 group-hover:scale-125"
            }`} />
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isRecording
                ? "bg-linear-to-br from-rose-600 to-rose-500 shadow-rose-500/40 scale-110"
                : "bg-linear-to-br from-violet-600 to-indigo-600 shadow-violet-500/30 group-hover:shadow-violet-500/50 group-hover:scale-105"
            }`}>
              {isRecording ? (
                <AudioFilled className="text-white text-3xl animate-pulse" />
              ) : (
                <AudioOutlined className="text-white text-3xl" />
              )}
            </div>
          </button>

          {/* Explicit stop control, only shown while actively recording */}
          {isRecording && (
            <button
              onClick={handleStopClick}
              className="group cursor-pointer bg-transparent border-0 flex flex-col items-center gap-1.5"
              aria-label="Stop recording"
            >
              <div className="w-12 h-12 rounded-full bg-[#141928] border border-[#2a3654] flex items-center justify-center shadow-lg group-hover:border-rose-500/50 group-hover:bg-[#1a2033] transition-all duration-200">
                <span className="w-3.5 h-3.5 rounded-[3px] bg-rose-500 group-hover:bg-rose-400 transition-colors" />
              </div>
              <span className="text-[11px] text-slate-500 group-hover:text-rose-400 transition-colors">Stop</span>
            </button>
          )}
        </div>

        <div className="text-center">
          {isRecording ? (
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-rose-400 text-sm font-medium">Recording your answer...</span>
              <span className="text-rose-400/70 text-xs font-mono">
                {recordingDuration}s
              </span>
            </div>
          ) : (
            <div>
              <p className="text-slate-300 text-sm font-medium mb-1">Click the microphone to answer</p>
              <p className="text-slate-500 text-xs">Speak freely — click Stop when you're done</p>
            </div>
          )}
        </div>

        {/* Live waveform driven by the microphone's actual input level */}
        {isRecording && (
          <canvas
            ref={waveformCanvasRef}
            width={320}
            height={64}
            className="w-full max-w-[320px] h-16"
          />
        )}
      </div>
    );
  };

  // ===== MAIN RENDER =====
  return (
    <>
     <style>{`
        @keyframes countdown-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .countdown-number {
          animation: countdown-pulse 1s ease-in-out;
        }
       
        .ant-tag {
          margin-inline-end: 0 !important;
        }
      `}</style>





      <div className="w-full h-full bg-[#0d1221]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-full h-full flex flex-col">
        {/* Header */}
        <div className="bg-[#0d1221] border-b border-[#1e2943] px-6 py-3 shrink-0">
          <div className="w-full mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 shrink-0">
                <span className="absolute inset-0 rounded-xl bg-violet-600/25 blur-md" />
                <div className="relative w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <RobotOutlined className="text-white text-sm" />
                </div>
              </div>
              <div>
                <h1 className="text-white font-bold text-sm tracking-tight">
                  AI Interview Evaluator
                </h1>
                <div className="flex items-center gap-3">
                  <p className="text-slate-500 text-xs">
                    {session ? `Question ${currentQuestionIndex + 1}/${totalQuestions}` : "Ready"}
                  </p>
                  {isRecording && (
                    <span className="flex items-center gap-1 text-xs text-rose-400">
                      <span className="animate-pulse">●</span> Recording
                    </span>
                  )}
                  {session && (
                    <Tag color={session.status === "completed" ? "purple" : "geekblue"} className="!text-xs !px-2 !py-0 !border-0">
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
                className="!bg-linear-to-r !from-violet-600 !to-indigo-600 !border-0 !rounded-lg !shadow-lg !shadow-violet-500/20"
              >
                View evaluation
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages area — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4 relative">
            {!session ? (
              <SetupScreen onStart={initializeInterview} />
            ) : (
              <div className="w-full md:w-[70%] mx-auto space-y-5">
                {/* Countdown Overlay */}
                {showCountdown && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-slate-400 text-sm font-medium tracking-widest uppercase mb-4">
                      Your interview starts in
                    </div>
                    <div className="text-8xl font-bold text-transparent bg-clip-text bg-linear-to-br from-violet-400 to-indigo-500 countdown-number">
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
                          className={`max-w-[80%] rounded-2xl px-5 py-4 border ${
                            msg.type === "candidate"
                              ? "bg-violet-500/10 border-violet-500/20"
                              : msg.type === "system"
                              ? "bg-[#141928] border-[#1e2943]"
                              : "bg-[#141928] border-[#1e2943]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {msg.type === "interviewer" && (
                              <Avatar icon={<RobotOutlined />} className="!bg-linear-to-br !from-violet-500 !to-indigo-600 !border-0 !shrink-0" size="small" />
                            )}
                            {msg.type === "candidate" && (
                              <Avatar icon={<UserOutlined />} className="!bg-linear-to-br !from-violet-500 !to-indigo-600 !border-0 !shrink-0" size="small" />
                            )}
                            {msg.type === "system" && (
                              <div className="w-7 h-7 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                                <RobotOutlined className="text-white text-sm" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {/* Bold title */}
                              <div className="text-white font-semibold text-sm mb-1">
                                {msg.content}
                              </div>

                              {/* Question details */}
                              {msg.question && (
                                <div className="mt-0.5 space-y-2">
                                  <p className="text-slate-300 text-sm leading-relaxed">
                                    {msg.question.question}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Tag color="purple" className="!text-xs !px-2 !py-0.5 !border-0 capitalize">
                                      {getCategoryIcon(msg.question.category)} {msg.question.category.replace("_", " ")}
                                    </Tag>
                                    <Tag color={getDifficultyColor(msg.question.difficulty)} className="!text-xs !px-2 !py-0.5 !border-0">
                                      {msg.question.difficulty}
                                    </Tag>
                                  </div>
                                </div>
                              )}

                              {/* Per-question evaluation card */}
                              {msg.evaluation && (
                                <div className="mt-3 p-3 bg-[#0d1221] border border-[#1e2943] rounded-xl">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-slate-400">Score</span>
                                    <Tag color="purple" className="!text-xs !px-2 !py-0.5 !border-0 !font-semibold">
                                      {msg.evaluation.overallScore}/{msg.evaluation.maxScore}
                                    </Tag>
                                  </div>
                                  <p className="text-xs text-slate-400 mb-2">{msg.evaluation.summary}</p>
                                  {msg.evaluation.strengths.length > 0 && (
                                    <div className="mb-1.5">
                                      <span className="text-emerald-400 text-xs font-medium">Strengths</span>
                                      <ul className="text-xs text-slate-400 mt-1 space-y-0.5">
                                        {msg.evaluation.strengths.map((s, i) => (
                                          <li key={i} className="flex items-start gap-1.5">
                                            <span className="text-emerald-500 mt-0.5">✓</span>
                                            <span>{s}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {msg.evaluation.weaknesses.length > 0 && (
                                    <div>
                                      <span className="text-rose-400 text-xs font-medium">Areas to improve</span>
                                      <ul className="text-xs text-slate-400 mt-1 space-y-0.5">
                                        {msg.evaluation.weaknesses.map((w, i) => (
                                          <li key={i} className="flex items-start gap-1.5">
                                            <span className="text-rose-500 mt-0.5">✗</span>
                                            <span>{w}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {msg.timestamp && (
                                <div className="text-xs mt-2 text-slate-600">{dayjs(msg.timestamp).format("HH:mm")}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Mic button to kick off the interview, shown right after the welcome message */}
                    {!showCountdown && renderStartInterviewMic()}

                    <div ref={messagesEndRef} />
                  </div>
                )}

                {showEvaluation && renderEvaluationPanel()}
              </div>
            )}
          </div>

          {/* Recording Controls — separate section at the bottom */}
          {session && !showCountdown && !showEvaluation && session.status !== "completed" && (phase === "question" || phase === "recording") && (
            <div className="shrink-0 border-t border-[#1e2943] bg-[#0d1221] px-4 py-6">
              <div className="w-full md:w-[70%] mx-auto">
                {renderMicButton()}
              </div>
            </div>
          )}
        </div>

        {/* Audio download tags */}
        {session && session.status === "completed" && Object.keys(audioResponses).length > 0 && (
          <div className="shrink-0 px-4 pb-6 pt-2">
            <div className="w-full md:w-[70%] mx-auto flex flex-wrap justify-center gap-2">
              <span className="text-slate-500 text-xs mr-1 self-center">
                {Object.keys(audioResponses).length} audio response(s) recorded —
              </span>
              {Object.entries(audioResponses).map(([qId], idx) => (
                <Tag key={qId} color="purple" className="!text-xs !px-2 !py-0.5 !border-0 cursor-pointer"
                  onClick={() => {
                    const blob = audioResponses[qId];
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `response-Q${idx + 1}.wav`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <SoundOutlined /> Download Q{idx + 1}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default AIInterviewEvaluation;