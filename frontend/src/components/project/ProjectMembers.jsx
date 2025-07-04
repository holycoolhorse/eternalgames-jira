import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

const ProjectMembers = ({ project, onMemberUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setLoading(true);
      await api.put(`/projects/${project.id}/members/${userId}`, {
        role: newRole
      });
      
      toast.success('Üye rolü güncellendi');
      onMemberUpdate();
    } catch (error) {
      console.error('Update member role error:', error);
      if (error.response?.status === 403) {
        toast.error('Bu işlem için yetkiniz yok');
      } else {
        toast.error('Rol güncellenirken hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`${userName} kullanıcısını projeden çıkarmak istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/projects/${project.id}/members/${userId}`);
      
      toast.success('Üye projeden çıkarıldı');
      onMemberUpdate();
    } catch (error) {
      console.error('Remove member error:', error);
      if (error.response?.status === 403) {
        toast.error('Bu işlem için yetkiniz yok');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Üye çıkarılamadı');
      } else {
        toast.error('Üye çıkarılırken hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'member': return 'bg-blue-100 text-blue-800';
      case 'reader': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Yönetici';
      case 'member': return 'Üye';
      case 'reader': return 'Okuyucu';
      default: return role;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Proje Üyeleri ({project.members?.length || 0})
      </h3>
      
      <div className="space-y-3">
        {project.members?.map(member => (
          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                disabled={loading || project.owner_id === member.id}
                className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="reader">Okuyucu</option>
                <option value="member">Üye</option>
                <option value="admin">Yönetici</option>
              </select>
              
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role)}`}>
                {getRoleText(member.role)}
              </span>
              
              {project.owner_id !== member.id && (
                <button
                  onClick={() => handleRemoveMember(member.id, member.name)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Çıkar
                </button>
              )}
              
              {project.owner_id === member.id && (
                <span className="text-xs text-gray-500">(Sahip)</span>
              )}
            </div>
          </div>
        ))}
        
        {(!project.members || project.members.length === 0) && (
          <p className="text-gray-500 text-center py-4">Henüz üye bulunmuyor.</p>
        )}
      </div>
    </div>
  );
};

export default ProjectMembers;
