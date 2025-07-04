import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from API
      const projectsRes = await api.get('/projects');
      if (projectsRes.data && projectsRes.data.success) {
        setProjects(projectsRes.data.projects);
        setStats({
          totalProjects: projectsRes.data.projects.length,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0
        });
      }
      
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Veriler yüklenemedi: ' + (error.response?.data?.message || error.message));
      // Keep empty state if API fails
      setProjects([]);
      setStats({
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/projects', {
        name: newProject.name,
        description: newProject.description,
        key: newProject.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
      });
      
      if (response.data && response.data.success) {
        toast.success('Proje başarıyla oluşturuldu!');
        setShowCreateProject(false);
        setNewProject({ name: '', description: '' });
        fetchDashboardData();
      } else {
        toast.error('Proje oluşturulamadı');
      }
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Proje oluşturulamadı: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Veriler yükleniyor...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Hoş geldiniz, {user?.name}! Proje durumunuzun özeti aşağıda.
          </p>
        </div>
        
        {/* BIG CREATE PROJECT BUTTON */}
        <button
          onClick={() => setShowCreateProject(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          🚀 YENİ PROJE OLUŞTUR
        </button>
      </div>

      {/* ANOTHER BIG CREATE PROJECT BUTTON */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Hemen Başlayın!</h2>
            <p className="text-blue-100">Yeni bir proje oluşturun ve takımınızla çalışmaya başlayın.</p>
          </div>
          <button
            onClick={() => setShowCreateProject(true)}
            className="bg-white text-blue-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors text-lg"
          >
            📝 CREATE PROJECT
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">P</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Projeler</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.totalProjects}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Tamamlanan</h3>
              <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">⏳</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Devam Eden</h3>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgressTasks}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">📋</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Toplam Görev</h3>
              <p className="text-2xl font-bold text-purple-600">{stats.totalTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Son Projeler</h3>
            <Link to="/projects" className="text-blue-600 hover:text-blue-800 text-sm">
              Tümünü Gör
            </Link>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 5).map(project => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{project.name}</h4>
                    <p className="text-sm text-gray-500">{project.key} • {project.member_count || 0} üye</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {project.task_count || 0} görev
                  </span>
                </div>
              </Link>
            ))}
            {projects.length === 0 && (
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">Henüz proje bulunmuyor.</p>
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                >
                  🎯 İlk Projenizi Oluşturun!
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Son Görevler</h3>
          </div>
          <div className="space-y-3">
            <div className="text-center py-8">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">Henüz görev bulunmuyor.</p>
              <p className="text-sm text-gray-400">Projenizi seçin ve görev oluşturmaya başlayın.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/projects" className="btn-primary">
            Projeler
          </Link>
          <button 
            onClick={() => setShowCreateProject(true)}
            className="btn-secondary"
          >
            Yeni Proje Oluştur
          </button>
          {user?.role === 'Admin' && (
            <Link to="/users" className="btn-secondary">
              Kullanıcı Yönetimi
            </Link>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Yeni Proje Oluştur</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proje Adı
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="btn-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
