import React from 'react';

export default function ToolFilters({
  searchQuery,
  setSearchQuery,
  datasetSearchQuery,
  setDatasetSearchQuery,
  projectSearchQuery,
  setProjectSearchQuery
}) {
  return (
    <aside className="w-80 bg-gray-50 border-r border-gray-200 p-6 flex flex-col h-full overflow-y-auto">

      {/* Tool Search Field */}
      <div className="mb-6">
        <label htmlFor="searchTools" className="block text-xs font-bold text-[#00468C] uppercase tracking-wider mb-2">
          Search Tools
        </label>
        <div className="relative">
          <input
            id="searchTools"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, description, or author..."
            className="w-full bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00468C] focus:border-[#00468C]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear tool search"
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Dataset Search Field */}
      <div className="mb-6">
        <label htmlFor="searchLinkedDatasets" className="block text-xs font-bold text-[#00468C] uppercase tracking-wider mb-2">
          Search Linked Datasets
        </label>
        <div className="relative">
          <input
            id="searchLinkedDatasets"
            type="text"
            value={datasetSearchQuery}
            onChange={(e) => setDatasetSearchQuery(e.target.value)}
            placeholder="Search datasets..."
            className="w-full bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00468C] focus:border-[#00468C]"
          />
          {datasetSearchQuery && (
            <button
              onClick={() => setDatasetSearchQuery('')}
              aria-label="Clear dataset search"
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Project Search Field */}
      <div className="mb-6">
        <label htmlFor="searchLinkedProjects" className="block text-xs font-bold text-[#00468C] uppercase tracking-wider mb-2">
          Search Linked Projects
        </label>
        <div className="relative">
          <input
            id="searchLinkedProjects"
            type="text"
            value={projectSearchQuery}
            onChange={(e) => setProjectSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00468C] focus:border-[#00468C]"
          />
          {projectSearchQuery && (
            <button
              onClick={() => setProjectSearchQuery('')}
              aria-label="Clear project search"
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

    </aside>
  );
}
