import React, { useState, useEffect, useMemo } from 'react';
import ToolFilters from './ToolFilters';
import ToolList from './ToolList';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export function ToolDashboard() {
  const [allTools, setAllTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [datasetSearchQuery, setDatasetSearchQuery] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/tools/`);
        if (!res.ok) throw new Error('Failed to fetch tools');
        const toolsData = await res.json();
        setAllTools(toolsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTools = useMemo(() => {
    return allTools.filter((tool) => {
      // 1. Text Search Filter
      const matchesSearch = searchQuery.trim() === '' ||
        (tool.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (tool.description || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (tool.associated_authors && tool.associated_authors.some(a => {
          if (typeof a === 'string') return a.toLowerCase().includes(searchQuery.trim().toLowerCase());
          return (a.family && a.family.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
                 (a.given && a.given.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
                 (a.name && a.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
        }));

      // 2. Dataset Search Filter
      const matchesDatasets = datasetSearchQuery.trim() === '' ||
        (tool.datasets && tool.datasets.some(ds => {
          const dsTitle = (
            ds.computed_title ||
            ds.title ||
            ds.name ||
            ds.metadata_blob?.summary?.title ||
            ds.datasetid ||
            ''
          ).toLowerCase();
          return dsTitle.includes(datasetSearchQuery.trim().toLowerCase());
        }));

      // 3. Project Search Filter
      const matchesProjects = projectSearchQuery.trim() === '' ||
        (tool.projects && tool.projects.some(proj => {
          const searchLower = projectSearchQuery.trim().toLowerCase();
          const pName = (
            proj.project_grant_name ||
            proj.projectGrantName ||
            proj.metadata_blob?.project_grant_name ||
            proj.metadata_blob?.projectGrantName ||
            proj.metadata_blob?.summary?.title ||
            proj.metadata_blob?.title ||
            proj.name ||
            proj.title ||
            ''
          ).toLowerCase();
          const pScope = (proj.project_grant_scope || proj.metadata_blob?.summary?.abstract || proj.metadata_blob?.abstract || proj.metadata_blob?.description || '').toLowerCase();
          const pPid = (proj.pid || '').toLowerCase();
          const pGrantNum = (proj.grant_numbers || '').toLowerCase();
          const pResearcher = (proj.lead_researcher || '').toLowerCase();

          return pName.includes(searchLower) ||
                 pScope.includes(searchLower) ||
                 pPid.includes(searchLower) ||
                 pGrantNum.includes(searchLower) ||
                 pResearcher.includes(searchLower);
        }));

      return matchesSearch && matchesDatasets && matchesProjects;
    });
  }, [allTools, searchQuery, datasetSearchQuery, projectSearchQuery]);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading CRUK datahub tools...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      <ToolFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        datasetSearchQuery={datasetSearchQuery}
        setDatasetSearchQuery={setDatasetSearchQuery}
        projectSearchQuery={projectSearchQuery}
        setProjectSearchQuery={setProjectSearchQuery}
      />
      <main className="flex-1 p-6 bg-gray-50 flex flex-col overflow-hidden">
        <div className="mb-4 flex justify-between items-end">
          <h1 className="text-2xl font-bold text-gray-900">Tools Directory</h1>
          <span className="text-sm text-gray-500 font-medium">
            Showing {filteredTools.length} results
          </span>
        </div>
        <ToolList tools={filteredTools} />
      </main>
    </div>
  );
}
