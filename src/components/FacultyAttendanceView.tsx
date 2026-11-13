import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type {
  AttendanceStatus,
  Course,
  Faculty,
  Student,
} from '../types/attendance';

interface Props {
  courses: Course[];
  facultyList: Faculty[];
  onSaved: () => void;
  onViewRecords?: (courseCode: string, date: string) => void;
}

function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function FacultyAttendanceView({ courses, facultyList, onSaved, onViewRecords }: Props) {
  const [selectedCourse, setSelectedCourse] = useState<string>(courses[0]?.courseCode || 'BV501');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalTodayIso());
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    savedCourse?: string;
    savedDate?: string;
  } | null>(null);

  useEffect(() => {
    if (courses.length > 0 && !courses.some((c) => c.courseCode === selectedCourse)) {
      setSelectedCourse(courses[0].courseCode);
    }
  }, [courses, selectedCourse]);

  useEffect(() => {
    let active = true;
    async function loadRoster() {
      setLoading(true);
      setFeedback(null);
      try {
        const [{ students: roster }, { records }] = await Promise.all([
          api.getStudents(),
          api.getAttendance({ courseCode: selectedCourse, date: selectedDate }),
        ]);
        if (!active) return;

        setStudents(roster);
        const initialStatuses: Record<string, AttendanceStatus> = {};
        const initialRemarks: Record<string, string> = {};
        for (const s of roster) {
          const existing = records.find((r) => r.studentId === s._id);
          initialStatuses[s._id] = existing ? existing.status : 'Present';
          if (existing?.remarks) initialRemarks[s._id] = existing.remarks;
        }
        setStatuses(initialStatuses);
        setRemarks(initialRemarks);
      } catch (err) {
        if (active) {
          setFeedback({
            type: 'error',
            message: err instanceof Error ? err.message : 'Unable to load student roster.',
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRoster();
    return () => {
      active = false;
    };
  }, [selectedCourse, selectedDate]);

  const activeCourse = courses.find((c) => c.courseCode === selectedCourse);
  const assignedFaculty = facultyList.find((f) => f._id === activeCourse?.facultyId);

  const counts = students.reduce(
    (acc, s) => {
      const st = statuses[s._id] || 'Present';
      acc[st] += 1;
      return acc;
    },
    { Present: 0, Late: 0, Absent: 0 }
  );

  function markAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {};
    for (const s of students) next[s._id] = status;
    setStatuses(next);
  }

  async function handleSubmit() {
    if (students.length === 0) return;
    setSaving(true);
    setFeedback(null);
    try {
      const entries = students.map((s) => ({
        studentId: s._id,
        status: statuses[s._id] || 'Present',
        remarks: remarks[s._id]?.trim() || undefined,
      }));
      const res = await api.markAttendance({
        courseCode: selectedCourse,
        date: selectedDate,
        markedBy: assignedFaculty?.name || 'Faculty',
        entries,
      });
      setFeedback({
        type: 'success',
        message: `Saved ${res.savedCount} attendance records for ${selectedCourse} on ${selectedDate}.`,
        savedCourse: selectedCourse,
        savedDate: selectedDate,
      });
      onSaved();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save attendance.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Mark Class Attendance
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Select a course and lecture date to record daily student attendance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="course-select" className="block text-xs font-medium text-slate-600 mb-1">
              Course
            </label>
            <select
              id="course-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            >
              {courses.map((c) => (
                <option key={c.courseCode} value={c.courseCode}>
                  {c.courseCode} — {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date-input" className="block text-xs font-medium text-slate-600 mb-1">
              Session Date
            </label>
            <input
              id="date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            />
          </div>
        </div>
      </div>

      {/* Session summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="font-medium text-slate-900">
            {activeCourse ? `${activeCourse.courseCode}: ${activeCourse.title}` : selectedCourse}
          </span>
          <span aria-hidden="true">·</span>
          <span>Faculty: {assignedFaculty?.name || 'Department Staff'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Present {counts.Present} · Late {counts.Late} · Absent {counts.Absent}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => markAll('Present')}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => markAll('Absent')}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Mark All Absent
          </button>
          <button
            type="button"
            disabled={saving || loading || students.length === 0}
            onClick={handleSubmit}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-800 px-4 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <span>{feedback.message}</span>
          {feedback.type === 'success' && onViewRecords && feedback.savedCourse && feedback.savedDate && (
            <button
              type="button"
              onClick={() => onViewRecords(feedback.savedCourse!, feedback.savedDate!)}
              className="text-xs font-semibold text-emerald-900 underline underline-offset-2 hover:text-emerald-700 whitespace-nowrap shrink-0"
            >
              View in Attendance Records
            </button>
          )}
        </div>
      )}

      {/* Attendance Marking Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="px-4 py-3 font-medium">Roll Number</th>
                <th className="px-4 py-3 font-medium">Student Name</th>
                <th className="px-4 py-3 font-medium">Attendance Status</th>
                <th className="px-4 py-3 font-medium">Remarks (Optional)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="h-12 animate-pulse">
                    <td className="px-4 py-2.5">
                      <div className="h-4 w-20 rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-4 w-36 rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-7 w-48 rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-7 w-44 rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                    No students enrolled yet. Add students from the Administration directory first.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const currentStatus = statuses[student._id] || 'Present';
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">
                        {student.rollNumber}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.email}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div
                          role="group"
                          aria-label={`Attendance status for ${student.name}`}
                          className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5"
                        >
                          {(['Present', 'Late', 'Absent'] as AttendanceStatus[]).map((option) => {
                            const active = currentStatus === option;
                            let activeStyle = 'bg-white text-slate-900 shadow-xs';
                            if (active && option === 'Present') {
                              activeStyle = 'bg-emerald-600 text-white shadow-xs';
                            } else if (active && option === 'Late') {
                              activeStyle = 'bg-amber-600 text-white shadow-xs';
                            } else if (active && option === 'Absent') {
                              activeStyle = 'bg-red-600 text-white shadow-xs';
                            }
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() =>
                                  setStatuses((prev) => ({ ...prev, [student._id]: option }))
                                }
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                                  active
                                    ? activeStyle
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={remarks[student._id] || ''}
                          onChange={(e) =>
                            setRemarks((prev) => ({ ...prev, [student._id]: e.target.value }))
                          }
                          placeholder="Add note..."
                          className="h-8 w-full max-w-xs rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                        />
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
