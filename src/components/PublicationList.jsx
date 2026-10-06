import React, { useState } from 'react';
import { EditPublicationModal } from './EditPublicationModal';

const PublicationCard = ({ publication, onPublicationUpdated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentPub, setCurrentPub] = useState(publication);

  const isLoggedIn = Boolean(localStorage.getItem('token'));

  // Format authors to show "First Author et al." if there are multiple
  const formatAuthors = (authorsList) => {
    if (!authorsList || authorsList.length === 0) return "Unknown Author";
    const firstAuthor = authorsList[0] || "Unknown Author";

    return authorsList.length > 1 ? `${firstAuthor} et al.` : firstAuthor;
  };

  // Extract the first sentence or first line of the abstract safely
  const getFirstLine = (text) => {
    if (!text) return "No abstract available.";
    // Replace HTML tags with a space, then collapse multiple spaces into one
    const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const match = plainText.match(/[^.!?]+[.!?]/);
    return match ? match[0] : plainText.substring(0, 100) + "...";
  };

  const handleSaved = (updated) => {
    setCurrentPub(prev => ({ ...prev, ...updated }));
    if (onPublicationUpdated) {
      onPublicationUpdated(updated);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-4 hover:shadow-md transition-shadow relative">
      {/* Title & Edit Header */}
      <div className="flex justify-between items-start gap-4 mb-2">
        <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600 flex-1">
          <a href={currentPub.url || (currentPub.paper_doi ? `https://doi.org/${currentPub.paper_doi}` : '#')} target="_blank" rel="noopener noreferrer">
            {currentPub.paper_title}
          </a>
        </h3>

        {isLoggedIn && (
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#00468C] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* Citation Metadata */}
      <div className="text-sm text-gray-600 flex flex-wrap gap-2 mb-4">
        <span>{formatAuthors(currentPub.authors)}</span>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-[#00468C]">{currentPub.journal_name || "Journal Unknown"}</span>
        <span className="text-gray-300">|</span>
        <span>Published: {currentPub.year_of_publication || "N/A"}</span>
      </div>

      {/* Data Dependencies Section */}
      <div className="bg-gray-50 rounded-md p-4 mb-4 border border-gray-100">
        <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider mb-2">
          Data Dependencies
        </span>

        {/* Linked Datasets */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700 w-20">Datasets:</span>
          {currentPub.datasets && currentPub.datasets.length > 0 ? (
            currentPub.datasets.map((dataset) => (
              <a
                key={dataset.id}
                href={`/src/meta?id=${dataset.id}`}
                className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md font-medium hover:bg-blue-100 transition-colors"
              >
                {dataset.computed_title}
              </a>
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">None linked</span>
          )}
        </div>

        {/* Linked Projects */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 w-20">Projects:</span>
          {currentPub.projects && currentPub.projects.length > 0 ? (
            currentPub.projects.map((project) => (
              <a
                key={project.id}
                href={`/src/project_meta?pid=${project.id}`}
                className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md font-medium hover:bg-purple-100 transition-colors"
              >
                {project.project_grant_name || project.projectGrantName || project.metadata_blob?.project_grant_name || project.metadata_blob?.projectGrantName || project.metadata_blob?.summary?.title || project.name || project.title || `Project ID: ${project.id}`}
              </a>
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">None linked</span>
          )}
        </div>
      </div>

      {/* Expandable Abstract Section */}
      <div className="text-sm text-gray-700 border-t border-gray-100 pt-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 font-semibold text-gray-800 hover:text-blue-600 transition-colors mb-1 focus:outline-none"
        >
          <span className="transform transition-transform duration-200 inline-block">
            {isExpanded ? '▼' : '►'}
          </span>
          ABSTRACT
        </button>

        <div className="pl-4 text-gray-600 leading-relaxed">
          {isExpanded ? (
            <div dangerouslySetInnerHTML={{ __html: currentPub.abstract || "No abstract available." }} />
          ) : (
            getFirstLine(currentPub.abstract)
          )}
          {!isExpanded && currentPub.abstract && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-blue-600 ml-1 hover:underline text-xs font-medium"
            >
              Read more
            </button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditPublicationModal
        publication={currentPub}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default function PublicationList({ publications, onPublicationUpdated }) {
  if (publications.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg text-gray-500">
        No publications found matching the current search criteria.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pr-2">
      {publications.map((pub) => (
        <PublicationCard key={pub.id} publication={pub} onPublicationUpdated={onPublicationUpdated} />
      ))}
    </div>
  );
}