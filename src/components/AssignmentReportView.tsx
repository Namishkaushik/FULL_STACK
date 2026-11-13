import { Check, Copy, Play } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';

type QuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

const QUESTIONS: Array<{ id: QuestionId; number: string; shortTitle: string; prompt: string }> = [
  {
    id: 'q1',
    number: 'Question 1',
    shortTitle: 'Node.js & Express.js Routes',
    prompt:
      'Design a Node.js application using Express.js to create a web server and define routes for adding students, marking attendance, and viewing attendance records.',
  },
  {
    id: 'q2',
    number: 'Question 2',
    shortTitle: 'MongoDB Storage, Queries & Updates',
    prompt:
      'Explain how MongoDB can store student information and attendance records and how these records can be queried and updated.',
  },
  {
    id: 'q3',
    number: 'Question 3',
    shortTitle: 'File System Logs & Yargs CLI',
    prompt:
      'Explain how the File System module can be used to maintain attendance logs and how command-line arguments can be processed using Yargs.',
  },
  {
    id: 'q4',
    number: 'Question 4',
    shortTitle: 'Git, Jenkins & Maven Workflow',
    prompt:
      'Describe how Git, Jenkins, and Maven can be used for source code management, automated testing, and build management, wherever applicable.',
  },
  {
    id: 'q5',
    number: 'Question 5',
    shortTitle: 'Docker & Port Forwarding',
    prompt:
      'Explain how Docker can be used to containerize the attendance system and deploy it with appropriate port forwarding.',
  },
];

const ANSWER_TEXT: Record<QuestionId, string> = {
  q1: `1. Node.js & Express.js Web Server and Route Design

Architecture Overview:
The attendance system uses Node.js as the JavaScript runtime and Express.js as the HTTP web framework. Express configures JSON body parsing (express.json()), mounts REST API route handlers for students, faculty, and attendance, and binds to port 3000 (0.0.0.0) so it works both locally and inside Docker containers.

Core REST Endpoints (implemented in server.ts):
- POST /api/students : Validates rollNumber, name, email, department, and semester, then inserts a new student document and returns HTTP 201.
- GET /api/students : Retrieves enrolled students, supporting optional ?q= search filtering.
- POST /api/attendance : Accepts { courseCode, date, markedBy, entries: [{ studentId, status }] }, validates course and student IDs, upserts daily records, and logs the batch action.
- GET /api/attendance : Queries attendance records with optional query parameters (?courseCode, ?date, ?studentId, ?status).
- GET /api/attendance/summary/:studentId : Computes subject-wise and overall attendance percentages and checks the 75% university eligibility threshold.

Express.js Implementation Snippet:
import express from 'express';
const app = express();
app.use(express.json());

// Add a student
app.post('/api/students', async (req, res) => {
  const { rollNumber, name, email, department, semester } = req.body;
  if (!rollNumber || !name || !email) {
    return res.status(400).json({ error: 'rollNumber, name, and email are required.' });
  }
  const student = await addStudent({ rollNumber, name, email, department, semester });
  res.status(201).json({ student });
});

// Mark attendance
app.post('/api/attendance', async (req, res) => {
  const { courseCode, date, markedBy, entries } = req.body;
  const records = await markAttendanceBatch({ courseCode, date, markedBy, entries });
  res.status(201).json({ savedCount: records.length, records });
});

// View attendance records
app.get('/api/attendance', async (req, res) => {
  const { courseCode, date, studentId, status } = req.query;
  const records = await queryAttendance({ courseCode, date, studentId, status });
  res.json({ records, total: records.length });
});

app.listen(3000, '0.0.0.0', () => console.log('Server running on port 3000'));`,

  q2: `2. MongoDB Schema Design, Querying, and Updating

Collection Modeling (Referenced Document Pattern):
Rather than embedding unbounded attendance arrays inside a student document (which could hit MongoDB's 16 MB BSON document limit over 8 semesters), we store separate normalized collections linked by ObjectId / rollNumber:
1. students collection:
{
  "_id": ObjectId("6734a1..."),
  "rollNumber": "BVOC501",
  "name": "Aarav Sharma",
  "email": "aarav.sharma@student.edu",
  "department": "B.Voc (Software Development)",
  "semester": 5,
  "enrolledCourses": ["BV501", "BV502", "BV503", "BV504"]
}

2. attendance collection (with compound unique index { studentId: 1, courseCode: 1, date: 1 }):
{
  "_id": ObjectId("6734b8..."),
  "studentId": ObjectId("6734a1..."),
  "rollNumber": "BVOC501",
  "courseCode": "BV501",
  "date": "2026-11-13",
  "status": "Present", // "Present" | "Late" | "Absent"
  "markedBy": "Dr. Ananya Deshmukh",
  "markedAt": ISODate("2026-11-13T10:15:00Z")
}

Querying Records:
// Find all attendance records for course BV501 on a specific date
db.attendance.find({ courseCode: "BV501", date: "2026-11-13" }).sort({ rollNumber: 1 });

// Aggregation pipeline to compute student attendance percentage per subject
db.attendance.aggregate([
  { $match: { rollNumber: "BVOC501" } },
  {
    $group: {
      _id: "$courseCode",
      totalSessions: { $sum: 1 },
      attended: {
        $sum: { $cond: [{ $in: ["$status", ["Present", "Late"]] }, 1, 0] }
      }
    }
  },
  {
    $project: {
      courseCode: "$_id",
      totalSessions: 1,
      attended: 1,
      percentage: { $round: [{ $multiply: [{ $divide: ["$attended", "$totalSessions"] }, 100] }, 1] }
    }
  }
]);

Updating Records (Idempotent Upsert):
// Update or insert attendance if faculty corrects a student's status
db.attendance.updateOne(
  { rollNumber: "BVOC501", courseCode: "BV501", date: "2026-11-13" },
  {
    $set: {
      status: "Present",
      markedBy: "Dr. Ananya Deshmukh",
      markedAt: new Date()
    }
  },
  { upsert: true }
);`,

  q3: `3. Maintaining Attendance Logs with Node.js File System (fs) & Processing CLI Arguments with Yargs

File System (fs/promises) Audit Logging:
Every time a student is added or attendance is marked, the server appends a structured, immutable audit entry to logs/attendance.log using Node's fs/promises API:
- fs.mkdir(LOG_DIR, { recursive: true }) ensures the logs/ directory exists.
- fs.appendFile(LOG_FILE_PATH, line, 'utf8') atomically appends timestamped log lines without overwriting existing history.
- fs.readFile(LOG_FILE_PATH, 'utf8') reads the log file so administrators can inspect recent audit events.

Example (server/logger.ts):
import fs from 'node:fs/promises';
import path from 'node:path';

const LOG_FILE = path.resolve(process.cwd(), 'logs', 'attendance.log');

export async function appendAttendanceLog(action, actor, details) {
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  const line = \`[\${new Date().toISOString()}] [\${action}] [actor:\${actor}] \${details}\\n\`;
  await fs.appendFile(LOG_FILE, line, 'utf8');
}

Processing Command-Line Arguments with Yargs:
Yargs parses terminal flags, enforces required options, validates allowed values (choices), and generates --help documentation automatically (implemented in cli/attendance-cli.ts & server/yargsHandler.ts):

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

yargs(hideBin(process.argv))
  .command(
    'mark',
    'Mark attendance for a student',
    (y) => y
      .option('course', { type: 'string', demandOption: true })
      .option('roll', { type: 'string', demandOption: true })
      .option('status', { choices: ['Present', 'Absent', 'Late'], demandOption: true })
      .option('date', { type: 'string', default: new Date().toISOString().slice(0, 10) }),
    async (argv) => {
      await markAttendanceBatch({ ...argv });
    }
  )
  .demandCommand(1)
  .help()
  .parse();`,

  q4: `4. Git, Jenkins, and Maven for SCM, Automated Testing, and Build Management

1. Git (Source Code Management):
- Distributed version control tracks changes across server.ts, React components, CLI scripts, and configuration files.
- Branching strategy: main holds production-ready releases; feature branches (e.g., feature/faculty-attendance-api, feature/yargs-cli) isolate development until reviewed via Pull Requests.
- .gitignore excludes node_modules/, dist/, .env secrets, and runtime logs/ so only clean source code is committed.

2. Jenkins (Continuous Integration & Automated Testing):
- Jenkins monitors the Git repository via webhooks or SCM polling and executes a declarative Jenkinsfile pipeline on every push:
  - Stage 1 (Checkout SCM): Pulls the latest commit from Git.
  - Stage 2 (Install Dependencies): Runs npm ci for reproducible package versions.
  - Stage 3 (Typecheck & Lint): Executes npm run lint (tsc --noEmit) and automated API/unit tests.
  - Stage 4 (Build): Runs npm run build to generate the production Vite bundle.
  - Stage 5 (Docker Build & Deploy): Builds the container image and restarts the app with port forwarding.

3. Maven (Build Management — Where Applicable):
- For a pure Node.js/Express.js project, npm (package.json) serves as the native package and build manager.
- However, in enterprise university environments or polyglot/Jenkins pipelines standardized on Apache Maven, Maven manages standardized build lifecycles (validate -> compile -> test -> package).
- Using com.github.eirslett:frontend-maven-plugin inside pom.xml (included in this repository), Maven can automatically download Node/npm, execute npm ci, run npm run lint during the test phase, and package the application during mvn package—integrating Node.js seamlessly alongside Java/Spring microservices.`,

  q5: `5. Containerizing with Docker and Deploying with Port Forwarding

Why Docker?
Docker packages the Node.js runtime, Express server, Vite production bundle, Yargs CLI, and system dependencies into a single portable image, eliminating "works on my machine" discrepancies between development and university servers.

Multi-Stage Dockerfile (included in repository):
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install -g tsx
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
EXPOSE 3000
CMD ["tsx", "server.ts"]

Build & Deploy with Port Forwarding:
1. Build the Docker image:
   docker build -t university/attend-ledger:1.0.0 .

2. Run the container with port forwarding (-p hostPort:containerPort) and persistent volumes:
   docker run -d \\
     --name attend-ledger \\
     -p 3000:3000 \\
     -v attend_data:/app/data \\
     -v attend_logs:/app/logs \\
     university/attend-ledger:1.0.0

Explanation of Port Forwarding:
- Inside the container, Express listens on 0.0.0.0:3000 (declared via EXPOSE 3000).
- Binding to 0.0.0.0 (rather than 127.0.0.1) is essential so traffic routed across Docker's bridge network reaches Express.
- The flag -p 3000:3000 maps port 3000 on the host machine to port 3000 inside the container (or e.g. -p 8080:3000 to expose it on host port 8080), allowing browsers on the university network to access http://<server-ip>:3000.`,
};

export function AssignmentReportView() {
  const [activeQ, setActiveQ] = useState<QuestionId>('q1');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [liveApiResponse, setLiveApiResponse] = useState<string>('');
  const [testingApi, setTestingApi] = useState(false);

  const currentQuestion = QUESTIONS.find((q) => q.id === activeQ)!;

  async function copyAnswer(id: QuestionId) {
    try {
      await navigator.clipboard.writeText(ANSWER_TEXT[id]);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback ignored if clipboard permissions restricted
    }
  }

  async function testLiveEndpoint(endpoint: 'overview' | 'students' | 'logs') {
    setTestingApi(true);
    try {
      if (endpoint === 'overview') {
        const res = await api.getOverview();
        setLiveApiResponse(JSON.stringify(res, null, 2));
      } else if (endpoint === 'students') {
        const res = await api.getStudents();
        setLiveApiResponse(JSON.stringify({ count: res.students.length, sample: res.students.slice(0, 2) }, null, 2));
      } else {
        const res = await api.getLogs(5);
        setLiveApiResponse(JSON.stringify({ filePath: res.filePath, totalLines: res.totalLines, latest: res.entries.slice(0, 3) }, null, 2));
      }
    } catch (err) {
      setLiveApiResponse(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setTestingApi(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Assignment Solutions & Architecture Reference
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          B.Voc (Software Development) · Sem 5 · Full Stack Web Development - 2 — Complete technical answers backed by working code in this repository.
        </p>
      </div>

      {/* Question Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1">
        {QUESTIONS.map((q) => {
          const active = q.id === activeQ;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setActiveQ(q.id);
                setLiveApiResponse('');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {q.number}: {q.shortTitle}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      <article className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 bg-slate-50/60">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold text-blue-800">{currentQuestion.number}</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {currentQuestion.shortTitle}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">{currentQuestion.prompt}</p>
          </div>

          <button
            type="button"
            onClick={() => copyAnswer(currentQuestion.id)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedId === currentQuestion.id ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                Copied Answer
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Answer
              </>
            )}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Interactive Live Verification Bar */}
          {(activeQ === 'q1' || activeQ === 'q2' || activeQ === 'q3') && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Live Server Verification:</span>{' '}
                Inspect real JSON output directly from the running Express.js backend.
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={testingApi}
                  onClick={() =>
                    testLiveEndpoint(
                      activeQ === 'q1' ? 'overview' : activeQ === 'q2' ? 'students' : 'logs'
                    )
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded bg-blue-800 px-3 text-xs font-medium text-white hover:bg-blue-900 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Play className="h-3 w-3" />
                  {activeQ === 'q1'
                    ? 'Test GET /api/overview'
                    : activeQ === 'q2'
                    ? 'Inspect Live Student Documents'
                    : 'Test GET /api/logs'}
                </button>
              </div>
            </div>
          )}

          {liveApiResponse && (
            <div className="rounded-md bg-slate-900 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
              <pre className="whitespace-pre-wrap">{liveApiResponse}</pre>
            </div>
          )}

          {/* Formatted Technical Solution */}
          <div className="prose prose-slate max-w-none">
            <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-5 font-sans text-sm leading-relaxed text-slate-800 overflow-x-auto">
              {ANSWER_TEXT[currentQuestion.id]}
            </pre>
          </div>

          {/* Supporting Repo Files Note */}
          <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
            Implemented workspace files:{' '}
            <span className="font-mono text-slate-700">
              {activeQ === 'q1' && 'server.ts · src/api/client.ts'}
              {activeQ === 'q2' && 'server/store.ts · data/database.json'}
              {activeQ === 'q3' && 'server/logger.ts · server/yargsHandler.ts · cli/attendance-cli.ts'}
              {activeQ === 'q4' && '.gitignore · Jenkinsfile · pom.xml · package.json'}
              {activeQ === 'q5' && 'Dockerfile · .dockerignore · server.ts'}
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
