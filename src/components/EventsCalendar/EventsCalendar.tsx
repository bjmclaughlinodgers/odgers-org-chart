import React, { useMemo } from 'react';
import { Calendar, Cake, Award, Briefcase, Clock } from 'lucide-react';
import { useOrgData } from '../../hooks/useOrgData';
import { useUIStore } from '../../stores/uiStore';
import { isUpcomingBirthday, isUpcomingAnniversary, computeTenure, formatBirthday, getMilestoneYear } from '../../utils/tenure';
import type { Person } from '../../types';

interface Event {
  type: 'birthday' | 'anniversary' | 'openSeat';
  person: Person;
  date: string;
  label: string;
  sublabel?: string;
  isMilestone?: boolean;
}

export function EventsCalendar() {
  const { people } = useOrgData();
  const { selectPerson } = useUIStore();

  const events = useMemo(() => {
    const items: Event[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    people.forEach(p => {
      if (p.status === 'Open Seat') {
        if (p.targetStartDate) {
          items.push({
            type: 'openSeat',
            person: p,
            date: p.targetStartDate,
            label: `Open: ${p.title}`,
            sublabel: `${p.practiceArea} · Target: ${p.targetStartDate}`,
          });
        }
        return;
      }

      // Birthdays
      if (p.birthday && isUpcomingBirthday(p.birthday, 30)) {
        const [month, day] = p.birthday.split('-').map(Number);
        let bdayDate = new Date(currentYear, month - 1, day);
        if (bdayDate < now) bdayDate = new Date(currentYear + 1, month - 1, day);
        items.push({
          type: 'birthday',
          person: p,
          date: bdayDate.toISOString().split('T')[0],
          label: `${p.firstName} ${p.lastName}`,
          sublabel: formatBirthday(p.birthday),
        });
      }

      // Anniversaries
      if (isUpcomingAnniversary(p.startDate, 30)) {
        const start = new Date(p.startDate);
        let annivDate = new Date(currentYear, start.getMonth(), start.getDate());
        if (annivDate < now) annivDate = new Date(currentYear + 1, start.getMonth(), start.getDate());
        const milestone = getMilestoneYear(p.startDate);
        const tenure = computeTenure(p.startDate);
        items.push({
          type: 'anniversary',
          person: p,
          date: annivDate.toISOString().split('T')[0],
          label: `${p.firstName} ${p.lastName}`,
          sublabel: `${tenure.years + 1} year${tenure.years + 1 !== 1 ? 's' : ''}`,
          isMilestone: milestone !== null,
        });
      }
    });

    items.sort((a, b) => a.date.localeCompare(b.date));
    return items;
  }, [people]);

  const birthdays = events.filter(e => e.type === 'birthday');
  const anniversaries = events.filter(e => e.type === 'anniversary');
  const openSeats = events.filter(e => e.type === 'openSeat');

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Calendar size={16} className="text-[#00857C]" />
        Upcoming Events
      </h2>

      {/* Birthdays */}
      <div className="mb-5">
        <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Cake size={12} />
          Birthdays (Next 30 Days)
        </h3>
        {birthdays.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No upcoming birthdays</p>
        ) : (
          <div className="space-y-1.5">
            {birthdays.map((e, i) => (
              <button
                key={i}
                onClick={() => selectPerson(e.person.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left transition-colors"
              >
                <Cake size={12} className="text-pink-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{e.label}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{e.sublabel}</div>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{e.date}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Anniversaries */}
      <div className="mb-5">
        <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Award size={12} />
          Work Anniversaries (Next 30 Days)
        </h3>
        {anniversaries.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No upcoming anniversaries</p>
        ) : (
          <div className="space-y-1.5">
            {anniversaries.map((e, i) => (
              <button
                key={i}
                onClick={() => selectPerson(e.person.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left transition-colors ${e.isMilestone ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : ''}`}
              >
                <Award size={12} className={e.isMilestone ? 'text-amber-500' : 'text-blue-400'} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                    {e.label}
                    {e.isMilestone && <span className="ml-1 text-amber-600 dark:text-amber-400">Milestone!</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{e.sublabel}</div>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{e.date}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Open Seat Targets */}
      <div>
        <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Briefcase size={12} />
          Open Seat Target Dates
        </h3>
        {openSeats.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No open seats with target dates</p>
        ) : (
          <div className="space-y-1.5">
            {openSeats.map((e, i) => (
              <button
                key={i}
                onClick={() => selectPerson(e.person.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left transition-colors"
              >
                <Briefcase size={12} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{e.label}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{e.sublabel}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
