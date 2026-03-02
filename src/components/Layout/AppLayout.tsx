import React from 'react';
import { Header } from './Header';
import { useUIStore } from '../../stores/uiStore';
import { DetailSidebar } from '../Sidebar/DetailSidebar';
import { EventsCalendar } from '../EventsCalendar/EventsCalendar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarOpen, eventsSidebarOpen } = useUIStore();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Detail Sidebar */}
        {sidebarOpen && (
          <aside className="w-[420px] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2332] overflow-y-auto shadow-lg dark:shadow-gray-900/50 flex-shrink-0">
            <DetailSidebar />
          </aside>
        )}

        {/* Events Sidebar */}
        {eventsSidebarOpen && !sidebarOpen && (
          <aside className="w-[320px] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2332] overflow-y-auto flex-shrink-0">
            <EventsCalendar />
          </aside>
        )}
      </div>
    </div>
  );
}
