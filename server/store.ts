import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  DatabaseState,
  Faculty,
  Student,
  StudentAttendanceSummary,
  SubjectBreakdown,
} from '../src/types/attendance.ts';
import { appendAttendanceLog } from './logger.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const DB_FILE_PATH = path.join(DATA_DIR, 'database.json');

function createSeedData(): DatabaseState {
  const now = new Date().toISOString();

  const courses: Course[] = [
    {
      _id: 'crs_bv501',
      courseCode: 'BV501',
      title: 'Full Stack Web Development - 2',
      semester: 5,
      credits: 4,
      facultyId: 'fac_01',
    },
    {
      _id: 'crs_bv502',
      courseCode: 'BV502',
      title: 'NoSQL Databases & MongoDB',
      semester: 5,
      credits: 4,
      facultyId: 'fac_02',
    },
    {
      _id: 'crs_bv503',
      courseCode: 'BV503',
      title: 'DevOps, CI/CD & Containerization',
      semester: 5,
      credits: 3,
      facultyId: 'fac_03',
    },
    {
      _id: 'crs_bv504',
      courseCode: 'BV504',
      title: 'Software Testing & Automation',
      semester: 5,
      credits: 3,
      facultyId: 'fac_04',
    },
  ];

  const faculty: Faculty[] = [
    {
      _id: 'fac_01',
      facultyCode: 'FAC-101',
      name: 'Dr. Ananya Deshmukh',
      email: 'ananya.deshmukh@university.edu',
      department: 'Software Development',
      designation: 'Associate Professor',
      assignedCourses: ['BV501'],
      createdAt: now,
    },
    {
      _id: 'fac_02',
      facultyCode: 'FAC-102',
      name: 'Prof. Vikram Kulkarni',
      email: 'vikram.kulkarni@university.edu',
      department: 'Software Development',
      designation: 'Assistant Professor',
      assignedCourses: ['BV502'],
      createdAt: now,
    },
    {
      _id: 'fac_03',
      facultyCode: 'FAC-103',
      name: 'Prof. Meera Iyer',
      email: 'meera.iyer@university.edu',
      department: 'Cloud & Infrastructure',
      designation: 'Assistant Professor',
      assignedCourses: ['BV503'],
      createdAt: now,
    },
    {
      _id: 'fac_04',
      facultyCode: 'FAC-104',
      name: 'Dr. Rajesh Nair',
      email: 'rajesh.nair@university.edu',
      department: 'Quality Engineering',
      designation: 'Professor',
      assignedCourses: ['BV504'],
      createdAt: now,
    },
  ];

  const studentSeeds: Array<{ roll: string; name: string; email: string }> = [
    { roll: 'BVOC501', name: 'Aarav Sharma', email: 'aarav.sharma@student.edu' },
    { roll: 'BVOC502', name: 'Diya Patel', email: 'diya.patel@student.edu' },
    { roll: 'BVOC503', name: 'Rohan Verma', email: 'rohan.verma@student.edu' },
    { roll: 'BVOC504', name: 'Sneha Reddy', email: 'sneha.reddy@student.edu' },
    { roll: 'BVOC505', name: 'Kabir Mehta', email: 'kabir.mehta@student.edu' },
    { roll: 'BVOC506', name: 'Ishita Banerjee', email: 'ishita.banerjee@student.edu' },
    { roll: 'BVOC507', name: 'Aditya Joshi', email: 'aditya.joshi@student.edu' },
    { roll: 'BVOC508', name: 'Nandini Rao', email: 'nandini.rao@student.edu' },
    { roll: 'BVOC509', name: 'Pranav Gupta', email: 'pranav.gupta@student.edu' },
    { roll: 'BVOC510', name: 'Tanvi Krishnan', email: 'tanvi.krishnan@student.edu' },
  ];

  const courseCodes = courses.map((c) => c.courseCode);
  const students: Student[] = studentSeeds.map((s, idx) => ({
    _id: `stu_${String(idx + 1).padStart(2, '0')}`,
    rollNumber: s.roll,
    name: s.name,
    email: s.email,
    department: 'B.Voc (Software Development)',
    semester: 5,
    enrolledCourses: courseCodes,
    createdAt: now,
    updatedAt: now,
  }));

  const dates = [
    '2026-11-02',
    '2026-11-04',
    '2026-11-06',
    '2026-11-09',
    '2026-11-11',
    '2026-11-12',
  ];

  const attendance: AttendanceRecord[] = [];
  let recordCounter = 1;

  for (const date of dates) {
    for (const course of courses) {
      const fac = faculty.find((f) => f._id === course.facultyId);
      for (let sIdx = 0; sIdx < students.length; sIdx++) {
        const student = students[sIdx];
        const dIdx = dates.indexOf(date);
        const cIdx = courses.indexOf(course);

        // Deterministic pattern creating realistic attendance variance (65% to 100%)
        let status: AttendanceStatus = 'Present';
        if (sIdx === 2 || sIdx === 6) {
          // Students with lower attendance (~66%) to showcase <75% shortage warnings
          if ((dIdx + cIdx) % 3 === 0) status = 'Absent';
          else if ((dIdx + cIdx) % 5 === 0) status = 'Late';
        } else if (sIdx === 4 || sIdx === 8) {
          // Borderline (~78%)
          if ((dIdx + cIdx) % 4 === 1) status = 'Absent';
        } else {
          // High attendance (~88-96%)
          if ((dIdx + sIdx + cIdx) % 11 === 0) status = 'Absent';
          else if ((dIdx + sIdx + cIdx) % 9 === 0) status = 'Late';
        }

        attendance.push({
          _id: `att_${String(recordCounter++).padStart(4, '0')}`,
          studentId: student._id,
          rollNumber: student.rollNumber,
          studentName: student.name,
          courseCode: course.courseCode,
          courseTitle: course.title,
          date,
          status,
          markedBy: fac?.name ?? 'Faculty',
          markedAt: `${date}T10:15:00.000Z`,
        });
      }
    }
  }

  return { students, faculty, courses, attendance };
}

let writeQueue: Promise<void> = Promise.resolve();

export async function readDatabase(): Promise<DatabaseState> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE_PATH, 'utf8');
    return JSON.parse(raw) as DatabaseState;
  } catch {
    const seed = createSeedData();
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

export async function writeDatabase(state: DatabaseState): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
  });
  return writeQueue;
}

export async function addStudent(input: {
  rollNumber: string;
  name: string;
  email: string;
  department?: string;
  semester?: number;
  enrolledCourses?: string[];
  actor?: string;
}): Promise<Student> {
  const db = await readDatabase();
  const normalizedRoll = input.rollNumber.trim().toUpperCase();
  if (db.students.some((s) => s.rollNumber.toUpperCase() === normalizedRoll)) {
    throw new Error(`Student with roll number ${normalizedRoll} already exists.`);
  }
  const now = new Date().toISOString();
  const newStudent: Student = {
    _id: `stu_${Date.now()}`,
    rollNumber: normalizedRoll,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    department: input.department?.trim() || 'B.Voc (Software Development)',
    semester: Number(input.semester) || 5,
    enrolledCourses:
      input.enrolledCourses && input.enrolledCourses.length > 0
        ? input.enrolledCourses
        : db.courses.map((c) => c.courseCode),
    createdAt: now,
    updatedAt: now,
  };
  db.students.push(newStudent);
  await writeDatabase(db);
  await appendAttendanceLog(
    'STUDENT_CREATED',
    input.actor || 'admin',
    `Added student ${newStudent.rollNumber} (${newStudent.name}) in ${newStudent.department} Sem ${newStudent.semester}`
  );
  return newStudent;
}

export async function updateStudent(
  id: string,
  updates: Partial<Pick<Student, 'name' | 'email' | 'department' | 'semester' | 'enrolledCourses'>>,
  actor = 'admin'
): Promise<Student> {
  const db = await readDatabase();
  const index = db.students.findIndex((s) => s._id === id || s.rollNumber === id);
  if (index === -1) {
    throw new Error(`Student ${id} not found.`);
  }
  const current = db.students[index];
  const updated: Student = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  db.students[index] = updated;
  await writeDatabase(db);
  await appendAttendanceLog(
    'STUDENT_UPDATED',
    actor,
    `Updated student ${updated.rollNumber} (${updated.name})`
  );
  return updated;
}

export async function deleteStudent(id: string, actor = 'admin'): Promise<void> {
  const db = await readDatabase();
  const target = db.students.find((s) => s._id === id || s.rollNumber === id);
  if (!target) {
    throw new Error(`Student ${id} not found.`);
  }
  db.students = db.students.filter((s) => s._id !== target._id);
  db.attendance = db.attendance.filter((a) => a.studentId !== target._id);
  await writeDatabase(db);
  await appendAttendanceLog(
    'STUDENT_DELETED',
    actor,
    `Removed student ${target.rollNumber} (${target.name}) and cascaded attendance records`
  );
}

export async function addFaculty(input: {
  facultyCode: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  assignedCourses?: string[];
  actor?: string;
}): Promise<Faculty> {
  const db = await readDatabase();
  const code = input.facultyCode.trim().toUpperCase();
  if (db.faculty.some((f) => f.facultyCode.toUpperCase() === code)) {
    throw new Error(`Faculty with code ${code} already exists.`);
  }
  const newFaculty: Faculty = {
    _id: `fac_${Date.now()}`,
    facultyCode: code,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    department: input.department?.trim() || 'Software Development',
    designation: input.designation?.trim() || 'Assistant Professor',
    assignedCourses: input.assignedCourses || [],
    createdAt: new Date().toISOString(),
  };
  db.faculty.push(newFaculty);
  await writeDatabase(db);
  await appendAttendanceLog(
    'FACULTY_CREATED',
    input.actor || 'admin',
    `Added faculty ${newFaculty.facultyCode} (${newFaculty.name}, ${newFaculty.designation})`
  );
  return newFaculty;
}

export async function updateFaculty(
  id: string,
  updates: Partial<Pick<Faculty, 'name' | 'email' | 'department' | 'designation' | 'assignedCourses'>>,
  actor = 'admin'
): Promise<Faculty> {
  const db = await readDatabase();
  const index = db.faculty.findIndex((f) => f._id === id);
  if (index === -1) {
    throw new Error(`Faculty ${id} not found.`);
  }
  const updated: Faculty = {
    ...db.faculty[index],
    ...updates,
  };
  db.faculty[index] = updated;
  await writeDatabase(db);
  await appendAttendanceLog(
    'FACULTY_UPDATED',
    actor,
    `Updated faculty ${updated.facultyCode} (${updated.name})`
  );
  return updated;
}

export async function deleteFaculty(id: string, actor = 'admin'): Promise<void> {
  const db = await readDatabase();
  const target = db.faculty.find((f) => f._id === id);
  if (!target) {
    throw new Error(`Faculty ${id} not found.`);
  }
  db.faculty = db.faculty.filter((f) => f._id !== id);
  await writeDatabase(db);
  await appendAttendanceLog(
    'FACULTY_DELETED',
    actor,
    `Removed faculty ${target.facultyCode} (${target.name})`
  );
}

export async function markAttendanceBatch(input: {
  courseCode: string;
  date: string;
  markedBy: string;
  entries: Array<{ studentId?: string; rollNumber?: string; status: AttendanceStatus; remarks?: string }>;
}): Promise<AttendanceRecord[]> {
  const db = await readDatabase();
  const course = db.courses.find((c) => c.courseCode.toUpperCase() === input.courseCode.toUpperCase());
  if (!course) {
    throw new Error(`Course ${input.courseCode} not found.`);
  }

  const saved: AttendanceRecord[] = [];
  const now = new Date().toISOString();

  for (const entry of input.entries) {
    const student = db.students.find(
      (s) =>
        (entry.studentId && s._id === entry.studentId) ||
        (entry.rollNumber && s.rollNumber.toUpperCase() === entry.rollNumber.toUpperCase())
    );
    if (!student) {
      throw new Error(`Student not found for entry (${entry.studentId || entry.rollNumber}).`);
    }

    const existingIdx = db.attendance.findIndex(
      (a) =>
        a.studentId === student._id &&
        a.courseCode === course.courseCode &&
        a.date === input.date
    );

    const record: AttendanceRecord = {
      _id: existingIdx >= 0 ? db.attendance[existingIdx]._id : `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      studentId: student._id,
      rollNumber: student.rollNumber,
      studentName: student.name,
      courseCode: course.courseCode,
      courseTitle: course.title,
      date: input.date,
      status: entry.status,
      markedBy: input.markedBy || 'Faculty',
      markedAt: now,
      remarks: entry.remarks,
    };

    if (existingIdx >= 0) {
      db.attendance[existingIdx] = record;
    } else {
      db.attendance.push(record);
    }
    saved.push(record);
  }

  await writeDatabase(db);

  const presentCount = saved.filter((r) => r.status === 'Present').length;
  const lateCount = saved.filter((r) => r.status === 'Late').length;
  const absentCount = saved.filter((r) => r.status === 'Absent').length;
  await appendAttendanceLog(
    'ATTENDANCE_MARKED',
    input.markedBy || 'faculty',
    `Course ${course.courseCode} on ${input.date}: ${saved.length} records saved (Present:${presentCount}, Late:${lateCount}, Absent:${absentCount})`
  );

  return saved;
}

export function computeStudentSummary(
  student: Student,
  courses: Course[],
  allAttendance: AttendanceRecord[]
): StudentAttendanceSummary {
  const studentRecords = allAttendance
    .filter((a) => a.studentId === student._id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const subjects: SubjectBreakdown[] = courses
    .filter((c) => student.enrolledCourses.includes(c.courseCode))
    .map((course) => {
      const recs = studentRecords.filter((r) => r.courseCode === course.courseCode);
      const presentCount = recs.filter((r) => r.status === 'Present').length;
      const lateCount = recs.filter((r) => r.status === 'Late').length;
      const absentCount = recs.filter((r) => r.status === 'Absent').length;
      const totalSessions = recs.length;
      // University standard: Present and Late both count toward attended sessions, or Present=1, Late=1
      const attended = presentCount + lateCount;
      const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 1000) / 10 : 100;
      return {
        courseCode: course.courseCode,
        courseTitle: course.title,
        totalSessions,
        presentCount,
        lateCount,
        absentCount,
        percentage,
        eligible: percentage >= 75,
      };
    });

  const totalSessions = studentRecords.length;
  const presentCount = studentRecords.filter((r) => r.status === 'Present').length;
  const lateCount = studentRecords.filter((r) => r.status === 'Late').length;
  const absentCount = studentRecords.filter((r) => r.status === 'Absent').length;
  const overallPercentage =
    totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 1000) / 10 : 100;

  return {
    student,
    totalSessions,
    presentCount,
    lateCount,
    absentCount,
    overallPercentage,
    eligible: overallPercentage >= 75,
    subjects,
    recentRecords: studentRecords.slice(0, 20),
  };
}
