import React, { useState } from 'react';
import { BarChart3, BookOpen, GitCompare } from 'lucide-react';
import { ResultsDashboard } from './ResultsDashboard';
import { RulesList } from './RulesList';
import { ScenarioComparison } from './ScenarioComparison';
import { useRuleResults } from './RuleResultsContext';

type SubTab = 'results' | 'rules' | 'scenario';

export function BusinessLogicView() {
  const [activeTab, setActiveTab] = useState<SubTab>('results');
  const { isPlanningActive } = useRuleResults();

  const tabs: { id: SubTab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'results', label: 'Results', icon: <BarChart3 size={15} /> },
    { id: 'rules', label: 'Rules', icon: <BookOpen size={15} /> },
    { id: 'scenario', label: 'Scenario Diff', icon: <GitCompare size={15} />, disabled: !isPlanningActive },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-tab bar */}
      <div className="bg-white dark:bg-[#1c2431] border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#00857C] text-[#00857C] dark:text-[#00857C] bg-gray-50 dark:bg-[#0f1419]'
                  : tab.disabled
                  ? 'border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'scenario' && !isPlanningActive && (
                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded ml-1">Planning Only</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0f1419]">
        {activeTab === 'results' && <ResultsDashboard />}
        {activeTab === 'rules' && <RulesList />}
        {activeTab === 'scenario' && <ScenarioComparison />}
      </div>
    </div>
  );
}
