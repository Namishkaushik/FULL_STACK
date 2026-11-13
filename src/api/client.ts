import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  Faculty,
  LogEntry,
  Student,
  StudentAttendanceSummary,
} from '../types/attendance';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface OverviewResponse {
  studentCount: number;
  facultyCount: number;
  courseCount: number;
  attendanceRecordCount: number;
  averageAttendancePercentage: number;
  shortageCount: number;
  courses: Course[];
}

export const api = {
  getOverview: () => request<OverviewResponse>('/api/overview'),
  getCourses: () => request<{ courses: Course[] }>('/api/courses'),

  getStudents: (q = '') =>
    request<{ students: Student[] }>(`/api/students${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createStudent: (payload: {
    rollNumber: string;
    name: string;
    email: string;
    department: string;
    semester: number;
  }) =>
    request<{ student: Student }>('/api/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateStudent: (
    id: string,
    payload: Partial<Pick<Student, 'name' | 'email' | 'department' | 'semester'>>
  ) =>
    request<{ student: Student }>(`/api/students/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteStudent: (id: string) =>
    request<{ deleted: boolean }>(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getFaculty: () => request<{ faculty: Faculty[] }>('/api/faculty'),
  createFaculty: (payload: {
    facultyCode: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    assignedCourses: string[];
  }) =>
    request<{ faculty: Faculty }>('/api/faculty', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateFaculty: (
    id: string,
    payload: Partial<Pick<Faculty, 'name' | 'email' | 'department' | 'designation' | 'assignedCourses'>>
  ) =>
    request<{ faculty: Faculty }>(`/api/faculty/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteFaculty: (id: string) =>
    request<{ deleted: boolean }>(`/api/faculty/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getAttendance: (filters: {
    courseCode?: string;
    date?: string;
    studentId?: string;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters.courseCode) params.set('courseCode', filters.courseCode);
    if (filters.date) params.set('date', filters.date);
    if (filters.studentId) params.set('studentId', filters.studentId);
    if (filters.status) params.set('status', filters.status);
    const qs = params.toString();
    return request<{ records: AttendanceRecord[]; total: number }>(
      `/api/attendance${qs ? `?${qs}` : ''}`
    );
  },

  markAttendance: (payload: {
    courseCode: string;
    date: string;
    markedBy: string;
    entries: Array<{ studentId: string; status: AttendanceStatus; remarks?: string }>;
  }) =>
    request<{ savedCount: number; records: AttendanceRecord[] }>('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAllSummaries: () => request<{ summaries: StudentAttendanceSummary[] }>('/api/attendance/summary'),
  getStudentSummary: (studentId: string) =>
    request<{ summary: StudentAttendanceSummary }>(
      `/api/attendance/summary/${encodeURIComponent(studentId)}`
    ),

  getLogs: (limit = 100) =>
    request<{ filePath: string; totalLines: number; entries: LogEntry[]; raw: string }>(
      `/api/logs?limit=${limit}`
    ),

  executeCli: (command: string) =>
    request<{ exitCode: number; output: string }>('/api/cli/execute', {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),
};
