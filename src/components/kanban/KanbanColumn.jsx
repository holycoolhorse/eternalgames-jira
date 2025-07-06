import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import AddTaskModal from './AddTaskModal';

const KanbanColumn = ({ id, title, tasks, projectId, onTaskAdded }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <>
      <div ref={setNodeRef} className={`bg-gray-100 rounded-lg p-4 flex flex-col h-full transition-colors ${isOver ? 'bg-blue-50 border-2 border-blue-300' : ''}`}>
        <h3 className="font-bold text-lg mb-4 text-gray-800">{title} ({tasks.length})</h3>
        
        <div className="flex-grow overflow-y-auto space-y-4 pr-2 min-h-[200px]">
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
        </div>

        {/* Yeni görev ekleme butonu */}
        <button 
          onClick={() => setShowAddModal(true)}
          className="mt-4 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 p-2 rounded-md transition-colors"
        >
          + Yeni Görev Ekle
        </button>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          projectId={projectId}
          initialStatus={id}
          onTaskAdded={onTaskAdded}
        />
      )}
    </>
  );
};

export default KanbanColumn;
