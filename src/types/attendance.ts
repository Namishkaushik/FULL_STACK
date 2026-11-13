export type AttendanceStatus = 'Present' | 'Absent' | 'Late';

export interface Student {
  _id: string;
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  enrolledCourses: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Faculty {
  _id: string;
  facultyCode: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  assignedCourses: string[];
  createdAt: string;
}

export interface Course {
  _id: string;
  courseCode: string;
  title: string;
  semester: number;
  credits: number;
  facultyId: string;
}

export interface AttendanceRecord {
  _id: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string;
  markedAt: string;
  remarks?: string;
}

export interface SubjectBreakdown {
  courseCode: string;
  courseTitle: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  percentage: number;
  eligible: boolean;
}

export interface StudentAttendanceSummary {
  student: Student;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  overallPercentage: number;
  eligible: boolean;
  subjects: SubjectBreakdown[];
  recentRecords: AttendanceRecord[];
}

export interface LogEntry {
  lineNumber: number;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  raw: string;
}

export interface DatabaseState {
  students: Student[];
  faculty: Faculty[];
  courses: Course[];
  attendance: AttendanceRecord[];
}
