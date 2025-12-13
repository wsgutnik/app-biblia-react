import React, { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Papa from 'papaparse';
import { translateText } from '../utils/translate';
import { isAuth0Configured } from '../config/auth0';
import { syncQuizStats } from '../utils/activitiesService';

const CSV_PATH = '/100_bible_trivia_rewritten.csv';
const STORAGE_KEY = 'quiz_progress_v1';
const ANSWER_MAP = { A: 0, B: 1, C: 2, D: 3 };

function Quiz() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [progress, setProgress] = useState({ correct: 0, total: 0 });
  const [questionTranslation, setQuestionTranslation] = useState('');
  const [optionTranslations, setOptionTranslations] = useState([]);
  const [translationError, setTranslationError] = useState('');
  const auth = isAuth0Configured ? useAuth0() : { isAuthenticated: false, user: null };
  const { isAuthenticated, user } = auth;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch {
      // ignore parsing errors
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (!isAuth0Configured || !isAuthenticated || !user?.sub) return;
    syncQuizStats(user.sub, progress).catch((err) =>
      console.warn('Falha ao sincronizar progresso do quiz:', err)
    );
  }, [progress, isAuthenticated, user?.sub]);

  useEffect(() => {
    setLoading(true);
    Papa.parse(CSV_PATH, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const formatted = results.data
          .map((row, idx) => {
            const answerIndex = ANSWER_MAP[String(row.resposta_correta).trim().toUpperCase()] ?? 0;
            return {
              id: `${row.categoria}-${idx}`,
              category: row.categoria || 'Geral',
              question: row.pergunta,
              options: [row.opcao_a, row.opcao_b, row.opcao_c, row.opcao_d].filter(Boolean),
              answerIndex,
              reference: row.referencia_biblica || ''
            };
          })
          .filter((q) => q.question && q.options.length >= 2);
        setQuestions(formatted);
        setLoading(false);
      },
      error: (err) => {
        setError(err.message);
        setLoading(false);
      }
    });
  }, []);

  const categoryList = useMemo(() => {
    const unique = Array.from(new Set(questions.map((q) => q.category)));
    unique.sort();
    return ['Todas', ...unique];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (selectedCategory === 'Todas') return questions;
    return questions.filter((q) => q.category === selectedCategory);
  }, [questions, selectedCategory]);

  useEffect(() => {
    if (!filteredQuestions.length) {
      setCurrentQuestion(null);
      setQuestionTranslation('');
      setOptionTranslations([]);
      return;
    }
    const random = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
    setCurrentQuestion(random);
    setSelectedOption(null);
    setIsSubmitted(false);
    setTranslationError('');
  }, [filteredQuestions]);

  useEffect(() => {
    if (!currentQuestion) return;
    let isMounted = true;
    setQuestionTranslation('');
    setOptionTranslations([]);
    setTranslationError('');
    const runTranslation = async () => {
      try {
        const qTranslation = await translateText(currentQuestion.question);
        const optionPromises = currentQuestion.options.map((opt) => translateText(opt));
        const translatedOpts = await Promise.all(optionPromises);
        if (isMounted) {
          setQuestionTranslation(qTranslation);
          setOptionTranslations(translatedOpts);
        }
      } catch (err) {
        console.warn('Falha ao traduzir pergunta do quiz:', err);
        if (isMounted) {
          setQuestionTranslation('');
          setOptionTranslations([]);
          setTranslationError('Não foi possível traduzir automaticamente.');
        }
      }
    };
    runTranslation();
    return () => {
      isMounted = false;
    };
  }, [currentQuestion]);

  const handleSubmit = () => {
    if (selectedOption === null || !currentQuestion) return;
    setIsSubmitted(true);
    setProgress((prev) => ({
      correct: prev.correct + (selectedOption === currentQuestion.answerIndex ? 1 : 0),
      total: prev.total + 1
    }));
  };

  const handleNext = () => {
    if (!filteredQuestions.length) return;
    const random = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
    setCurrentQuestion(random);
    setSelectedOption(null);
    setIsSubmitted(false);
  };

  const accuracy =
    progress.total === 0 ? 0 : Math.round((progress.correct / progress.total) * 100);

  if (loading) {
    return (
      <section className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-10">
        <p className="text-slate-500">Carregando perguntas...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-card rounded-3xl shadow-card border border-red-100 p-6 sm:p-10 text-red-600">
        Falha ao carregar quiz: {error}
      </section>
    );
  }

  if (!currentQuestion) {
    return (
      <section className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-10 text-slate-500">
        Nenhuma pergunta disponível para a categoria selecionada.
      </section>
    );
  }

  return (
    <section className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-10 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-brand-500">Quiz Bíblico</p>
          <h2 className="text-3xl font-bold text-brand-900 mt-2">{selectedCategory}</h2>
          <p className="text-slate-500">Teste seus conhecimentos bíblicos com perguntas reais do arquivo “100_bible_trivia_rewritten”.</p>
        </div>
        <div className="bg-surface rounded-2xl border border-slate-100 p-4 text-center min-w-[180px]">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Desempenho</p>
          <p className="text-3xl font-extrabold text-brand-900">{accuracy}%</p>
          <p className="text-xs text-slate-500">Acertos {progress.correct} / {progress.total}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-600">Filtrar por categoria</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
        >
          {categoryList.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{currentQuestion.category}</p>
          <p className="text-xl font-semibold text-slate-800">
            {questionTranslation || currentQuestion.question}
          </p>
          {questionTranslation && (
            <p className="text-sm text-slate-400">Original: {currentQuestion.question}</p>
          )}
          {translationError && (
            <p className="text-xs text-red-500">{translationError}</p>
          )}
          {currentQuestion.reference && (
            <p className="text-sm text-slate-400">Referência: {currentQuestion.reference}</p>
          )}
        </div>
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = currentQuestion.answerIndex === index;
            let stateClasses = 'border-slate-200';
            if (isSubmitted && isSelected) {
              stateClasses = isCorrect ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50';
            } else if (isSubmitted && isCorrect) {
              stateClasses = 'border-green-400 bg-green-50';
            } else if (isSelected) {
              stateClasses = 'border-brand-400 bg-brand-50/60';
            }

            return (
              <button
                key={`${currentQuestion.id}-${option}`}
                type="button"
                onClick={() => !isSubmitted && setSelectedOption(index)}
                className={`w-full text-left p-4 rounded-2xl border transition ${stateClasses}`}
              >
                <span className="font-medium text-slate-800">
                  {optionTranslations[index] || option}
                </span>
                {optionTranslations[index] && (
                  <span className="block text-xs text-slate-400 mt-1">
                    Original: {option}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          Perguntas respondidas: {progress.total}
        </div>
        {!isSubmitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedOption === null}
            className="px-6 py-3 rounded-full text-white font-semibold shadow-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-brand, #1d4ed8)' }}
          >
            Conferir resposta
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 rounded-full bg-surface text-brand-700 font-semibold border border-brand-100"
            >
              Próxima pergunta
            </button>
            <button
              type="button"
              onClick={() => setProgress({ correct: 0, total: 0 })}
              className="px-6 py-3 rounded-full bg-white text-slate-500 font-semibold border border-slate-200"
            >
              Resetar placar
            </button>
          </div>
        )}
      </div>

      {isSubmitted && (
        <div
          className={`rounded-2xl border p-4 ${
            currentQuestion.answerIndex === selectedOption
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-red-300 bg-red-50 text-red-700'
          }`}
        >
          <p className="font-semibold">
            {currentQuestion.answerIndex === selectedOption ? 'Resposta correta!' : 'Resposta incorreta'}
          </p>
          {currentQuestion.reference && (
            <p className="text-sm mt-1 text-slate-600">
              Consulte {currentQuestion.reference} para revisar o texto.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default Quiz;
