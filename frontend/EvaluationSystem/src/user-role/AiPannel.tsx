import { useEffect, useState, useRef } from "react";
import {
  Button,
  message,
  Progress,
  Tag,
  Avatar,
  Badge,
} from "antd";
import {
  RobotOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  BulbOutlined,
  ArrowRightOutlined,
  AudioOutlined,
  AudioFilled,
  TrophyOutlined,
  PoweroffOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../utils/axiosInstance";

// ==================== INTERFACES ====================

interface BackendQuestion {
  id: number;
  question_text: string;
  difficulty_level: number;
  skill_id?: number;
}

interface BackendSkill {
  id: number;
  name: string;
}

interface TranscriptionInfo {
  confidence_score: number;
  message: string;
}

interface AnswerEvaluation {
  keyword_score: number;
  tfidf_score: number;
  semantic_score: number;
  final_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  negated_keywords: string[];
  strengths: string[];
  weaknesses: string[];
  areas_for_improvement: string[];
}

interface AnswerResponse {
  transcription?: TranscriptionInfo;
  evaluation?: AnswerEvaluation;
  next_question: BackendQuestion | null;
  message?: string;
}

interface InterviewStartResponse {
  interview_id: number;
  question: BackendQuestion;
}

interface InterviewEndResponse {
  interview_id: number;
  status: string;
}

interface ReportQuestion {
  order_index: number;
  question_text: string;
  difficulty_level: number;
  transcript_text: string | null;
  confidence_score: number | null;
  final_score: number | null;
  strengths: string[];
  weaknesses: string[];
  areas_for_improvement: string[];
}

interface SkillReport {
  skill: string;
  final_difficulty_reached: number;
  assessed_level: string;
  average_score_at_that_level: number | null;
  average_confidence_score: number | null;
  questions_asked: number;
  questions: ReportQuestion[];
}

interface InterviewReport {
  interview_id: number;
  skills: SkillReport[];
}

interface EvaluationCriteria {
  category: string;
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
}

interface EvaluationResult {
  overallScore: number;
  maxScore: number;
  criteria: EvaluationCriteria[];
  summary: string;
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  negatedKeywords: string[];
  transcriptionMessage: string;
}

interface Message {
  id: string;
  type: "interviewer" | "candidate" | "system";
  content: string;
  timestamp: Date;
  question?: BackendQuestion;
  evaluation?: EvaluationResult;
}

const STARTING_LEVEL_OPTIONS = [
  { label: "Easy", value: "easy" },
  { label: "Mid", value: "mid" },
  { label: "Expert", value: "expert" },
];

// Bucket a 0–1 difficulty float into a label: < 0.35 easy, 0.35–0.65 mid, > 0.65 expert.
const difficultyToLabel = (level: number): "easy" | "mid" | "expert" => {
  if (level < 0.35) return "easy";
  if (level <= 0.65) return "mid";
  return "expert";
};

const difficultyToColor = (level: number): string => {
  const label = difficultyToLabel(level);
  if (label === "easy") return "green";
  if (label === "mid") return "gold";
  return "magenta";
};

const levelToColor = (level: string): string => {
  if (level === "easy") return "green";
  if (level === "mid") return "gold";
  return "magenta";
};

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

interface ApiErrorLike {
  response?: { data?: { message?: string } };
}

function getErrorMessage(err: unknown, fallback: string): string {
  return (err as ApiErrorLike | null)?.response?.data?.message || fallback;
}

function drawRoundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rectCtx = ctx as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
  };
  if (typeof rectCtx.roundRect === "function") {
    rectCtx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

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
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

// ==================== SETUP SCREEN ====================

const SetupScreen = ({
  onStart,
  loading,
}: {
  onStart: (skillIds: number[], startingLevel: string) => void;
  loading: boolean;
}) => {
  const [skillOptions, setSkillOptions] = useState<BackendSkill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [startingLevel, setStartingLevel] = useState<string>("easy");

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await api.get("/api/skills");
        setSkillOptions(response.data?.data || []);
      } catch {
        // Silently fail
      }
    };
    fetchSkills();
  }, []);

  const toggleSkill = (id: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    if (selectedSkillIds.length === 0) {
      message.warning("Please select at least one skill");
      return;
    }
    onStart(selectedSkillIds, startingLevel);
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
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-medium">
                Select skills
              </label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((skill) => {
                  const active = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                        active
                          ? "bg-violet-600/20 border-violet-500 text-white shadow-lg shadow-violet-500/20"
                          : "bg-[#0d1221] border-[#1e2943] text-slate-400 hover:border-violet-500/50 hover:text-slate-200"
                      }`}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Pick any number of skills</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-medium">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STARTING_LEVEL_OPTIONS.map((opt) => {
                  const active = startingLevel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStartingLevel(opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer capitalize ${
                        active
                          ? "bg-linear-to-br from-violet-600 to-indigo-600 border-violet-500 text-white shadow-lg shadow-violet-500/20"
                          : "bg-[#0d1221] border-[#1e2943] text-slate-400 hover:border-violet-500/50 hover:text-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              block
              onClick={handleStart}
              loading={loading}
              icon={!loading ? <ArrowRightOutlined /> : undefined}
              iconPosition="end"
              className="!bg-linear-to-r !from-violet-600 !to-indigo-600 !border-0 !rounded-xl !h-11 !font-semibold !shadow-lg !shadow-violet-500/20 hover:!shadow-violet-500/40 !transition-all !mt-2"
            >
              {loading ? "Starting interview..." : "Begin interview"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== REPORT SCREEN ====================

const ReportScreen = ({
  report,
  onRestart,
}: {
  report: InterviewReport;
  onRestart: () => void;
}) => {
  const allQuestions = report.skills.flatMap((s) => s.questions);
  const answered = allQuestions.filter((q) => q.final_score != null);
  const overallAvg =
    answered.length > 0
      ? answered.reduce((acc, q) => acc + (q.final_score ?? 0), 0) / answered.length
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <TrophyOutlined className="text-white text-sm" />
          </div>
          <h2 className="text-white font-bold text-base">Interview Report</h2>
          <Badge count={`#${report.interview_id}`} color="#7c3aed" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Skills</div>
            <div className="text-white font-semibold text-lg">{report.skills.length}</div>
          </div>
          <div className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Questions</div>
            <div className="text-white font-semibold text-lg">{allQuestions.length}</div>
          </div>
          <div className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Answered</div>
            <div className="text-white font-semibold text-lg">{answered.length}</div>
          </div>
          <div className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Avg score</div>
            <div className="text-white font-semibold text-lg">
              {overallAvg != null ? `${Math.round(overallAvg * 100)}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {report.skills.map((skill) => (
        <div key={skill.skill} className="bg-[#141928] border border-[#1e2943] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <BarChartOutlined className="text-white text-sm" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">{skill.skill}</h3>
                <p className="text-xs text-slate-500">
                  Final difficulty reached: {Math.round(skill.final_difficulty_reached * 100)}%
                </p>
              </div>
            </div>
            <Tag color={levelToColor(skill.assessed_level)} className="!text-xs !px-2 !py-0.5 !border-0 !font-semibold !uppercase">
              {skill.assessed_level}
            </Tag>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Avg score</div>
              <div className="text-white font-semibold">
                {skill.average_score_at_that_level != null
                  ? `${Math.round(skill.average_score_at_that_level * 100)}%`
                  : "—"}
              </div>
            </div>
            <div className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Avg confidence</div>
              <div className="text-white font-semibold">
                {skill.average_confidence_score != null
                  ? `${Math.round(skill.average_confidence_score * 100)}%`
                  : "—"}
              </div>
            </div>
            <div className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Asked</div>
              <div className="text-white font-semibold">{skill.questions_asked}</div>
            </div>
          </div>

          <div className="space-y-3">
            {skill.questions.map((q) => {
              const scored = q.final_score != null;
              return (
                <div key={q.order_index} className="bg-[#0d1221] border border-[#1e2943] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Tag color="geekblue" className="!text-[11px] !px-2 !py-0 !border-0">
                      Q{q.order_index}
                    </Tag>
                    <Tag color={difficultyToColor(q.difficulty_level)} className="!text-[11px] !px-2 !py-0 !border-0">
                      {difficultyToLabel(q.difficulty_level)}
                    </Tag>
                    <span className="ml-auto text-xs font-semibold text-white">
                      {scored ? `${Math.round((q.final_score ?? 0) * 100)}%` : "Not answered"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-2">{q.question_text}</p>

                  {scored && q.transcript_text && (
                    <div className="mb-2">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500">Your answer</span>
                      <p className="text-xs text-slate-400 italic mt-0.5">"{q.transcript_text}"</p>
                    </div>
                  )}

                  {scored && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {q.strengths.length > 0 && (
                        <div>
                          <span className="text-emerald-400 text-[11px] font-medium">Strengths</span>
                          <ul className="text-xs text-slate-400 mt-1 space-y-0.5">
                            {q.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">✓</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {q.weaknesses.length > 0 && (
                        <div>
                          <span className="text-rose-400 text-[11px] font-medium">Areas to improve</span>
                          <ul className="text-xs text-slate-400 mt-1 space-y-0.5">
                            {q.weaknesses.map((w, i) => (
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

                  {scored && q.areas_for_improvement.length > 0 && (
                    <div className="mt-2">
                      <span className="text-amber-400 text-[11px] font-medium">Recommendations</span>
                      <ul className="text-xs text-slate-400 mt-1 space-y-0.5">
                        {q.areas_for_improvement.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-violet-500 mt-0.5">→</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        type="primary"
        size="large"
        block
        icon={<ReloadOutlined />}
        onClick={onRestart}
        className="!bg-linear-to-r !from-violet-600 !to-indigo-600 !border-0 !rounded-xl !h-11 !font-semibold !shadow-lg !shadow-violet-500/20"
      >
        Start a new interview
      </Button>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export const AIInterviewEvaluation = () => {
  // ===== STATE =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [interviewId, setInterviewId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<BackendQuestion | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [endingInterview, setEndingInterview] = useState(false);

  // ===== COUNTDOWN STATE =====
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  // ===== AUDIO RECORDING STATE =====
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  // ===== INTERVIEW PHASE =====
  const [phase, setPhase] = useState<
    "idle" | "starting" | "ready" | "countdown" | "question" | "recording" | "submitting"
  >("idle");

  // ===== REFS =====
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawPcmRef = useRef<Float32Array[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleRateRef = useRef<number>(48000);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const stopRecordingTracks = () => {
    stopMediaTracks(streamRef.current);
    streamRef.current = null;
    closeAudioContext(audioContextRef.current);
    audioContextRef.current = null;
    analyserRef.current = null;
  };

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
      drawRoundedBar(ctx, x, y, barWidth, barHeight, radius);
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
    if (!currentQuestion) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;
      sampleRateRef.current = audioCtx.sampleRate;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

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

      animationFrameRef.current = requestAnimationFrame(drawWaveform);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      message.error("Microphone access denied or unavailable.");
      setPhase("question");
    }
  };

  // ===== END INTERVIEW + FETCH REPORT =====
  const finalizeInterview = async () => {
    if (!interviewId || endingInterview) return;
    setEndingInterview(true);

    try {
      // POST /api/interviews/:id/end
      const endResponse = await api.post<InterviewEndResponse>(`/api/interviews/${interviewId}/end`);
      const endData = endResponse.data;

      // GET /api/interviews/:id/report
      const reportResponse = await api.get<InterviewReport>(`/api/interviews/${interviewId}/report`);
      const reportData = reportResponse.data;

      setReport(reportData);
      setSessionComplete(true);
      setPhase("idle");

      const completeMessage: Message = {
        id: nextId("complete"),
        type: "system",
        content: `Interview complete (${endData.status}). Your report is ready.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, completeMessage]);
    } catch (err) {
      console.error("Failed to end interview:", err);
      message.error("Failed to finalize the interview. Please try again.");
      setSessionComplete(true);
      setPhase("idle");
    } finally {
      setEndingInterview(false);
    }
  };

  // ===== STOP RECORDING =====
  const stopRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    stopWaveformLoop();
    setIsRecording(false);

    const rawChunks = rawPcmRef.current;
    rawPcmRef.current = [];

    let totalLength = 0;
    for (const chunk of rawChunks) {
      totalLength += chunk.length;
    }

    if (totalLength === 0) {
      stopRecordingTracks();
      setPhase("question");
      return;
    }

    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of rawChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // ── TEMP DIAGNOSTIC: log RMS/peak so we can verify the mic captured audio ──
    const sampleRate = sampleRateRef.current;
    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < combined.length; i++) {
      const v = combined[i];
      sumSq += v * v;
      const abs = Math.abs(v);
      if (abs > peak) peak = abs;
    }
    const rms = Math.sqrt(sumSq / combined.length);
    console.log(
      `[recording-diagnostic] samples=${combined.length} duration=${(combined.length / sampleRate).toFixed(2)}s sampleRate=${sampleRate} rms=${rms.toFixed(4)} peak=${peak.toFixed(4)}`
    );
    if (rms < 0.005) {
      message.warning(
        "Recording appears silent — the microphone may not be picking up audio."
      );
    }
    // ── END TEMP DIAGNOSTIC ──

    const wavBuffer = encodeWav(combined, sampleRate);
    const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

    stopRecordingTracks();

    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);
    setPhase("submitting");

    // Submit answer to backend
    try {
      const formData = new FormData();
      formData.append("audio", wavBlob, "answer.wav");

      const response = await api.post<AnswerResponse>(
        `/api/questions/${currentQuestion!.id}/answer`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const answerResult = response.data;

      if (answerResult.transcription && answerResult.evaluation) {
        const evalResult: EvaluationResult = {
          overallScore: Math.round(answerResult.evaluation.final_score * 10),
          maxScore: 10,
          criteria: [
            {
              category: "Confidence",
              score: Math.round(answerResult.transcription.confidence_score * 10),
              maxScore: 10,
              feedback: answerResult.transcription.message,
              strengths: [],
              areasForImprovement: [],
            },
            {
              category: "Keyword Match",
              score: Math.round(answerResult.evaluation.keyword_score * 10),
              maxScore: 10,
              feedback: `Keyword score: ${(answerResult.evaluation.keyword_score * 100).toFixed(0)}%`,
              strengths: [],
              areasForImprovement: [],
            },
            {
              category: "Semantic",
              score: Math.round(answerResult.evaluation.semantic_score * 10),
              maxScore: 10,
              feedback: `Semantic score: ${(answerResult.evaluation.semantic_score * 100).toFixed(0)}%`,
              strengths: [],
              areasForImprovement: [],
            },
          ],
          summary: `You spoke for ${timeSpent} seconds.`,
          recommendations: answerResult.evaluation.areas_for_improvement,
          strengths: answerResult.evaluation.strengths,
          weaknesses: answerResult.evaluation.weaknesses,
          matchedKeywords: answerResult.evaluation.matched_keywords,
          missingKeywords: answerResult.evaluation.missing_keywords,
          negatedKeywords: answerResult.evaluation.negated_keywords,
          transcriptionMessage: answerResult.transcription.message,
        };

        const reviewMessage: Message = {
          id: nextId("review"),
          type: "system",
          content: `Answer Review \u2014 Question ${questionCount}`,
          timestamp: new Date(),
          evaluation: evalResult,
        };
        setMessages((prev) => [...prev, reviewMessage]);
      } else if (answerResult.message) {
        // Duplicate submit — no new evaluation, just continue to next question.
        const noticeMessage: Message = {
          id: nextId("notice"),
          type: "system",
          content: answerResult.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, noticeMessage]);
      }

      if (answerResult.next_question) {
        const nextQ = answerResult.next_question;
        setTimeout(() => {
          setCurrentQuestion(nextQ);
          setQuestionCount((prev) => prev + 1);
          setPhase("question");

          const nextQMessage: Message = {
            id: nextId("q"),
            type: "interviewer",
            content: `Question ${questionCount + 1}`,
            timestamp: new Date(),
            question: nextQ,
          };
          setMessages((prev) => [...prev, nextQMessage]);
          questionStartRef.current = Date.now();
        }, 2500);
      } else {
        // No more questions — end the interview and fetch the report.
        setTimeout(() => {
          finalizeInterview();
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
      message.error("Failed to submit answer. Please try again.");
      setPhase("question");
    }
  };

  // ===== TOGGLE RECORDING =====
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ===== EXPLICIT STOP BUTTON =====
  const handleStopClick = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  // ===== END INTERVIEW EARLY =====
  const handleEndEarly = () => {
    if (isRecording) {
      message.warning("Stop recording before ending the interview");
      return;
    }
    finalizeInterview();
  };

  // ===== CANDIDATE CLICKS MIC ON WELCOME SCREEN =====
  const handleBeginInterviewClick = () => {
    if (phase !== "ready") return;
    startCountdown();
  };

  // ===== COUNTDOWN =====
  const startCountdown = () => {
    setShowCountdown(true);
    setCountdownValue(3);
    setPhase("countdown");

    let remaining = 3;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setShowCountdown(false);
        setPhase("idle");
        showFirstQuestion();
        return;
      }
      setCountdownValue(remaining);
    }, 1000);
  };

  // ===== SHOW FIRST QUESTION =====
  const showFirstQuestion = () => {
    if (!currentQuestion) return;

    const questionMessage: Message = {
      id: nextId("q"),
      type: "interviewer",
      content: `Question 1`,
      timestamp: new Date(),
      question: currentQuestion,
    };

    setMessages((prev) => [...prev, questionMessage]);
    questionStartRef.current = Date.now();
    setPhase("question");
  };

  // ===== INITIALIZE INTERVIEW (calls POST /api/interviews) =====
  const initializeInterview = async (skillIds: number[], startingLevel: string) => {
    setPhase("starting");

    try {
      const response = await api.post<InterviewStartResponse>("/api/interviews", {
        skill_ids: skillIds,
        starting_level: startingLevel,
      });

      const data = response.data;

      setInterviewId(data.interview_id);
      setCurrentQuestion(data.question);
      setQuestionCount(1);
      setSessionComplete(false);
      setShowEvaluation(false);
      setEvaluationResult(null);
      setReport(null);

      const welcomeMessage: Message = {
        id: nextId("welcome"),
        type: "system",
        content: "Interview started! Get ready.",
        timestamp: new Date(),
      };

      setMessages([welcomeMessage]);
      setPhase("ready");
    } catch (err) {
      console.error("Failed to start interview:", err);
      message.error(getErrorMessage(err, "Failed to start interview"));
      setPhase("idle");
    }
  };

  // ===== RESTART =====
  const handleRestart = () => {
    setInterviewId(null);
    setCurrentQuestion(null);
    setQuestionCount(0);
    setSessionComplete(false);
    setReport(null);
    setEvaluationResult(null);
    setShowEvaluation(false);
    setMessages([]);
    setPhase("idle");
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

  // ===== START-INTERVIEW MIC BUTTON =====
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

  // ===== MICROPHONE BUTTON =====
  const renderMicButton = () => {
    if (phase !== "question" && phase !== "recording") return null;

    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex items-center gap-5">
          <button
            onClick={handleMicClick}
            className="relative group cursor-pointer bg-transparent border-0"
          >
            <span
              className={`absolute inset-0 rounded-full transition-all duration-500 ${
                isRecording
                  ? "bg-rose-500/20 animate-ping scale-150"
                  : "bg-violet-500/20 group-hover:scale-125"
              }`}
            />
            <div
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                isRecording
                  ? "bg-linear-to-br from-rose-600 to-rose-500 shadow-rose-500/40 scale-110"
                  : "bg-linear-to-br from-violet-600 to-indigo-600 shadow-violet-500/30 group-hover:shadow-violet-500/50 group-hover:scale-105"
              }`}
            >
              {isRecording ? (
                <AudioFilled className="text-white text-3xl animate-pulse" />
              ) : (
                <AudioOutlined className="text-white text-3xl" />
              )}
            </div>
          </button>

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
              <span className="text-rose-400/70 text-xs font-mono">{recordingDuration}s</span>
            </div>
          ) : (
            <div>
              <p className="text-slate-300 text-sm font-medium mb-1">Click the microphone to answer</p>
              <p className="text-slate-500 text-xs">Speak freely — click Stop when you're done</p>
            </div>
          )}
        </div>

        {isRecording && (
          <canvas ref={waveformCanvasRef} width={320} height={64} className="w-full max-w-[320px] h-16" />
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
                  <h1 className="text-white font-bold text-sm tracking-tight">AI Interview Evaluator</h1>
                  <div className="flex items-center gap-3">
                    <p className="text-slate-500 text-xs">
                      {report ? `Interview #${report.interview_id}` : currentQuestion ? `Question ${questionCount}` : "Ready"}
                    </p>
                    {isRecording && (
                      <span className="flex items-center gap-1 text-xs text-rose-400">
                        <span className="animate-pulse">●</span> Recording
                      </span>
                    )}
                    {phase === "submitting" && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <span className="animate-pulse">●</span> Submitting...
                      </span>
                    )}
                    {endingInterview && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <span className="animate-pulse">●</span> Finalizing...
                      </span>
                    )}
                    {sessionComplete && (
                      <Tag color="purple" className="!text-xs !px-2 !py-0 !border-0">
                        Completed
                      </Tag>
                    )}
                    {currentQuestion && !sessionComplete && (
                      <Tag color="geekblue" className="!text-xs !px-2 !py-0 !border-0">
                        In progress
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
              {currentQuestion && !sessionComplete && phase !== "recording" && (
                <Button
                  size="small"
                  danger
                  loading={endingInterview}
                  onClick={handleEndEarly}
                  icon={<PoweroffOutlined />}
                  className="!rounded-lg"
                >
                  End interview
                </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 relative">
              {!currentQuestion && !sessionComplete ? (
                <SetupScreen onStart={initializeInterview} loading={phase === "starting"} />
              ) : sessionComplete && report ? (
                <ReportScreen report={report} onRestart={handleRestart} />
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
                                <div className="text-white font-semibold text-sm mb-1">{msg.content}</div>

                                {msg.question && (
                                  <div className="mt-0.5 space-y-2">
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                      {msg.question.question_text}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      <Tag color={difficultyToColor(msg.question.difficulty_level)} className="!text-xs !px-2 !py-0.5 !border-0">
                                        {difficultyToLabel(msg.question.difficulty_level)}
                                      </Tag>
                                    </div>
                                  </div>
                                )}

                                {msg.evaluation && (
                                  <div className="mt-3 p-3 bg-[#0d1221] border border-[#1e2943] rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-slate-400">Score</span>
                                      <Tag color="purple" className="!text-xs !px-2 !py-0.5 !border-0 !font-semibold">
                                        {msg.evaluation.overallScore}/{msg.evaluation.maxScore}
                                      </Tag>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2">{msg.evaluation.summary}</p>
                                    {msg.evaluation.transcriptionMessage && (
                                      <p className="text-[11px] text-sky-400 mb-2">
                                        {msg.evaluation.transcriptionMessage}
                                      </p>
                                    )}
                                    {msg.evaluation.matchedKeywords.length > 0 && (
                                      <div className="mb-1.5">
                                        <span className="text-emerald-400 text-xs font-medium">Matched keywords</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {msg.evaluation.matchedKeywords.map((k, i) => (
                                            <Tag key={i} color="green" className="!text-[11px] !px-1.5 !py-0 !border-0">
                                              {k}
                                            </Tag>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {msg.evaluation.missingKeywords.length > 0 && (
                                      <div className="mb-1.5">
                                        <span className="text-rose-400 text-xs font-medium">Missing keywords</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {msg.evaluation.missingKeywords.map((k, i) => (
                                            <Tag key={i} color="red" className="!text-[11px] !px-1.5 !py-0 !border-0">
                                              {k}
                                            </Tag>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {msg.evaluation.negatedKeywords.length > 0 && (
                                      <div className="mb-1.5">
                                        <span className="text-amber-400 text-xs font-medium">Negated keywords</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {msg.evaluation.negatedKeywords.map((k, i) => (
                                            <Tag key={i} color="orange" className="!text-[11px] !px-1.5 !py-0 !border-0">
                                              {k}
                                            </Tag>
                                          ))}
                                        </div>
                                      </div>
                                    )}
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

                      {!showCountdown && renderStartInterviewMic()}

                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {showEvaluation && renderEvaluationPanel()}
                </div>
              )}
            </div>

            {/* Recording Controls */}
            {currentQuestion && !showCountdown && !showEvaluation && !sessionComplete && (phase === "question" || phase === "recording") && (
              <div className="shrink-0 border-t border-[#1e2943] bg-[#0d1221] px-4 py-6">
                <div className="w-full md:w-[70%] mx-auto">{renderMicButton()}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AIInterviewEvaluation;
