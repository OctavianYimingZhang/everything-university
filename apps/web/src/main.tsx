import React from "react";
import ReactDOM from "react-dom/client";
import {
  Activity,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  GraduationCap,
  KeyRound,
  Layers3,
  MessageSquare,
  Play,
  RefreshCcw,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UploadCloud,
} from "lucide-react";
import "./styles.css";

type SystemId = "coursework" | "exam" | "daily";
type SectionId = "workspace" | "sources" | "settings";
type BridgeState = "checking" | "online" | "offline";
type OutputState =
  | "Idle"
  | "Refreshing memory"
  | "Memory ready"
  | "Memory updated"
  | "Plan ready"
  | "Review questions ready"
  | "Decision payload ready"
  | "Automation plan ready"
  | "Offline handoff";

type Decision = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  recommended: string;
};

type GeneratedQuestion = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  recommended?: string;
  decisionId?: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  questions?: GeneratedQuestion[];
  mode?: "ai" | "fallback";
};

type AIQuestionsResponse = {
  mode?: "ai" | "fallback";
  assistant_message?: string;
  questions?: GeneratedQuestion[];
};

type Task = {
  id: string;
  system: SystemId;
  title: string;
  route: string;
  intent: string;
  primaryAction: string;
  material: string;
  output: string;
  decisions: Decision[];
};

type MemoryStore = {
  records: number;
  latest_observed_at: string | null;
  path?: string;
};

type MemoryContext = {
  course?: string;
  readiness?: {
    score: number;
    total: number;
    state: string;
    source_gaps: string[];
  };
  stores?: Record<string, MemoryStore>;
  writing_style_signals?: string[];
  notes_preferences?: string[];
  teaching_memory_signals?: {
    lecture_material_records?: number;
    transcript_records?: number;
    lecture_gap_records?: number;
    writing_sample_records?: number;
    notes_preference_records?: number;
  };
  trust_boundary?: string;
  summary?: {
    initialized?: boolean;
    student?: {
      student_id_present?: boolean;
      profile_notes_present?: boolean;
    };
    source_access?: {
      lms?: string;
      lms_base_url?: string;
      collection_modes?: string[];
    };
    stores?: Record<string, MemoryStore>;
    missing_stores?: string[];
  };
};

type SourceUpload = {
  id: string;
  role: SourceRoleId;
  name: string;
  size: number;
  kind: string;
  contentHint: string;
  preview: string;
};

type CodexState = {
  state: string;
  available: boolean;
  authenticated: boolean;
  authMethod?: string | null;
  detail?: string;
  deviceCode?: string;
  authUrl?: string;
  expiresInMinutes?: number;
  instructions?: string;
};

const query = new URLSearchParams(window.location.search);
const bridgeUrl = query.get("codex_bridge") || import.meta.env.VITE_CODEX_BRIDGE || "http://127.0.0.1:8787";

const sourceRoleLabels = [
  ["lecture_materials", "Lecture slides / materials"],
  ["recordings_transcripts", "Transcripts / recordings"],
  ["assignments", "Assignment briefs"],
  ["readings", "Readings"],
] as const;

type SourceRoleId = (typeof sourceRoleLabels)[number][0];

const memoryGenerationLabels = [
  ["timetable", "Timetable"],
  ["announcements", "Announcements"],
  ["feedback", "Tutor / marker feedback"],
  ["lecture_gap_notes", "Slide-transcript gaps"],
  ["writing_samples", "Writing samples"],
  ["notes_preferences", "Notes preferences"],
] as const;

const tasks: Task[] = [
  {
    id: "exam-notes",
    system: "exam",
    title: "Generate Notes",
    route: "exam_prep_notes",
    intent: "Create explanation-first teaching notes from lecture materials and course memory.",
    primaryAction: "Build Review Plan",
    material: "Lecture materials, recordings, readings",
    output: "Teaching notes plan",
    decisions: [
      decision("notes_choice", "Notes", "Choose the notes output.", [
        "Generate full teaching notes",
        "Generate focused revision notes",
        "Skip notes and make report only",
      ]),
      decision("coverage_policy", "Coverage", "Choose the coverage target.", [
        "Lecture-unit complete",
        "Exam-priority only",
        "Mixed notes plus exam report",
      ]),
    ],
  },
  {
    id: "exam-mcq",
    system: "exam",
    title: "MCQ Practice",
    route: "mcq_preparation",
    intent: "Prepare MCQ/SBA revision from past-paper and lecture-memory signals.",
    primaryAction: "Build Review Plan",
    material: "Past papers, practice sets, lecture memory",
    output: "MCQ research report",
    decisions: [
      decision("notes_support", "Notes support", "Choose whether to generate notes first.", [
        "Generate notes first",
        "MCQ report only",
        "Ask after source review",
      ]),
      decision("mcq_focus", "Practice focus", "Choose the MCQ practice focus.", [
        "Recurring exam points",
        "Weak knowledge units",
        "Full course sweep",
      ]),
    ],
  },
  {
    id: "exam-short-answer",
    system: "exam",
    title: "Short Answer Prep",
    route: "short_answer_preparation",
    intent: "Prepare definitions, state/list answers, and concise SAQ knowledge.",
    primaryAction: "Build Review Plan",
    material: "Past papers, lecture memory",
    output: "Short-answer report",
    decisions: [
      decision("saq_style", "Answer style", "Choose the answer style.", [
        "Concise exam-needed points",
        "Definitions plus examples",
        "Lecture-order revision sheet",
      ]),
      decision("notes_support", "Notes support", "Choose whether notes should be included.", [
        "Generate notes first",
        "Report only",
        "Use existing memory only",
      ]),
    ],
  },
  {
    id: "exam-long-answer",
    system: "exam",
    title: "Long Answer / Data Prep",
    route: "long_answer_preparation",
    intent: "Prepare long-answer, scenario, practical, data, or past-paper walkthrough routes.",
    primaryAction: "Build Review Plan",
    material: "Questions, datasets, practical material",
    output: "Long-answer report",
    decisions: [
      decision("question_type", "Question type", "Choose the dominant question type.", [
        "Scenario / long answer",
        "Data interpretation",
        "Practical method",
      ]),
      decision("answer_depth", "Answer depth", "Choose how detailed the preparation should be.", [
        "Answer structure + example answer",
        "Knowledge map only",
        "Full walkthrough",
      ]),
    ],
  },
  {
    id: "exam-worked-solutions",
    system: "exam",
    title: "Worked Solutions",
    route: "worked_solution_preparation",
    intent: "Develop calculation, derivation, proof, estimate, and data/problem solutions.",
    primaryAction: "Build Review Plan",
    material: "Problem sheets, calculations, data questions",
    output: "Worked-solution notes",
    decisions: [
      decision("solution_format", "Solution format", "Choose the worked-solution format.", [
        "Full teaching walkthrough",
        "Concise answer key",
        "Assumptions and units focus",
      ]),
      decision("problem_scope", "Problem scope", "Choose the problem scope.", [
        "Every extracted problem",
        "Selected hard problems",
        "One target question",
      ]),
    ],
  },
  {
    id: "exam-essay",
    system: "exam",
    title: "Essay Exam Prep",
    route: "essay_preparation",
    intent: "Prepare essay-style exam answers with course detail and optional extra reading.",
    primaryAction: "Build Review Plan",
    material: "Essay prompts, lectures, readings",
    output: "Essay prep report",
    decisions: [
      decision("essay_evidence", "Evidence depth", "Choose the evidence blend.", [
        "Course material + extra reading",
        "Course material only",
        "Extra reading leads first",
      ]),
      decision("essay_output", "Output", "Choose the essay prep output.", [
        "Claim plan + example paragraphs",
        "Full model answer",
        "Evidence map only",
      ]),
    ],
  },
  {
    id: "exam-online-essay",
    system: "exam",
    title: "Online Essay Exam",
    route: "online_essay_exam_drafting",
    intent: "Prepare an online essay exam with explicit source-permission gates.",
    primaryAction: "Build Review Plan",
    material: "Lecture materials + allowed online materials",
    output: "Evidence map + plan",
    decisions: [
      decision("online_permissions", "Allowed sources", "Choose the source permission boundary.", [
        "Lecture + approved online materials",
        "Lecture materials only",
        "Ask before external material",
      ]),
      decision("draft_output", "Output", "Choose the handoff target.", [
        "Plan first",
        "Plan + draft",
        "Evidence map only",
      ]),
    ],
  },
  {
    id: "exam-question-solving",
    system: "exam",
    title: "Question Solving",
    route: "question_solving",
    intent: "Solve a target question with matching course memory and transfer practice.",
    primaryAction: "Build Review Plan",
    material: "Target question",
    output: "Solution report",
    decisions: [
      decision("solution_depth", "Solution depth", "Choose the answer depth.", [
        "Teach the reasoning",
        "Concise answer",
        "Worked solution with transfer questions",
      ]),
      decision("matching_scope", "Matching scope", "Choose how to find similar material.", [
        "Strict same knowledge point",
        "Same lecture unit",
        "Whole course memory",
      ]),
    ],
  },
  {
    id: "exam-question-organization",
    system: "exam",
    title: "Question Organization",
    route: "question_organizing",
    intent: "Sort past-paper and practice questions by lecture or knowledge-unit order.",
    primaryAction: "Build Review Plan",
    material: "Past papers, practice material, lecture order",
    output: "Organized questions DOCX",
    decisions: [
      decision("organization_order", "Sort order", "Choose how questions should be ordered.", [
        "Lecture knowledge-unit order",
        "Past-paper year order",
        "Difficulty order",
      ]),
      decision("answer_visibility", "Answer content", "Choose whether answers should be included.", [
        "Questions only",
        "Questions plus short tags",
        "Questions plus answer hints",
      ]),
    ],
  },
  {
    id: "exam-mixed",
    system: "exam",
    title: "Mixed Exam Prep",
    route: "mixed_exam_preparation",
    intent: "Confirm and prepare mixed exam components across notes, MCQ, SAQ, essay, and worked routes.",
    primaryAction: "Build Review Plan",
    material: "Mixed course and exam material",
    output: "Mixed route plan",
    decisions: [
      decision("mixed_components", "Components", "Choose the confirmed components.", [
        "Notes + MCQ + SAQ",
        "Notes + essay + long answer",
        "All detected routes",
      ]),
      decision("priority", "Priority", "Choose the main priority.", [
        "Exam format coverage",
        "Weak topics",
        "Upcoming deadline",
      ]),
    ],
  },
  {
    id: "daily-notes",
    system: "daily",
    title: "Daily Notes Generation",
    route: "daily_notes_generation",
    intent: "Generate day-to-day teaching notes from lecture slides, transcripts, timetable context, and stored preferences.",
    primaryAction: "Prepare Daily Notes",
    material: "Lecture slides, transcripts, timetable",
    output: "Daily teaching notes plan",
    decisions: [
      decision("daily_scope", "Daily scope", "Choose the daily notes scope.", [
        "Today and next class",
        "This teaching week",
        "Selected uploaded sources",
      ]),
      decision("notes_preference", "Notes preference", "Choose the notes style.", [
        "Explanation-first teaching notes",
        "Condensed study notes",
        "Slides plus spoken additions",
      ]),
    ],
  },
  {
    id: "daily-timetable",
    system: "daily",
    title: "Timetable Review",
    route: "timetable_review",
    intent: "Turn timetable, deadlines, and announcements into an actionable study schedule.",
    primaryAction: "Prepare Timetable Plan",
    material: "Timetable, announcements, deadlines",
    output: "Study schedule plan",
    decisions: [
      decision("schedule_window", "Schedule window", "Choose the schedule window.", [
        "Next 7 days",
        "Next 3 days",
        "This module only",
      ]),
      decision("study_output", "Output", "Choose the schedule output.", [
        "Action list with priorities",
        "Calendar-style plan",
        "Deadline risk review",
      ]),
    ],
  },
  {
    id: "daily-lecture-gaps",
    system: "daily",
    title: "Lecture Gap Notes",
    route: "lecture_gap_notes",
    intent: "Track what the lecturer said beyond the slides and preserve it for future notes and exam work.",
    primaryAction: "Prepare Gap Memory",
    material: "Lecture slides plus transcripts",
    output: "Slide-transcript gap memory",
    decisions: [
      decision("gap_focus", "Gap focus", "Choose what to capture.", [
        "Teacher-only explanations",
        "Examples not on slides",
        "Exam hints and emphasis",
      ]),
      decision("gap_output", "Output", "Choose how the gaps should be used.", [
        "Update memory and generate notes",
        "Update memory only",
        "Make a comparison report",
      ]),
    ],
  },
  {
    id: "cw-essay",
    system: "coursework",
    title: "Write an Essay / Report",
    route: "task-type",
    intent: "Start coursework intake for essay, report, review, or assessed academic writing.",
    primaryAction: "Prepare Coursework Gate",
    material: "Brief, rubric, course memory",
    output: "Locked brief decisions",
    decisions: [
      decision("task_type", "Task type", "Choose the coursework type.", [
        "Essay or report",
        "Critical analysis",
        "Section revision",
      ]),
      decision("target_output", "Target output", "Choose the next output.", [
        "Plan first",
        "Draft after approval",
        "DOCX-ready package",
      ]),
    ],
  },
  {
    id: "cw-website",
    system: "coursework",
    title: "Interactive Website Coursework",
    route: "website-plan",
    intent: "Prepare the website coursework gate with uploaded source context and memory signals.",
    primaryAction: "Prepare Coursework Gate",
    material: "Brief, rubric, assets",
    output: "Decision gate",
    decisions: [
      decision("website_output_mode", "Output mode", "Choose the website output.", [
        "Interactive website",
        "Static website",
        "Prototype/spec only",
      ]),
      decision("website_interaction_model", "Interaction model", "Choose the main user journey.", [
        "Guided narrative",
        "Explore data or figures",
        "Decision or quiz interaction",
      ]),
      decision("evidence_base", "Evidence base", "Choose the source base for claims.", [
        "Course memory + supplied brief",
        "Course memory + external research",
        "Supplied files only",
      ]),
    ],
  },
  {
    id: "cw-lab",
    system: "coursework",
    title: "Lab Analysis",
    route: "lab-analysis",
    intent: "Route data-supported coursework with analysis tool and source decisions.",
    primaryAction: "Prepare Coursework Gate",
    material: "Dataset, method, rubric",
    output: "Analysis gate",
    decisions: [
      decision("analysis_tool", "Analysis tool", "Select the analysis tool.", [
        "GraphPad Prism",
        "R / Python / MatLab",
        "Spreadsheet or other",
      ]),
      decision("analysis_scope", "Analysis scope", "Choose how data should be handled.", [
        "Report supplied output only",
        "Check and reproduce analysis",
        "Plan analysis first",
      ]),
    ],
  },
  {
    id: "cw-poster",
    system: "coursework",
    title: "Poster Plan",
    route: "poster-plan",
    intent: "Prepare an academic poster plan with message hierarchy and source evidence.",
    primaryAction: "Prepare Coursework Gate",
    material: "Poster brief, figures, rubric",
    output: "Poster structure",
    decisions: [
      decision("poster_audience", "Audience", "Choose the expected reader.", [
        "Academic marker",
        "Conference audience",
        "Mixed public audience",
      ]),
      decision("poster_density", "Density", "Choose the content density.", [
        "Rubric-led density",
        "Concise visual poster",
        "Data-heavy poster",
      ]),
    ],
  },
  {
    id: "cw-presentation",
    system: "coursework",
    title: "Presentation Plan",
    route: "presentation-plan",
    intent: "Create a presentation storyboard, slide plan, and speaker-support gate.",
    primaryAction: "Prepare Coursework Gate",
    material: "Presentation brief, timing, rubric",
    output: "Storyboard",
    decisions: [
      decision("presentation_timing", "Timing", "Choose the pacing target.", [
        "Use assignment timing",
        "Concise assessed talk",
        "User-specified timing",
      ]),
      decision("speaker_notes", "Speaker notes", "Choose the delivery support.", [
        "Slides and notes",
        "Slides only",
        "Script first",
      ]),
    ],
  },
  {
    id: "cw-figure",
    system: "coursework",
    title: "Figure / Legend Plan",
    route: "figure-plan",
    intent: "Plan source-backed figures, captions, legends, and generation handoff.",
    primaryAction: "Prepare Coursework Gate",
    material: "Data, source image, figure brief",
    output: "Figure packet",
    decisions: [
      decision("figure_goal", "Figure goal", "Choose what the figure must do.", [
        "Explain mechanism",
        "Show result",
        "Compare conditions",
      ]),
      decision("figure_output", "Figure output", "Choose the figure handoff.", [
        "Generation plan",
        "Legend contract",
        "QA checklist",
      ]),
    ],
  },
  {
    id: "cw-section",
    system: "coursework",
    title: "Section Review",
    route: "section-review",
    intent: "Review a draft section against rubric, memory, and feedback signals.",
    primaryAction: "Prepare Coursework Gate",
    material: "Draft section",
    output: "Revision gate",
    decisions: [
      decision("review_scope", "Review scope", "Choose what should be checked.", [
        "Argument and evidence",
        "Style and structure",
        "Requirement fit",
      ]),
      decision("feedback_weight", "Feedback weight", "Choose how strongly stored feedback should steer revision.", [
        "Use recurring feedback strongly",
        "Use feedback as secondary signal",
        "Ignore old feedback for this task",
      ]),
    ],
  },
  {
    id: "cw-critical-analysis",
    system: "coursework",
    title: "Critical Analysis",
    route: "critical-analysis",
    intent: "Build a critical-analysis stance, limitations, synthesis, and evaluation plan.",
    primaryAction: "Prepare Coursework Gate",
    material: "Brief, readings, draft argument",
    output: "Critical-analysis gate",
    decisions: [
      decision("critical_stance", "Critical stance", "Choose the dominant critical move.", [
        "Evaluate evidence quality",
        "Compare theories or mechanisms",
        "Expose limitations and implications",
      ]),
      decision("analysis_depth", "Depth", "Choose the critical-analysis depth.", [
        "Discussion-level critique",
        "Paragraph-level integration",
        "High-level plan only",
      ]),
    ],
  },
  {
    id: "cw-planning-approval",
    system: "coursework",
    title: "Approve Coursework Plan",
    route: "planning-approval",
    intent: "Review a visible coursework plan and choose what to include, condense, or exclude.",
    primaryAction: "Prepare Coursework Gate",
    material: "Visible plan",
    output: "Planning approval",
    decisions: [
      decision("approval_action", "Plan decision", "Choose the planning decision.", [
        "Approve and continue",
        "Revise structure first",
        "Change evidence or scope",
      ]),
      decision("revision_focus", "Revision focus", "Choose the plan revision focus.", [
        "Include more evidence",
        "Condense sections",
        "Exclude off-brief material",
      ]),
    ],
  },
  {
    id: "cw-writing-gate",
    system: "coursework",
    title: "Writing Gate",
    route: "writing-gate",
    intent: "Resolve plan-breaking writing decisions before drafting or revising.",
    primaryAction: "Prepare Coursework Gate",
    material: "Locked brief, plan, evidence map",
    output: "Writing decision gate",
    decisions: [
      decision("writing_action", "Writing action", "Choose the next writing action.", [
        "Start drafting",
        "Revise existing draft",
        "Pause for missing evidence",
      ]),
      decision("output_format", "Output format", "Choose the working output format.", [
        "Chat draft",
        "DOCX draft",
        "Section-by-section plan",
      ]),
    ],
  },
];

function decision(id: string, title: string, prompt: string, options: string[]): Decision {
  return { id, title, prompt, options, recommended: options[0] };
}

function App() {
  const [activeSection, setActiveSection] = React.useState<SectionId>("workspace");
  const [system, setSystem] = React.useState<SystemId>("exam");
  const [selectedTaskId, setSelectedTaskId] = React.useState("exam-notes");
  const [course, setCourse] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [bridge, setBridge] = React.useState<BridgeState>("checking");
  const [codex, setCodex] = React.useState<CodexState>({ state: "checking", available: false, authenticated: false });
  const [outputState, setOutputState] = React.useState<OutputState>("Idle");
  const [memory, setMemory] = React.useState<MemoryContext>(fallbackMemory(""));
  const [decisions, setDecisions] = React.useState<Record<string, string>>({});
  const [sourceRoles, setSourceRoles] = React.useState<Record<string, boolean>>({
    lecture_materials: true,
    recordings_transcripts: true,
    assignments: true,
    readings: false,
  });
  const [uploadRole, setUploadRole] = React.useState<SourceRoleId>("lecture_materials");
  const [uploadedSources, setUploadedSources] = React.useState<SourceUpload[]>([]);
  const [writingSample, setWritingSample] = React.useState("");
  const [notesPreference, setNotesPreference] = React.useState("");
  const [outputs, setOutputs] = React.useState<string[]>(["Bridge check pending"]);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advancedExport, setAdvancedExport] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const visibleTasks = tasks.filter((task) => task.system === system);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? tasks[0];

  React.useEffect(() => {
    const next = tasks.find((task) => task.system === system);
    if (next) {
      setSelectedTaskId(next.id);
      setDecisions(seedDecisions(next));
    }
  }, [system]);

  React.useEffect(() => {
    setDecisions(seedDecisions(selectedTask));
  }, [selectedTask.id]);

  React.useEffect(() => {
    checkBridge();
  }, []);

  async function checkBridge() {
    setBridge("checking");
    try {
      const health = await fetchJson(`${bridgeUrl}/api/health`);
      setBridge("online");
      setCodex(health.codex ?? { state: "unknown", available: false, authenticated: false });
      setOutputs(["Local bridge connected", "Memory and Codex controls are available"]);
      void refreshMemory(false);
    } catch {
      setBridge("offline");
      setCodex({ state: "offline", available: false, authenticated: false });
      setOutputs(["Bridge offline handoff active", "Start the local bridge to read memory and execute adapters"]);
      setMemory(fallbackMemory(course));
    }
  }

  async function refreshMemory(showBusy = true) {
    if (showBusy) setBusy(true);
    setOutputState("Refreshing memory");
    try {
      const context = await fetchJson(`${bridgeUrl}/api/university/memory/context`, {
        method: "POST",
        body: JSON.stringify({
          course,
          taskKind: system,
          selectedRoute: selectedTask.route,
          userPrompt: prompt,
        }),
      });
      setMemory(context);
      setBridge("online");
      setOutputState("Memory ready");
      setOutputs(["Memory context ready", `${context.readiness?.score ?? 0}/${context.readiness?.total ?? 5} memory areas populated`]);
    } catch {
      setBridge("offline");
      const fallback = fallbackMemory(course);
      setMemory(fallback);
      setOutputState("Offline handoff");
      setOutputs(["Offline handoff active", "The page is using a local fallback until the bridge is available"]);
    } finally {
      setBusy(false);
    }
  }

  async function connectCodex() {
    setBusy(true);
    try {
      const response = await fetchJson(`${bridgeUrl}/api/codex/oauth/start`, { method: "POST", body: "{}" });
      setCodex(response);
      setBridge("online");
      setOutputs([
        response.deviceCode ? `Device code: ${response.deviceCode}` : "Codex OAuth started",
        response.authUrl ? "Open the verification URL shown by the bridge" : response.detail ?? "Refresh status after login",
      ]);
    } catch {
      setBridge("offline");
      setOutputs(["Codex OAuth needs the local bridge", "Start the bridge, then run Connect Codex again"]);
    } finally {
      setBusy(false);
    }
  }

  async function runPrimaryAction() {
    setBusy(true);
    const memoryContext = memory.course === course ? memory : fallbackMemory(course);
    try {
      if (selectedTask.system === "coursework") {
        const payload = await fetchJson(`${bridgeUrl}/api/coursework/payload`, {
          method: "POST",
          body: JSON.stringify({
            scenario: selectedTask.route,
            context: { course, prompt, selected_decisions: decisions, source_roles: sourceRoles },
            memoryContext,
          }),
        });
        setOutputState("Decision payload ready");
        setOutputs([
          "Coursework decision gate ready",
          `${Array.isArray(payload.questions) ? payload.questions.length : 0} required decisions prepared`,
          "Run with Codex when the selected choices are correct",
        ]);
        await buildRunContext(payload);
      }

      if (selectedTask.system === "exam") {
        const plan = await fetchJson(`${bridgeUrl}/api/exam/plan`, {
          method: "POST",
          body: JSON.stringify({
            prompt,
            sourceScan: { course, source_roles: sourceRoles, route_hint: selectedTask.route },
            memoryContext,
          }),
        });
        const review = await fetchJson(`${bridgeUrl}/api/exam/review`, {
          method: "POST",
          body: JSON.stringify({
            workflowPlan: plan,
            sourceScan: { course, source_roles: sourceRoles, route_hint: selectedTask.route },
            memoryContext,
          }),
        });
        const count = Array.isArray(review.questions) ? review.questions.length : Array.isArray(review.batches) ? review.batches.length : 1;
        setOutputState("Review questions ready");
        setOutputs(["Exam Prep review plan ready", `${count} review decision groups prepared`, "Run with Codex to continue with confirmed course memory"]);
        await buildRunContext({ plan, review });
      }

      if (selectedTask.system === "daily") {
        const context = await fetchJson(`${bridgeUrl}/api/university/memory/context`, {
          method: "POST",
          body: JSON.stringify({
            course,
            taskKind: "daily",
            selectedRoute: selectedTask.route,
            userPrompt: prompt,
          }),
        });
        setMemory(context);
        setOutputState("Plan ready");
        setOutputs([
          "Daily notes memory context ready",
          `${context.readiness?.score ?? 0}/${context.readiness?.total ?? 5} memory areas populated`,
          "Run with Codex to generate the daily notes or timetable plan",
        ]);
        await buildRunContext({ context, selected_decisions: decisions, source_roles: sourceRoles });
      }
    } catch {
      const offlinePacket = offlineRunContext(selectedTask, course, decisions, sourceRoles, memoryContext, prompt);
      setBridge("offline");
      setOutputState("Offline handoff");
      setOutputs(["Offline handoff ready", "The bridge is unavailable, but the selected task and memory intent are preserved"]);
      setAdvancedExport(offlinePacket.codex_prompt);
    } finally {
      setBusy(false);
    }
  }

  async function buildCollectionPlan() {
    setBusy(true);
    try {
      const plan = await fetchJson(`${bridgeUrl}/api/university/automation/plan`, {
        method: "POST",
        body: JSON.stringify({
          profile: "three-day",
          courseScope: course ? `${course} only` : "all configured courses",
          allowedAccessModes: ["authenticated_browser", "official_export"],
          stores: ["materials", "announcements", "timetable"],
        }),
      });
      setOutputState("Automation plan ready");
      setOutputs(["Collection plan ready", `${plan.name ?? "Automation spec"} generated`]);
      setAdvancedExport(plan.prompt ?? JSON.stringify(plan, null, 2));
    } catch {
      setBridge("offline");
      setOutputState("Offline handoff");
      setOutputs(["Collection plan needs the local bridge", "Settings still preserve the selected memory scope"]);
    } finally {
      setBusy(false);
    }
  }

  async function handleSourceFiles(files: FileList | null) {
    if (!files?.length) return;
    const nextSources = await Promise.all(
      Array.from(files).map(async (file) => {
        const preview = await readFilePreview(file);
        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
          role: uploadRole,
          name: file.name,
          size: file.size,
          kind: detectFileKind(file.name, file.type),
          contentHint: sourceContentHint(uploadRole, file.name, file.type),
          preview,
        };
      }),
    );
    setUploadedSources((current) => [...nextSources, ...current]);
    setOutputState("Memory ready");
    setOutputs([`${nextSources.length} source file${nextSources.length === 1 ? "" : "s"} staged`, "Review the detected contents before writing memory"]);
  }

  function updateUploadedSourceRole(id: string, role: SourceRoleId) {
    setUploadedSources((current) => current.map((source) => (source.id === id ? { ...source, role, contentHint: sourceContentHint(role, source.name, source.kind) } : source)));
  }

  async function saveUploadedSources() {
    if (!uploadedSources.length) {
      setOutputs(["No uploaded sources staged", "Choose lecture slides, transcripts, assignments, or readings first"]);
      return;
    }
    if (!course.trim()) {
      setOutputs(["Course / module is required before writing source memory", "The staged source inventory remains visible on this page"]);
      return;
    }
    setBusy(true);
    try {
      for (const source of uploadedSources) {
        await fetchJson(`${bridgeUrl}/api/university/memory/append`, {
          method: "POST",
          body: JSON.stringify({
            store: source.role,
            course,
            record: {
              source: {
                platform: "browser_upload",
                access_mode: "user_supplied",
                file_name: source.name,
              },
              title: source.name,
              material_type: materialTypeForRole(source.role),
              file_size_bytes: source.size,
              content_hint: source.contentHint,
              browser_preview: source.preview,
            },
          }),
        });
      }
      setBridge("online");
      setOutputState("Memory updated");
      setOutputs([`${uploadedSources.length} source record${uploadedSources.length === 1 ? "" : "s"} written`, "Refresh Memory to reload source counts"]);
      void refreshMemory(false);
    } catch {
      setBridge("offline");
      setOutputState("Offline handoff");
      setOutputs(["Source memory write needs the local bridge", "The upload inventory remains staged in the browser"]);
    } finally {
      setBusy(false);
    }
  }

  async function updateWritingMemory() {
    const sample = writingSample.trim();
    const preference = notesPreference.trim();
    if (!sample && !preference) {
      setOutputs(["No writing memory input", "Paste a writing sample or notes preference first"]);
      return;
    }
    setBusy(true);
    try {
      if (sample) {
        await fetchJson(`${bridgeUrl}/api/university/memory/append`, {
          method: "POST",
          body: JSON.stringify({
            store: "writing_samples",
            record: {
              source: { platform: "browser_form", access_mode: "user_supplied" },
              title: "User writing sample",
              sample_text: sample,
              signal_type: "writing_style",
            },
          }),
        });
      }
      if (preference) {
        await fetchJson(`${bridgeUrl}/api/university/memory/append`, {
          method: "POST",
          body: JSON.stringify({
            store: "notes_preferences",
            record: {
              source: { platform: "browser_form", access_mode: "user_supplied" },
              title: "Notes preference",
              preference_text: preference,
              signal_type: "notes_preference",
            },
          }),
        });
      }
      setWritingSample("");
      setNotesPreference("");
      setBridge("online");
      setOutputState("Memory updated");
      setOutputs(["Writing and notes preference memory updated", "Refresh Memory to reload personalized signals"]);
      void refreshMemory(false);
    } catch {
      setBridge("offline");
      setOutputState("Offline handoff");
      setOutputs(["Writing memory update needs the local bridge", "The form content is still visible for retry"]);
    } finally {
      setBusy(false);
    }
  }

  async function buildRunContext(generatedPayload: Record<string, unknown>) {
    const body = {
      selectedSystem: selectedTask.system,
      selectedRoute: selectedTask.route,
      course,
      userChoices: decisions,
      sourceRoles,
      memoryContext: memory,
      generatedPayload,
      confirmedState: { outputState, bridge },
      nextAction: selectedTask.primaryAction,
    };
    try {
      const packet = await fetchJson(`${bridgeUrl}/api/run-context`, { method: "POST", body: JSON.stringify(body) });
      setAdvancedExport(packet.codex_prompt ?? JSON.stringify(packet, null, 2));
      return packet;
    } catch {
      const packet = offlineRunContext(selectedTask, course, decisions, sourceRoles, memory, prompt);
      setAdvancedExport(packet.codex_prompt);
      return packet;
    }
  }

  async function runWithCodex() {
    setBusy(true);
    const packet = {
      selectedSystem: selectedTask.system,
      selectedRoute: selectedTask.route,
      course,
      userChoices: decisions,
      sourceRoles,
      memoryContext: memory,
      generatedPayload: {},
      confirmedState: { outputState, bridge },
      nextAction: "Run with Codex",
    };
    try {
      const handoff = await fetchJson(`${bridgeUrl}/api/codex/handoff`, {
        method: "POST",
        body: JSON.stringify({ packet }),
      });
      setAdvancedExport(handoff.codex_prompt ?? JSON.stringify(handoff, null, 2));
      setOutputs(["Codex handoff ready", handoff.codex_command ?? "Use the generated handoff in Codex"]);
    } catch {
      const fallback = offlineRunContext(selectedTask, course, decisions, sourceRoles, memory, prompt);
      setAdvancedExport(fallback.codex_prompt);
      setOutputs(["Offline Codex handoff ready", "Copy the advanced handoff after starting Codex manually"]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar
        activeSection={activeSection}
        onSection={setActiveSection}
        bridge={bridge}
        codex={codex}
        onConnect={connectCodex}
        busy={busy}
      />
      <div className="console-grid">
        <LeftRail
          system={system}
          setSystem={setSystem}
          tasks={visibleTasks}
          selectedTaskId={selectedTask.id}
          onTask={setSelectedTaskId}
          course={course}
          setCourse={setCourse}
        />
        <main className="workspace">
          {activeSection === "workspace" && (
            <TaskWorkspace
              task={selectedTask}
              course={course}
              prompt={prompt}
              setPrompt={setPrompt}
              decisions={decisions}
              setDecision={(id, value) => setDecisions((current) => ({ ...current, [id]: value }))}
              sourceRoles={sourceRoles}
              memory={memory}
              outputState={outputState}
              outputs={outputs}
              busy={busy}
              onPrimary={runPrimaryAction}
              onRunCodex={runWithCodex}
            />
          )}
          {activeSection === "sources" && (
            <SourcesView
              sourceRoles={sourceRoles}
              toggleSource={(id) => setSourceRoles((current) => ({ ...current, [id]: !current[id] }))}
              uploadRole={uploadRole}
              setUploadRole={setUploadRole}
              uploadedSources={uploadedSources}
              onFiles={handleSourceFiles}
              onSourceRole={updateUploadedSourceRole}
              onSaveSources={saveUploadedSources}
              memory={memory}
              course={course}
              busy={busy}
            />
          )}
          {activeSection === "settings" && (
            <SettingsView
              bridgeUrl={bridgeUrl}
              bridge={bridge}
              codex={codex}
              course={course}
              setCourse={setCourse}
              memory={memory}
              busy={busy}
              onCheck={checkBridge}
              onConnect={connectCodex}
              onRefreshMemory={() => refreshMemory(true)}
              onBuildCollectionPlan={buildCollectionPlan}
              writingSample={writingSample}
              setWritingSample={setWritingSample}
              notesPreference={notesPreference}
              setNotesPreference={setNotesPreference}
              onUpdateWritingMemory={updateWritingMemory}
            />
          )}
        </main>
        <Inspector
          task={selectedTask}
          course={course}
          memory={memory}
          bridge={bridge}
          codex={codex}
          outputState={outputState}
          outputs={outputs}
          advancedOpen={advancedOpen}
          setAdvancedOpen={setAdvancedOpen}
          advancedExport={advancedExport}
        />
      </div>
    </div>
  );
}

function Topbar({
  activeSection,
  onSection,
  bridge,
  codex,
  onConnect,
  busy,
}: {
  activeSection: SectionId;
  onSection: (section: SectionId) => void;
  bridge: BridgeState;
  codex: CodexState;
  onConnect: () => void;
  busy: boolean;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <strong>Everything University</strong>
          <span>Control Center</span>
        </div>
      </div>
      <nav className="nav-tabs" aria-label="Primary">
        <button className={activeSection === "workspace" ? "active" : ""} onClick={() => onSection("workspace")}>
          Workspace
        </button>
        <button className={activeSection === "sources" ? "active" : ""} onClick={() => onSection("sources")}>
          Sources
        </button>
        <button className={activeSection === "settings" ? "active" : ""} onClick={() => onSection("settings")}>
          Settings
        </button>
      </nav>
      <div className="topbar-actions">
        <StatusPill state={bridge === "online" ? "connected" : bridge === "checking" ? "pending" : "warn"} label={bridgeLabel(bridge)} />
        <button className="primary-outline" disabled={busy} onClick={onConnect}>
          <KeyRound aria-hidden="true" />
          {codex.authenticated ? "Codex Connected" : "Connect Codex"}
        </button>
      </div>
    </header>
  );
}

function LeftRail({
  system,
  setSystem,
  tasks,
  selectedTaskId,
  onTask,
  course,
  setCourse,
}: {
  system: SystemId;
  setSystem: (system: SystemId) => void;
  tasks: Task[];
  selectedTaskId: string;
  onTask: (id: string) => void;
  course: string;
  setCourse: (course: string) => void;
}) {
  return (
    <aside className="left-rail">
      <section>
        <div className="rail-title">
          <span>Course Scope</span>
          <GraduationCap aria-hidden="true" />
        </div>
        <label className="field-label" htmlFor="course-code">
          Course / module
        </label>
        <input
          id="course-code"
          className="text-input"
          value={course}
          placeholder="Optional"
          onChange={(event) => setCourse(event.target.value)}
        />
      </section>

      <section>
        <div className="rail-title">
          <span>Task family</span>
          <Layers3 aria-hidden="true" />
        </div>
        <div className="system-stack">
          <button className={system === "exam" ? "selected" : ""} onClick={() => setSystem("exam")}>
            <BookOpen aria-hidden="true" />
            <span>Exam Prep</span>
          </button>
          <button className={system === "coursework" ? "selected" : ""} onClick={() => setSystem("coursework")}>
            <FileText aria-hidden="true" />
            <span>Coursework</span>
          </button>
          <button className={system === "daily" ? "selected" : ""} onClick={() => setSystem("daily")}>
            <CalendarDays aria-hidden="true" />
            <span>Daily Notes</span>
          </button>
        </div>
      </section>

      <section>
        <div className="rail-title">
          <span>Task</span>
          <Activity aria-hidden="true" />
        </div>
        <div className="task-list">
          {tasks.map((task) => (
            <button key={task.id} className={selectedTaskId === task.id ? "task-row selected" : "task-row"} onClick={() => onTask(task.id)}>
              <span>
                <strong>{task.title}</strong>
                <small>{task.intent}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function TaskWorkspace({
  task,
  course,
  prompt,
  setPrompt,
  decisions,
  setDecision,
  sourceRoles,
  memory,
  outputState,
  outputs,
  busy,
  onPrimary,
  onRunCodex,
}: {
  task: Task;
  course: string;
  prompt: string;
  setPrompt: (prompt: string) => void;
  decisions: Record<string, string>;
  setDecision: (id: string, value: string) => void;
  sourceRoles: Record<string, boolean>;
  memory: MemoryContext;
  outputState: OutputState;
  outputs: string[];
  busy: boolean;
  onPrimary: () => void;
  onRunCodex: () => void;
}) {
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => initialChatMessages(task));
  const [questionBusy, setQuestionBusy] = React.useState(false);

  React.useEffect(() => {
    setDraft("");
    setMessages(initialChatMessages(task));
  }, [task.id]);

  async function generateQuestions() {
    const userText = draft.trim();
    const combinedPrompt = userText ? [prompt.trim(), userText].filter(Boolean).join("\n\n") : prompt.trim();
    if (userText) {
      setPrompt(combinedPrompt);
      setMessages((current) => [
        ...current,
        {
          id: createId("user"),
          role: "user",
          text: userText,
        },
      ]);
      setDraft("");
    }

    setQuestionBusy(true);
    try {
      const response = (await fetchJson(`${bridgeUrl}/api/ai/questions`, {
        method: "POST",
        body: JSON.stringify({
          selectedSystem: task.system,
          selectedRoute: task.route,
          taskTitle: task.title,
          taskIntent: task.intent,
          course,
          prompt: combinedPrompt || userText || task.intent,
          sourceRoles,
          memoryContext: memory,
          currentAnswers: decisions,
          defaultQuestions: task.decisions,
          conversation: messages.slice(-6).map((message) => ({ role: message.role, text: message.text })),
        }),
      })) as AIQuestionsResponse;
      applyGeneratedQuestions(response);
    } catch {
      applyGeneratedQuestions(browserFallbackQuestions(task, memory, combinedPrompt || userText));
    } finally {
      setQuestionBusy(false);
    }
  }

  function applyGeneratedQuestions(response: AIQuestionsResponse) {
    const questions = normalizeGeneratedQuestions(response.questions ?? []);
    questions.forEach((question) => {
      const id = question.decisionId ?? question.id;
      if (!decisions[id] && question.recommended) {
        setDecision(id, question.recommended);
      }
    });
    setMessages((current) => [
      ...current,
      {
        id: createId("assistant"),
        role: "assistant",
        mode: response.mode ?? "fallback",
        text:
          response.assistant_message ??
          "Answer these questions so the run can use the right materials, output shape, and memory context.",
        questions,
      },
    ]);
  }

  function selectOption(question: GeneratedQuestion, option: string) {
    setDecision(question.decisionId ?? question.id, option);
  }

  return (
    <div className="workspace-inner">
      <section className="command-header">
        <div>
          <h1>{task.title}</h1>
          <p>{task.intent}</p>
        </div>
        <div className="command-actions">
          <button className="primary-button" disabled={busy} onClick={onPrimary}>
            <Play aria-hidden="true" />
            {task.primaryAction}
          </button>
        </div>
      </section>

      <section className="chat-panel" aria-label="Task conversation">
        <div className="chat-panel-head">
          <div>
            <span className="section-kicker">Live task intake</span>
            <h2>Answer AI questions</h2>
          </div>
          <StatusPill state={statusToPill(questionBusy ? "Refreshing memory" : outputState)} label={questionBusy ? "Generating questions" : outputState} />
        </div>

        <div className="task-context-strip">
          <span>{familyLabel(task.system)}</span>
          <span>{task.material}</span>
          <span>{task.output}</span>
        </div>

        <div className="chat-stream" aria-live="polite">
          {messages.map((message) => (
            <ChatMessageView key={message.id} message={message} decisions={decisions} onSelectOption={selectOption} />
          ))}
        </div>

        <div className="run-footer">
          <div className="output-list compact-output">
            {outputs.slice(0, 3).map((output) => (
              <div className="output-row" key={output}>
                <CheckCircle2 aria-hidden="true" />
                <span>{output}</span>
              </div>
            ))}
          </div>
          <button className="primary-outline" disabled={busy || questionBusy} onClick={onRunCodex}>
            <Sparkles aria-hidden="true" />
            Run with Codex
          </button>
        </div>

        <div className="chat-composer">
          <MessageSquare aria-hidden="true" />
          <textarea
            aria-label="Message to agent"
            value={draft}
            placeholder="Describe the task, paste the question, or ask what the agent needs before running."
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                void generateQuestions();
              }
            }}
          />
          <div className="chat-composer-actions">
            <button className="ghost-button" disabled={busy || questionBusy} onClick={generateQuestions}>
              <Send aria-hidden="true" />
              Generate Questions
            </button>
          </div>
        </div>
        <div className="operation-note chat-note">
          <ShieldCheck aria-hidden="true" />
          <span>Upload lecture slides, transcripts, assignments, and readings from the Sources page before relying on source-grounded answers.</span>
        </div>
      </section>
    </div>
  );
}

function ChatMessageView({
  message,
  decisions,
  onSelectOption,
}: {
  message: ChatMessage;
  decisions: Record<string, string>;
  onSelectOption: (question: GeneratedQuestion, option: string) => void;
}) {
  return (
    <article className={`chat-message ${message.role}`}>
      <div className="chat-avatar" aria-hidden="true">
        {message.role === "assistant" ? <Sparkles /> : <GraduationCap />}
      </div>
      <div className="chat-bubble">
        <p>{message.text}</p>
        {message.questions?.length ? (
          <div className="question-stack">
            <span className="question-mode">{message.mode === "ai" ? "AI-generated questions" : "Bridge fallback questions"}</span>
            {message.questions.map((question) => {
              const selected = decisions[question.decisionId ?? question.id] ?? "";
              return (
                <div className="question-card" key={question.id}>
                  <div>
                    <h3>{question.title}</h3>
                    <p>{question.prompt}</p>
                  </div>
                  <div className="question-options">
                    {question.options.map((option) => (
                      <button key={option} className={selected === option ? "choice selected" : "choice"} onClick={() => onSelectOption(question, option)}>
                        <span>{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SourcesView({
  sourceRoles,
  toggleSource,
  uploadRole,
  setUploadRole,
  uploadedSources,
  onFiles,
  onSourceRole,
  onSaveSources,
  memory,
  course,
  busy,
}: {
  sourceRoles: Record<string, boolean>;
  toggleSource: (id: string) => void;
  uploadRole: SourceRoleId;
  setUploadRole: (id: SourceRoleId) => void;
  uploadedSources: SourceUpload[];
  onFiles: (files: FileList | null) => void;
  onSourceRole: (id: string, role: SourceRoleId) => void;
  onSaveSources: () => void;
  memory: MemoryContext;
  course: string;
  busy: boolean;
}) {
  return (
    <div className="workspace-inner">
      <section className="command-header">
        <div>
          <h1>Upload Sources</h1>
          <p>Stage lecture slides, transcripts, assignment briefs, and readings, then write their source records into local memory.</p>
        </div>
        <button className="primary-button" disabled={busy || !uploadedSources.length} onClick={onSaveSources}>
          <Database aria-hidden="true" />
          Write Source Memory
        </button>
      </section>
      <div className="source-upload-grid">
        <section className="operation-panel upload-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Upload</span>
              <h2>Source intake</h2>
            </div>
            <UploadCloud aria-hidden="true" />
          </div>
          <div className="upload-role-grid" role="group" aria-label="Upload source type">
            {sourceRoleLabels.map(([id, label]) => (
              <button key={id} className={uploadRole === id ? "choice selected" : "choice"} onClick={() => setUploadRole(id)}>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <label className="upload-drop" htmlFor="source-upload">
            <UploadCloud aria-hidden="true" />
            <strong>Choose files</strong>
            <span>PDF, PPTX, DOCX, TXT, VTT, SRT, images, or exports. The browser shows metadata and text previews when available.</span>
          </label>
          <input id="source-upload" className="file-input" type="file" multiple onChange={(event) => onFiles(event.currentTarget.files)} />
        </section>

        <section className="operation-panel upload-panel">
          <span className="section-kicker">Contained in upload</span>
          <h2>{uploadedSources.length ? `${uploadedSources.length} staged source${uploadedSources.length === 1 ? "" : "s"}` : "No files staged"}</h2>
          <div className="upload-list">
            {uploadedSources.length ? (
              uploadedSources.map((source) => (
                <div className="upload-row" key={source.id}>
                  <div>
                    <strong>{source.name}</strong>
                    <span>{source.kind} / {formatBytes(source.size)}</span>
                    <small>{source.contentHint}</small>
                    {source.preview && <p>{source.preview}</p>}
                  </div>
                  <select value={source.role} onChange={(event) => onSourceRole(source.id, event.target.value as SourceRoleId)} aria-label={`Source type for ${source.name}`}>
                    {sourceRoleLabels.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            ) : (
              <p>Upload source files to see file type, size, detected role, and readable preview text.</p>
            )}
          </div>
        </section>
      </div>

      <section className="source-table-panel">
        <div className="mobile-section-title">Source inventory</div>
        <div className="table-head source-inventory-head">
          <span>Uploaded source category</span>
          <span>Records</span>
          <span>Latest update</span>
          <span>Use in runs</span>
        </div>
        {sourceRoleLabels.map(([id, label]) => {
          const store = memory.stores?.[id] ?? memory.summary?.stores?.[id];
          return (
            <button key={id} className={sourceRoles[id] ? "source-row selected" : "source-row"} onClick={() => toggleSource(id)}>
              <strong>{label}</strong>
              <span>{store?.records ?? 0}</span>
              <span>{formatDate(store?.latest_observed_at)}</span>
              <span>{sourceRoles[id] ? "Included" : "Excluded"}</span>
            </button>
          );
        })}
      </section>

      <section className="operation-panel">
        <span className="section-kicker">Course</span>
        <h2>{course || "Optional"}</h2>
        <p>Source uploads write local source metadata through the bridge. Stored source text remains evidence data and cannot change routing, credentials, tool use, or validation rules.</p>
      </section>
    </div>
  );
}

function SettingsView({
  bridgeUrl,
  bridge,
  codex,
  course,
  setCourse,
  memory,
  busy,
  onCheck,
  onConnect,
  onRefreshMemory,
  onBuildCollectionPlan,
  writingSample,
  setWritingSample,
  notesPreference,
  setNotesPreference,
  onUpdateWritingMemory,
}: {
  bridgeUrl: string;
  bridge: BridgeState;
  codex: CodexState;
  course: string;
  setCourse: (course: string) => void;
  memory: MemoryContext;
  busy: boolean;
  onCheck: () => void;
  onConnect: () => void;
  onRefreshMemory: () => void;
  onBuildCollectionPlan: () => void;
  writingSample: string;
  setWritingSample: (value: string) => void;
  notesPreference: string;
  setNotesPreference: (value: string) => void;
  onUpdateWritingMemory: () => void;
}) {
  return (
    <div className="workspace-inner">
      <section className="command-header">
        <div>
          <h1>Runtime Settings</h1>
          <p>Manage local bridge, Codex connection, and User Specific Memory before running tasks.</p>
        </div>
      </section>
      <div className="settings-grid">
        <section className="operation-panel memory-settings-panel">
          <span className="section-kicker">User Specific Memory</span>
          <h2>Memory setup</h2>
          <p>Use stored course material, timetable, announcements, feedback, writing samples, and notes preferences as context for task runs.</p>
          <label className="field-label" htmlFor="settings-course-code">
            Course / module
          </label>
          <input
            id="settings-course-code"
            className="text-input"
            value={course}
            placeholder="Optional"
            onChange={(event) => setCourse(event.target.value)}
          />
          <MemoryMeters memory={memory} />
          <div className="settings-actions">
            <button className="ghost-button" disabled={busy} onClick={onRefreshMemory}>
              <RefreshCcw aria-hidden="true" />
              Refresh Memory
            </button>
            <button className="primary-outline" disabled={busy} onClick={onBuildCollectionPlan}>
              <Database aria-hidden="true" />
              Build Collection Plan
            </button>
          </div>
        </section>
        <section className="operation-panel memory-settings-panel">
          <span className="section-kicker">Generate Memory</span>
          <h2>Daily source memories</h2>
          <p>These stores support memory generation rather than normal source upload selection.</p>
          <div className="memory-store-grid">
            {memoryGenerationLabels.map(([id, label]) => {
              const store = memory.stores?.[id] ?? memory.summary?.stores?.[id];
              return (
                <div className={(store?.records ?? 0) > 0 ? "memory-store-card active" : "memory-store-card"} key={id}>
                  <strong>{label}</strong>
                  <span>{store?.records ?? 0} records</span>
                  <small>{formatDate(store?.latest_observed_at)}</small>
                </div>
              );
            })}
          </div>
        </section>
        <section className="operation-panel memory-settings-panel">
          <span className="section-kicker">Writing Memory</span>
          <h2>Writing style and notes preferences</h2>
          <p>Paste your own writing and notes preferences so future runs can match your style and preferred explanation format.</p>
          <div className="writing-memory-grid">
            <label>
              <span className="field-label">Writing sample</span>
              <textarea
                value={writingSample}
                placeholder="Paste a paragraph or previous answer you wrote."
                onChange={(event) => setWritingSample(event.target.value)}
                aria-label="Writing sample"
              />
            </label>
            <label>
              <span className="field-label">Notes preference</span>
              <textarea
                value={notesPreference}
                placeholder="Describe how you want notes to be structured, detailed, or condensed."
                onChange={(event) => setNotesPreference(event.target.value)}
                aria-label="Notes preference"
              />
            </label>
          </div>
          <div className="settings-actions">
            <button className="primary-outline" disabled={busy} onClick={onUpdateWritingMemory}>
              <Database aria-hidden="true" />
              Update Writing Memory
            </button>
          </div>
        </section>
        <section className="operation-panel">
          <span className="section-kicker">Bridge</span>
          <h2>{bridgeLabel(bridge)}</h2>
          <InfoPair label="Endpoint" value={bridgeUrl} />
          <button className="ghost-button" onClick={onCheck}>
            <Server aria-hidden="true" />
            Check Bridge
          </button>
        </section>
        <section className="operation-panel">
          <span className="section-kicker">OAuth</span>
          <h2>{codex.authenticated ? "Codex connected" : "Codex sign-in required"}</h2>
          <p>{codex.detail ?? "Connect through the local bridge when you want to hand off a run to Codex."}</p>
          {codex.deviceCode && <div className="device-code">{codex.deviceCode}</div>}
          <button className="primary-button" onClick={onConnect}>
            <KeyRound aria-hidden="true" />
            Connect Codex
          </button>
        </section>
      </div>
    </div>
  );
}

function Inspector({
  task,
  course,
  memory,
  bridge,
  codex,
  outputState,
  outputs,
  advancedOpen,
  setAdvancedOpen,
  advancedExport,
}: {
  task: Task;
  course: string;
  memory: MemoryContext;
  bridge: BridgeState;
  codex: CodexState;
  outputState: OutputState;
  outputs: string[];
  advancedOpen: boolean;
  setAdvancedOpen: (open: boolean) => void;
  advancedExport: string;
}) {
  const gaps = memory.readiness?.source_gaps ?? memory.summary?.missing_stores ?? [];
  return (
    <aside className="inspector">
      <section className="inspector-title">
        <div>
          <span className="section-kicker">Inspector</span>
          <h2>Run Readiness</h2>
        </div>
        <StatusPill state={bridge === "online" ? "connected" : "warn"} label={bridgeLabel(bridge)} />
      </section>

      <section>
        <h3>Selected task</h3>
        <InfoPair label="Task" value={task.title} />
        <InfoPair label="Family" value={familyLabel(task.system)} />
        <InfoPair label="Course" value={course || "Optional"} />
        <InfoPair label="Memory" value={`${memory.readiness?.score ?? 0}/${memory.readiness?.total ?? 5}`} />
      </section>

      <section>
        <h3>Source gaps</h3>
        <div className="gap-list">
          {gaps.length ? gaps.slice(0, 6).map((gap) => <span key={gap}>{gap}</span>) : <span className="pass">No critical source gaps detected</span>}
        </div>
      </section>

      <section>
        <h3>Writing signals</h3>
        <div className="signal-list">
          {(memory.writing_style_signals ?? []).length ? (
            memory.writing_style_signals?.slice(0, 3).map((signal) => <p key={signal}>{signal}</p>)
          ) : (
            <p>No stored writing sample or feedback yet.</p>
          )}
        </div>
      </section>

      <section>
        <h3>Run status</h3>
        <InfoPair label="State" value={outputState} />
        <InfoPair label="Codex" value={codex.authenticated ? `Connected${codex.authMethod ? ` (${codex.authMethod})` : ""}` : codex.state} />
        <div className="event-log">
          {outputs.slice(0, 4).map((output) => (
            <span key={output}>{output}</span>
          ))}
        </div>
      </section>

      <section>
        <button className="advanced-button" onClick={() => setAdvancedOpen(!advancedOpen)}>
          <TerminalSquare aria-hidden="true" />
          Advanced export
        </button>
        {advancedOpen && (
          <textarea className="advanced-export" readOnly value={advancedExport || "No handoff generated yet."} aria-label="Advanced export" />
        )}
      </section>
    </aside>
  );
}

function MemoryMeters({ memory }: { memory: MemoryContext }) {
  const stores = [
    ["lecture_materials", "Slides"],
    ["recordings_transcripts", "Transcript"],
    ["lecture_gap_notes", "Gaps"],
    ["timetable", "Time"],
    ["writing_samples", "Writing"],
    ["notes_preferences", "Notes pref"],
  ] as const;
  return (
    <div className="memory-meters">
      {stores.map(([id, label]) => {
        const records = memory.stores?.[id]?.records ?? memory.summary?.stores?.[id]?.records ?? 0;
        return (
          <div className={records > 0 ? "meter active" : "meter"} key={id}>
            <span>{label}</span>
            <strong>{records}</strong>
          </div>
        );
      })}
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="info-pair">
      <span>{label}</span>
      <strong>{String(value || "Not set")}</strong>
    </div>
  );
}

function StatusPill({ state, label }: { state: "connected" | "pending" | "warn"; label: string }) {
  return <span className={`status-pill ${state}`}>{label}</span>;
}

function seedDecisions(task: Task): Record<string, string> {
  return Object.fromEntries(task.decisions.map((item) => [item.id, item.recommended]));
}

function initialChatMessages(task: Task): ChatMessage[] {
  return [
    {
      id: createId("assistant"),
      role: "assistant",
      text:
        `You selected ${task.title}. Tell me the concrete task, then generate questions so the agent can decide what to ask before running.`,
    },
  ];
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeGeneratedQuestions(questions: GeneratedQuestion[]) {
  return questions
    .map((question, index) => {
      const options = Array.isArray(question.options)
        ? question.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4)
        : [];
      return {
        id: safeQuestionId(question.id || question.decisionId || `question_${index + 1}`),
        title: String(question.title || `Question ${index + 1}`).trim(),
        prompt: String(question.prompt || "Choose the best option before running.").trim(),
        options: options.length ? options : ["Use best judgment", "Ask me first", "Use memory only"],
        recommended: question.recommended ? String(question.recommended) : options[0],
        decisionId: question.decisionId ? safeQuestionId(question.decisionId) : undefined,
      };
    })
    .slice(0, 6);
}

function safeQuestionId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || createId("question");
}

function browserFallbackQuestions(task: Task, memory: MemoryContext, prompt: string): AIQuestionsResponse {
  const gaps = memory.readiness?.source_gaps ?? memory.summary?.missing_stores ?? [];
  const questions: GeneratedQuestion[] = [
    {
      id: `${task.id}_target`,
      title: "Target outcome",
      prompt: `What should ${task.title} produce for this run?`,
      options: [task.output, "Plan first", "Ask me for missing details"],
      recommended: task.output,
    },
    {
      id: `${task.id}_source_boundary`,
      title: "Source boundary",
      prompt: gaps.length
        ? `Memory is missing ${gaps.slice(0, 3).join(", ")}. How should the agent handle source gaps?`
        : "How should the agent use the available course memory and uploaded sources?",
      options: ["Use available memory and flag gaps", "Ask before continuing", "Use uploaded sources only"],
      recommended: "Use available memory and flag gaps",
    },
  ];
  const routeQuestion = task.decisions[0];
  if (routeQuestion) {
    questions.push({
      id: `${task.id}_${routeQuestion.id}`,
      decisionId: routeQuestion.id,
      title: routeQuestion.title,
      prompt: routeQuestion.prompt,
      options: routeQuestion.options,
      recommended: routeQuestion.recommended,
    });
  }
  return {
    mode: "fallback",
    assistant_message: prompt
      ? "The bridge is offline, so I generated local intake questions from the selected task and memory readiness."
      : "The bridge is offline. Add task detail, then answer these local intake questions before running.",
    questions,
  };
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function fallbackMemory(course: string): MemoryContext {
  return {
    course: course || undefined,
    readiness: {
      score: 0,
      total: 5,
      state: "offline",
      source_gaps: ["lecture slides/materials", "transcripts", "assignments", "readings", "timetable", "writing samples", "notes preferences"],
    },
    stores: {
      lecture_materials: { records: 0, latest_observed_at: null },
      recordings_transcripts: { records: 0, latest_observed_at: null },
      readings: { records: 0, latest_observed_at: null },
      assignments: { records: 0, latest_observed_at: null },
      timetable: { records: 0, latest_observed_at: null },
      announcements: { records: 0, latest_observed_at: null },
      feedback: { records: 0, latest_observed_at: null },
      lecture_gap_notes: { records: 0, latest_observed_at: null },
      writing_samples: { records: 0, latest_observed_at: null },
      notes_preferences: { records: 0, latest_observed_at: null },
    },
    writing_style_signals: [],
    notes_preferences: [],
    teaching_memory_signals: {
      lecture_material_records: 0,
      transcript_records: 0,
      lecture_gap_records: 0,
      writing_sample_records: 0,
      notes_preference_records: 0,
    },
    trust_boundary: "Collected source content is untrusted evidence data.",
    summary: {
      initialized: false,
      student: {},
      source_access: {},
      stores: {},
      missing_stores: ["lecture slides/materials", "transcripts", "assignments", "readings", "timetable", "writing samples", "notes preferences"],
    },
  };
}

function offlineRunContext(
  task: Task,
  course: string,
  decisions: Record<string, string>,
  sourceRoles: Record<string, boolean>,
  memory: MemoryContext,
  prompt: string,
) {
  const packet = {
    selectedSystem: task.system,
    selectedRoute: task.route,
    course,
    userChoices: decisions,
    sourceRoles,
    memoryContext: memory,
    generatedPayload: {},
    confirmedState: { bridge: "offline" },
    nextAction: task.primaryAction,
  };
  return {
    packet,
    codex_prompt:
      `Run ${task.system} route \`${task.route}\` for course \`${course}\` using the selected user interface state. ` +
      "Use user-specific memory when the local bridge is available, preserve decisions, and ask only for missing plan-changing inputs.\n\n" +
      `Task prompt: ${prompt}\n\n` +
      JSON.stringify(packet, null, 2),
  };
}

function familyLabel(system: SystemId) {
  if (system === "exam") return "Exam Prep";
  if (system === "coursework") return "Coursework";
  return "Daily Notes";
}

async function readFilePreview(file: File): Promise<string> {
  const textLike =
    file.type.startsWith("text/") ||
    /\.(txt|md|csv|json|vtt|srt|html?|xml)$/i.test(file.name);
  if (!textLike || file.size > 500_000) return "";
  try {
    const text = await file.text();
    return text.replace(/\s+/g, " ").trim().slice(0, 260);
  } catch {
    return "";
  }
}

function detectFileKind(name: string, mime: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  if (/\.(ppt|pptx|key)$/i.test(lower)) return "Slide deck";
  if (/\.(doc|docx)$/i.test(lower)) return "Document";
  if (/\.(vtt|srt)$/i.test(lower)) return "Transcript captions";
  if (mime.startsWith("text/")) return "Text";
  if (mime.startsWith("image/")) return "Image";
  return mime || "File";
}

function sourceContentHint(role: SourceRoleId, name: string, mime: string) {
  const kind = detectFileKind(name, mime);
  if (role === "lecture_materials") return `${kind}; expected to contain slides, lecture notes, module pages, or source visuals.`;
  if (role === "recordings_transcripts") return `${kind}; expected to contain spoken lecture content, captions, or transcript text.`;
  if (role === "assignments") return `${kind}; expected to contain assignment brief, rubric, marking criteria, or submission instructions.`;
  return `${kind}; expected to contain required or optional course reading material.`;
}

function materialTypeForRole(role: SourceRoleId) {
  if (role === "lecture_materials") return "slide_deck";
  if (role === "recordings_transcripts") return "transcript";
  if (role === "assignments") return "assignment_brief";
  return "reading";
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function bridgeLabel(bridge: BridgeState) {
  if (bridge === "online") return "Bridge online";
  if (bridge === "checking") return "Checking bridge";
  return "Bridge offline";
}

function statusToPill(state: OutputState): "connected" | "pending" | "warn" {
  if (state.includes("ready") || state.includes("Ready")) return "connected";
  if (state.includes("Offline")) return "warn";
  return "pending";
}

function formatDate(value?: string | null) {
  if (!value) return "No record";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
