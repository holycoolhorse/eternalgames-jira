import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';

const TaskCard = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getTypeIcon = (type) => {
    return type === 'bug' ? '🐛' : '📋';
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="bg-white rounded-md shadow-sm p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getTypeIcon(task.type)}</span>
          <Link 
            to={`/tasks/${task.id}`} 
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {task.key}
          </Link>
        </div>
        <span className={`w-3 h-3 rounded-full ${getPriorityClass(task.priority)}`}></span>
      </div>
      
      <h4 className="font-semibold text-gray-800 mb-2 line-clamp-2">{task.title}</h4>
      
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee_avatar ? (
            <img 
              src={task.assignee_avatar} 
              alt={task.assignee_name} 
              className="w-6 h-6 rounded-full"
            />
          ) : task.assignee_name ? (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
              {task.assignee_name.charAt(0).toUpperCase()}
            </div>
          ) : null}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1">
              💬 {task.comment_count}
            </span>
          )}
          {task.attachment_count > 0 && (
            <span className="flex items-center gap-1">
              📎 {task.attachment_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
