import React from 'react';
import Footer from '../components/Footer';

const INTEGRATIONS = [
  {
    name: 'Groq LLM API',
    category: 'AI Engine',
    desc: 'Uses the Groq LPU™ Inference Engine for lightning-fast responses, powering our fault diagnosis and severity analysis.',
  },
  {
    name: 'FastAPI Backend',
    category: 'Core API',
    desc: 'A robust Python-based API server that handles all requests, domain-based access control, and background ingestion jobs.',
  },
  {
    name: 'ChromaDB',
    category: 'Vector Database',
    desc: 'The primary storage for machine manuals. It stores document embeddings and performs similarity searches to find relevant fixes.',
  },
  {
    name: 'Sentence Transformers',
    category: 'Embedding',
    desc: 'Uses the all-MiniLM-L6-v2 model to convert technical text into high-dimensional vectors for semantic search.',
  },
  {
    name: 'Docling Parser',
    category: 'Document Processing',
    desc: 'Advanced PDF parsing engine used by our ingestion pipeline to accurately extract text and layout from engineering manuals.',
  },
  {
    name: 'React & Vite',
    category: 'Frontend Stack',
    desc: 'Modern frontend technologies providing a fast, reactive, and intuitive interface for both workers and administrators.',
  },
  {
    name: 'Tailwind CSS',
    category: 'Design System',
    desc: 'A utility-first CSS framework that allows us to build premium, responsive, and consistent user interfaces.',
  },
  {
    name: 'Framer Motion',
    category: 'Animations',
    desc: 'Powering the fluid transitions and micro-interactions that make the SmartFix experience feel alive and premium.',
  },
  {
    name: 'Lucide React',
    category: 'Iconography',
    desc: 'A beautiful and consistent icon library used across the application to provide visual cues and clarity.',
  }
];

const IntegrationsPage = () => {
  return (
    <div className="relative min-h-screen bg-tecdia-background flex flex-col">
      <div className="relative z-10 flex-grow">
        {/* Header */}
        <header className="px-6 pt-36 pb-20 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-tecdia-textDeep mb-4">
            System <span className="text-tecdia-accent">Integrations</span>
          </h1>
          <p className="text-base md:text-lg text-tecdia-text/60 leading-relaxed font-medium">
            The core technology and services powering the SmartFix platform.
          </p>
        </header>

        {/* Integrations List */}
        <main className="px-6 pb-32">
          <div className="max-w-4xl mx-auto space-y-16">
            {INTEGRATIONS.map((item, index) => (
              <div key={item.name} className="relative group">
                <div className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-8 items-start">
                  
                  {/* Category - Bold and Larger as requested */}
                  <div className="md:col-span-4 lg:col-span-3">
                    <h2 className="text-xl md:text-2xl font-bold text-tecdia-accent uppercase tracking-tight">
                      {item.category}
                    </h2>
                  </div>

                  {/* Content */}
                  <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-tecdia-accent/40" />
                      <h3 className="text-xl font-bold text-tecdia-textDeep">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-base text-tecdia-text/65 leading-relaxed font-medium pl-4 border-l-2 border-tecdia-accent/10">
                      {item.desc}
                    </p>
                  </div>
                </div>
                
                {index < INTEGRATIONS.length - 1 && (
                  <div className="mt-16 h-px w-full bg-tecdia-accent/5" />
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default IntegrationsPage;
