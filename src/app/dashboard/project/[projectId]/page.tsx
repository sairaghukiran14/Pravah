'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { ProjectData, PipelineData } from '@/types/pipeline';
import { Plus, ArrowLeft, Workflow, Play, Trash2, Sparkles, Loader2, Search, ArrowDownUp, Filter } from 'lucide-react';

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [pipelines, setPipelines] = useState<PipelineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingPipelineId, setDeletingPipelineId] = useState<string | null>(null);
  const [pipelineToDelete, setPipelineToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPipeName, setNewPipeName] = useState('');
  const [newPipeDesc, setNewPipeDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterBy, setFilterBy] = useState('all');
  const [libraryPipelines, setLibraryPipelines] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const fetchProjectDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setPipelines(data.pipelines || []);
      }
    } catch (err) {
      console.error('Error fetching project detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const allProjects = await res.json();
          const libraryProj = allProjects.find((p: any) => p.name === 'Library');
          if (libraryProj) {
            setLibraryPipelines(libraryProj.pipelines || []);
          }
        }
      } catch (err) {
        console.error('Error fetching library templates:', err);
      }
    }
    fetchTemplates();
  }, []);

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipeName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPipeName,
          description: newPipeDesc,
          projectId,
          cloneFromId: selectedTemplateId || undefined,
        }),
      });

      if (res.ok) {
        const createdPipeline = await res.json();
        setIsModalOpen(false);
        router.push(`/pipeline/${createdPipeline.id}`);
      }
    } catch (err) {
      console.error('Error creating pipeline:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePipeline = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPipelineToDelete(id);
  };

  const confirmDeletePipeline = async () => {
    if (!pipelineToDelete || deletingPipelineId) return;

    setDeletingPipelineId(pipelineToDelete);
    try {
      await fetch(`/api/pipelines/${pipelineToDelete}`, { method: 'DELETE' });
      setPipelines(pipelines.filter((p) => p.id !== pipelineToDelete));
      setPipelineToDelete(null);
    } catch (err) {
      console.error('Error deleting pipeline:', err);
    } finally {
      setDeletingPipelineId(null);
    }
  };

  const filteredAndSortedPipelines = React.useMemo(() => {
    let result = [...pipelines];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (filterBy === 'with-nodes') {
      result = result.filter((p) => (p.nodes?.length || 0) > 0);
    } else if (filterBy === 'empty') {
      result = result.filter((p) => (p.nodes?.length || 0) === 0);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'nodes-desc':
          return (b.nodes?.length || 0) - (a.nodes?.length || 0);
        case 'nodes-asc':
          return (a.nodes?.length || 0) - (b.nodes?.length || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [pipelines, searchQuery, sortBy, filterBy]);

  return (
    <div className="min-h-screen bg-gray-50/40 flex flex-col font-sans relative overflow-hidden">
      {/* Soft background blurs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-100/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to All Projects
          </Link>
        </div>

        {/* Project Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-50/40 via-indigo-50/20 to-purple-50/40 border border-gray-200/80 shadow-2xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-semibold">
              PROJECT WORKSPACE
            </span>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              {project?.name || (isLoading ? 'Loading Project...' : 'Project Details')}
            </h1>
            <p className="text-xs text-gray-500 max-w-2xl">
              {project?.description || 'Manage visual AI pipelines within this project environment.'}
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
            size="md"
            disabled={isLoading}
          >
            Create New Pipeline
          </Button>
        </div>

        {/* Pipelines List */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-gray-700" /> Visual Pipelines ({pipelines.length})
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pipelines..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    className="w-full sm:w-auto appearance-none pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all cursor-pointer"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="with-nodes">Configured</option>
                    <option value="empty">Empty</option>
                  </select>
                </div>
                <div className="relative w-full sm:w-auto">
                  <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    className="w-full sm:w-auto appearance-none pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all cursor-pointer"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="nodes-desc">Most Nodes</option>
                    <option value="nodes-asc">Fewest Nodes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl bg-gray-50 animate-pulse border border-gray-200 flex flex-col justify-between p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gray-200" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : pipelines.length === 0 ? (
            <div className="rounded-xl border border-gray-200 p-12 text-center bg-white">
              <Workflow className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <h3 className="text-sm font-semibold text-gray-900">No Pipelines Created Yet</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Create a visual pipeline to drag & drop STT, Translate, and TTS nodes on the interactive editor canvas.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                icon={<Plus className="h-4 w-4" />}
                className="mt-4"
                size="sm"
              >
                Create Pipeline
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedPipelines.length === 0 ? (
                <div className="col-span-full py-16 text-center border border-dashed border-gray-200 rounded-xl bg-white/50">
                  <Search className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                  <h3 className="text-sm font-medium text-gray-900">No matching pipelines found</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    We couldn't find any pipelines matching your current search and filter criteria.
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterBy('all');
                      setSortBy('name-asc');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                filteredAndSortedPipelines.map((pipe) => {
                const isDeletingThis = deletingPipelineId === pipe.id;
                return (
                  <Link
                    key={pipe.id}
                    href={isDeletingThis ? '#' : `/pipeline/${pipe.id}`}
                    onClick={(e) => { if (isDeletingThis) e.preventDefault(); }}
                    className={`group relative rounded-xl border border-gray-200 bg-white p-5 flex flex-col justify-between transition-all ${
                      isDeletingThis ? 'opacity-60 pointer-events-none' : 'hover:border-gray-300 hover:shadow-sm cursor-pointer'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            <Workflow className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {pipe.name}
                            </h3>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeletePipeline(pipe.id, e)}
                          disabled={isDeletingThis || deletingPipelineId !== null}
                          title="Delete Pipeline"
                          className="text-gray-300 hover:text-red-500 p-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                        >
                          {isDeletingThis ? (
                            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-gray-400 line-clamp-2 min-h-[28px]">
                        {pipe.description || 'Speech-to-Text, Translation & Audio Synthesis Workflow'}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {pipe.nodes?.length || 3} Nodes Configured
                      </span>
                      <span className="flex items-center gap-1 text-gray-900 group-hover:translate-x-0.5 transition-transform font-medium">
                        Open Editor <Play className="h-3 w-3 fill-current" />
                      </span>
                    </div>
                  </Link>
                );
              })
              )}
            </div>
          )}
        </div>
      </main>

      {/* New Pipeline Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isCreating && setIsModalOpen(false)}
        title="Create Visual Pipeline"
      >
        <form onSubmit={handleCreatePipeline} className="space-y-4">
          <Input
            label="Pipeline Name"
            placeholder="e.g., Hindi Speech to English & Telugu Audio"
            value={newPipeName}
            onChange={(e) => setNewPipeName(e.target.value)}
            disabled={isCreating}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none disabled:opacity-50"
              placeholder="What does this pipeline execute?"
              value={newPipeDesc}
              onChange={(e) => setNewPipeDesc(e.target.value)}
              disabled={isCreating}
            />
          </div>

          {libraryPipelines.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start from Template (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none disabled:opacity-50"
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  const template = libraryPipelines.find(p => p.id === e.target.value);
                  if (template) {
                    if (!newPipeName || newPipeName.startsWith('Clone of ') || newPipeName === '') {
                      setNewPipeName(`Clone of ${template.name}`);
                    }
                    setNewPipeDesc(template.description || '');
                  }
                }}
                disabled={isCreating}
              >
                <option value="">Start with an Empty Canvas</option>
                {libraryPipelines.map((pipe) => (
                  <option key={pipe.id} value={pipe.id}>
                    {pipe.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isCreating} disabled={isCreating} icon={<Sparkles className="h-4 w-4" />}>
              Open in Node Editor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!pipelineToDelete}
        title="Delete Pipeline"
        message="Are you sure you want to delete this visual pipeline? This action cannot be undone."
        confirmText="Delete Pipeline"
        isConfirming={!!deletingPipelineId}
        onConfirm={confirmDeletePipeline}
        onCancel={() => !deletingPipelineId && setPipelineToDelete(null)}
      />
    </div>
  );
}
