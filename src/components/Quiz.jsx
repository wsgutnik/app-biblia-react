import React, { useMemo, useState } from 'react';

const QUIZ_BANK = [
  {
    id: 'genesis_creation',
    title: 'Gênesis 1',
    question: 'Qual frase inicia a narrativa bíblica em Gênesis 1:1?',
    options: [
      'No princípio criou Deus o céu e a terra.',
      'No princípio era o Verbo.',
      'Bem-aventurados os puros de coração.',
      'No começo Deus formou o homem do pó.'
    ],
    answerIndex: 0,
    explanation: 'Gênesis 1:1 afirma: "No princípio criou Deus os céus e a terra."'
  },
  {
    id: 'salmo_23',
    title: 'Salmo 23',
    question: 'Quem é descrito como o pastor no Salmo 23?',
    options: [
      'Moisés',
      'O Senhor',
      'Davi',
      'Jacó'
    ],
    answerIndex: 1,
    explanation: 'O salmista declara: "O Senhor é o meu pastor; nada me faltará."'
  },
  {
    id: 'acts_pentecost',
    title: 'Atos 2',
    question: 'Qual evento marca o dia de Pentecostes em Atos 2?',
    options: [
      'A conversão de Paulo',
      'A eleição de Matias',
      'A descida do Espírito Santo',
      'A cura do paralítico'
    ],
    answerIndex: 2,
    explanation: 'Em Atos 2 o Espírito Santo desce sobre os discípulos, iniciando a Igreja.'
  }
];

function Quiz() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentQuiz = useMemo(() => QUIZ_BANK[currentIndex], [currentIndex]);

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setCurrentIndex((prev) => (prev + 1) % QUIZ_BANK.length);
  };

  return (
    <section className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-10 space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.4em] text-brand-500">Quiz Bíblico</p>
        <h2 className="text-3xl font-bold text-brand-900 mt-2">{currentQuiz.title}</h2>
        <p className="text-slate-500">Responda e aprenda com curiosidades rápidas.</p>
      </div>

      <div className="space-y-4">
        <p className="text-xl font-semibold text-slate-800">{currentQuiz.question}</p>
        <div className="space-y-3">
          {currentQuiz.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = currentQuiz.answerIndex === index;
            let stateClasses = 'border-slate-200';
            if (isSubmitted && isSelected) {
              stateClasses = isCorrect ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50';
            } else if (isSelected) {
              stateClasses = 'border-brand-400 bg-brand-50/60';
            }

            return (
              <button
                key={option}
                type="button"
                onClick={() => !isSubmitted && setSelectedOption(index)}
                className={`w-full text-left p-4 rounded-2xl border transition ${stateClasses}`}
              >
                <span className="font-medium text-slate-800">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          Pergunta {currentIndex + 1} de {QUIZ_BANK.length}
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
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-3 rounded-full bg-surface text-brand-700 font-semibold border border-brand-100"
          >
            Próxima pergunta
          </button>
        )}
      </div>

      {isSubmitted && (
        <div className={`rounded-2xl border p-4 ${currentQuiz.answerIndex === selectedOption ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
          <p className="font-semibold">
            {currentQuiz.answerIndex === selectedOption ? 'Resposta correta!' : 'Resposta incorreta'}
          </p>
          <p className="text-sm mt-1 text-slate-600">{currentQuiz.explanation}</p>
        </div>
      )}
    </section>
  );
}

export default Quiz;
