import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-widest transition-all duration-200 px-2 py-1 rounded-md hover:bg-tecdia-text/5 ${copied ? 'text-tecdia-accent' : 'text-tecdia-text/40'}`}
      title="Copy code"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const MessageContent = ({ content, isAI }) => {
  return (
    <div className={`prose max-w-none text-[15px] leading-relaxed ${isAI ? 'text-tecdia-text/90' : 'text-tecdia-textDeep'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const codeText = String(children).replace(/\n$/, '');
            return inline ? (
              <code className="bg-tecdia-background border border-tecdia-border px-1.5 py-0.5 rounded text-sm font-mono text-tecdia-accent" {...props}>
                {children}
              </code>
            ) : (
              <div className="relative group my-4">
                <div className="flex items-center justify-between px-4 py-2 bg-tecdia-background border-b border-tecdia-border rounded-t-xl">
                  <span className="text-[11px] uppercase font-bold text-tecdia-text/60 tracking-widest">
                    {className?.replace('language-', '') || 'Code'}
                  </span>
                  <CopyButton text={codeText} />
                </div>
                <pre className="bg-tecdia-surface p-4 rounded-b-xl border border-t-0 border-tecdia-border overflow-x-auto font-mono text-sm leading-relaxed m-0 text-tecdia-textDeep" {...props}>
                  <code>{children}</code>
                </pre>
              </div>
            );
          },
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-4 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-4 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-tecdia-textDeep">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-3 text-tecdia-textDeep">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mb-2 text-tecdia-textDeep">{children}</h3>,
          strong: ({ children }) => <strong className="text-tecdia-textDeep font-semibold">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-tecdia-accent/40 pl-4 py-1 italic text-tecdia-text/60 mb-4 bg-tecdia-accent/5 rounded-r-lg">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
