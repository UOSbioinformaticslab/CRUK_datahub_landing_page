import React from 'react';

const ToolRow = ({ tool }) => {
  const externalUrl = tool.url
    ? (tool.url.startsWith('http') ? tool.url : `https://${tool.url}`)
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 overflow-hidden hover:shadow-md transition-shadow">
      {/* LINE 1: Name, External URL, Linked Datasets, Linked Projects */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <a
            href={`/src/tool.html?id=${tool.id}`}
            className="text-lg font-bold text-[#00468C] hover:text-[#002D5C] hover:underline truncate"
          >
            {tool.name}
          </a>

          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-medium text-[#00468C] hover:underline bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full hover:bg-blue-100 transition-colors"
            >
              <span>link to external website</span>
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
          )}
        </div>

        {/* Linked Datasets & Projects */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Linked Datasets */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#00468C] uppercase tracking-wider">Datasets:</span>
            {tool.datasets && tool.datasets.length > 0 ? (
              tool.datasets.map((ds) => (
                <a
                  key={ds.id}
                  href={`/src/meta?id=${ds.id}`}
                  className="text-xs bg-blue-50 text-[#00468C] border border-blue-200 px-2 py-0.5 rounded-md font-medium hover:bg-blue-100 hover:underline transition-colors"
                >
                  {ds.computed_title || ds.title || `Dataset ${ds.id}`}
                </a>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">None</span>
            )}
          </div>

          {/* Linked Projects */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#00468C] uppercase tracking-wider">Projects:</span>
            {tool.projects && tool.projects.length > 0 ? (
              tool.projects.map((proj) => (
                <a
                  key={proj.id}
                  href={`/src/project_meta?pid=${proj.id}`}
                  className="text-xs bg-blue-50 text-[#00468C] border border-blue-200 px-2 py-0.5 rounded-md font-medium hover:bg-blue-100 hover:underline transition-colors"
                >
                  {proj.project_grant_name || proj.projectGrantName || proj.title || `Project ${proj.id}`}
                </a>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">None</span>
            )}
          </div>
        </div>
      </div>

      {/* LINE 2: Description (1 line only) */}
      <div className="px-4 py-3 bg-white text-sm text-gray-600 flex items-center">
        <span className="font-semibold text-[#00468C] mr-2 flex-shrink-0">Description:</span>
        <span className="line-clamp-1 text-gray-600 truncate" title={tool.description}>
          {tool.description || 'No description provided.'}
        </span>
      </div>
    </div>
  );
};

export default function ToolList({ tools }) {
  if (!tools || tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-gray-200 shadow-sm">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-900">No tools found</h3>
        <p className="text-gray-500 mt-1">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto pr-2 custom-scrollbar">
      {tools.map((tool) => (
        <ToolRow key={tool.id} tool={tool} />
      ))}
    </div>
  );
}
