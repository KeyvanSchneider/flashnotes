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
  Highlighter,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { countWords, getSelectedText, simpleUuid, stripHtml } from '../utils';
import { Flashcard } from '../types';

export function NoteEditor() {
  const { state, dispatch } = useApp();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [flashcardData, setFlashcardData] = useState({ question: '', answer: '', tags: '' });
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);

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
    
    // Détecter le pattern markdown et ouvrir le modal
    detectMarkdownPattern(content);
    
    const updatedNote = {
      ...currentNote,
      content,
      updatedAt: new Date(),
    };

    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
  };

  const detectMarkdownPattern = (content: string) => {
    if (!currentNote) return;
    
    // Convertir le HTML en texte brut pour analyser
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    let textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Nettoyer le texte et normaliser les espaces
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    console.log('Contenu analysé:', textContent); // Debug
    
    // Pattern plus simple et flexible pour détecter # Question ## Réponse
    const flashcardPattern = /#\s*([^#]+?)\s*##\s*([^#]+?)(?:\s|$)/g;
    const match = flashcardPattern.exec(textContent);
    
    console.log('Pattern trouvé:', match); // Debug
    
    if (match) {
      const question = match[1].trim();
      const answer = match[2].trim();
      
      console.log('Question:', question, 'Réponse:', answer); // Debug
      
      // Vérifier les flashcards existantes pour éviter les doublons
      const existingFlashcards = state.flashcards.filter(fc => fc.noteId === currentNote.id);
      const exists = existingFlashcards.some(fc => 
        stripHtml(fc.question).toLowerCase().includes(question.toLowerCase()) || 
        question.toLowerCase().includes(stripHtml(fc.question).toLowerCase())
      );
      
      console.log('Flashcard existe déjà:', exists); // Debug
      
      // Si pas de doublon et qu'on a question et réponse, ouvrir le modal
      if (!exists && question && answer && !showFlashcardModal) {
        console.log('Ouverture du modal flashcard'); // Debug
        
        setSelectedText(`# ${question}\n## ${answer}`);
        setFlashcardData({
          question: question,
          answer: answer,
          tags: 'auto-markdown'
        });
        setShowFlashcardModal(true);
      }
    }
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

  const handleAlignment = (alignment: 'left' | 'center' | 'right') => {
    let command = '';
    switch (alignment) {
      case 'left':
        command = 'justifyLeft';
        break;
      case 'center':
        command = 'justifyCenter';
        break;
      case 'right':
        command = 'justifyRight';
        break;
    }
    
    // S'assurer que l'éditeur a le focus
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    // Exécuter la commande d'alignement
    document.execCommand(command, false);
    
    // Sauvegarder les changements
    setTimeout(() => {
      handleContentChange();
    }, 100);
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

  const addImageResizeHandlers = () => {
    if (!editorRef.current) return;
    
    // Traiter toutes les images, même celles sans container
    const images = editorRef.current.querySelectorAll('img');
    images.forEach(img => {
      // Si l'image n'a pas de container, en créer un
      if (!img.closest('.image-container')) {
        const container = document.createElement('div');
        container.className = 'image-container';
        container.style.cssText = `
          position: relative;
          display: block;
          margin: 20px auto;
          text-align: center;
          max-width: 100%;
        `;
        
        // Envelopper l'image dans le container
        img.parentNode?.insertBefore(container, img);
        container.appendChild(img);
        
        // Créer le handle
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.style.cssText = `
          position: absolute;
          bottom: -5px;
          right: -5px;
          width: 15px;
          height: 15px;
          background: #3b82f6;
          cursor: nw-resize;
          opacity: 0.7;
          border-radius: 0 0 3px 0;
          z-index: 10;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        `;
        container.appendChild(handle);
      }
    });
    
    // Maintenant traiter tous les containers
    const containers = editorRef.current.querySelectorAll('.image-container');
    containers.forEach(container => {
      const img = container.querySelector('img') as HTMLImageElement;
      const handle = container.querySelector('.resize-handle') as HTMLElement;
      
      if (!img || !handle || handle.dataset.listenerAdded) return;
      
      handle.dataset.listenerAdded = 'true';
      
      // S'assurer que l'image a les bons styles
      img.style.cssText = `
        max-width: 100%;
        height: auto;
        min-width: 100px;
        min-height: 100px;
        user-select: none;
        pointer-events: auto;
        display: block;
      `;
      
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
      
      // Hover effects
      container.addEventListener('mouseenter', () => {
        handle.style.opacity = '1';
      });
      
      container.addEventListener('mouseleave', () => {
        if (!isResizing) {
          handle.style.opacity = '0.7';
        }
      });
      
      // Empêcher le drag de l'image
      img.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });
      
      // Double-clic pour supprimer l'image
      img.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (confirm('Supprimer cette image ?')) {
          container.remove();
          handleContentChange();
        }
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
    const timeoutId = setTimeout(() => {
      if (editorRef.current) {
        addImageResizeHandlers();
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentNote?.content]);

  // Ajouter les handlers après chaque modification du contenu
  useEffect(() => {
    const observer = new MutationObserver(() => {
      addImageResizeHandlers();
    });
    
    if (editorRef.current) {
      observer.observe(editorRef.current, {
        childList: true,
        subtree: true
      });
    }
    
    return () => observer.disconnect();
  }, []);

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

  // Export en PDF
  const exportToPDF = async () => {
    if (!currentNote) return;
    
    try {
      // Dynamically import jsPDF and html2canvas
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      
      const pdf = new jsPDF();
      
      // Créer un élément temporaire avec le contenu formaté
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        width: 800px;
        padding: 40px;
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        position: absolute;
        top: -9999px;
        left: -9999px;
      `;
      
      // Titre
      const titleElement = document.createElement('h1');
      titleElement.style.cssText = `
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        color: #1f2937;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 10px;
      `;
      titleElement.textContent = currentNote.title;
      tempDiv.appendChild(titleElement);
      
      // Contenu avec mise en forme
      const contentElement = document.createElement('div');
      contentElement.style.cssText = `
        font-size: 14px;
        margin-top: 20px;
      `;
      contentElement.innerHTML = currentNote.content;
      
      // Améliorer le style des éléments dans le contenu
      const styleElements = (element: HTMLElement) => {
        // Style pour les images
        const images = element.querySelectorAll('img');
        images.forEach(img => {
          (img as HTMLElement).style.cssText = `
            max-width: 100%;
            height: auto;
            margin: 10px 0;
            border-radius: 4px;
          `;
        });
        
        // Style pour les éléments en gras
        const boldElements = element.querySelectorAll('b, strong');
        boldElements.forEach(el => {
          (el as HTMLElement).style.fontWeight = 'bold';
        });
        
        // Style pour les éléments en italique
        const italicElements = element.querySelectorAll('i, em');
        italicElements.forEach(el => {
          (el as HTMLElement).style.fontStyle = 'italic';
        });
        
        // Style pour les éléments soulignés
        const underlineElements = element.querySelectorAll('u');
        underlineElements.forEach(el => {
          (el as HTMLElement).style.textDecoration = 'underline';
        });
        
        // Style pour les listes
        const lists = element.querySelectorAll('ul, ol');
        lists.forEach(list => {
          (list as HTMLElement).style.cssText = `
            margin: 10px 0;
            padding-left: 20px;
          `;
        });
        
        const listItems = element.querySelectorAll('li');
        listItems.forEach(li => {
          (li as HTMLElement).style.cssText = `
            margin: 5px 0;
            line-height: 1.5;
          `;
        });
      };
      
      styleElements(contentElement);
      tempDiv.appendChild(contentElement);
      
      // Ajouter l'élément au DOM temporairement
      document.body.appendChild(tempDiv);
      
      // Capturer l'élément avec html2canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // Meilleure qualité
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Supprimer l'élément temporaire
      document.body.removeChild(tempDiv);
      
      // Calculer les dimensions pour le PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Ajouter la première page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Ajouter des pages supplémentaires si nécessaire
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Télécharger
      pdf.save(`${currentNote.title}.pdf`);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export PDF. Veuillez réessayer.');
    }
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
            onClick={() => handleAlignment('left')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Aligner à gauche"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => handleAlignment('center')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Centrer"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => handleAlignment('right')}
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
            onClick={exportToPDF}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-green-600"
            title="Exporter en PDF"
          >
            <Download size={16} />
          </button>
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
          className="min-h-full outline-none prose prose-sm max-w-none break-words"
          style={{ 
            minHeight: '400px',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            maxWidth: '100%',
            width: '100%',
            overflowX: 'hidden',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>{wordCount} mot{wordCount !== 1 ? 's' : ''}</span>
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