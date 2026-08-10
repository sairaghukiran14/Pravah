'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { ProjectData } from '@/types/pipeline';
import { Plus, Folder, ArrowRight, Trash2, Layers, Loader2, ShieldAlert, Zap, ChevronRight, Search, Filter, ArrowDownUp } from 'lucide-react';

const CARD_GRADIENTS = [
  'from-blue-50 to-indigo-50/50 text-gray-900 border-indigo-100/80',
  'from-purple-50 to-violet-50/50 text-gray-900 border-violet-100/80',
  'from-pink-50 to-rose-50/50 text-gray-900 border-rose-100/80',
  'from-emerald-50 to-teal-50/50 text-gray-900 border-teal-100/80',
  'from-orange-50 to-amber-50/50 text-gray-900 border-amber-100/80',
];

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterBy, setFilterBy] = useState('all');

  // 1. AUTHENTICATION & AUTHORIZATION GUARD & ONBOARDING ROUTER
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      // @ts-ignore - custom field
      if (session?.user?.onboardingCompleted === false) {
        router.push('/onboarding');
        return;
      }
    }
  }, [status, session, router]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
      });
      if (res.ok) {
        const created = await res.json();
        setProjects([created, ...projects]);
        setNewProjectName('');
        setNewProjectDesc('');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(id);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete || deletingId) return;

    setDeletingId(projectToDelete);
    try {
      await fetch(`/api/projects/${projectToDelete}`, { method: 'DELETE' });
      setProjects(projects.filter((p) => p.id !== projectToDelete));
      setProjectToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAndSortedProjects = React.useMemo(() => {
    let result = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (filterBy === 'with-pipelines') {
      result = result.filter((p) => (p._count?.pipelines || 0) > 0);
    } else if (filterBy === 'empty') {
      result = result.filter((p) => (p._count?.pipelines || 0) === 0);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'pipelines-desc':
          return (b._count?.pipelines || 0) - (a._count?.pipelines || 0);
        case 'pipelines-asc':
          return (a._count?.pipelines || 0) - (b._count?.pipelines || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [projects, searchQuery, sortBy, filterBy]);

  // Full Screen Auth Loader while verifying session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 text-gray-500 font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        <span className="text-sm font-semibold text-gray-800">Verifying Authentication & Session...</span>
      </div>
    );
  }

  // Prevent flash of content if unauthenticated
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/40 flex flex-col font-sans relative overflow-hidden">
      {/* Soft background blurs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-100/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Projects Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your Indic AI pipeline projects</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
            disabled={isLoading}
          >
            New Project
          </Button>
        </div>


        {/* Projects Grid */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-900">Your Projects</h2>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
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
                    <option value="with-pipelines">Configured</option>
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
                    <option value="pipelines-desc">Most Pipelines</option>
                    <option value="pipelines-asc">Fewest Pipelines</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-gray-50 animate-pulse border border-gray-200 flex flex-col justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gray-200" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-gray-200 p-12 text-center bg-white">
              <Folder className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <h3 className="text-sm font-semibold text-gray-900">No Projects Yet</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Create a project to organize your speech processing pipelines.
              </p>
              <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="h-4 w-4" />} className="mt-4" size="sm">
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedProjects.length === 0 ? (
                <div className="col-span-full py-16 text-center border border-dashed border-gray-200 rounded-xl bg-white/50">
                  <Search className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                  <h3 className="text-sm font-medium text-gray-900">No matching projects found</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    We couldn't find any projects matching your current search and filter criteria.
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
                filteredAndSortedProjects.map((project) => {
                const isDeletingThis = deletingId === project.id;
                return (
                  <Link
                    key={project.id}
                    href={isDeletingThis ? '#' : `/dashboard/project/${project.id}`}
                    onClick={(e) => { if (isDeletingThis) e.preventDefault(); }}
                    className={`group relative rounded-xl border border-gray-200 bg-white p-5 flex flex-col justify-between transition-all ${
                      isDeletingThis ? 'opacity-60 pointer-events-none' : 'hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            <Folder className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{project.name}</h3>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          disabled={isDeletingThis || deletingId !== null}
                          title="Delete Project"
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
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" /> {project._count?.pipelines || 0} Pipelines
                      </span>
                      <span className="flex items-center gap-1 text-gray-900 group-hover:translate-x-0.5 transition-transform font-medium">
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })
              )}
            </div>
          )}
        </div>

        {/* Quick Navigation for Library Project Pipelines */}
        {!isLoading && projects.find(p => p.name === 'Library') && (
          <div className="space-y-4 pt-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Quick Access: Library Pipelines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[368px] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pr-2">
              {[...(projects.find(p => p.name === 'Library')?.pipelines || [])]
                .sort((a, b) => {
                  const numA = parseInt(a.name.match(/^\d+/)?.[0] || '999', 10);
                  const numB = parseInt(b.name.match(/^\d+/)?.[0] || '999', 10);
                  if (numA === numB) return a.name.localeCompare(b.name);
                  return numA - numB;
                })
                .map((pipe) => {
                const gradientClass = CARD_GRADIENTS[0]; // Always use the first blue gradient
                return (
                  <Link
                    key={pipe.id}
                    href={`/pipeline/${pipe.id}`}
                    className={`group relative overflow-hidden rounded-xl border p-4 hover:shadow-md transition-all flex flex-col justify-between h-28 bg-gradient-to-br ${gradientClass}`}
                  >
                    {/* Noise texture layer */}
                    <div className="noisy-grain" />

                    <div className="space-y-1 relative z-10">
                      <h3 className="text-xs font-semibold line-clamp-1">
                        {pipe.name}
                      </h3>
                      <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                        {pipe.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-600 pt-2 border-t border-gray-900/5 mt-1 relative z-10">
                      <span>Open Editor</span>
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !isCreating && setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project Name"
            placeholder="e.g., Hindi Audio Translator"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            disabled={isCreating}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none disabled:opacity-50"
              placeholder="Describe your project..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              disabled={isCreating}
            />
          </div>
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
            <Button type="submit" size="sm" isLoading={isCreating} disabled={isCreating}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!projectToDelete}
        title="Delete Project"
        message="Are you sure you want to delete this project? This will permanently delete the project, all its pipelines, and execution history."
        confirmText="Delete Project"
        isConfirming={!!deletingId}
        onConfirm={confirmDeleteProject}
        onCancel={() => !deletingId && setProjectToDelete(null)}
      />
    </div>
  );
}
