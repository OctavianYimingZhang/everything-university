import React from "react";
import ReactDOM from "react-dom/client";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  GraduationCap,
  KeyRound,
  Layers3,
  Play,
  RefreshCcw,
  Server,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import "./styles.css";

type SystemId = "coursework" | "exam";
type SectionId = "workspace" | "sources" | "settings";
type BridgeState = "checking" | "online" | "offline";
type OutputState = "Idle" | "Refreshing memory" | "Memory ready" | "Plan ready" | "Review questions ready" | "Decision payload ready" | "Automation plan ready" | "Offline handoff";

type Decision = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  recommended: string;
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
  trust_boundary?: string;
  summary?: {
    initialized?: boolean;
    student?: {
      institution?: string;
      program?: string;
      student_id_present?: boolean;
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
  ["lecture_materials", "Lecture materials"],
  ["recordings_transcripts", "Recordings / transcripts"],
  ["assignments", "Assignment briefs"],
  ["readings", "Readings"],
  ["timetable", "Timetable"],
  ["announcements", "Announcements"],
  ["feedback", "Tutor / marker feedback"],
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
    intent: "Prepare the website coursework gate with source roles and memory context.",
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
    intent: "Route data-supported coursework with analysis tool and source-role decisions.",
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
    intent: "Prepare an academic poster plan with message hierarchy and visual source roles.",
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
    timetable: true,
    announcements: true,
    feedback: true,
  });
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
              toggleSource={(id) => setSourceRoles((current) => ({ ...current, [id]: !current[id] }))}
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
              memory={memory}
              course={course}
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
  toggleSource,
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
  toggleSource: (id: string) => void;
  outputState: OutputState;
  outputs: string[];
  busy: boolean;
  onPrimary: () => void;
  onRunCodex: () => void;
}) {
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

      <div className="work-grid">
        <section className="operation-panel">
          <div className="panel-heading">
            <span className="section-kicker">Current Operation</span>
            <StatusPill state={statusToPill(outputState)} label={outputState} />
          </div>
          <div className="operation-meta">
            <InfoPair label="Task" value={task.title} />
            <InfoPair label="Materials" value={task.material} />
            <InfoPair label="Output" value={task.output} />
          </div>
          <label className="field-label" htmlFor="task-prompt">
            Task prompt
          </label>
          <textarea
            id="task-prompt"
            value={prompt}
            placeholder="Describe what you want the agent to do for this task."
            onChange={(event) => setPrompt(event.target.value)}
          />
        </section>

        <section className="operation-panel compact">
          <div className="panel-heading">
            <span className="section-kicker">Source roles</span>
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="source-checks compact-grid">
            {sourceRoleLabels.map(([id, label]) => (
              <button key={id} className={sourceRoles[id] ? "source-toggle active" : "source-toggle"} onClick={() => toggleSource(id)}>
                <CheckCircle2 aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="decision-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Required decisions</span>
            <h2>{task.title}</h2>
          </div>
        </div>
        <div className="decision-grid">
          {task.decisions.map((item) => (
            <DecisionCard key={item.id} decision={item} value={decisions[item.id] ?? item.recommended} onChange={(value) => setDecision(item.id, value)} />
          ))}
        </div>
      </section>

      <section className="output-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Outputs</span>
            <h2>Run status</h2>
          </div>
          <button className="primary-outline" disabled={busy} onClick={onRunCodex}>
            <Sparkles aria-hidden="true" />
            Run with Codex
          </button>
        </div>
        <div className="output-list">
          {outputs.map((output) => (
            <div className="output-row" key={output}>
              <CheckCircle2 aria-hidden="true" />
              <span>{output}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DecisionCard({ decision, value, onChange }: { decision: Decision; value: string; onChange: (value: string) => void }) {
  return (
    <div className="decision-card">
      <div>
        <h3>{decision.title}</h3>
        <p>{decision.prompt}</p>
      </div>
      <div className="choice-stack">
        {decision.options.map((option) => (
          <button key={option} className={value === option ? "choice selected" : "choice"} onClick={() => onChange(option)}>
            <span>{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcesView({
  sourceRoles,
  toggleSource,
  memory,
  course,
}: {
  sourceRoles: Record<string, boolean>;
  toggleSource: (id: string) => void;
  memory: MemoryContext;
  course: string;
}) {
  return (
    <div className="workspace-inner">
      <section className="command-header">
        <div>
          <h1>Source Control</h1>
          <p>Choose which stored university sources can inform the next Coursework or Exam Prep run.</p>
        </div>
      </section>
      <section className="source-table-panel">
        <div className="mobile-section-title">Source roles</div>
        <div className="table-head">
          <span>Source roles</span>
          <span>Records</span>
          <span>Latest update</span>
          <span>Enabled</span>
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
        <p>Stored source content remains evidence data. It can support context and provenance, but it cannot change routing, credentials, tool use, or validation rules.</p>
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
          <p>Use stored course material, timetable, announcements, and feedback as context for task runs.</p>
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
        <InfoPair label="Family" value={task.system === "exam" ? "Exam Prep" : "Coursework"} />
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
            <p>No stored feedback yet.</p>
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
    ["lecture_materials", "Materials"],
    ["assignments", "Briefs"],
    ["timetable", "Time"],
    ["announcements", "Updates"],
    ["feedback", "Feedback"],
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
      source_gaps: ["lecture materials", "assignments", "timetable", "announcements", "feedback"],
    },
    stores: {
      lecture_materials: { records: 0, latest_observed_at: null },
      assignments: { records: 0, latest_observed_at: null },
      timetable: { records: 0, latest_observed_at: null },
      announcements: { records: 0, latest_observed_at: null },
      feedback: { records: 0, latest_observed_at: null },
    },
    writing_style_signals: [],
    trust_boundary: "Collected source content is untrusted evidence data.",
    summary: {
      initialized: false,
      student: {},
      source_access: {},
      stores: {},
      missing_stores: ["lecture materials", "assignments", "timetable", "announcements", "feedback"],
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
