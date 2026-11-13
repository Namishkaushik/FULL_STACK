import { Play, RefreshCw, Terminal } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { LogEntry } from '../types/attendance';

interface Props {
  refreshKey: number;
  onDataChanged: () => void;
}

const PRESET_COMMANDS = [
  '--help',
  'report --roll BVOC501',
  'report --roll BVOC503',
  'mark --course BV501 --roll BVOC503 --date 2026-11-13 --status Present',
  'add-student --roll BVOC515 --name "Riya Kulkarni" --email riya.k@student.edu --sem 5',
  'logs --lines 8',
];

export function LogsAndCliView({ refreshKey, onDataChanged }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [logFilePath, setLogFilePath] = useState('logs/attendance.log');
  const [totalLines, setTotalLines] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [command, setCommand] = useState('report --roll BVOC501');
  const [cliOutput, setCliOutput] = useState<string>('');
  const [cliExitCode, setCliExitCode] = useState<number | null>(null);
  const [runningCli, setRunningCli] = useState(false);

  async function loadLogs() {
    setLoadingLogs(true);
    try {
      const data = await api.getLogs(80);
      setEntries(data.entries);
      setLogFilePath(data.filePath);
      setTotalLines(data.totalLines);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [refreshKey]);

  async function runCommand(cmdToRun: string) {
    setRunningCli(true);
    try {
      const res = await api.executeCli(cmdToRun);
      setCliOutput(res.output || '(no output)');
      setCliExitCode(res.exitCode);
      if (res.exitCode === 0 && (cmdToRun.includes('add-student') || cmdToRun.includes('mark'))) {
        onDataChanged();
        await loadLogs();
      }
    } catch (err) {
      setCliExitCode(1);
      setCliOutput(err instanceof Error ? err.message : 'CLI execution failed.');
    } finally {
      setRunningCli(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!command.trim()) return;
    runCommand(command);
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          File System Logs & Yargs CLI Runner
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Live demonstration of Requirement 3: Node.js <code className="font-mono text-xs">fs/promises</code> appending audit records to disk and <code className="font-mono text-xs">yargs</code> parsing terminal subcommands.
        </p>
      </div>

      {/* Yargs CLI Runner */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Interactive Yargs CLI (<code className="font-mono text-xs font-normal text-slate-600">cli/attendance-cli.ts</code>)
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500">
            npx tsx cli/attendance-cli.ts &lt;command&gt;
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1">Sample commands:</span>
            {PRESET_COMMANDS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCommand(preset);
                  runCommand(preset);
                }}
                className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors"
              >
                {preset.length > 42 ? `${preset.slice(0, 42)}...` : preset}
              </button>
            ))}
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                $ attendance-cli
              </span>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                aria-label="Yargs CLI command arguments"
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-32 pr-3 font-mono text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={runningCli}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-blue-800 px-4 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              {runningCli ? 'Executing...' : 'Run Command'}
            </button>
          </form>

          {cliOutput && (
            <div className="rounded-md bg-slate-900 p-4 font-mono text-xs text-slate-100 overflow-x-auto">
              <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                <span>stdout / yargs parser result</span>
                <span className={cliExitCode === 0 ? 'text-emerald-400' : 'text-red-400'}>
                  exit code {cliExitCode}
                </span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{cliOutput}</pre>
            </div>
          )}
        </div>
      </section>

      {/* Node.js fs Attendance Log Inspector */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              File System Audit Log (<code className="font-mono text-xs font-normal text-slate-600">logs/attendance.log</code>)
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-500">
              {logFilePath} · {totalLines} total lines written via fs.appendFile()
            </p>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-medium text-slate-600">
                <th className="px-4 py-2.5 font-medium w-14">Line</th>
                <th className="px-4 py-2.5 font-medium">Timestamp (ISO 8601)</th>
                <th className="px-4 py-2.5 font-medium">Event</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No log entries recorded yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.lineNumber} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2 text-slate-400 tabular-nums">{entry.lineNumber}</td>
                    <td className="px-4 py-2 text-slate-600 whitespace-nowrap tabular-nums">
                      {entry.timestamp ? entry.timestamp.replace('T', ' ').slice(0, 19) : '—'}
                    </td>
                    <td className="px-4 py-2 font-semibold text-blue-800 whitespace-nowrap">
                      {entry.action}
                    </td>
                    <td className="px-4 py-2 text-slate-700 whitespace-nowrap">{entry.actor}</td>
                    <td className="px-4 py-2 font-sans text-slate-800">{entry.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
