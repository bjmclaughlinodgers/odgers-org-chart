import React, { useState } from 'react';
import { Undo2, Save, FolderOpen, Trash2, ArrowRightLeft, Plus, Minus, Edit3, GitBranch, Download, Check } from 'lucide-react';
import { usePlanningMode } from '../../hooks/usePlanningMode';

export function PlanningChangeLog() {
  const {
    isActive, changes, scenarios, activeScenarioId,
    undoLast, saveScenario, loadScenario, deleteScenario, deactivate,
  } = usePlanningMode();
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);

  if (!isActive) return null;

  const changeIcons: Record<string, React.ReactNode> = {
    move: <ArrowRightLeft size={12} className="text-blue-500" />,
    add: <Plus size={12} className="text-green-500" />,
    remove: <Minus size={12} className="text-red-500" />,
    edit: <Edit3 size={12} className="text-amber-500" />,
    reassign: <GitBranch size={12} className="text-purple-500" />,
  };

  return (
    <div className="fixed bottom-4 right-4 w-[350px] bg-white dark:bg-[#1a2332] rounded-xl shadow-2xl dark:shadow-gray-900/50 border border-amber-200 dark:border-amber-800 z-50 overflow-hidden">
      <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Planning Mode</span>
          <span className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">{changes.length} changes</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={undoLast} disabled={changes.length === 0} className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo last change">
            <Undo2 size={14} />
          </button>
          <button onClick={() => setShowSave(!showSave)} className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400" title="Save scenario">
            <Save size={14} />
          </button>
          <button onClick={() => setShowScenarios(!showScenarios)} className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400" title="Load scenario">
            <FolderOpen size={14} />
          </button>
        </div>
      </div>

      {/* Save Panel */}
      {showSave && (
        <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
          <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Scenario name..." className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100" />
          <input value={saveDesc} onChange={e => setSaveDesc(e.target.value)} placeholder="Description (optional)..." className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100" />
          <button onClick={() => { if (saveName.trim()) { saveScenario(saveName, saveDesc); setSaveName(''); setSaveDesc(''); setShowSave(false); } }} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded hover:bg-amber-600 flex items-center gap-1">
            <Save size={12} /> Save Scenario
          </button>
        </div>
      )}

      {/* Load Scenarios Panel */}
      {showScenarios && (
        <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 max-h-[200px] overflow-y-auto">
          {scenarios.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No saved scenarios</p>
          ) : (
            <div className="space-y-1.5">
              {scenarios.map(s => (
                <div key={s.id} className={`flex items-center justify-between p-2 rounded border ${activeScenarioId === s.id ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2332]'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{s.name}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">{s.changes.length} changes · {new Date(s.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { loadScenario(s.id); setShowScenarios(false); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Load"><Download size={12} className="text-gray-500 dark:text-gray-400" /></button>
                    <button onClick={() => deleteScenario(s.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete"><Trash2 size={12} className="text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Change Log */}
      <div className="max-h-[300px] overflow-y-auto">
        {changes.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">No changes yet</p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">Drag cards in org chart, add open seats, or reassign support lines</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[...changes].reverse().map(change => (
              <div key={change.id} className="px-4 py-2.5 flex items-start gap-2">
                {changeIcons[change.type] || <Edit3 size={12} className="text-gray-400 dark:text-gray-500" />}
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-700 dark:text-gray-300">{change.description}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(change.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exit Button */}
      <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1419] flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">Changes are sandboxed</span>
        <button onClick={deactivate} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Exit Planning</button>
      </div>
    </div>
  );
}
