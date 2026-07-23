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
import { Plus, Folder, ArrowRight, Trash2, Layers, Loader2, ShieldAlert, Zap, ChevronRight } from 'lucide-react';

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

        {/* Quick Navigation for Sample Project Pipelines */}
        {!isLoading && projects.find(p => p.name === 'Sample Project') && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Quick Access: Sample Pipelines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {projects.find(p => p.name === 'Sample Project')?.pipelines?.map((pipe, index) => {
                const gradientClass = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
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


        {/* Projects Grid */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Your Projects</h2>

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
              {projects.map((project) => {
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
              })}
            </div>
          )}
        </div>
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
