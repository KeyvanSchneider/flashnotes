import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Eye, 
  CheckCircle, 
  Circle, 
  XCircle,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Trash2,
  BarChart3,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Flashcard, RevisionMode, EvaluationResult } from '../types';

export function FlashcardPanel() {
  const { state, dispatch } = useApp();
  const [revisionMode, setRevisionMode] = useState<RevisionMode>('current-note');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [viewMode, setViewMode] = useState<'review' | 'list'>('review');
  const [showStats, setShowStats] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    completed: 0,
  });

  const getCurrentCards = (): Flashcard[] => {
    switch (revisionMode) {
      case 'current-note':
        return state.selectedNoteId 
          ? state.flashcards.filter(fc => fc.noteId === state.selectedNoteId)
          : [];
      case 'folder':
        if (!state.selectedNoteId) return [];
        const currentNote = state.notes.find(n => n.id === state.selectedNoteId);
        if (!currentNote) return [];
        const folderNotes = state.notes.filter(n => n.folderId === currentNote.folderId);
        return state.flashcards.filter(fc => folderNotes.some(n => n.id === fc.noteId));
      case 'all':
        return state.flashcards;
      default:
        return [];
    }
  };

  const cards = getCurrentCards();
  const currentCard = cards[currentCardIndex];

  useEffect(() => {
    if (cards.length > 0) {
      setSessionStats({
        total: cards.length,
        correct: 0,
        completed: 0,
      });
    }
  }, [cards.length, revisionMode]);

  const startReview = () => {
    if (cards.length > 0) {
      setIsReviewing(true);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    }
  };

  const stopReview = () => {
    setIsReviewing(false);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const handleEvaluation = (result: EvaluationResult) => {
    if (!currentCard) return;

    const isCorrect = result === 'easy' || result === 'medium';
    const updatedCard: Flashcard = {
      ...currentCard,
      stats: {
        ...currentCard.stats,
        timesReviewed: currentCard.stats.timesReviewed + 1,
        correctAnswers: isCorrect 
          ? currentCard.stats.correctAnswers + 1 
          : currentCard.stats.correctAnswers,
        lastReviewed: new Date(),
        lastResponse: result === 'easy' ? 'easy' : 'again',
      },
    };

    dispatch({ type: 'UPDATE_FLASHCARD', payload: updatedCard });

    setSessionStats(prev => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      completed: prev.completed + 1,
    }));

    // Move to next card
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // End of session
      stopReview();
    }
  };

  const goToPrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setShowAnswer(false);
    }
  };

  const goToNext = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  const deleteFlashcard = (cardId: string) => {
    dispatch({ type: 'DELETE_FLASHCARD', payload: cardId });
    
    // Adjust current index if needed
    if (currentCardIndex >= cards.length - 1 && currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
    
    // Stop review if no cards left
    if (cards.length <= 1) {
      stopReview();
    }
  };

  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  // Calculer les statistiques de la semaine
  const getWeeklyStats = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const reviewedThisWeek = state.flashcards.filter(card => 
      card.stats.lastReviewed && 
      new Date(card.stats.lastReviewed) >= weekAgo
    );
    
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const reviewedToday = reviewedThisWeek.filter(card => {
        const reviewDate = new Date(card.stats.lastReviewed!);
        return reviewDate >= dayStart && reviewDate < dayEnd;
      }).length;
      
      dailyStats.push({
        day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        count: reviewedToday
      });
    }
    
    return {
      total: reviewedThisWeek.length,
      daily: dailyStats,
      maxDaily: Math.max(...dailyStats.map(d => d.count), 1)
    };
  };

  // Export des flashcards pour Anki
  const exportToAnki = () => {
    const cards = getCurrentCards();
    if (cards.length === 0) return;
    
    const ankiFormat = cards.map(card => {
      // Format Anki: Question\tRéponse\tTags
      const question = card.question.replace(/\t/g, ' ').replace(/\n/g, ' ');
      const answer = card.answer.replace(/\t/g, ' ').replace(/\n/g, ' ');
      const tags = card.tags.join(' ');
      return `${question}\t${answer}\t${tags}`;
    }).join('\n');
    
    const blob = new Blob([ankiFormat], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-anki-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const weeklyStats = getWeeklyStats();

  if (focusMode) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Focus Mode Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Mode Focus - Révision</h2>
          <div className="flex items-center space-x-4">
            {currentCard && (
              <span className="text-sm font-medium text-gray-600">
                {currentCardIndex + 1} / {cards.length}
              </span>
            )}
            <button
              onClick={toggleFocusMode}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Quitter le mode focus"
            >
              <Minimize2 size={20} />
            </button>
          </div>
        </div>

        {/* Focus Mode Content */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          {currentCard ? (
            <div className="max-w-2xl w-full my-auto">
              <div className="bg-gray-50 rounded-xl p-8 mb-6 text-center">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Question</h3>
                  <div 
                    className="text-xl text-gray-700 leading-relaxed"
                    style={{ 
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      maxWidth: '100%',
                      width: '100%'
                    }}
                    dangerouslySetInnerHTML={{ __html: currentCard.question }} 
                  />
              </div>

              {showAnswer && (
                <div className="bg-blue-50 rounded-xl p-8 mb-6 text-center">
                  <h3 className="text-lg font-medium text-blue-800 mb-4">Réponse</h3>
                  <div 
                    className="text-xl text-blue-700 leading-relaxed"
                    style={{ 
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      maxWidth: '100%',
                      width: '100%'
                    }}
                    dangerouslySetInnerHTML={{ __html: currentCard.answer }} 
                  />
                </div>
              )}

              {/* Focus Mode Actions */}
              <div className="space-y-4">
                {/* Barre de progression en mode focus */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
                  />
                </div>
                
                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="w-full flex items-center justify-center px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-lg"
                  >
                    <Eye size={20} className="mr-3" />
                    Révéler la réponse
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleEvaluation('easy')}
                      className="w-full flex items-center justify-center px-6 py-4 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors text-lg"
                    >
                      <CheckCircle size={20} className="mr-3" />
                      Facile
                    </button>
                    
                    <button
                      onClick={() => handleEvaluation('again')}
                      className="w-full flex items-center justify-center px-6 py-4 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors text-lg"
                    >
                      <RotateCcw size={20} className="mr-3" />
                      À revoir
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation in Focus Mode */}
              <div className="flex justify-between items-center mt-8">
                <button
                  onClick={goToPrevious}
                  disabled={currentCardIndex === 0}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Précédente
                </button>
                
                <button
                  onClick={stopReview}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Arrêter la révision
                </button>
                
                <button
                  onClick={goToNext}
                  disabled={currentCardIndex === cards.length - 1}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivante
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xl text-gray-500 mb-4">Aucune flashcard disponible</p>
              <button
                onClick={toggleFocusMode}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retour
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Révision</h2>
          {cards.length > 0 && (
            <button
              onClick={toggleFocusMode}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Mode focus"
            >
              <Maximize2 size={16} />
            </button>
          )}
        </div>
        
        {/* Mode Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Mode de révision</label>
          <select
            value={revisionMode}
            onChange={(e) => setRevisionMode(e.target.value as RevisionMode)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="current-note">Note actuelle</option>
            <option value="folder">Dossier actuel</option>
            <option value="all">Toutes les flashcards</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="mt-4 grid grid-cols-3 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('review')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'review'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Révision
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Liste
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              showStats
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Stats
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Cartes disponibles:</span>
              <span className="font-medium">{cards.length}</span>
            </div>
            {isReviewing && (
              <div className="flex justify-between mt-1">
                <span>Progression:</span>
                <span className="font-medium">{sessionStats.completed}/{sessionStats.total}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        {showStats ? (
          // Stats View
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  Statistiques
                </h3>
                <button
                  onClick={exportToAnki}
                  className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  title="Exporter pour Anki"
                >
                  <Download size={14} className="mr-2" />
                  Export Anki
                </button>
              </div>
              
              {/* Graphique de la semaine */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-800 mb-3">Cartes révisées cette semaine</h4>
                <div className="flex items-end justify-between h-32 mb-2">
                  {weeklyStats.daily.map((day, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div 
                        className="bg-blue-500 rounded-t w-6 transition-all duration-300"
                        style={{ 
                          height: `${(day.count / weeklyStats.maxDaily) * 100}%`,
                          minHeight: day.count > 0 ? '8px' : '2px'
                        }}
                        title={`${day.count} cartes révisées`}
                      />
                      <span className="text-xs text-gray-600 mt-2">{day.day}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total: {weeklyStats.total} cartes révisées
                  </span>
                </div>
              </div>
              
              {/* Statistiques générales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-700">
                    {state.flashcards.length}
                  </div>
                  <div className="text-sm text-blue-600">Total flashcards</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-700">
                    {state.flashcards.filter(c => c.stats.timesReviewed > 0).length}
                  </div>
                  <div className="text-sm text-green-600">Cartes révisées</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-700">
                    {state.flashcards.filter(c => c.stats.lastResponse === 'easy').length}
                  </div>
                  <div className="text-sm text-purple-600">Cartes maîtrisées</div>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-700">
                    {state.flashcards.filter(c => c.stats.lastResponse === 'again').length}
                  </div>
                  <div className="text-sm text-orange-600">À revoir</div>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          // List View
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Toutes les flashcards ({cards.length})
              </h3>
              {cards.length > 0 ? (
                <div className="space-y-3 max-h-full overflow-y-auto">
                  {cards.map((card, index) => {
                    const note = state.notes.find(n => n.id === card.noteId);
                    const lastResponse = card.stats.lastResponse;
                    const hasBeenReviewed = card.stats.timesReviewed > 0;
                    return (
                      <div key={card.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 mb-1">
                              {note?.title || 'Note supprimée'}
                            </p>
                            <div className="flex items-center mb-1">
                              {hasBeenReviewed && (
                                <div 
                                  className={`w-3 h-3 rounded-full mr-2 ${
                                    lastResponse === 'easy' ? 'bg-green-500' : 
                                    lastResponse === 'again' ? 'bg-red-500' : 'bg-gray-300'
                                  }`}
                                  title={
                                    lastResponse === 'easy' ? 'Dernière réponse: Facile' : 
                                    lastResponse === 'again' ? 'Dernière réponse: À revoir' : 
                                    'Révisée mais statut inconnu'
                                  }
                                />
                              )}
                              {!hasBeenReviewed && (
                                <div 
                                  className="w-3 h-3 rounded-full mr-2 bg-gray-300"
                                  title="Jamais révisée"
                                />
                              )}
                            <h4 className="font-medium text-gray-800 mb-2">
                              <div 
                                style={{ 
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'normal',
                                  maxWidth: '100%',
                                  width: '100%',
                                  overflow: 'hidden',
                                  display: 'block'
                                }}
                                className="break-words overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: card.question }} 
                              />
                            </h4>
                            </div>
                            <div className="text-gray-600 text-sm mb-2">
                              <div 
                                style={{ 
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'normal',
                                  maxWidth: '100%',
                                  width: '100%',
                                  overflow: 'hidden',
                                  display: 'block'
                                }}
                                className="break-words overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: card.answer }} 
                              />
                            </div>
                            {card.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {card.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteFlashcard(card.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2 flex-shrink-0"
                            title="Supprimer cette flashcard"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 flex-shrink-0">
                  <p className="text-gray-500 mb-4">Aucune flashcard disponible</p>
                  <p className="text-sm text-gray-400">
                    Créez des flashcards depuis l'éditeur de notes
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : !isReviewing ? (
          // Start Screen
          <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 max-h-full">
            {cards.length > 0 ? (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Prêt à réviser ?
                  </h3>
                  <p className="text-sm text-gray-600">
                    {cards.length} flashcard{cards.length > 1 ? 's' : ''} disponible{cards.length > 1 ? 's' : ''}
                  </p>
                </div>
                
                <button
                  onClick={startReview}
                  className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Play size={20} className="mr-2" />
                  Commencer la révision
                </button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 mb-4">Aucune flashcard disponible</p>
                <p className="text-sm text-gray-400">
                  Sélectionnez du texte dans l'éditeur pour créer des flashcards
                </p>
              </div>
            )}
          </div>
        ) : (
          // Review Screen
          <div className="flex-1 flex flex-col min-h-0 max-h-full">
            {/* Navigation */}
            <div className="p-4 border-b border-gray-200">
              {/* Barre de progression */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between">
              <button
                onClick={goToPrevious}
                disabled={currentCardIndex === 0}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={16} />
              </button>
              
              <span className="text-sm font-medium text-gray-600">
                {currentCardIndex + 1} / {cards.length}
              </span>
              
              <button
                onClick={goToNext}
                disabled={currentCardIndex === cards.length - 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRight size={16} />
              </button>
            </div>
            </div>

            {/* Card Content */}
            {currentCard && (
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                {/* Delete Button */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => deleteFlashcard(currentCard.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer cette flashcard"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Question</h4>
                  <div 
                    className="text-gray-700"
                    style={{ 
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      maxWidth: '100%',
                      width: '100%'
                    }}
                    dangerouslySetInnerHTML={{ __html: currentCard.question }} 
                  />
                </div>

                {showAnswer && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-800 mb-2">Réponse</h4>
                    <div 
                      className="text-blue-700"
                      style={{ 
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                        maxWidth: '100%',
                        width: '100%'
                      }}
                      dangerouslySetInnerHTML={{ __html: currentCard.answer }} 
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye size={16} className="mr-2" />
                      Révéler la réponse
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 text-center mb-3">
                        Comment évaluez-vous cette carte ?
                      </p>
                      
                      <button
                        onClick={() => handleEvaluation('easy')}
                        className="w-full flex items-center justify-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <CheckCircle size={16} className="mr-2" />
                        Facile
                      </button>
                      
                      <button
                        onClick={() => handleEvaluation('again')}
                        className="w-full flex items-center justify-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <RotateCcw size={16} className="mr-2" />
                        À revoir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stop Review */}
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={stopReview}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Arrêter la révision
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}