import React, { useEffect, useCallback } from 'react';
import { useOrgStore } from './stores/orgStore';
import { useUIStore } from './stores/uiStore';
import { AppLayout } from './components/Layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FilterBar } from './components/Filters/FilterBar';
import { SearchModal } from './components/Filters/SearchModal';
import { OrgChartView } from './components/OrgChart/OrgChartView';
import { GridView } from './components/GridView/GridView';
import { PracticeView } from './components/PracticeView/PracticeView';
import { RevenueDashboard } from './components/RevenueDashboard/RevenueDashboard';
import { TeamComposition } from './components/TeamComposition/TeamComposition';
import { SupportBoard } from './components/SupportBoard/SupportBoard';
import { PracticeScorecard } from './components/PracticeScorecard/PracticeScorecard';
import { GapAnalysisView } from './components/GapAnalysis/GapAnalysisView';
import { RetentionMatrix } from './components/RetentionMatrix/RetentionMatrix';
import { PlanningChangeLog } from './components/PlanningMode/PlanningChangeLog';
import { ImportModal } from './components/Import/ImportModal';
import { BusinessLogicView } from './components/BusinessLogic/BusinessLogicView';
import { HiringConsole } from './components/HiringConsole/HiringConsole';
import ExecutiveSummary from './components/ExecutiveSummary/ExecutiveSummary';
import { RuleResultsProvider } from './components/BusinessLogic/RuleResultsContext';
import { useRulesStore } from './stores/rulesStore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { isSupabaseEnabled } from './lib/supabase';
import {
  fetchAllPeople,
  fetchAllRules,
  fetchCustomPractices,
  seedIfEmpty,
  subscribeToPeople,
  subscribeToRules,
} from './lib/supabaseSync';
import type { Person } from './types';
import type { Rule } from './types/rules';
import orgData from './data/orgData.json';
import { SEED_RULES } from './data/seedRules';

function ViewRouter() {
  const activeView = useUIStore(s => s.activeView);

  switch (activeView) {
    case 'executive': return <ExecutiveSummary />;
    case 'orgChart': return <OrgChartView />;
    case 'grid': return <GridView />;
    case 'practiceArea': return <PracticeView />;
    case 'revenue': return <RevenueDashboard />;
    case 'teamComposition': return <TeamComposition />;
    case 'supportBoard': return <SupportBoard />;
    case 'practiceScorecard': return <PracticeScorecard />;
    case 'gapAnalysis': return <GapAnalysisView />;
    case 'retentionMatrix': return <RetentionMatrix />;
    case 'businessLogic': return <BusinessLogicView />;
    case 'hiringConsole': return <HiringConsole />;
    default: return <ExecutiveSummary />;
  }
}

function AppContent() {
  const initialize = useOrgStore(s => s.initialize);
  const initializeFromCloud = useOrgStore(s => s.initializeFromCloud);
  const initialized = useOrgStore(s => s.initialized);
  const darkMode = useUIStore(s => s.darkMode);
  const activeView = useUIStore(s => s.activeView);
  const initializeRules = useRulesStore(s => s.initialize);
  const initializeRulesFromCloud = useRulesStore(s => s.initializeFromCloud);
  const { user, isCloudMode } = useAuth();

  // Realtime handlers
  const realtimeUpsertPerson = useOrgStore(s => s._realtimeUpsert);
  const realtimeDeletePerson = useOrgStore(s => s._realtimeDelete);
  const realtimeUpsertRule = useRulesStore(s => s._realtimeUpsert);
  const realtimeDeleteRule = useRulesStore(s => s._realtimeDelete);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Cloud + Local initialization
  const doInit = useCallback(async () => {
    if (isCloudMode && user) {
      try {
        // Try loading from Supabase
        let [cloudPeople, cloudRules, cloudPractices] = await Promise.all([
          fetchAllPeople(),
          fetchAllRules(),
          fetchCustomPractices(),
        ]);

        // If Supabase is empty, seed it with local data
        if (cloudPeople.length === 0) {
          const localData = orgData as Person[];
          const seeded = await seedIfEmpty(localData, SEED_RULES);
          if (seeded) {
            cloudPeople = localData;
            cloudRules = [...SEED_RULES];
          }
        }

        if (cloudPeople.length > 0) {
          initializeFromCloud(cloudPeople, cloudPractices);
        } else {
          initialize();
        }

        if (cloudRules.length > 0) {
          initializeRulesFromCloud(cloudRules);
        } else {
          initializeRules();
        }
      } catch (err) {
        console.error('Cloud init failed, falling back to local:', err);
        initialize();
        initializeRules();
      }
    } else {
      // Local-only mode
      initialize();
      initializeRules();
    }
  }, [isCloudMode, user, initialize, initializeFromCloud, initializeRules, initializeRulesFromCloud]);

  useEffect(() => {
    doInit();
  }, [doInit]);

  // Set up realtime subscriptions when in cloud mode
  useEffect(() => {
    if (!isCloudMode || !user || !initialized) return;

    const unsubPeople = subscribeToPeople(
      realtimeUpsertPerson,
      realtimeUpsertPerson,
      realtimeDeletePerson,
    );

    const unsubRules = subscribeToRules(
      realtimeUpsertRule,
      realtimeUpsertRule,
      realtimeDeleteRule,
    );

    return () => {
      unsubPeople();
      unsubRules();
    };
  }, [isCloudMode, user, initialized, realtimeUpsertPerson, realtimeDeletePerson, realtimeUpsertRule, realtimeDeleteRule]);

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1419]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[#00857C] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">OB</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isCloudMode ? 'Syncing from cloud...' : 'Loading workforce data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <RuleResultsProvider>
      <AppLayout>
        {activeView !== 'executive' && activeView !== 'businessLogic' && activeView !== 'hiringConsole' && <FilterBar />}
        <ErrorBoundary fallbackLabel={activeView}>
          <ViewRouter />
        </ErrorBoundary>
      </AppLayout>
      <SearchModal />
      <PlanningChangeLog />
      <ImportModal />
    </RuleResultsProvider>
  );
}

/** Auth gate: show login if cloud mode + not authenticated */
function AuthGate() {
  const { user, loading, isCloudMode } = useAuth();
  const darkMode = useUIStore(s => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1419]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[#00857C] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">OB</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If Supabase is configured but user not logged in → show login
  if (isCloudMode && !user) {
    return <LoginPage />;
  }

  // Either local-only mode or authenticated → show the app
  return <AppContent />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
