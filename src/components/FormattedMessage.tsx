import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FormattedMessageProps {
  content: string;
  isUser?: boolean;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, isUser = false }) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  return (
    <div className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-900 space-y-2.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom Paragraph styling
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-800">{children}</p>,
          
          // Headings
          h1: ({ children }) => <h1 className="text-sm font-bold text-slate-900 mt-2 mb-1 border-b border-slate-200 pb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xs font-bold text-slate-900 mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-semibold text-slate-800 mt-1.5 mb-0.5">{children}</h3>,
          
          // Lists
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2 text-slate-800">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2 text-slate-800">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
          
          // Strong / Emphasis
          strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-800">{children}</em>,

          // Tables (Full GFM Table support with clean borders and subtle styling)
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-md border border-[#E5E7EB] bg-white shadow-xs">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#F8F9FA] text-slate-900 font-semibold text-[11px] uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#F0F2F5] bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#FAFBFB] transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-slate-800 font-semibold border-b border-[#E5E7EB]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2.5 text-slate-700 align-top leading-normal">
              {children}
            </td>
          ),

          // Code
          code: ({ children, className }) => {
            const isCodeBlock = className && className.includes('language-');
            if (isCodeBlock) {
              return (
                <pre className="my-2 p-2.5 rounded-md bg-[#191F28] text-slate-100 font-mono text-[11px] overflow-x-auto">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-800 border border-slate-200/70">
                {children}
              </code>
            );
          },

          // Blockquotes / Callout highlights
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-[#0F3830] pl-3 py-1 my-2 bg-emerald-50/50 rounded-r text-slate-700 italic">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="my-3 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
