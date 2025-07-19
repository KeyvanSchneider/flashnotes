import React, { useState, useRef } from 'react';
import { 
  Menu, 
  Plus, 
  Search, 
  FileText, 
  Folder, 
  FolderOpen,
  Edit2,
  Trash2,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { simpleUuid } from '../utils';
import { Folder as FolderType, Note } from '../types';

export function Sidebar() {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ type: 'folder' | 'note', id: string } | null>(null);
  const dragCounter = useRef(0);

  const createFolder = (parentId?: string) => {
    const newFolder: FolderType = {
      id: simpleUuid(),
      name: 'Nouveau dossier',
      type: 'folder',
      parent: parentId,
      children: [],
      createdAt: new Date(),
    };
    dispatch({ type: 'ADD_FOLDER', payload: newFolder });
    
    if (parentId) {
      const parentFolder = state.folders.find(f => f.id === parentId);
      if (parentFolder) {
        dispatch({ 
          type: 'UPDATE_FOLDER', 
          payload: { 
            ...parentFolder, 
            children: [...parentFolder.children, newFolder.id] 
          } 
        });
      }
      setExpandedFolders(prev => new Set([...prev, parentId]));
    }
    
    setEditingFolderId(newFolder.id);
    setNewFolderName(newFolder.name);
  };

  const createNote = (folderId: string) => {
    const newNote: Note = {
      id: simpleUuid(),
      title: 'Nouvelle note',
      content: '',
      folderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dispatch({ type: 'ADD_NOTE', payload: newNote });
    dispatch({ type: 'SELECT_NOTE', payload: newNote.id });
    setEditingNoteId(newNote.id);
    setNewNoteName(newNote.title);
  };

  const updateFolderName = (folderId: string, name: string) => {
    const folder = state.folders.find(f => f.id === folderId);
    if (folder) {
      dispatch({ 
        type: 'UPDATE_FOLDER', 
        payload: { ...folder, name } 
      });
    }
    setEditingFolderId(null);
    setNewFolderName('');
  };

  const updateNoteName = (noteId: string, title: string) => {
    const note = state.notes.find(n => n.id === noteId);
    if (note) {
      dispatch({ 
        type: 'UPDATE_NOTE', 
        payload: { ...note, title, updatedAt: new Date() } 
      });
    }
    setEditingNoteId(null);
    setNewNoteName('');
  };

  const deleteFolder = (folderId: string) => {
    // Delete all notes in the folder first
    const notesToDelete = state.notes.filter(n => n.folderId === folderId);
    notesToDelete.forEach(note => {
      dispatch({ type: 'DELETE_NOTE', payload: note.id });
    });
    
    // Delete subfolders recursively
    const subfolders = state.folders.filter(f => f.parent === folderId);
    subfolders.forEach(subfolder => {
      deleteFolder(subfolder.id);
    });
    
    // Remove from parent's children
    const parentFolder = state.folders.find(f => f.children.includes(folderId));
    if (parentFolder) {
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          ...parentFolder,
          children: parentFolder.children.filter(id => id !== folderId)
        }
      });
    }
    
    // Then delete the folder
    dispatch({ type: 'DELETE_FOLDER', payload: folderId });
  };

  const deleteNote = (noteId: string) => {
    dispatch({ type: 'DELETE_NOTE', payload: noteId });
    if (state.selectedNoteId === noteId) {
      dispatch({ type: 'SELECT_NOTE', payload: '' });
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const moveNote = (noteId: string, targetFolderId: string) => {
    const note = state.notes.find(n => n.id === noteId);
    if (note && note.folderId !== targetFolderId) {
      dispatch({
        type: 'UPDATE_NOTE',
        payload: { ...note, folderId: targetFolderId, updatedAt: new Date() }
      });
    }
  };

  const moveFolder = (folderId: string, targetParentId?: string) => {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;

    // Prevent moving a folder into itself or its descendants
    if (targetParentId) {
      const isDescendant = (parentId: string, checkId: string): boolean => {
        const parent = state.folders.find(f => f.id === parentId);
        if (!parent) return false;
        if (parent.parent === checkId) return true;
        if (parent.parent) return isDescendant(parent.parent, checkId);
        return false;
      };

      if (targetParentId === folderId || isDescendant(targetParentId, folderId)) {
        return; // Prevent circular reference
      }
    }

    const oldParentId = folder.parent;

    // Remove from old parent's children
    if (oldParentId) {
      const oldParent = state.folders.find(f => f.id === oldParentId);
      if (oldParent) {
        dispatch({
          type: 'UPDATE_FOLDER',
          payload: {
            ...oldParent,
            children: oldParent.children.filter(id => id !== folderId)
          }
        });
      }
    }

    // Add to new parent's children
    if (targetParentId) {
      const newParent = state.folders.find(f => f.id === targetParentId);
      if (newParent) {
        dispatch({
          type: 'UPDATE_FOLDER',
          payload: {
            ...newParent,
            children: [...newParent.children, folderId]
          }
        });
      }
    }

    // Update the folder's parent
    dispatch({
      type: 'UPDATE_FOLDER',
      payload: {
        ...folder,
        parent: targetParentId
      }
    });
  };
  const handleDragStart = (e: React.DragEvent, type: 'folder' | 'note', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    if (draggedItem) {
      if (draggedItem.type === 'note') {
        moveNote(draggedItem.id, targetFolderId);
      } else if (draggedItem.type === 'folder') {
        moveFolder(draggedItem.id, targetFolderId);
      }
    }
    
    setDraggedItem(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    // Only allow dropping folders on root, not notes
    if (draggedItem && draggedItem.type === 'folder') {
      moveFolder(draggedItem.id, undefined); // Move to root level
    }
    
    setDraggedItem(null);
  };

  const getRootFolders = () => {
    return state.folders.filter(folder => !folder.parent);
  };

  const getSubfolders = (parentId: string) => {
    return state.folders.filter(folder => folder.parent === parentId);
  };

  const getNotesForFolder = (folderId: string) => {
    return state.notes.filter(note => 
      note.folderId === folderId &&
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getTotalNotesCount = (folderId: string): number => {
    // Compter les notes directes du dossier
    let count = state.notes.filter(note => note.folderId === folderId).length;
    
    // Ajouter les notes des sous-dossiers récursivement
    const subfolders = getSubfolders(folderId);
    subfolders.forEach(subfolder => {
      count += getTotalNotesCount(subfolder.id);
    });
    
    return count;
  };

  const renderFolder = (folder: FolderType, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = getSubfolders(folder.id);
    const notes = getNotesForFolder(folder.id);
    const hasChildren = subfolders.length > 0 || notes.length > 0;

    return (
      <div key={folder.id} className="space-y-1">
        {/* Folder */}
        <div 
          className={`flex items-center group ${level > 0 ? 'ml-4' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            e.stopPropagation();
            handleDrop(e, folder.id);
          }}
        >
          <button 
            onClick={() => toggleFolder(folder.id)}
            className="flex items-center flex-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="mr-2 p-1 hover:bg-gray-200 rounded-md transition-colors"
              >
                {isExpanded ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                    <polyline points="6,9 12,15 18,9"></polyline>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                    <polyline points="9,18 15,12 9,6"></polyline>
                  </svg>
                )}
              </button>
            )}
            
            {isExpanded ? (
              <FolderOpen size={16} className="mr-2 text-blue-500" />
            ) : (
              <Folder size={16} className="mr-2 text-blue-500" />
            )}
            
            {editingFolderId === folder.id ? (
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => updateFolderName(folder.id, newFolderName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateFolderName(folder.id, newFolderName);
                  } else if (e.key === 'Escape') {
                    setEditingFolderId(null);
                    setNewFolderName('');
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-left text-sm font-medium text-gray-700">
                {folder.name}
              </span>
            )}
            
            <span className="text-xs text-gray-400 mr-2">
              {getTotalNotesCount(folder.id)}
            </span>
          </button>

          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
            <button
              onClick={() => createFolder(folder.id)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Nouveau sous-dossier"
            >
              <Folder size={12} />
            </button>
            <button
              onClick={() => createNote(folder.id)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Nouvelle note"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={() => {
                setEditingFolderId(folder.id);
                setNewFolderName(folder.name);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Renommer"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={() => deleteFolder(folder.id)}
              className="p-1 hover:bg-gray-200 rounded transition-colors text-red-500"
              title="Supprimer"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Subfolders and Notes */}
        {isExpanded && (
          <div className="space-y-1">
            {/* Subfolders */}
            {subfolders.map(subfolder => renderFolder(subfolder, level + 1))}
            
            {/* Notes */}
            {notes.map(note => (
              <div 
                key={note.id} 
                className={`flex items-center group ${level > 0 ? 'ml-8' : 'ml-4'}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'note', note.id)}
              >
                <button
                  onClick={() => dispatch({ type: 'SELECT_NOTE', payload: note.id })}
                  className={`flex items-center flex-1 p-2 rounded-lg transition-colors ${
                    state.selectedNoteId === note.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <FileText size={14} className="mr-2" />
                  
                  {editingNoteId === note.id ? (
                    <input
                      type="text"
                      value={newNoteName}
                      onChange={(e) => setNewNoteName(e.target.value)}
                      onBlur={() => updateNoteName(note.id, newNoteName)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateNoteName(note.id, newNoteName);
                        } else if (e.key === 'Escape') {
                          setEditingNoteId(null);
                          setNewNoteName('');
                        }
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {note.title}
                      </span>
                      {(() => {
                        const flashcardCount = state.flashcards.filter(fc => fc.noteId === note.id).length;
                        return flashcardCount > 0 ? (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            {flashcardCount}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  )}
                </button>

                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setEditingNoteId(note.id);
                      setNewNoteName(note.title);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Renommer"
                  >
                    <Edit2 size={10} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (state.sidebarCollapsed) {
    return null;
  }

  const rootFolders = getRootFolders();

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="relative mr-3">
              <BookOpen 
                size={24} 
                className="text-blue-500 animate-pulse"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))',
                  animation: 'glow 2s ease-in-out infinite alternate'
                }}
              />
              <style jsx>{`
                @keyframes glow {
                  from {
                    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
                  }
                  to {
                    filter: drop-shadow(0 0 16px rgba(59, 130, 246, 0.8));
                  }
                }
              `}</style>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">FlashNotes</h1>
              <div className="text-xs text-gray-500">
                (Par Keyvan Schneider)
              </div>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Réduire la sidebar"
          >
            <Menu size={20} />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto"
        onDragOver={handleDragOver}
        onDrop={handleDropOnRoot}
      >
        {rootFolders.length === 0 && searchQuery === '' ? (
          <div className="p-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Folder size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Créer un dossier</h3>
              <p className="text-gray-500 mb-4">Organisez vos notes en créant votre premier dossier</p>
              <button
                onClick={() => createFolder()}
                className="flex items-center justify-center w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Nouveau dossier
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Dossiers
              </h2>
              <button
                onClick={() => createFolder()}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Nouveau dossier"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {rootFolders.map(folder => renderFolder(folder))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}