import { Download, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { AttendanceRecord, Course } from '../types/attendance';

interface Props {
  courses: Course[];
  refreshKey: number;
}

export function AttendanceRecordsView({ courses, refreshKey }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getAttendance({
          courseCode: courseFilter,
          status: statusFilter,
          date: dateFilter || undefined,
        });
        if (active) setRecords(res.records);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load attendance records.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [courseFilter, statusFilter, dateFilter, refreshKey]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q) ||
        r.courseCode.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  function exportCsv() {
    const headers = ['Date', 'Course Code', 'Roll Number', 'Student Name', 'Status', 'Marked By', 'Remarks'];
    const rows = filteredRecords.map((r) => [
      r.date,
      r.courseCode,
      r.rollNumber,
      `"${r.studentName.replace(/"/g, '""')}"`,
      r.status,
      `"${r.markedBy.replace(/"/g, '""')}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Attendance Records Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Filter, review, and export historical attendance records across courses, dates, and statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredRecords.length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roll number or student name..."
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by course"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-700 focus:outline-none"
        >
          <option value="ALL">All Courses</option>
          {courses.map((c) => (
            <option key={c.courseCode} value={c.courseCode}>
              {c.courseCode} — {c.title}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-700 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="Present">Present</option>
          <option value="Late">Late</option>
          <option value="Absent">Absent</option>
        </select>

        <input
          type="date"
          aria-label="Filter by date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-800 focus:border-blue-700 focus:outline-none"
        />

        {(courseFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setCourseFilter('ALL');
              setStatusFilter('ALL');
              setDateFilter('');
              setSearchQuery('');
            }}
            className="h-9 px-2.5 text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0"
          >
            Reset Filters
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-xs text-slate-600">
          <span className="font-medium text-slate-800">
            Showing <span className="font-mono tabular-nums">{filteredRecords.length}</span> records
          </span>
          <span>Ordered by most recent session date</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Roll Number</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="h-11 animate-pulse">
                    <td className="px-4 py-2.5"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                    <td className="px-4 py-2.5"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    <td className="px-4 py-2.5"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                    <td className="px-4 py-2.5"><div className="h-4 w-32 rounded bg-slate-200" /></td>
                    <td className="px-4 py-2.5"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    <td className="px-4 py-2.5"><div className="h-4 w-28 rounded bg-slate-200" /></td>
                  </tr>
                ))
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No attendance records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.slice(0, 100).map((record) => {
                  const statusTone =
                    record.status === 'Present'
                      ? 'text-emerald-700'
                      : record.status === 'Late'
                      ? 'text-amber-700'
                      : 'text-red-700';

                  return (
                    <tr key={record._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {record.date}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-800 whitespace-nowrap">
                        {record.courseCode}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {record.rollNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {record.studentName}
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap ${statusTone}`}>
                        {record.status}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {record.markedBy}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
