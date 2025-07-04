import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import KanbanBoard from '../components/kanban/KanbanBoard';
import AddMemberModal from '../components/project/AddMemberModal';
import ProjectMembers from '../components/project/ProjectMembers';
import { Toaster, toast } from 'react-hot-toast';

const ProjectDetailPage = () => {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching project with ID:', projectId);
      
      const projectRes = await api.get(`/projects/${projectId}`);
      console.log('Project response:', projectRes.data);
      setProject(projectRes.data.project);

      const tasksRes = await api.get(`/projects/${projectId}/tasks`);
      console.log('Tasks response:', tasksRes.data);
      setTasks(tasksRes.data.tasks);
      
      setError(null);
    } catch (err) {
      console.error('Fetch project data error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.status === 401) {
        setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else if (err.response?.status === 403) {
        setError('Bu projeye erişim yetkiniz yok.');
        toast.error('Bu projeye erişim yetkiniz yok.');
      } else if (err.response?.status === 404) {
        setError('Proje bulunamadı.');
        toast.error('Proje bulunamadı.');
      } else if (err.response?.status >= 500) {
        setError('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
        toast.error('Sunucu hatası.');
      } else {
        setError(err.response?.data?.message || 'Proje verileri yüklenemedi.');
        toast.error('Proje verileri yüklenemedi.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleMemberUpdate = useCallback(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, fetchProjectData]);

  if (loading) {
    return (
      <div className="card p-6">
        <p className="text-gray-500 text-center py-8">Proje yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 bg-red-50 border border-red-200">
        <p className="text-red-700 text-center py-8">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card p-6">
        <p className="text-gray-500 text-center py-8">Proje bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="mt-2 text-sm text-gray-600">{project.description}</p>
          <p className="mt-1 text-sm text-gray-500">
            Proje Anahtarı: {project.key} • Sahip: {project.owner_name}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="btn-primary"
          >
            Üye Ekle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'kanban'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Kanban Panosu
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Üyeler ({project.members?.length || 0})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'kanban' && (
          <KanbanBoard tasks={tasks} setTasks={setTasks} projectId={projectId} />
        )}
        
        {activeTab === 'members' && (
          <div className="card p-6">
            <ProjectMembers project={project} onMemberUpdate={handleMemberUpdate} />
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        projectId={projectId}
        onMemberAdded={handleMemberUpdate}
      />
    </div>
  );
};

export default ProjectDetailPage;
