import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Course, Faculty, Student } from '../types/attendance';

interface Props {
  courses: Course[];
  refreshKey: number;
  onDataChanged: () => void;
}

export function AdminDirectoryView({ courses, refreshKey, onDataChanged }: Props) {
  const [activeTab, setActiveTab] = useState<'students' | 'faculty'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Add / Edit Student State
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [stuRoll, setStuRoll] = useState('');
  const [stuName, setStuName] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuDept, setStuDept] = useState('B.Voc (Software Development)');
  const [stuSem, setStuSem] = useState(5);

  // Add / Edit Faculty State
  const [showFacultyForm, setShowFacultyForm] = useState(false);
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);
  const [facCode, setFacCode] = useState('');
  const [facName, setFacName] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facDept, setFacDept] = useState('Software Development');
  const [facDesig, setFacDesig] = useState('Assistant Professor');
  const [facCourses, setFacCourses] = useState<string[]>([]);

  // Inline Delete Confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [{ students: s }, { faculty: f }] = await Promise.all([
          api.getStudents(),
          api.getFaculty(),
        ]);
        if (active) {
          setStudents(s);
          setFaculty(f);
        }
      } catch (err) {
        if (active) {
          setFeedback({
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to load directory.',
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  function openNewStudent() {
    setEditingStudentId(null);
    setStuRoll(`BVOC${500 + students.length + 1}`);
    setStuName('');
    setStuEmail('');
    setStuDept('B.Voc (Software Development)');
    setStuSem(5);
    setShowStudentForm(true);
    setFeedback(null);
  }

  function openEditStudent(s: Student) {
    setEditingStudentId(s._id);
    setStuRoll(s.rollNumber);
    setStuName(s.name);
    setStuEmail(s.email);
    setStuDept(s.department);
    setStuSem(s.semester);
    setShowStudentForm(true);
    setFeedback(null);
  }

  async function submitStudent(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      if (editingStudentId) {
        await api.updateStudent(editingStudentId, {
          name: stuName,
          email: stuEmail,
          department: stuDept,
          semester: Number(stuSem),
        });
        setFeedback({ type: 'success', message: `Updated student ${stuRoll} (${stuName}).` });
      } else {
        await api.createStudent({
          rollNumber: stuRoll,
          name: stuName,
          email: stuEmail,
          department: stuDept,
          semester: Number(stuSem),
        });
        setFeedback({
          type: 'success',
          message: `Added student ${stuRoll} (${stuName}) to the enrollment directory.`,
        });
      }
      setShowStudentForm(false);
      onDataChanged();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save student.',
      });
    }
  }

  async function handleDeleteStudent(id: string) {
    try {
      await api.deleteStudent(id);
      setConfirmDeleteId(null);
      setFeedback({ type: 'success', message: 'Removed student record and cascaded attendance entries.' });
      onDataChanged();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to delete student.',
      });
    }
  }

  function openNewFaculty() {
    setEditingFacultyId(null);
    setFacCode(`FAC-${101 + faculty.length}`);
    setFacName('');
    setFacEmail('');
    setFacDept('Software Development');
    setFacDesig('Assistant Professor');
    setFacCourses([]);
    setShowFacultyForm(true);
    setFeedback(null);
  }

  function openEditFaculty(f: Faculty) {
    setEditingFacultyId(f._id);
    setFacCode(f.facultyCode);
    setFacName(f.name);
    setFacEmail(f.email);
    setFacDept(f.department);
    setFacDesig(f.designation);
    setFacCourses(f.assignedCourses);
    setShowFacultyForm(true);
    setFeedback(null);
  }

  async function submitFaculty(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      if (editingFacultyId) {
        await api.updateFaculty(editingFacultyId, {
          name: facName,
          email: facEmail,
          department: facDept,
          designation: facDesig,
          assignedCourses: facCourses,
        });
        setFeedback({ type: 'success', message: `Updated faculty ${facCode} (${facName}).` });
      } else {
        await api.createFaculty({
          facultyCode: facCode,
          name: facName,
          email: facEmail,
          department: facDept,
          designation: facDesig,
          assignedCourses: facCourses,
        });
        setFeedback({
          type: 'success',
          message: `Added faculty ${facCode} (${facName}) to the department directory.`,
        });
      }
      setShowFacultyForm(false);
      onDataChanged();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save faculty.',
      });
    }
  }

  async function handleDeleteFaculty(id: string) {
    try {
      await api.deleteFaculty(id);
      setConfirmDeleteId(null);
      setFeedback({ type: 'success', message: 'Removed faculty record.' });
      onDataChanged();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to delete faculty.',
      });
    }
  }

  const q = search.trim().toLowerCase();
  const filteredStudents = q
    ? students.filter(
        (s) =>
          s.rollNumber.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      )
    : students;

  const filteredFaculty = q
    ? faculty.filter(
        (f) =>
          f.facultyCode.toLowerCase().includes(q) ||
          f.name.toLowerCase().includes(q) ||
          f.department.toLowerCase().includes(q)
      )
    : faculty;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Student & Faculty Administration
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, update, and maintain university student enrollments and faculty assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('students');
                setShowFacultyForm(false);
                setConfirmDeleteId(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'students'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Students ({students.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('faculty');
                setShowStudentForm(false);
                setConfirmDeleteId(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'faculty'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Faculty ({faculty.length})
            </button>
          </div>

          <button
            type="button"
            onClick={activeTab === 'students' ? openNewStudent : openNewFaculty}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-800 px-3.5 text-xs font-semibold text-white hover:bg-blue-900 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {activeTab === 'students' ? 'Add Student' : 'Add Faculty'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Add/Edit Student Form Panel */}
      {showStudentForm && activeTab === 'students' && (
        <form
          onSubmit={submitStudent}
          className="rounded-lg border border-slate-300 bg-white p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              {editingStudentId ? `Edit Student (${stuRoll})` : 'Register New Student'}
            </h2>
            <button
              type="button"
              onClick={() => setShowStudentForm(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Roll Number</label>
              <input
                required
                disabled={Boolean(editingStudentId)}
                value={stuRoll}
                onChange={(e) => setStuRoll(e.target.value)}
                placeholder="BVOC511"
                className="h-9 w-full rounded border border-slate-300 px-3 font-mono text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input
                required
                value={stuName}
                onChange={(e) => setStuName(e.target.value)}
                placeholder="Student Name"
                className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                required
                type="email"
                value={stuEmail}
                onChange={(e) => setStuEmail(e.target.value)}
                placeholder="name@student.edu"
                className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
              <input
                required
                value={stuDept}
                onChange={(e) => setStuDept(e.target.value)}
                className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Semester</label>
              <input
                required
                type="number"
                min={1}
                max={8}
                value={stuSem}
                onChange={(e) => setStuSem(Number(e.target.value))}
                className="h-9 w-full rounded border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowStudentForm(false)}
              className="h-9 rounded-md border border-slate-300 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 rounded-md bg-blue-800 px-4 text-xs font-semibold text-white hover:bg-blue-900"
            >
              {editingStudentId ? 'Update Student' : 'Save Student'}
            </button>
          </div>
        </form>
      )}

      {/* Add/Edit Faculty Form Panel */}
      {showFacultyForm && activeTab === 'faculty' && (
        <form
          onSubmit={submitFaculty}
          className="rounded-lg border border-slate-300 bg-white p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              {editingFacultyId ? `Edit Faculty (${facCode})` : 'Register Faculty Member'}
            </h2>
            <button
              type="button"
              onClick={() => setShowFacultyForm(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Faculty Code</label>
              <input
                required
                disabled={Boolean(editingFacultyId)}
                value={facCode}
                onChange={(e) => setFacCode(e.target.value)}
                placeholder="FAC-105"
                className="h-9 w-full rounded border border-slate-300 px-3 font-mono text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input
                required
                value={facName}
                onChange={(e) => setFacName(e.target.value)}
                placeholder="Dr. Faculty Name"
                className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                required
                type="email"
                value={facEmail}
                onChange={(e) => setFacEmail(e.target.value)}
                placeholder="faculty@university.edu"
                className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
              <input
                required
                value={facDept}
                onChange={(e) => setFacDept(e.target.value)}
                className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Designation</label>
              <input
                required
                value={facDesig}
                onChange={(e) => setFacDesig(e.target.value)}
                className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1.5">Assigned Courses</span>
            <div className="flex flex-wrap gap-3">
              {courses.map((c) => {
                const checked = facCourses.includes(c.courseCode);
                return (
                  <label
                    key={c.courseCode}
                    className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setFacCourses((prev) => [...prev, c.courseCode]);
                        else setFacCourses((prev) => prev.filter((x) => x !== c.courseCode));
                      }}
                      className="rounded border-slate-300 text-blue-800"
                    />
                    <span className="font-mono font-medium">{c.courseCode}</span>
                    <span>{c.title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowFacultyForm(false)}
              className="h-9 rounded-md border border-slate-300 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 rounded-md bg-blue-800 px-4 text-xs font-semibold text-white hover:bg-blue-900"
            >
              {editingFacultyId ? 'Update Faculty' : 'Save Faculty'}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            activeTab === 'students'
              ? 'Filter students by roll number, name, or email...'
              : 'Filter faculty by code, name, or department...'
          }
          className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
        />
      </div>

      {/* Directory Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          {activeTab === 'students' ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="px-4 py-3 font-medium">Roll Number</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Department & Sem</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="h-11 animate-pulse">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-4 w-full rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-800 tabular-nums whitespace-nowrap">
                        {s.rollNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{s.email}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {s.department} · Sem {s.semester}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {confirmDeleteId === s._id ? (
                          <span className="inline-flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(s._id)}
                              className="font-semibold text-red-700 hover:underline"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-slate-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditStudent(s)}
                              aria-label={`Edit ${s.name}`}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(s._id)}
                              aria-label={`Delete ${s.name}`}
                              className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Faculty Name</th>
                  <th className="px-4 py-3 font-medium">Department & Role</th>
                  <th className="px-4 py-3 font-medium">Assigned Courses</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="h-11 animate-pulse">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-4 w-full rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      No faculty records found.
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((f) => (
                    <tr key={f._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-800 whitespace-nowrap">
                        {f.facultyCode}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{f.name}</div>
                        <div className="text-xs text-slate-500">{f.email}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {f.designation} · {f.department}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                        {f.assignedCourses.length > 0 ? f.assignedCourses.join(', ') : 'Unassigned'}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {confirmDeleteId === f._id ? (
                          <span className="inline-flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleDeleteFaculty(f._id)}
                              className="font-semibold text-red-700 hover:underline"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-slate-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditFaculty(f)}
                              aria-label={`Edit ${f.name}`}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(f._id)}
                              aria-label={`Delete ${f.name}`}
                              className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
