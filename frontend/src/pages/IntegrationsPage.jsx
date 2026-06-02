import React from 'react';
import Footer from '../components/Footer';
import { PageWrapper, PublicHero, ContentShell } from '../components/TecdiaPage';

const INTEGRATIONS = [
  {
    name: 'Groq LLM API',
    category: 'AI Engine',
    desc: 'Uses the Groq LPU Inference Engine for fast fault diagnosis and severity analysis.',
  },
  {
    name: 'FastAPI Backend',
    category: 'Core API',
    desc: 'Handles requests, domain-based access control, machine binding, and background ingestion jobs.',
  },
  {
    name: 'ChromaDB',
    category: 'Vector Database',
    desc: 'Stores machine manual embeddings and performs similarity searches for relevant procedures.',
  },
  {
    name: 'Sentence Transformers',
    category: 'Embedding',
    desc: 'Converts technical text into vectors for semantic manual retrieval.',
  },
  {
    name: 'Docling Parser',
    category: 'Document Processing',
    desc: 'Extracts text and layout from engineering manuals for ingestion.',
  },
  {
    name: 'React & Vite',
    category: 'Frontend Stack',
    desc: 'Provides a fast, reactive interface for technicians and administrators.',
  },
  {
    name: 'Tailwind CSS',
    category: 'Design System',
    desc: 'Supplies responsive visual primitives and consistent styling across the app.',
  },
  {
    name: 'Framer Motion',
    category: 'Animations',
    desc: 'Powers page transitions and compact interaction feedback.',
  },
  {
    name: 'Lucide React',
    category: 'Iconography',
    desc: 'Provides clear interface icons for machine, support, and admin workflows.',
  },
];

const IntegrationsPage = () => (
  <PageWrapper>
    <div className="min-h-screen">
      <PublicHero
        eyebrow="System"
        title="Platform"
        accent="Integrations"
      />
      <ContentShell>
        <div className="mx-auto max-w-6xl">
          {INTEGRATIONS.map((item, index) => (
            <article key={item.name} className="grid gap-5 border-t border-black/10 py-8 md:grid-cols-[240px_1fr] md:gap-10">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-black/40">0{index + 1}</div>
                <h2 className="mt-3 bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] bg-clip-text text-2xl font-black uppercase leading-tight tracking-normal text-transparent">
                  {item.category}
                </h2>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] md:p-8">
                <h3 className="mb-3 text-2xl font-black tracking-normal text-black">{item.name}</h3>
                <p className="max-w-3xl text-base leading-8 text-black/62">{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </ContentShell>
      <Footer />
    </div>
  </PageWrapper>
);

export default IntegrationsPage;
