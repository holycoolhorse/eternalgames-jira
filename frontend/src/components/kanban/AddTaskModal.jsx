import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const AddTaskModal = ({ isOpen, onClose, projectId, initialStatus = 'TODO', onTaskAdded }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    status: initialStatus,
    assigneeId: '',
    dueDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchProjectMembers();
    }
  }, [isOpen, projectId]);

  const fetchProjectMembers = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProjectMembers(response.data.project.members || []);
    } catch (error) {
      console.error('Fetch project members error:', error);
      toast.error('Proje üyeleri yüklenemedi');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const taskData = {
        ...formData,
        projectId: parseInt(projectId),
        assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : null,
        dueDate: formData.dueDate || null
      };

      const response = await api.post('/tasks', taskData);
      toast.success('Görev başarıyla oluşturuldu!');
      
      // Parent component'e yeni görevi bildir
      if (onTaskAdded) {
        onTaskAdded(response.data.task);
      }
      
      onClose();
    } catch (error) {
      console.error('Create task error:', error);
      toast.error(error.response?.data?.message || 'Görev oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Yeni Görev Oluştur</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Görev Başlığı *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              className="input"
              placeholder="Görev başlığı girin"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleInputChange}
              className="input"
              placeholder="Görev açıklaması (opsiyonel)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Tür
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="input"
              >
                <option value="task">Görev</option>
                <option value="bug">Hata</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Öncelik
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="input"
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="input"
              >
                <option value="TODO">Yapılacak</option>
                <option value="IN_PROGRESS">Devam Ediyor</option>
                <option value="DONE">Tamamlandı</option>
              </select>
            </div>

            <div>
              <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 mb-1">
                Atanan Kişi
              </label>
              <select
                id="assigneeId"
                name="assigneeId"
                value={formData.assigneeId}
                onChange={handleInputChange}
                className="input"
              >
                <option value="">Seçiniz</option>
                {projectMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className="input"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Oluşturuluyor...' : 'Görev Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
