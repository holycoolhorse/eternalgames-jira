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
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch projects
      const projectsRes = await api.get('/projects');
      setProjects(projectsRes.data.projects || []);
      
      // Calculate stats from projects
      const totalProjects = projectsRes.data.projects?.length || 0;
      let totalTasks = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;
      
      // Fetch all tasks for stats
      const allTasks = [];
      for (const project of projectsRes.data.projects || []) {
        try {
          const tasksRes = await api.get(`/projects/${project.id}/tasks`);
          allTasks.push(...(tasksRes.data.tasks || []));
        } catch (error) {
          console.error(`Error fetching tasks for project ${project.id}:`, error);
        }
      }
      
      totalTasks = allTasks.length;
      completedTasks = allTasks.filter(task => task.status?.toLowerCase() === 'done' || task.status?.toUpperCase() === 'DONE').length;
      inProgressTasks = allTasks.filter(task => task.status?.toLowerCase() === 'in_progress' || task.status?.toUpperCase() === 'IN_PROGRESS').length;
      
      setStats({
        totalProjects,
        totalTasks,
        completedTasks,
        inProgressTasks
      });
      
      // Set recent tasks (last 5)
      const sortedTasks = allTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentTasks(sortedTasks.slice(0, 5));
      
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Dashboard verileri yüklenemedi');
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Hoş geldiniz, {user?.name}! Proje durumunuzun özeti aşağıda.
        </p>
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
                to={`/project/${project.id}`}
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
              <p className="text-gray-500 text-center py-4">Henüz proje bulunmuyor.</p>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Son Görevler</h3>
          </div>
          <div className="space-y-3">
            {recentTasks.map(task => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 line-clamp-1">{task.title}</h4>
                    <p className="text-sm text-gray-500">{task.key} • {task.project_name}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      task.status?.toLowerCase() === 'done' || task.status?.toUpperCase() === 'DONE'
                        ? 'text-green-600 bg-green-100'
                        : task.status?.toLowerCase() === 'in_progress' || task.status?.toUpperCase() === 'IN_PROGRESS'
                        ? 'text-blue-600 bg-blue-100'
                        : 'text-gray-600 bg-gray-100'
                    }`}>
                      {task.status?.toLowerCase() === 'done' || task.status?.toUpperCase() === 'DONE'
                        ? 'Tamamlandı'
                        : task.status?.toLowerCase() === 'in_progress' || task.status?.toUpperCase() === 'IN_PROGRESS'
                        ? 'Devam Ediyor'
                        : 'Yapılacak'
                      }
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {recentTasks.length === 0 && (
              <p className="text-gray-500 text-center py-4">Henüz görev bulunmuyor.</p>
            )}
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
          {(user?.role === 'admin' || user?.role === 'member') && (
            <>
              <Link to="/projects" className="btn-secondary">
                Yeni Proje Oluştur
              </Link>
            </>
          )}
          {user?.role === 'admin' && (
            <Link to="/users" className="btn-secondary">
              Kullanıcı Yönetimi
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
