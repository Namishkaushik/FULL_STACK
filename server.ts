import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { readAttendanceLogs } from './server/logger.ts';
import {
  addFaculty,
  addStudent,
  computeStudentSummary,
  deleteFaculty,
  deleteStudent,
  markAttendanceBatch,
  readDatabase,
  updateFaculty,
  updateStudent,
} from './server/store.ts';
import { runYargsCommand } from './server/yargsHandler.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ---------------------------------------------------------------------------
  // Health & Overview
  // ---------------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AttendLedger Express Server',
      port: PORT,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/overview', async (_req, res) => {
    try {
      const db = await readDatabase();
      const summaries = db.students.map((s) =>
        computeStudentSummary(s, db.courses, db.attendance)
      );
      const avgAttendance =
        summaries.length > 0
          ? Math.round(
              (summaries.reduce((acc, s) => acc + s.overallPercentage, 0) / summaries.length) *
                10
            ) / 10
          : 0;
      const shortageCount = summaries.filter((s) => !s.eligible).length;
      res.json({
        studentCount: db.students.length,
        facultyCount: db.faculty.length,
        courseCount: db.courses.length,
        attendanceRecordCount: db.attendance.length,
        averageAttendancePercentage: avgAttendance,
        shortageCount,
        courses: db.courses,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load overview' });
    }
  });

  // ---------------------------------------------------------------------------
  // Courses
  // ---------------------------------------------------------------------------
  app.get('/api/courses', async (_req, res) => {
    try {
      const db = await readDatabase();
      res.json({ courses: db.courses });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load courses' });
    }
  });

  // ---------------------------------------------------------------------------
  // Students CRUD (Requirement 1: Adding & Managing Students)
  // ---------------------------------------------------------------------------
  app.get('/api/students', async (req, res) => {
    try {
      const db = await readDatabase();
      const query = String(req.query.q || '').trim().toLowerCase();
      const filtered = query
        ? db.students.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.rollNumber.toLowerCase().includes(query) ||
              s.email.toLowerCase().includes(query)
          )
        : db.students;
      res.json({ students: filtered });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch students' });
    }
  });

  app.post('/api/students', async (req, res) => {
    try {
      const { rollNumber, name, email, department, semester, enrolledCourses } = req.body;
      if (!rollNumber || !name || !email) {
        res.status(400).json({ error: 'rollNumber, name, and email are required.' });
        return;
      }
      const student = await addStudent({
        rollNumber,
        name,
        email,
        department,
        semester,
        enrolledCourses,
        actor: 'admin-portal',
      });
      res.status(201).json({ student });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create student' });
    }
  });

  app.put('/api/students/:id', async (req, res) => {
    try {
      const student = await updateStudent(req.params.id, req.body, 'admin-portal');
      res.json({ student });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Student not found' });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      await deleteStudent(req.params.id, 'admin-portal');
      res.json({ deleted: true });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Student not found' });
    }
  });

  // ---------------------------------------------------------------------------
  // Faculty CRUD (Administrator Management)
  // ---------------------------------------------------------------------------
  app.get('/api/faculty', async (_req, res) => {
    try {
      const db = await readDatabase();
      res.json({ faculty: db.faculty });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load faculty' });
    }
  });

  app.post('/api/faculty', async (req, res) => {
    try {
      const { facultyCode, name, email, department, designation, assignedCourses } = req.body;
      if (!facultyCode || !name || !email) {
        res.status(400).json({ error: 'facultyCode, name, and email are required.' });
        return;
      }
      const faculty = await addFaculty({
        facultyCode,
        name,
        email,
        department,
        designation,
        assignedCourses,
        actor: 'admin-portal',
      });
      res.status(201).json({ faculty });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create faculty' });
    }
  });

  app.put('/api/faculty/:id', async (req, res) => {
    try {
      const faculty = await updateFaculty(req.params.id, req.body, 'admin-portal');
      res.json({ faculty });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Faculty not found' });
    }
  });

  app.delete('/api/faculty/:id', async (req, res) => {
    try {
      await deleteFaculty(req.params.id, 'admin-portal');
      res.json({ deleted: true });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Faculty not found' });
    }
  });

  // ---------------------------------------------------------------------------
  // Attendance Routes (Requirement 1: Marking & Viewing Attendance Records)
  // ---------------------------------------------------------------------------
  app.get('/api/attendance', async (req, res) => {
    try {
      const db = await readDatabase();
      const { courseCode, date, studentId, status } = req.query;

      let records = db.attendance;
      if (courseCode && courseCode !== 'ALL') {
        records = records.filter((r) => r.courseCode === String(courseCode));
      }
      if (date) {
        records = records.filter((r) => r.date === String(date));
      }
      if (studentId) {
        records = records.filter(
          (r) => r.studentId === String(studentId) || r.rollNumber === String(studentId)
        );
      }
      if (status && status !== 'ALL') {
        records = records.filter((r) => r.status === String(status));
      }

      records = [...records].sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return a.rollNumber.localeCompare(b.rollNumber);
      });

      res.json({ records, total: records.length });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch attendance' });
    }
  });

  app.post('/api/attendance', async (req, res) => {
    try {
      const { courseCode, date, markedBy, entries } = req.body;
      if (!courseCode || !date || !Array.isArray(entries) || entries.length === 0) {
        res.status(400).json({ error: 'courseCode, date, and non-empty entries array are required.' });
        return;
      }
      const saved = await markAttendanceBatch({
        courseCode,
        date,
        markedBy: markedBy || 'Faculty',
        entries,
      });
      res.status(201).json({ savedCount: saved.length, records: saved });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to mark attendance' });
    }
  });

  app.get('/api/attendance/summary', async (_req, res) => {
    try {
      const db = await readDatabase();
      const summaries = db.students.map((student) =>
        computeStudentSummary(student, db.courses, db.attendance)
      );
      res.json({ summaries });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to compute summaries' });
    }
  });

  app.get('/api/attendance/summary/:studentId', async (req, res) => {
    try {
      const db = await readDatabase();
      const student = db.students.find(
        (s) =>
          s._id === req.params.studentId ||
          s.rollNumber.toUpperCase() === req.params.studentId.toUpperCase()
      );
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      const summary = computeStudentSummary(student, db.courses, db.attendance);
      res.json({ summary });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to compute summary' });
    }
  });

  // ---------------------------------------------------------------------------
  // File System Audit Logs & Yargs CLI Execution (Requirement 3)
  // ---------------------------------------------------------------------------
  app.get('/api/logs', async (req, res) => {
    try {
      const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
      const logData = await readAttendanceLogs(limit);
      res.json(logData);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read logs' });
    }
  });

  app.post('/api/cli/execute', async (req, res) => {
    try {
      const command = String(req.body?.command || '').trim();
      if (!command) {
        res.status(400).json({ error: 'Command string is required.' });
        return;
      }
      const result = await runYargsCommand(command);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'CLI execution failed' });
    }
  });

  // ---------------------------------------------------------------------------
  // Vite / Static Frontend Serving
  // ---------------------------------------------------------------------------
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AttendLedger Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
