import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Student, StudentAttendanceSummary } from '../types/attendance';

interface Props {
  refreshKey: number;
}

export function StudentPortalView({ refreshKey }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
  const [allSummaries, setAllSummaries] = useState<StudentAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDirectory() {
      setLoading(true);
      setError(null);
      try {
        const [{ students: stuList }, { summaries }] = await Promise.all([
          api.getStudents(),
          api.getAllSummaries(),
        ]);
        if (!active) return;
        setStudents(stuList);
        setAllSummaries(summaries);
        if (stuList.length > 0 && !selectedStudentId) {
          setSelectedStudentId(stuList[0]._id);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load student data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDirectory();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedStudentId) return;
    let active = true;
    async function loadSummary() {
      try {
        const { summary: s } = await api.getStudentSummary(selectedStudentId);
        if (active) setSummary(s);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load summary.');
      }
    }
    loadSummary();
    return () => {
      active = false;
    };
  }, [selectedStudentId, refreshKey]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Student Attendance Percentage Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect subject-wise attendance percentages and university examination eligibility (minimum 75.0% threshold).
          </p>
        </div>

        <div>
          <label htmlFor="student-picker" className="block text-xs font-medium text-slate-600 mb-1">
            View as Student
          </label>
          <select
            id="student-picker"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="h-10 min-w-[260px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
          >
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.rollNumber} — {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      {loading || !summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white p-5" />
          ))}
        </div>
      ) : (
        <>
          {/* Student Header & 4-Column Metric Strip */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span className="font-mono font-semibold text-slate-900">{summary.student.rollNumber}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-800">{summary.student.name}</span>
              <span aria-hidden="true">·</span>
              <span>{summary.student.department}</span>
              <span aria-hidden="true">·</span>
              <span>Semester {summary.student.semester}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">Overall Attendance</div>
                <div
                  className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${
                    summary.eligible ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {summary.overallPercentage.toFixed(1)}%
                </div>
                <div
                  className={`mt-1 text-xs font-medium ${
                    summary.eligible ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {summary.eligible ? 'Eligible for University Exams' : 'Shortage Warning (Below 75%)'}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">Sessions Attended</div>
                <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
                  {summary.presentCount + summary.lateCount}
                  <span className="text-base font-normal text-slate-400">
                    /{summary.totalSessions}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {summary.presentCount} Present · {summary.lateCount} Late
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">Absences Logged</div>
                <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
                  {summary.absentCount}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Across {summary.subjects.length} enrolled courses
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">Requirement Target</div>
                <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
                  75.0%
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {summary.eligible
                    ? `+${(summary.overallPercentage - 75).toFixed(1)}% above minimum`
                    : `${(75 - summary.overallPercentage).toFixed(1)}% needed to qualify`}
                </div>
              </div>
            </div>
          </div>

          {/* Subject-wise Breakdown Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-base font-semibold text-slate-900">Subject-Wise Attendance Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="px-5 py-3 font-medium">Course</th>
                    <th className="px-5 py-3 font-medium text-right">Attended</th>
                    <th className="px-5 py-3 font-medium text-right">Absent</th>
                    <th className="px-5 py-3 font-medium">Progress</th>
                    <th className="px-5 py-3 font-medium text-right">Percentage</th>
                    <th className="px-5 py-3 font-medium">Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.subjects.map((sub) => (
                    <tr key={sub.courseCode} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          {sub.courseCode}
                        </div>
                        <div className="text-xs text-slate-600">{sub.courseTitle}</div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-800 tabular-nums">
                        {sub.presentCount + sub.lateCount}/{sub.totalSessions}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {sub.absentCount}
                      </td>
                      <td className="px-5 py-3 w-44">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              sub.eligible ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(100, sub.percentage)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {sub.percentage.toFixed(1)}%
                      </td>
                      <td
                        className={`px-5 py-3 text-xs font-semibold whitespace-nowrap ${
                          sub.eligible ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {sub.eligible ? 'Eligible (>=75%)' : 'Shortage (<75%)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cohort Comparison Overview */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-base font-semibold text-slate-900">Cohort Attendance Standing</h2>
              <span className="text-xs text-slate-500">Click any student row to inspect</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="px-5 py-2.5 font-medium">Roll Number</th>
                    <th className="px-5 py-2.5 font-medium">Student</th>
                    <th className="px-5 py-2.5 font-medium text-right">Attended</th>
                    <th className="px-5 py-2.5 font-medium text-right">Overall %</th>
                    <th className="px-5 py-2.5 font-medium">Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allSummaries.map((item) => {
                    const isSelected = item.student._id === selectedStudentId;
                    return (
                      <tr
                        key={item.student._id}
                        onClick={() => setSelectedStudentId(item.student._id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-5 py-2.5 font-mono text-xs font-medium text-slate-700 tabular-nums">
                          {item.student.rollNumber}
                        </td>
                        <td className="px-5 py-2.5 font-medium text-slate-900">
                          {item.student.name}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {item.presentCount + item.lateCount}/{item.totalSessions}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {item.overallPercentage.toFixed(1)}%
                        </td>
                        <td
                          className={`px-5 py-2.5 text-xs font-semibold ${
                            item.eligible ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {item.eligible ? 'Eligible' : 'Shortage'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
