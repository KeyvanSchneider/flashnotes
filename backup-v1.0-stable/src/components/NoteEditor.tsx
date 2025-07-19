import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  CreditCard,
  Type,
  Highlighter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { countWords, getSelectedText, simpleUuid } from '../utils';
import { Flashcard } from '../types';

export function NoteEditor() {
  const { state, dispatch } = useApp();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [flashcardData, setFlashcardData] = useState({ question: '', answer: '', tags: '' });
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentNote = state.notes.find(n => n.id === state.selectedNoteId);

  useEffect(() => {
    if (currentNote && editorRef.current) {
      editorRef.current.innerHTML = currentNote.content;
      // Add resize handles to existing images
      const images = editorRef.current.querySelectorAll('img');
      images.forEach(img => {
        if (!img.classList.contains('resizable-image')) {
          img.classList.add('resizable-image');
          img.style.resize = 'both';
          img.style.overflow = 'auto';
          img.style.display = 'block';
        }
      });
    }
  }, [currentNote?.id]);

  const handleContentChange = () => {
    if (!currentNote || !editorRef.current) return;

    const content = editorRef.current.innerHTML;
    const updatedNote = {
      ...currentNote,
      content,
      updatedAt: new Date(),
    };

    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
  };

  const execCommand = (command: string, value?: string) => {
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      // Utiliser une approche moderne pour les listes
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const listType = command === 'insertUnorderedList' ? 'ul' : 'ol';
        const listItem = document.createElement('li');
        const list = document.createElement(listType);
        
        // Si on a du texte sélectionné, l'utiliser comme contenu de l'élément de liste
        if (!range.collapsed) {
          listItem.appendChild(range.extractContents());
        } else {
          listItem.innerHTML = '&nbsp;';
        }
        
        list.appendChild(listItem);
        range.insertNode(list);
        
        // Positionner le curseur dans l'élément de liste
        range.setStart(listItem, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      document.execCommand(command, false, value);
    }
    if (editorRef.current) {
      editorRef.current.focus();
    }
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    setActiveFormats(formats);
  };

  const setFontSize = (size: string) => {
    execCommand('fontSize', size);
    setShowFontSizePicker(false);
  };

  const setHighlight = (color: string) => {
    execCommand('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  const setTextColor = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const removeHighlight = () => {
    execCommand('hiliteColor', 'transparent');
    setShowHighlightPicker(false);
  };

  const handleTextSelection = () => {
    const selection = getSelectedText();
    if (selection.trim()) {
      setSelectedText(selection);
      setFlashcardData({ 
        question: selection, 
        answer: '', 
        tags: '' 
      });
      setShowFlashcardModal(true);
    }
  };

  const createFlashcard = () => {
    if (!currentNote || !flashcardData.question || !flashcardData.answer) return;

    const newFlashcard: Flashcard = {
      id: simpleUuid(),
      noteId: currentNote.id,
      question: flashcardData.question,
      answer: flashcardData.answer,
      textSelection: selectedText,
      tags: flashcardData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      difficulty: 1,
      stats: {
        timesReviewed: 0,
        correctAnswers: 0,
      },
    };

    dispatch({ type: 'ADD_FLASHCARD', payload: newFlashcard });
    setShowFlashcardModal(false);
    setFlashcardData({ question: '', answer: '', tags: '' });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const imgId = `img-${Date.now()}`;
        const imgContainer = `<div><br></div><div class="image-container" style="display: block; position: relative; margin: 20px 0; text-align: center;">
            <img id="${imgId}" src="${result}" alt="Image" class="resizable-image" style="max-width: 100%; height: auto; display: inline-block; min-width: 100px; min-height: 100px;" />
            <div class="resize-handle" data-target="${imgId}"></div>
          </div><div><br></div>`;
        document.execCommand('insertHTML', false, imgContainer);
        if (editorRef.current) {
          editorRef.current.focus();
          // Add event listeners for the new image
          setTimeout(() => addImageResizeHandlers(), 100);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addImageResizeHandlers = () => {
    if (!editorRef.current) return;
    
    const containers = editorRef.current.querySelectorAll('.image-container');
    containers.forEach(container => {
      const img = container.querySelector('img') as HTMLImageElement;
      const handle = container.querySelector('.resize-handle') as HTMLElement;
      
      if (!img || !handle || handle.dataset.listenerAdded) return;
      
      handle.dataset.listenerAdded = 'true';
      
      let isResizing = false;
      let startX = 0;
      let startY = 0;
      let startWidth = 0;
      let startHeight = 0;
      
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = img.offsetWidth;
        startHeight = img.offsetHeight;
        
        // Empêcher la sélection de texte pendant le redimensionnement
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        container.classList.add('resizing');
      });
      
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newWidth = Math.max(100, startWidth + deltaX);
        // Maintenir les proportions
        const aspectRatio = startHeight / startWidth;
        const newHeight = newWidth * aspectRatio;
        
        img.style.width = newWidth + 'px';
        img.style.height = newHeight + 'px';
      };
      
      const handleMouseUp = () => {
        isResizing = false;
        document.body.style.userSelect = '';
        container.classList.remove('resizing');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Trigger content change to save
        handleContentChange();
      };
      
      // Empêcher le drag de l'image
      img.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });
      
      // Permettre de cliquer à côté de l'image pour positionner le curseur
      container.addEventListener('click', (e) => {
        if (e.target === container) {
          // Créer un élément temporaire pour positionner le curseur
          const range = document.createRange();
          const selection = window.getSelection();
          
          if (selection) {
            range.setStartAfter(container);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      });
    });
  };

  // Add resize handlers when component mounts or content changes
  useEffect(() => {
    if (editorRef.current) {
      addImageResizeHandlers();
    }
  }, [currentNote?.content]);

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const insertImage = (imageData: string) => {
    if (imageData.trim()) {
      const img = `<img src="${imageData}" alt="Image" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
      document.execCommand('insertHTML', false, img);
      setShowImageModal(false);
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }
  };

  const exportNote = () => {
    if (!currentNote) return;
    
    const noteData = {
      title: currentNote.title,
      content: currentNote.content,
      createdAt: currentNote.createdAt,
      updatedAt: currentNote.updatedAt,
      flashcards: noteFlashcards.map(fc => ({
        question: fc.question,
        answer: fc.answer,
        tags: fc.tags
      }))
    };
    
    const blob = new Blob([JSON.stringify(noteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNote.title}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const textColors = [
    '#000000', '#374151', '#6B7280', '#EF4444', '#F97316', 
    '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
  ];

  const highlightColors = [
    '#FEF3C7', '#FED7AA', '#FECACA', '#D1FAE5', '#BFDBFE', 
    '#E0E7FF', '#F3E8FF', '#FCE7F3', '#F0F9FF', '#F7FEE7'
  ];

  const fontSizes = [
    { label: '8pt', value: '1' },
    { label: '10pt', value: '2' },
    { label: '12pt', value: '3' },
    { label: '14pt', value: '4' },
    { label: '18pt', value: '5' },
    { label: '24pt', value: '6' },
    { label: '36pt', value: '7' }
  ];

  if (!currentNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Aucune note sélectionnée</h2>
          <p className="text-gray-500">Sélectionnez une note dans la sidebar pour commencer</p>
        </div>
      </div>
    );
  }

  const wordCount = countWords(currentNote.content);
  const noteFlashcards = state.flashcards.filter(fc => fc.noteId === currentNote.id);

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Title */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          value={currentNote.title}
          onChange={(e) => {
            const updatedNote = { ...currentNote, title: e.target.value, updatedAt: new Date() };
            dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
          }}
          className="w-full text-2xl font-bold text-gray-800 bg-transparent border-none outline-none"
          placeholder="Titre de la note"
        />
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowFontSizePicker(!showFontSizePicker)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Taille de police"
            >
              <Type size={16} />
            </button>
            {showFontSizePicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                <div className="space-y-1">
                  {fontSizes.map(size => (
                    <button
                      key={size.value}
                      onClick={() => setFontSize(size.value)}
                      className="block w-full text-left px-3 py-1 hover:bg-gray-100 rounded text-sm"
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => execCommand('bold')}
            className={`p-2 hover:bg-gray-200 rounded-lg transition-colors ${
              activeFormats.has('bold') ? 'bg-gray-300 text-gray-900' : ''
            }`}
            title="Gras"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => execCommand('italic')}
            className={`p-2 hover:bg-gray-200 rounded-lg transition-colors ${
              activeFormats.has('italic') ? 'bg-gray-300 text-gray-900' : ''
            }`}
            title="Italique"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => execCommand('underline')}
            className={`p-2 hover:bg-gray-200 rounded-lg transition-colors ${
              activeFormats.has('underline') ? 'bg-gray-300 text-gray-900' : ''
            }`}
            title="Souligné"
          >
            <Underline size={16} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={() => execCommand('justifyLeft')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Aligner à gauche"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => execCommand('justifyCenter')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Centrer"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => execCommand('justifyRight')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Aligner à droite"
          >
            <AlignRight size={16} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Couleur du texte"
            >
              <Palette size={16} />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                <div className="grid grid-cols-6 gap-2">
                  {textColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowHighlightPicker(!showHighlightPicker)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Surligner le texte"
            >
              <Highlighter size={16} />
            </button>
            {showHighlightPicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {highlightColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setHighlight(color)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  onClick={removeHighlight}
                  className="w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  Supprimer surlignage
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={() => {
              const selection = getSelectedText();
              setSelectedText(selection);
              setFlashcardData({ 
                question: selection || '', 
                answer: '', 
                tags: '' 
              });
              setShowFlashcardModal(true);
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-blue-600"
            title="Créer une flashcard"
          >
            <CreditCard size={16} />
          </button>

          <button
            onClick={triggerImageUpload}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Insérer une image"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          className="min-h-full outline-none prose prose-sm max-w-none"
          style={{ minHeight: '400px' }}
        />
      </div>

      {/* Status Bar */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>{wordCount} mots</span>
          <span>{noteFlashcards.length} flashcards</span>
        </div>
        <span className="text-sm text-gray-500">Sauvegardé automatiquement</span>
      </div>

      {/* Flashcard Modal */}
      {showFlashcardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Créer une flashcard</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea
                  value={flashcardData.question}
                  onChange={(e) => setFlashcardData({ ...flashcardData, question: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Réponse</label>
                <textarea
                  value={flashcardData.answer}
                  onChange={(e) => setFlashcardData({ ...flashcardData, answer: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Saisissez la réponse..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={flashcardData.tags}
                  onChange={(e) => setFlashcardData({ ...flashcardData, tags: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowFlashcardModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createFlashcard}
                disabled={!flashcardData.question || !flashcardData.answer}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}