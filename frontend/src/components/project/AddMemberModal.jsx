import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

const AddMemberModal = ({ isOpen, onClose, projectId, onMemberAdded }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log('Fetching assignable users...');
      const response = await api.get('/users/assignable');
      console.log('Users response:', response.data);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Fetch users error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error('Kullanıcılar yüklenemedi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error('Lütfen bir kullanıcı seçin');
      return;
    }

    try {
      setLoading(true);
      console.log('Adding member:', { projectId, userId: parseInt(selectedUser), role: selectedRole });
      
      await api.post(`/projects/${projectId}/members`, {
        userId: parseInt(selectedUser),
        role: selectedRole
      });
      
      toast.success('Üye başarıyla eklendi');
      onMemberAdded();
      onClose();
      setSelectedUser('');
      setSelectedRole('member');
    } catch (error) {
      console.error('Add member error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Üye eklenemedi');
      } else if (error.response?.status === 403) {
        toast.error('Bu işlem için yetkiniz yok');
      } else if (error.response?.status === 404) {
        toast.error('Kullanıcı veya proje bulunamadı');
      } else if (error.response?.status === 500) {
        toast.error('Sunucu hatası');
      } else {
        toast.error('Üye eklenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedUser('');
    setSelectedRole('member');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Yeni Üye Ekle</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı
            </label>
            {loadingUsers ? (
              <div className="text-center py-2">
                <span className="text-gray-500">Kullanıcılar yükleniyor...</span>
              </div>
            ) : (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input"
                required
              >
                <option value="">Kullanıcı seçin</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input"
              required
            >
              <option value="reader">Okuyucu</option>
              <option value="member">Üye</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || loadingUsers}
              className="btn-primary"
            >
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
