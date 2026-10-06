import React, { useState } from 'react';

const PublicationCard = ({ publication }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
  console.log("found these datasets", publication.datasets);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-4 hover:shadow-md transition-shadow">
      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600">
        <a href={publication.url} target="_blank" rel="noopener noreferrer">
          {publication.paper_title}
        </a>
      </h3>

      {/* Citation Metadata */}
      <div className="text-sm text-gray-600 flex flex-wrap gap-2 mb-4">
        <span>{formatAuthors(publication.authors)}</span>
        <span className="text-gray-300">|</span>
        <span className="font-medium">{publication.journal_name}</span>
        <span className="text-gray-300">|</span>
        <span>Published: {publication.year_of_publication}</span>
      </div>

      {/* Data Dependencies Section */}
      <div className="bg-gray-50 rounded-md p-4 mb-4 border border-gray-100">
        <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider mb-2">
          Data Dependencies
        </span>

        {/* Linked Datasets */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700 w-20">Datasets:</span>
          {publication.datasets && publication.datasets.length > 0 ? (
            publication.datasets.map((dataset) => (
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
          {publication.projects && publication.projects.length > 0 ? (
            publication.projects.map((project) => (
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
            <div dangerouslySetInnerHTML={{ __html: publication.abstract }} />
          ) : (
            getFirstLine(publication.abstract)
          )}
          {!isExpanded && publication.abstract && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-blue-600 ml-1 hover:underline text-xs font-medium"
            >
              Read more
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function PublicationList({ publications }) {
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
        <PublicationCard key={pub.id} publication={pub} />
      ))}
    </div>
  );
}