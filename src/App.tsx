import {
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Menu,
  Terminal,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { api, type OverviewResponse } from './api/client';
import { AdminDirectoryView } from './components/AdminDirectoryView';
import { AssignmentReportView } from './components/AssignmentReportView';
import { AttendanceRecordsView } from './components/AttendanceRecordsView';
import { FacultyAttendanceView } from './components/FacultyAttendanceView';
import { LogsAndCliView } from './components/LogsAndCliView';
import { StudentPortalView } from './components/StudentPortalView';
import type { Course, Faculty } from './types/attendance';

type NavSection =
  | 'mark-attendance'
  | 'records'
  | 'student-portal'
  | 'admin'
  | 'logs-cli'
  | 'assignment';

interface NavItem {
  id: NavSection;
  label: string;
  group: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'mark-attendance', label: 'Mark Attendance', group: 'Faculty', icon: ClipboardCheck },
  { id: 'records', label: 'Attendance Records', group: 'Faculty', icon: FileText },
  { id: 'student-portal', label: 'My Attendance %', group: 'Student', icon: GraduationCap },
  { id: 'admin', label: 'Students & Faculty', group: 'Administration', icon: Users },
  { id: 'logs-cli', label: 'FS Logs & Yargs CLI', group: 'System & DevOps', icon: Terminal },
  { id: 'assignment', label: 'Assignment Q1–Q5', group: 'System & DevOps', icon: BookOpen },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('mark-attendance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadSharedData() {
      try {
        const [ov, crs, fac] = await Promise.all([
          api.getOverview(),
          api.getCourses(),
          api.getFaculty(),
        ]);
        if (!active) return;
        setOverview(ov);
        setCourses(crs.courses);
        setFacultyList(fac.faculty);
      } catch (err) {
        console.error('Failed to initialize portal overview:', err);
      }
    }
    loadSharedData();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  function triggerRefresh() {
    setRefreshKey((prev) => prev + 1);
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection)!;
  const groups = ['Faculty', 'Student', 'Administration', 'System & DevOps'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center border-b border-slate-200 px-5">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('mark-attendance');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            AttendLedger
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" aria-label="Workspace navigation">
          {groups.map((group) => (
            <div key={group}>
              <div className="px-3 mb-1.5 text-xs font-medium text-slate-500">{group}</div>
              <ul className="space-y-0.5">
                {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                  const Icon = item.icon;
                  const active = item.id === activeSection;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-blue-50 text-blue-900'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? 'text-blue-800' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          <div className="font-medium text-slate-700">B.Voc Software Development</div>
          <div className="mt-0.5">Semester 5 · Full Stack Web Dev - 2</div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
              <span className="font-display text-lg font-bold text-slate-900">AttendLedger</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {groups.map((group) => (
                <div key={group}>
                  <div className="px-3 mb-1.5 text-xs font-medium text-slate-500">{group}</div>
                  <ul className="space-y-0.5">
                    {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                      const Icon = item.icon;
                      const active = item.id === activeSection;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSection(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                              active
                                ? 'bg-blue-50 text-blue-900'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-8 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-700 whitespace-nowrap shrink-0">
                {currentNav.group}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{currentNav.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeSection !== 'assignment' ? (
              <button
                type="button"
                onClick={() => setActiveSection('assignment')}
                className="h-9 rounded-md bg-blue-800 px-4 text-xs font-semibold text-white hover:bg-blue-900 transition-colors whitespace-nowrap shrink-0"
              >
                View Assignment Q1–Q5
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSection('mark-attendance')}
                className="h-9 rounded-md bg-blue-800 px-4 text-xs font-semibold text-white hover:bg-blue-900 transition-colors whitespace-nowrap shrink-0"
              >
                Open Attendance Portal
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Institutional KPI Summary Row */}
            {overview && (
              <section aria-label="Department statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
                  <div className="text-xs font-medium text-slate-500">Enrolled Students</div>
                  <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                    {overview.studentCount}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {overview.facultyCount} faculty · {overview.courseCount} courses
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
                  <div className="text-xs font-medium text-slate-500">Cohort Average</div>
                  <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                    {overview.averageAttendancePercentage.toFixed(1)}%
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    75.0% exam eligibility threshold
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
                  <div className="text-xs font-medium text-slate-500">Attendance Logs</div>
                  <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                    {overview.attendanceRecordCount}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Persisted across sessions
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
                  <div className="text-xs font-medium text-slate-500">Shortage Alerts</div>
                  <div
                    className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
                      overview.shortageCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {overview.shortageCount}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {overview.shortageCount === 1
                      ? 'Student below 75% threshold'
                      : 'Students below 75% threshold'}
                  </div>
                </div>
              </section>
            )}

            {/* Active Workspace View */}
            {activeSection === 'mark-attendance' && (
              <FacultyAttendanceView
                courses={courses}
                facultyList={facultyList}
                onSaved={triggerRefresh}
              />
            )}

            {activeSection === 'records' && (
              <AttendanceRecordsView courses={courses} refreshKey={refreshKey} />
            )}

            {activeSection === 'student-portal' && (
              <StudentPortalView refreshKey={refreshKey} />
            )}

            {activeSection === 'admin' && (
              <AdminDirectoryView
                courses={courses}
                refreshKey={refreshKey}
                onDataChanged={triggerRefresh}
              />
            )}

            {activeSection === 'logs-cli' && (
              <LogsAndCliView refreshKey={refreshKey} onDataChanged={triggerRefresh} />
            )}

            {activeSection === 'assignment' && <AssignmentReportView />}
          </div>
        </main>
      </div>
    </div>
  );
}
