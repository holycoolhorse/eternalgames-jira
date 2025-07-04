import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const TaskDetailPage = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    fetchTaskData();
  }, [taskId]);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tasks/${taskId}`);
      setTask(response.data.task);
      setComments(response.data.task.comments || []);
    } catch (error) {
      console.error('Fetch task error:', error);
      if (error.response?.status === 404) {
        toast.error('Görev bulunamadı');
        navigate('/projects');
      } else {
        toast.error('Görev yüklenemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, {
        content: newComment
      });
      setComments([...comments, response.data.comment]);
      setNewComment('');
      toast.success('Yorum eklendi');
    } catch (error) {
      toast.error('Yorum eklenemedi');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'TODO': return 'text-gray-600 bg-gray-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'DONE': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'TODO': return 'Yapılacak';
      case 'IN_PROGRESS': return 'Devam Ediyor';
      case 'DONE': return 'Tamamlandı';
      default: return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <p className="text-gray-500 text-center py-8">Görev yükleniyor...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="card p-6">
        <p className="text-gray-500 text-center py-8">Görev bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {task.project_name} • {task.key}
          </p>
        </div>
        <button
          onClick={() => navigate(`/project/${task.project_id}`)}
          className="btn-secondary"
        >
          Projeye Dön
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Açıklama</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {task.description || 'Açıklama bulunmuyor.'}
            </p>
          </div>

          {/* Comments */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Yorumlar ({comments.length})</h3>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Yorum yazın..."
                className="input mb-3"
                rows="3"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="btn-primary"
              >
                {isSubmittingComment ? 'Ekleniyor...' : 'Yorum Ekle'}
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-4 border-blue-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{comment.author_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-gray-500 text-center py-4">Henüz yorum bulunmuyor.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Info */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Görev Bilgileri</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                  {getPriorityText(task.priority)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
                <span className="text-gray-900">{task.type === 'task' ? 'Görev' : 'Hata'}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atanan</label>
                <span className="text-gray-900">
                  {task.assignee_name || 'Atanmamış'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raporlayan</label>
                <span className="text-gray-900">{task.reporter_name}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oluşturulma</label>
                <span className="text-gray-900">
                  {new Date(task.created_at).toLocaleString('tr-TR')}
                </span>
              </div>
              {task.due_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                  <span className="text-gray-900">
                    {new Date(task.due_date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
