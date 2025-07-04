import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Fetch projects error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else if (error.response?.status === 403) {
        toast.error('Bu işlem için yetkiniz yok.');
      } else if (error.response?.status >= 500) {
        toast.error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
      } else {
        toast.error(error.response?.data?.message || 'Projeler yüklenemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await api.post('/projects', formData);
      toast.success('Proje başarıyla oluşturuldu!');
      setProjects([...projects, response.data.project]);
      setShowModal(false);
      setFormData({ name: '', description: '', key: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Proje oluşturulamadı');
      console.error('Create project error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate key from name
      ...(name === 'name' && { key: value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) })
    }));
  };

  if (loading) {
    return (
      <div className="card p-6">
        <p className="text-gray-500 text-center py-8">Projeler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projeler</h1>
          <p className="mt-1 text-sm text-gray-600">
            Mevcut projelerinizi görüntüleyin ve yönetin
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'member') && (
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Yeni Proje
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card p-6">
          <p className="text-gray-500 text-center py-8">
            Henüz proje bulunmuyor. İlk projenizi oluşturun!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
                <span className="badge badge-status-todo">{project.key}</span>
              </div>
              <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{project.member_count || 0} üye</span>
                <span>{project.task_count || 0} görev</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Yeni Proje Oluştur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Proje Adı
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Proje adı girin"
                />
              </div>
              <div>
                <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
                  Proje Anahtarı
                </label>
                <input
                  type="text"
                  id="key"
                  name="key"
                  required
                  value={formData.key}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="PROJ"
                  maxLength="10"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Proje açıklaması (opsiyonel)"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
