import yargs from 'yargs';
import type { AttendanceStatus } from '../src/types/attendance.ts';
import { readAttendanceLogs } from './logger.ts';
import {
  addStudent,
  computeStudentSummary,
  markAttendanceBatch,
  readDatabase,
} from './store.ts';

function tokenizeCommand(commandLine: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes: '"' | "'" | null = null;

  for (let i = 0; i < commandLine.length; i++) {
    const ch = commandLine[i];
    if (inQuotes) {
      if (ch === inQuotes) {
        inQuotes = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuotes = ch;
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

export async function runYargsCommand(argvOrLine: string[] | string): Promise<{
  exitCode: number;
  output: string;
}> {
  const rawTokens = Array.isArray(argvOrLine) ? argvOrLine : tokenizeCommand(argvOrLine);
  // Strip optional leading executable/script names if user typed `node cli.ts ...` or `attendance ...`
  let tokens = [...rawTokens];
  if (tokens[0] === 'node' || tokens[0] === 'npx' || tokens[0] === 'tsx') {
    tokens = tokens.slice(1);
    if (tokens[0] === 'tsx') tokens = tokens.slice(1);
    if (tokens[0]?.includes('attendance-cli')) tokens = tokens.slice(1);
  } else if (tokens[0] === 'attendance' || tokens[0] === 'attendance-cli') {
    tokens = tokens.slice(1);
  }

  const lines: string[] = [];
  let exitCode = 0;

  const parser = yargs(tokens)
    .scriptName('attendance-cli')
    .usage('Usage: $0 <command> [options]')
    .exitProcess(false)
    .fail((msg, err) => {
      exitCode = 1;
      lines.push(`Error: ${err ? err.message : msg}`);
    })
    .command(
      'add-student',
      'Register a new student record',
      (y) =>
        y
          .option('roll', { type: 'string', demandOption: true, describe: 'Student roll number (e.g. BVOC511)' })
          .option('name', { type: 'string', demandOption: true, describe: 'Full student name' })
          .option('email', { type: 'string', demandOption: true, describe: 'University email address' })
          .option('dept', { type: 'string', default: 'B.Voc (Software Development)', describe: 'Department' })
          .option('sem', { type: 'number', default: 5, describe: 'Semester number' }),
      async (args) => {
        const student = await addStudent({
          rollNumber: args.roll,
          name: args.name,
          email: args.email,
          department: args.dept,
          semester: args.sem,
          actor: 'yargs-cli',
        });
        lines.push(`Created student: ${student.rollNumber} — ${student.name} (Sem ${student.semester})`);
        lines.push(`Audit entry appended to logs/attendance.log`);
      }
    )
    .command(
      'mark',
      'Mark attendance for a student in a course',
      (y) =>
        y
          .option('course', { type: 'string', demandOption: true, describe: 'Course code (e.g. BV501)' })
          .option('roll', { type: 'string', demandOption: true, describe: 'Student roll number' })
          .option('date', {
            type: 'string',
            default: new Date().toISOString().slice(0, 10),
            describe: 'Session date (YYYY-MM-DD)',
          })
          .option('status', {
            type: 'string',
            choices: ['Present', 'Absent', 'Late'] as const,
            demandOption: true,
            describe: 'Attendance status',
          }),
      async (args) => {
        const saved = await markAttendanceBatch({
          courseCode: args.course,
          date: args.date,
          markedBy: 'Yargs CLI Operator',
          entries: [{ rollNumber: args.roll, status: args.status as AttendanceStatus }],
        });
        const rec = saved[0];
        lines.push(
          `Marked ${rec.status} for ${rec.rollNumber} (${rec.studentName}) in ${rec.courseCode} on ${rec.date}`
        );
        lines.push(`Audit entry appended to logs/attendance.log`);
      }
    )
    .command(
      'report',
      'Print attendance percentage breakdown for a student',
      (y) =>
        y.option('roll', {
          type: 'string',
          demandOption: true,
          describe: 'Student roll number (e.g. BVOC501)',
        }),
      async (args) => {
        const db = await readDatabase();
        const student = db.students.find(
          (s) => s.rollNumber.toUpperCase() === args.roll.trim().toUpperCase()
        );
        if (!student) {
          throw new Error(`No student found with roll number ${args.roll}`);
        }
        const summary = computeStudentSummary(student, db.courses, db.attendance);
        lines.push(`Attendance Report: ${student.rollNumber} — ${student.name}`);
        lines.push(`Department: ${student.department} | Semester: ${student.semester}`);
        lines.push(
          `Overall Attendance: ${summary.overallPercentage.toFixed(1)}% (${summary.presentCount + summary.lateCount}/${summary.totalSessions} sessions) [${summary.eligible ? 'ELIGIBLE >= 75%' : 'SHORTAGE < 75%'}]`
        );
        lines.push('--- Subject Breakdown ---');
        for (const sub of summary.subjects) {
          lines.push(
            `${sub.courseCode.padEnd(7)} ${sub.courseTitle.padEnd(34)} ${String(sub.percentage.toFixed(1) + '%').padStart(7)} (${sub.presentCount + sub.lateCount}/${sub.totalSessions})`
          );
        }
      }
    )
    .command(
      'logs',
      'Inspect recent lines from logs/attendance.log',
      (y) =>
        y.option('lines', {
          type: 'number',
          default: 10,
          describe: 'Number of trailing log entries to display',
        }),
      async (args) => {
        const logData = await readAttendanceLogs(args.lines);
        lines.push(`Reading ${logData.entries.length} of ${logData.totalLines} entries from ${logData.filePath}`);
        for (const entry of [...logData.entries].reverse()) {
          lines.push(entry.raw);
        }
      }
    )
    .demandCommand(1, 'Please specify a command: add-student, mark, report, or logs')
    .help()
    .version(false)
    .strict();

  try {
    if (tokens.includes('--help') || tokens.includes('-h') || tokens.length === 0) {
      const helpText = await parser.getHelp();
      return { exitCode: tokens.length === 0 ? 1 : 0, output: helpText };
    }
    await parser.parseAsync();
  } catch (err) {
    exitCode = 1;
    lines.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    exitCode,
    output: lines.join('\n'),
  };
}
