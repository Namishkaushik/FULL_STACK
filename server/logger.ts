import fs from 'node:fs/promises';
import path from 'node:path';
import type { LogEntry } from '../src/types/attendance.ts';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
export const LOG_FILE_PATH = path.join(LOG_DIR, 'attendance.log');

async function ensureLogFile(): Promise<void> {
  await fs.mkdir(LOG_DIR, { recursive: true });
  try {
    await fs.access(LOG_FILE_PATH);
  } catch {
    const initialEntries = [
      `[${new Date().toISOString()}] [SYSTEM_INIT] [actor:server] Attendance log initialized via Node.js fs/promises`,
      `[${new Date().toISOString()}] [SEED_LOAD] [actor:admin] Loaded B.Voc Software Development Sem 5 student, faculty, and attendance collections`,
    ].join('\n') + '\n';
    await fs.writeFile(LOG_FILE_PATH, initialEntries, 'utf8');
  }
}

export async function appendAttendanceLog(
  action: string,
  actor: string,
  details: string
): Promise<string> {
  await ensureLogFile();
  const timestamp = new Date().toISOString();
  const cleanDetails = details.replace(/\r?\n/g, ' ').trim();
  const line = `[${timestamp}] [${action}] [actor:${actor}] ${cleanDetails}\n`;
  await fs.appendFile(LOG_FILE_PATH, line, 'utf8');
  return line.trim();
}

export async function readAttendanceLogs(limit = 100): Promise<{
  filePath: string;
  totalLines: number;
  entries: LogEntry[];
  raw: string;
}> {
  await ensureLogFile();
  const content = await fs.readFile(LOG_FILE_PATH, 'utf8');
  const allLines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const sliced = allLines.slice(-Math.max(1, limit)).reverse();
  const startIndex = Math.max(0, allLines.length - sliced.length);

  const entries: LogEntry[] = sliced.map((raw, idx) => {
    const match = raw.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[actor:([^\]]+)\]\s+(.*)$/);
    const lineNumber = allLines.length - idx;
    if (match) {
      return {
        lineNumber: lineNumber > 0 ? lineNumber : startIndex + idx + 1,
        timestamp: match[1],
        action: match[2],
        actor: match[3],
        details: match[4],
        raw,
      };
    }
    return {
      lineNumber,
      timestamp: '',
      action: 'INFO',
      actor: 'system',
      details: raw,
      raw,
    };
  });

  return {
    filePath: LOG_FILE_PATH,
    totalLines: allLines.length,
    entries,
    raw: allLines.slice(-Math.max(1, limit)).join('\n'),
  };
}
