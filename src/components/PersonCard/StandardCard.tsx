import React from 'react';
import { Star, Check, AlertTriangle, Eye, Flag, MapPin, Briefcase } from 'lucide-react';
import type { Person } from '../../types';
import { PRACTICE_COLORS } from '../../types';
import { formatCurrency } from '../../utils/export';
import { computeTenure } from '../../utils/tenure';

interface StandardCardProps {
  person: Person;
  onClick?: () => void;
}

export function StandardCard({ person, onClick }: StandardCardProps) {
  const isOpenSeat = person.status === 'Open Seat';
  const isOnLeave = person.status === 'On Leave';
  const tenure = !isOpenSeat ? computeTenure(person.startDate) : null;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#1a2332] rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-md dark:hover:shadow-gray-900/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 ${isOnLeave ? 'opacity-60' : ''} ${isOpenSeat ? 'border-dashed bg-gray-50/50 dark:bg-[#0f1419]' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Color indicator */}
        {!isOpenSeat && person.photoUrl ? (
          <img src={person.photoUrl} alt="" className="w-10 h-10 rounded-lg flex-shrink-0 object-cover" />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
            style={{ backgroundColor: PRACTICE_COLORS[person.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }}
          >
            {isOpenSeat ? '?' : `${person.firstName[0]}${person.lastName[0]}`}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-semibold text-gray-900 dark:text-gray-100 truncate ${isOpenSeat ? 'italic text-gray-500 dark:text-gray-400' : ''}`}>
              {isOpenSeat ? `Open: ${person.title}` : `${person.firstName} ${person.lastName}`}
            </span>
            {!isOpenSeat && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {person.performanceRating === 'Star Performer' && <Star size={12} className="text-amber-500 fill-amber-500" />}
                {person.performanceRating === 'Performer' && <Check size={12} className="text-green-500" />}
                {person.performanceRating === 'Performance Improvement' && <AlertTriangle size={12} className="text-orange-500" />}
                {person.retentionRisk === 'Watch' && <Eye size={12} className="text-gray-400" />}
                {person.retentionRisk === 'Elevated' && <Flag size={12} className="text-orange-500" />}
                {person.retentionRisk === 'Critical' && <Flag size={12} className="text-red-500" />}
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{person.title}</div>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {person.office === 'Washington DC' ? 'DC' : person.office}
            </span>
            {tenure && (
              <span className="flex items-center gap-1">
                <Briefcase size={10} />
                {tenure.display}
              </span>
            )}
            {person.isRevenueProducer && person.currentYearOCE && (
              <span className="font-medium text-gray-600 dark:text-gray-400">{formatCurrency(person.currentYearOCE)}</span>
            )}
          </div>
        </div>

        {/* Practice badge */}
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white flex-shrink-0"
          style={{ backgroundColor: PRACTICE_COLORS[person.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }}
        >
          {person.practiceArea === 'US Associations & Corporate Affairs' ? 'US Assoc'
            : person.practiceArea === 'Aerospace & Defense' ? 'A&D'
            : person.practiceArea === 'Financial Services' ? 'Fin Svcs'
            : person.practiceArea}
        </span>
      </div>

      {/* Status badges */}
      {isOnLeave && (
        <div className="mt-2">
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">ON LEAVE</span>
        </div>
      )}
      {isOpenSeat && (
        <div className="mt-2 flex items-center gap-2">
          {person.hiringPriority && (
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
              person.hiringPriority === 'Critical' || person.hiringPriority === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {person.hiringPriority}
            </span>
          )}
          {person.targetStartDate && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Target: {person.targetStartDate}</span>
          )}
        </div>
      )}
    </div>
  );
}
