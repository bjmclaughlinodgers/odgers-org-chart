import React, { useState, useMemo } from 'react';
import {
  X, Star, Flag, MapPin, Briefcase,
  Calendar, DollarSign, Clock, TrendingUp, TrendingDown,
  ChevronDown, ChevronRight, Edit3, Save,
  Camera, Plus, UserX, Users, BarChart3,
  Shield, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useOrgData } from '../../hooks/useOrgData';
import { useOrgStore } from '../../stores/orgStore';
import { PRACTICE_COLORS } from '../../types';
import type { Person } from '../../types';
import { computeTenure, formatDate, formatBirthday } from '../../utils/tenure';
import { computePersonMetrics } from '../../hooks/useComputedMetrics';
import { formatCurrency, formatPercent } from '../../utils/export';
import { analyzePersonGaps } from '../../utils/gapAnalysis';
import { EditableField } from './EditableField';
import { TagEditorSection } from './TagEditorSection';
import { ReportingLineEditor } from './ReportingLineEditor';
import {
  BAND_OPTIONS,
  PRACTICE_OPTIONS,
  PERFORMANCE_OPTIONS,
  RISK_OPTIONS,
  OFFICE_OPTIONS,
  EMPLOYMENT_OPTIONS,
  COMPENSATION_OPTIONS,
  HIRING_PRIORITY_OPTIONS,
  RECRUITING_STATUS_OPTIONS,
  RECRUITER_TYPE_OPTIONS,
} from '../../constants/editOptions';
import { CandidateTracker } from '../HiringConsole/CandidateTracker';

/* =========================================================
   Collapsible Section
   ========================================================= */

function Section({
  title,
  children,
  defaultOpen = true,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  delay?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-5 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.08em] hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all duration-200"
      >
        <span className="transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown size={12} />
        </span>
        {title}
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: open ? '2000px' : '0px',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="px-5 pb-4">{children}</div>
      </div>
      <div className="mx-5 border-b border-gray-100 dark:border-gray-800/60" />
    </div>
  );
}

/* =========================================================
   Editable Notes Field
   ========================================================= */

function EditableNotesField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveNotes = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">{label}</div>
        <button
          onClick={() => { editing ? cancelEdit() : startEdit(); }}
          className="text-[10px] text-[#00857C] hover:text-[#006b64] font-medium flex items-center gap-1 transition-colors"
        >
          <Edit3 size={10} /> {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full text-[13px] leading-relaxed border border-gray-200 dark:border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 focus:border-[#00857C] resize-none bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 transition-all"
            rows={3}
          />
          <button
            onClick={saveNotes}
            className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold bg-[#00857C] text-white px-3 py-1.5 rounded-lg hover:bg-[#006b64] transition-colors"
          >
            <Save size={11} /> Save
          </button>
        </div>
      ) : (
        <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 bg-gray-50/60 dark:bg-gray-800/30 rounded-xl px-3 py-2.5 min-h-[36px]">
          {value || '\u2014'}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   Badge Dropdown (inline editable badge)
   ========================================================= */

function BadgeDropdown({
  value,
  options,
  onSave,
  className,
  style,
}: {
  value: string;
  options: string[];
  onSave: (newValue: string) => void;
  className: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        value={value}
        onChange={e => { onSave(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="text-[11px] font-semibold px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={className}
      style={style}
      title="Click to edit"
    >
      {value}
    </button>
  );
}

/* =========================================================
   Photo URL Editor (avatar with edit overlay)
   ========================================================= */

function PhotoUrlEditor({ person, isOpenSeat, practiceColor, onSave }: {
  person: Person;
  isOpenSeat: boolean;
  practiceColor: string;
  onSave: (url: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState('');

  const startEdit = () => {
    setUrl(person.photoUrl || '');
    setEditing(true);
  };

  const handleSave = () => {
    onSave(url.trim());
    setEditing(false);
  };

  const seed = `${person.firstName}-${person.lastName}`.toLowerCase();
  const diceBearUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${practiceColor.replace('#', '')}&fontFamily=Arial&fontSize=36`;
  const avatarUrl = (!isOpenSeat && person.photoUrl) ? person.photoUrl : diceBearUrl;

  if (editing) {
    return (
      <div className="relative">
        <div className="w-20 h-20 rounded-[22px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center shadow-md">
          <Camera size={24} className="text-gray-400 dark:text-gray-500" />
        </div>
        <div className="absolute top-22 left-0 z-50 bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded-xl shadow-float p-3 w-64 animate-scale-in">
          <input
            autoFocus
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste image URL..."
            className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 focus:border-[#00857C] mb-2 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          />
          <div className="flex gap-1.5">
            <button onClick={handleSave} className="text-[11px] font-semibold bg-[#00857C] text-white px-3 py-1.5 rounded-lg hover:bg-[#006b64] transition-colors">Save</button>
            <button onClick={() => setEditing(false)} className="text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer" onClick={startEdit}>
      {isOpenSeat ? (
        <div
          className="w-20 h-20 rounded-[22px] flex items-center justify-center text-white text-2xl font-bold shadow-md"
          style={{ backgroundColor: practiceColor }}
        >
          ?
        </div>
      ) : (
        <img
          src={avatarUrl}
          alt={`${person.firstName} ${person.lastName}`}
          className="w-20 h-20 rounded-[22px] object-cover shadow-md ring-2 ring-white dark:ring-gray-800"
        />
      )}
      <div className="absolute inset-0 rounded-[22px] bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
        <Camera size={18} className="text-white" />
      </div>
    </div>
  );
}

/* =========================================================
   Support Requirements Editor
   ========================================================= */

function SupportRequirementsEditor({ person, onSave }: {
  person: Person;
  onSave: (reqs: Person['supportRequirements']) => void;
}) {
  const roles = [
    { key: 'engagementManagers', label: 'Engagement Managers' },
    { key: 'seniorAssociates', label: 'Senior Associates' },
    { key: 'associates', label: 'Associates' },
    { key: 'analysts', label: 'Analysts' },
    { key: 'projectCoordinators', label: 'Project Coordinators' },
  ] as const;

  const reqs = person.supportRequirements;

  if (!reqs) {
    return (
      <button
        onClick={() => onSave({
          engagementManagers: { required: 0, allocated: 0 },
          seniorAssociates: { required: 0, allocated: 0 },
          associates: { required: 0, allocated: 0 },
          analysts: { required: 0, allocated: 0 },
          projectCoordinators: { required: 0, allocated: 0 },
        })}
        className="text-[12px] text-[#00857C] hover:text-[#006b64] font-medium flex items-center gap-1.5 transition-colors"
      >
        <Plus size={13} /> Set up support requirements
      </button>
    );
  }

  const handleChange = (roleKey: string, field: 'required' | 'allocated', value: number) => {
    const updated = { ...reqs, [roleKey]: { ...reqs[roleKey as keyof typeof reqs], [field]: value } };
    onSave(updated);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_60px_60px] gap-1 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
        <span>Role</span>
        <span className="text-center">Req</span>
        <span className="text-center">Alloc</span>
      </div>
      {roles.map(({ key, label }) => {
        const role = reqs[key];
        return (
          <div key={key} className="grid grid-cols-[1fr_60px_60px] gap-1 items-center">
            <span className="text-[12px] text-gray-600 dark:text-gray-400">{label}</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={role.required}
              onChange={e => handleChange(key, 'required', parseFloat(e.target.value) || 0)}
              className="w-full text-[12px] text-center border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
              min={0}
              step={0.5}
              value={role.allocated}
              onChange={e => handleChange(key, 'allocated', parseFloat(e.target.value) || 0)}
              className="w-full text-[12px] text-center border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100"
            />
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   Mini Stat Card (for the quick stats strip)
   ========================================================= */

function MiniStatCard({
  label,
  value,
  subValue,
  icon,
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="card-flat rounded-xl px-3 py-2.5 flex-1 min-w-0 text-center">
      <div className="flex items-center justify-center mb-1 text-gray-400 dark:text-gray-500">
        {icon}
      </div>
      <div className="text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-tight tracking-tight">
        {value}
      </div>
      {subValue && (
        <div className={`text-[10px] font-semibold mt-0.5 ${
          trend === 'up' ? 'text-green-600 dark:text-green-400'
          : trend === 'down' ? 'text-red-500 dark:text-red-400'
          : 'text-gray-400 dark:text-gray-500'
        }`}>
          {subValue}
        </div>
      )}
      <div className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

/* =========================================================
   Performance / Risk Visual Badge
   ========================================================= */

function StatusBadge({
  label,
  variant,
  icon,
}: {
  label: string;
  variant: 'star' | 'performer' | 'improvement' | 'low' | 'watch' | 'elevated' | 'critical';
  icon: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    star: 'bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-700/30',
    performer: 'bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400 border-green-200/60 dark:border-green-700/30',
    improvement: 'bg-orange-50 dark:bg-orange-900/15 text-orange-700 dark:text-orange-400 border-orange-200/60 dark:border-orange-700/30',
    low: 'bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400 border-green-200/60 dark:border-green-700/30',
    watch: 'bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 border-gray-200/60 dark:border-gray-700/30',
    elevated: 'bg-orange-50 dark:bg-orange-900/15 text-orange-700 dark:text-orange-400 border-orange-200/60 dark:border-orange-700/30',
    critical: 'bg-red-50 dark:bg-red-900/15 text-red-700 dark:text-red-400 border-red-200/60 dark:border-red-700/30',
  };

  return (
    <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${styles[variant]} transition-colors`}>
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-[12px] font-semibold">{label}</span>
    </div>
  );
}

/* =========================================================
   Revenue Trajectory Bar
   ========================================================= */

function RevenueTrajectory({
  currentYear,
  priorYear,
  target,
}: {
  currentYear: number | null;
  priorYear: number | null;
  target: number | null;
}) {
  if (!currentYear && !priorYear) return null;
  const maxVal = Math.max(currentYear || 0, priorYear || 0, target || 0);
  if (maxVal === 0) return null;

  const currentPct = currentYear ? (currentYear / maxVal) * 100 : 0;
  const priorPct = priorYear ? (priorYear / maxVal) * 100 : 0;
  const targetPct = target ? (target / maxVal) * 100 : 0;

  return (
    <div className="space-y-2.5">
      {/* Prior year bar */}
      {priorYear != null && priorYear > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Prior Year</span>
            <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-400">{formatCurrency(priorYear)}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill bg-gray-300 dark:bg-gray-600"
              style={{ width: `${priorPct}%` }}
            />
          </div>
        </div>
      )}
      {/* Current year bar */}
      {currentYear != null && currentYear > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Current Year</span>
            <span className="text-[12px] font-bold text-gray-900 dark:text-gray-100">{formatCurrency(currentYear)}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${currentPct}%`,
                backgroundColor: (target && currentYear >= target) ? '#22c55e'
                  : (target && currentYear >= target * 0.9) ? '#f59e0b'
                  : '#00857C',
              }}
            />
          </div>
        </div>
      )}
      {/* Target line */}
      {target != null && target > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Target</span>
            <span className="text-[12px] font-semibold text-gray-500 dark:text-gray-400">{formatCurrency(target)}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill bg-gray-200 dark:bg-gray-700"
              style={{ width: `${targetPct}%`, opacity: 0.5 }}
            />
          </div>
          {currentYear != null && target > 0 && (
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-1">
              {Math.round((currentYear / target) * 100)}% of target
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN: DetailSidebar
   ========================================================= */

export function DetailSidebar() {
  const { selectedPersonId, closeSidebar } = useUIStore();
  const { getPerson, people } = useOrgData();
  const updatePerson = useOrgStore(s => s.updatePerson);
  const { terminatePerson } = useOrgStore();
  const selectPerson = useUIStore(s => s.selectPerson);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);

  const allSkillTags = useMemo(() => {
    const set = new Set<string>();
    people.forEach(p => p.skillsTags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [people]);

  const allNeedTags = useMemo(() => {
    const set = new Set<string>();
    people.forEach(p => p.needsTags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [people]);

  const allSpecialtyTags = useMemo(() => {
    const set = new Set<string>();
    people.forEach(p => p.subPracticeSpecialties.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [people]);

  if (!selectedPersonId) return null;
  const person = getPerson(selectedPersonId);
  if (!person) return null;

  const isOpenSeat = person.status === 'Open Seat';
  const tenure = !isOpenSeat ? computeTenure(person.startDate) : null;
  const metrics = !isOpenSeat ? computePersonMetrics(person) : null;
  const gapAnalysis = person.isRevenueProducer ? analyzePersonGaps(person) : null;
  const practiceColor = PRACTICE_COLORS[person.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F';

  // Direct reports for reporting section
  const directReports = people.filter(p => p.reportsTo === person.id);
  const manager = person.reportsTo ? people.find(p => p.id === person.reportsTo) : null;

  // Revenue YoY delta
  const yoyDelta = metrics?.revenueGrowthPct;
  const yoyTrend: 'up' | 'down' | 'neutral' = yoyDelta != null
    ? (yoyDelta > 0 ? 'up' : yoyDelta < 0 ? 'down' : 'neutral')
    : 'neutral';

  const handleUpdate = (field: keyof Person) => (newValue: string | number | null) => {
    updatePerson(person.id, { [field]: newValue } as Partial<Person>);
  };

  // Map performance rating to badge variant
  const perfVariant = person.performanceRating === 'Star Performer' ? 'star'
    : person.performanceRating === 'Performance Improvement' ? 'improvement'
    : 'performer';

  // Map retention risk to badge variant
  const riskVariant = person.retentionRisk.toLowerCase() as 'low' | 'watch' | 'elevated' | 'critical';

  return (
    <div className="h-full flex flex-col animate-slide-in-right">

      {/* ===== HERO SECTION ===== */}
      <div className="relative overflow-hidden">
        {/* Gradient backdrop */}
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            background: `linear-gradient(135deg, ${practiceColor} 0%, transparent 70%)`,
          }}
        />

        <div className="relative px-5 pt-5 pb-4">
          {/* Close button */}
          <button
            onClick={closeSidebar}
            className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 text-gray-400 dark:text-gray-500 transition-all duration-200 z-10"
          >
            <X size={18} />
          </button>

          {/* Avatar + Identity */}
          <div className="flex flex-col items-center text-center mb-4 animate-fade-in-up">
            <PhotoUrlEditor
              person={person}
              isOpenSeat={isOpenSeat}
              practiceColor={practiceColor}
              onSave={(url) => updatePerson(person.id, { photoUrl: url })}
            />

            <h2 className="mt-3 text-[20px] font-bold text-gray-900 dark:text-gray-100 leading-tight tracking-tight">
              {isOpenSeat ? `Open: ${person.title}` : `${person.firstName} ${person.lastName}`}
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{person.title}</p>

            {/* Badge row: Practice Area, Band, Office */}
            <div className="flex items-center flex-wrap justify-center gap-1.5 mt-3">
              <BadgeDropdown
                value={person.practiceArea}
                options={PRACTICE_OPTIONS as string[]}
                onSave={val => updatePerson(person.id, { practiceArea: val as Person['practiceArea'] })}
                className="badge text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-white cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: practiceColor }}
              />
              <BadgeDropdown
                value={person.band}
                options={BAND_OPTIONS as string[]}
                onSave={val => updatePerson(person.id, { band: val as Person['band'] })}
                className="badge badge-gray text-[11px] font-semibold px-2.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              />
              <BadgeDropdown
                value={person.office}
                options={OFFICE_OPTIONS as string[]}
                onSave={val => updatePerson(person.id, { office: val as Person['office'] })}
                className="badge badge-gray text-[11px] font-semibold px-2.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
              />

              {/* Status badges */}
              {person.status !== 'Active' && person.status !== 'Terminated' && (
                <span className={`badge text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  person.status === 'On Leave' ? 'badge-amber'
                  : person.status === 'Open Seat' ? 'badge-teal'
                  : 'badge-red'
                }`}>{person.status}</span>
              )}
              {person.status === 'Terminated' && (
                <span className="badge badge-gray text-[11px] font-semibold px-2.5 py-0.5 rounded-full">Terminated</span>
              )}
            </div>
          </div>
        </div>

        <div className="mx-5 border-b border-gray-100 dark:border-gray-800/60" />
      </div>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <div className="flex-1 overflow-y-auto">

        {/* ===== QUICK STATS STRIP ===== */}
        {!isOpenSeat && (
          <div className="px-5 py-4 animate-fade-in-up" style={{ animationDelay: '60ms', animationFillMode: 'both' }}>
            <div className="grid grid-cols-4 gap-2">
              <MiniStatCard
                label="Tenure"
                value={tenure?.display || '--'}
                icon={<Clock size={13} />}
              />
              <MiniStatCard
                label="Revenue"
                value={person.currentYearOCE != null ? formatCurrency(person.currentYearOCE) : '--'}
                subValue={yoyDelta != null ? formatPercent(yoyDelta) : undefined}
                icon={<DollarSign size={13} />}
                trend={yoyTrend}
              />
              <MiniStatCard
                label="Comp"
                value={person.totalOTE != null ? formatCurrency(person.totalOTE) : '--'}
                icon={<Briefcase size={13} />}
              />
              <MiniStatCard
                label="Assigns"
                value={String(person.supportLines.length)}
                icon={<Users size={13} />}
              />
            </div>
          </div>
        )}

        {/* ===== PERFORMANCE & RISK BADGES ===== */}
        {!isOpenSeat && (
          <div className="px-5 pb-4 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <div className="grid grid-cols-2 gap-2">
              <StatusBadge
                label={person.performanceRating}
                variant={perfVariant}
                icon={
                  person.performanceRating === 'Star Performer'
                    ? <Star size={14} className="fill-current" />
                    : person.performanceRating === 'Performance Improvement'
                    ? <AlertTriangle size={14} />
                    : <CheckCircle2 size={14} />
                }
              />
              <StatusBadge
                label={`${person.retentionRisk} Risk`}
                variant={riskVariant}
                icon={
                  person.retentionRisk === 'Critical' || person.retentionRisk === 'Elevated'
                    ? <Flag size={14} className="fill-current" />
                    : person.retentionRisk === 'Watch'
                    ? <Shield size={14} />
                    : <Shield size={14} />
                }
              />
            </div>
            <div className="mx-0 mt-4 border-b border-gray-100 dark:border-gray-800/60" />
          </div>
        )}

        {/* ===== REVENUE TRAJECTORY (producers only) ===== */}
        {person.isRevenueProducer && !isOpenSeat && (
          <Section title="Revenue" delay={140}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
              <EditableField
                label="Current Year OCE"
                value={person.currentYearOCE}
                onSave={handleUpdate('currentYearOCE')}
                type="number"
                icon={<DollarSign size={12} />}
                formatter={formatCurrency}
              />
              <EditableField
                label="Prior Year OCE"
                value={person.priorYearOCE}
                onSave={handleUpdate('priorYearOCE')}
                type="number"
                icon={<DollarSign size={12} />}
                formatter={formatCurrency}
              />
              <EditableField
                label="Target"
                value={person.revenueTarget}
                onSave={handleUpdate('revenueTarget')}
                type="number"
                icon={<TrendingUp size={12} />}
                formatter={formatCurrency}
              />
              <EditableField
                label="Pipeline"
                value={person.pipelineValue}
                onSave={handleUpdate('pipelineValue')}
                type="number"
                icon={<BarChart3 size={12} />}
                formatter={formatCurrency}
              />
            </div>

            {/* YoY delta badge */}
            {yoyDelta != null && (
              <div className="mb-3">
                <span className={`stat-delta ${yoyDelta >= 0 ? 'stat-delta-up' : 'stat-delta-down'}`}>
                  {yoyDelta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {formatPercent(yoyDelta)} YoY
                </span>
              </div>
            )}

            {/* Visual trajectory bars */}
            <RevenueTrajectory
              currentYear={person.currentYearOCE}
              priorYear={person.priorYearOCE}
              target={person.revenueTarget}
            />
          </Section>
        )}

        {/* ===== SUPPORT GAPS (producers) ===== */}
        {gapAnalysis && (
          <Section title="Support Staffing" delay={180}>
            <div className="space-y-2">
              {gapAnalysis.gaps.map(g => (
                <div key={g.role} className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600 dark:text-gray-400 capitalize">{g.role.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">{g.allocated}/{g.required}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 ${
                      g.level === 'green' ? 'bg-green-500' : g.level === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ===== REPORTING SECTION ===== */}
        <Section title="Reporting" delay={220}>
          <ReportingLineEditor
            person={person}
            people={people}
            onUpdateReportsTo={newManagerId => updatePerson(person.id, { reportsTo: newManagerId })}
            onUpdateSupportLines={newLines => updatePerson(person.id, { supportLines: newLines })}
            onSelectPerson={selectPerson}
          />
        </Section>

        {/* ===== SUPPORT REQUIREMENTS (Revenue Producers only) ===== */}
        {person.isRevenueProducer && !isOpenSeat && (
          <Section title="Support Requirements" defaultOpen={false} delay={260}>
            <SupportRequirementsEditor
              person={person}
              onSave={(reqs) => updatePerson(person.id, { supportRequirements: reqs })}
            />
          </Section>
        )}

        {/* ===== HR DETAILS ===== */}
        {!isOpenSeat && (
          <Section title="HR Details" delay={300}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <EditableField
                label="Title"
                value={person.title}
                onSave={handleUpdate('title')}
                type="text"
                icon={<Briefcase size={12} />}
              />
              <EditableField
                label="Band"
                value={person.band}
                onSave={handleUpdate('band')}
                type="select"
                options={BAND_OPTIONS as string[]}
                icon={<Briefcase size={12} />}
              />
              <EditableField
                label="Practice Area"
                value={person.practiceArea}
                onSave={handleUpdate('practiceArea')}
                type="select"
                options={PRACTICE_OPTIONS as string[]}
                icon={<Briefcase size={12} />}
              />
              <EditableField
                label="Office"
                value={person.office}
                onSave={handleUpdate('office')}
                type="select"
                options={OFFICE_OPTIONS as string[]}
                icon={<MapPin size={12} />}
              />
              <EditableField
                label="Employment"
                value={person.employmentType}
                onSave={handleUpdate('employmentType')}
                type="select"
                options={EMPLOYMENT_OPTIONS as string[]}
                icon={<Briefcase size={12} />}
              />
              <EditableField
                label="Compensation"
                value={person.compensationType}
                onSave={handleUpdate('compensationType')}
                type="select"
                options={COMPENSATION_OPTIONS as string[]}
                icon={<DollarSign size={12} />}
              />
              <EditableField
                label="Base Salary"
                value={person.baseSalary}
                onSave={handleUpdate('baseSalary')}
                type="number"
                icon={<DollarSign size={12} />}
                formatter={formatCurrency}
              />
              <EditableField
                label="Total OTE"
                value={person.totalOTE}
                onSave={handleUpdate('totalOTE')}
                type="number"
                icon={<DollarSign size={12} />}
                formatter={formatCurrency}
              />
              <EditableField
                label="Start Date"
                value={person.startDate}
                onSave={handleUpdate('startDate')}
                type="date"
                icon={<Calendar size={12} />}
                formatter={formatDate}
              />
              <div className="group flex items-start gap-2 py-1.5">
                <span className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"><Clock size={12} /></span>
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tenure</div>
                  <div className="text-xs text-gray-800 dark:text-gray-200 mt-0.5">{tenure?.display || '\u2014'}</div>
                </div>
              </div>
              <div className="group flex items-start gap-2 py-1.5">
                <span className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"><Calendar size={12} /></span>
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Birthday</div>
                  <div className="text-xs text-gray-800 dark:text-gray-200 mt-0.5">{formatBirthday(person.birthday)}</div>
                </div>
              </div>
              <div className="group flex items-start gap-2 py-1.5">
                <span className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"><DollarSign size={12} /></span>
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Last Raise</div>
                  <div className="text-xs text-gray-800 dark:text-gray-200 mt-0.5">
                    {person.lastPayIncreasePercent ? `${person.lastPayIncreasePercent}% on ${formatDate(person.lastPayIncreaseDate)}` : '\u2014'}
                  </div>
                </div>
              </div>
              <div className="group flex items-start gap-2 py-1.5">
                <span className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"><Calendar size={12} /></span>
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Last Review</div>
                  <div className="text-xs text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(person.lastReviewDate)}</div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ===== PERFORMANCE & RISK EDITING ===== */}
        {!isOpenSeat && (
          <Section title="Performance & Risk" defaultOpen={false} delay={340}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <EditableField
                label="Performance Rating"
                value={person.performanceRating}
                onSave={handleUpdate('performanceRating')}
                type="select"
                options={PERFORMANCE_OPTIONS as string[]}
                icon={<Star size={12} />}
              />
              <EditableField
                label="Retention Risk"
                value={person.retentionRisk}
                onSave={handleUpdate('retentionRisk')}
                type="select"
                options={RISK_OPTIONS as string[]}
                icon={<Flag size={12} />}
              />
            </div>
          </Section>
        )}

        {/* ===== OPEN SEAT / HIRING DETAILS ===== */}
        {isOpenSeat && (
          <Section title="Hiring Details" delay={140}>
            <div className="space-y-1">
              <EditableField
                label="Hiring Priority"
                value={person.hiringPriority ?? null}
                onSave={handleUpdate('hiringPriority')}
                type="select"
                options={HIRING_PRIORITY_OPTIONS as string[]}
                icon={<AlertTriangle size={12} />}
              />
              <EditableField
                label="Recruiting Status"
                value={person.recruitingStatus ?? null}
                onSave={handleUpdate('recruitingStatus')}
                type="select"
                options={RECRUITING_STATUS_OPTIONS as string[]}
                icon={<Briefcase size={12} />}
              />
              <EditableField
                label="Recruiter Type"
                value={person.recruiterType ?? null}
                onSave={handleUpdate('recruiterType')}
                type="select"
                options={RECRUITER_TYPE_OPTIONS as string[]}
                icon={<Users size={12} />}
              />
              <EditableField
                label="Recruiter Name"
                value={person.recruiterName ?? null}
                onSave={handleUpdate('recruiterName')}
                type="text"
              />
              <EditableField
                label="Target Start Date"
                value={person.targetStartDate ?? null}
                onSave={handleUpdate('targetStartDate')}
                type="date"
                icon={<Calendar size={12} />}
              />
              <EditableField
                label="Budgeted Compensation"
                value={person.budgetedCompensation ?? null}
                onSave={handleUpdate('budgetedCompensation')}
                type="text"
                icon={<DollarSign size={12} />}
              />
              <EditableField
                label="Recruiting Fee Structure"
                value={person.recruitingFeeStructure ?? null}
                onSave={handleUpdate('recruitingFeeStructure')}
                type="text"
                icon={<DollarSign size={12} />}
              />
              <EditableField
                label="Recruiting Spend (Actual)"
                value={person.recruitingSpendActual ?? null}
                onSave={handleUpdate('recruitingSpendActual')}
                type="number"
                icon={<DollarSign size={12} />}
                formatter={(v: number) => `$${Number(v).toLocaleString()}`}
              />
              <EditableField
                label="Recruiting Spend (Committed)"
                value={person.recruitingSpendCommitted ?? null}
                onSave={handleUpdate('recruitingSpendCommitted')}
                type="number"
                icon={<DollarSign size={12} />}
                formatter={(v: number) => `$${Number(v).toLocaleString()}`}
              />
            </div>
            <div className="mt-3">
              <EditableNotesField
                label="Job Spec"
                value={person.jobSpec ?? ''}
                onSave={val => updatePerson(person.id, { jobSpec: val })}
              />
              <EditableNotesField
                label="Recruiting Notes"
                value={person.recruitingNotes ?? ''}
                onSave={val => updatePerson(person.id, { recruitingNotes: val })}
              />
            </div>
          </Section>
        )}

        {/* ===== CANDIDATES (for open seats) ===== */}
        {isOpenSeat && (
          <Section title="Candidates" delay={180}>
            <CandidateTracker
              personId={person.id}
              candidates={person.candidates ?? []}
            />
          </Section>
        )}

        {/* ===== SKILLS & NEEDS (pill-style tags) ===== */}
        <Section title="Skills & Needs" defaultOpen={false} delay={380}>
          <TagEditorSection
            label="Skills (brings)"
            tags={person.skillsTags}
            onUpdate={newTags => updatePerson(person.id, { skillsTags: newTags })}
            color="teal"
            placeholder="Add skill..."
            allKnownTags={allSkillTags}
          />
          <TagEditorSection
            label="Needs (requires)"
            tags={person.needsTags}
            onUpdate={newTags => updatePerson(person.id, { needsTags: newTags })}
            color="orange"
            placeholder="Add need..."
            allKnownTags={allNeedTags}
          />
          <TagEditorSection
            label="Sub-Practice Specialties"
            tags={person.subPracticeSpecialties}
            onUpdate={newTags => updatePerson(person.id, { subPracticeSpecialties: newTags })}
            color="purple"
            placeholder="Add specialty..."
            allKnownTags={allSpecialtyTags}
          />
        </Section>

        {/* ===== NOTES ===== */}
        <Section title="Notes" defaultOpen={false} delay={420}>
          <EditableNotesField
            label="Admin Notes"
            value={person.adminNotes}
            onSave={val => updatePerson(person.id, { adminNotes: val })}
          />
          <EditableNotesField
            label="Performance Notes"
            value={person.performanceNotes}
            onSave={val => updatePerson(person.id, { performanceNotes: val })}
          />
          <EditableNotesField
            label="Retention Notes"
            value={person.retentionNotes}
            onSave={val => updatePerson(person.id, { retentionNotes: val })}
          />
        </Section>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50/80 dark:bg-[#0f1419]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Updated {formatDate(person.lastUpdated)}
          </p>
          {person.status !== 'Terminated' && person.status !== 'Open Seat' && (
            <button
              onClick={() => setShowTerminateConfirm(true)}
              className="text-[11px] font-medium text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <UserX size={12} />
              Terminate
            </button>
          )}
        </div>
        {person.status === 'Terminated' && person.terminationDate && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Terminated: {formatDate(person.terminationDate)}</p>
        )}

        {/* Terminate Confirmation */}
        {showTerminateConfirm && (
          <div className="mt-3 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-scale-in">
            <p className="text-[13px] text-red-700 dark:text-red-300 font-semibold">Terminate {person.firstName} {person.lastName}?</p>
            <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 leading-relaxed">
              This will remove them from all reporting lines and support assignments. Their data will be archived.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  terminatePerson(person.id);
                  setShowTerminateConfirm(false);
                }}
                className="px-4 py-1.5 text-[11px] font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Terminate
              </button>
              <button
                onClick={() => setShowTerminateConfirm(false)}
                className="px-4 py-1.5 text-[11px] font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
