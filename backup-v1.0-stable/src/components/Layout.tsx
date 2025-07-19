import React from 'react';
import { Sidebar } from './Sidebar';
import { NoteEditor } from './NoteEditor';
import { FlashcardPanel } from './FlashcardPanel';
import { useApp } from '../context/AppContext';
import { Menu } from 'lucide-react';

export function Layout() {
  const { state, dispatch } = useApp();

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Collapsed Sidebar Button */}
      {state.sidebarCollapsed && (
        <div className="fixed top-4 left-4 z-50 bg-white border border-gray-200 rounded-lg shadow-sm">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="p-2 hover:bg-gray-50 transition-colors"
            title="Ouvrir la sidebar"
          >
            <Menu size={20} />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className={`flex-1 flex transition-all duration-300 ${state.sidebarCollapsed ? 'ml-16' : 'ml-0'}`}>
        <NoteEditor />
        <FlashcardPanel />
      </div>
    </div>
  );
}