import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UsersPage = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sistem kullanıcılarını görüntüleyin ve yönetin
          </p>
        </div>
        <button className="btn-primary">
          Yeni Kullanıcı
        </button>
      </div>

      <div className="card p-6">
        <p className="text-gray-500 text-center py-8">
          Kullanıcılar yükleniyor...
        </p>
      </div>
    </div>
  );
};

export default UsersPage;
