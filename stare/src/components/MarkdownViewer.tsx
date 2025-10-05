import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'highlight.js/styles/github-dark.css'

interface Props {
  content: string
  className?: string
}

export function MarkdownViewer({ content, className = '' }: Props) {
  return (
    <div className={`markdown-viewer ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Nagłówki z ikonami
          h1: ({ children }) => (
            <h1 className="flex items-center gap-3 text-4xl font-bold mt-8 mb-4 pb-3 border-b-2 border-blue-500 text-gray-900 dark:text-white">
              <span className="text-blue-500">📘</span>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="flex items-center gap-3 text-3xl font-bold mt-6 mb-3 text-gray-800 dark:text-gray-100">
              <span className="text-purple-500">📗</span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="flex items-center gap-2 text-2xl font-semibold mt-5 mb-2 text-gray-700 dark:text-gray-200">
              <span className="text-green-500">📖</span>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="flex items-center gap-2 text-xl font-semibold mt-4 mb-2 text-gray-600 dark:text-gray-300">
              <span className="text-orange-500">📄</span>
              {children}
            </h4>
          ),
          
          // Paragrafy z lepszym spacingiem
          p: ({ children }) => (
            <p className="text-base leading-relaxed my-4 text-gray-700 dark:text-gray-300">
              {children}
            </p>
          ),
          
          // Listy z custom bullets
          ul: ({ children }) => (
            <ul className="my-4 ml-6 space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 space-y-2 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-700 dark:text-gray-300 pl-2">
              <span className="inline-flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span className="flex-1">{children}</span>
              </span>
            </li>
          ),
          
          // Checklisty z emoji
          input: ({ checked, ...props }) => (
            <span className="inline-flex items-center mr-2">
              {checked ? '✅' : '⬜'}
            </span>
          ),
          
          // Kod inline
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded text-sm font-mono">
                  {children}
                </code>
              )
            }
            // Blok kodu
            return (
              <div className="my-4 rounded-lg overflow-hidden shadow-lg">
                <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">
                    {className?.replace('language-', '') || 'code'}
                  </span>
                  <span className="text-gray-500 text-xs">💻</span>
                </div>
                <code
                  className={`${className} block p-4 bg-gray-900 text-sm overflow-x-auto`}
                  {...props}
                >
                  {children}
                </code>
              </div>
            )
          },
          
          // Cytaty z lewym borderem
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 py-3 pr-4 rounded-r-lg italic text-gray-700 dark:text-gray-300">
              <span className="text-blue-500 mr-2">💬</span>
              {children}
            </blockquote>
          ),
          
          // Tabele z zebra striping
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg shadow-md">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-gray-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {children}
            </tr>
          ),
          
          // Linki z ikonką
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-dotted hover:decoration-solid transition-all inline-flex items-center gap-1"
            >
              {children}
              <span className="text-xs">🔗</span>
            </a>
          ),
          
          // Horizontal rule z gradientem
          hr: () => (
            <hr className="my-8 border-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-25" />
          ),
          
          // Bold i italic
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-600 dark:text-gray-400">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
