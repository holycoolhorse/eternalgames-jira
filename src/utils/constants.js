export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
};

export const TASK_PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

export const TASK_TYPE = {
  TASK: 'task',
  BUG: 'bug'
};

export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  READER: 'reader'
};

export const STATUS_LABELS = {
  [TASK_STATUS.TODO]: 'Yapılacak',
  [TASK_STATUS.IN_PROGRESS]: 'Devam Ediyor',
  [TASK_STATUS.DONE]: 'Tamamlandı'
};

export const PRIORITY_LABELS = {
  [TASK_PRIORITY.HIGH]: 'Yüksek',
  [TASK_PRIORITY.MEDIUM]: 'Orta',
  [TASK_PRIORITY.LOW]: 'Düşük'
};

export const TYPE_LABELS = {
  [TASK_TYPE.TASK]: 'Görev',
  [TASK_TYPE.BUG]: 'Hata'
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Yönetici',
  [USER_ROLES.MEMBER]: 'Üye',
  [USER_ROLES.READER]: 'Okuyucu'
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case TASK_PRIORITY.HIGH:
      return 'bg-red-100 text-red-800';
    case TASK_PRIORITY.MEDIUM:
      return 'bg-yellow-100 text-yellow-800';
    case TASK_PRIORITY.LOW:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case TASK_STATUS.TODO:
      return 'bg-gray-100 text-gray-800';
    case TASK_STATUS.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800';
    case TASK_STATUS.DONE:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getTypeColor = (type) => {
  switch (type) {
    case TASK_TYPE.TASK:
      return 'bg-blue-100 text-blue-800';
    case TASK_TYPE.BUG:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
