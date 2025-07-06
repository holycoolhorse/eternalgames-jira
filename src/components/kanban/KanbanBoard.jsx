import React, { useState, useMemo } from 'react';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import KanbanColumn from './KanbanColumn';
import CreateTaskModal from '../task/CreateTaskModal';

const KanbanBoard = ({ tasks, setTasks, projectId }) => {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [columns, setColumns] = useState([
    { id: 'TODO', title: 'Yapılacaklar' },
    { id: 'IN_PROGRESS', title: 'Devam Ediyor' },
    { id: 'DONE', title: 'Tamamlandı' },
  ]);

  const tasksByColumn = useMemo(() => {
    const groupedTasks = {};
    columns.forEach(col => groupedTasks[col.id] = []);
    tasks.forEach(task => {
      // Map database status to column IDs
      const statusMap = {
        'todo': 'TODO',
        'in_progress': 'IN_PROGRESS',
        'done': 'DONE'
      };
      const columnId = statusMap[task.status] || task.status.toUpperCase();
      if (groupedTasks[columnId]) {
        groupedTasks[columnId].push(task);
      }
    });
    return groupedTasks;
  }, [tasks, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px hareketten sonra sürüklemeyi başlat
      },
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = active.data.current?.sortable.containerId;
    const overContainer = over.data.current?.sortable.containerId || over.id;

    if (activeContainer !== overContainer) {
      const taskId = active.id;
      const newStatus = overContainer;
      
      // Map column ID to database status
      const statusMap = {
        'TODO': 'todo',
        'IN_PROGRESS': 'in_progress',
        'DONE': 'done'
      };
      const dbStatus = statusMap[newStatus] || newStatus.toLowerCase();
      
      const originalTasks = [...tasks];
      
      // Optimistic UI update
      setTasks(prevTasks => {
        const taskIndex = prevTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return prevTasks;
        const updatedTask = { ...prevTasks[taskIndex], status: dbStatus };
        const newTasks = [...prevTasks];
        newTasks[taskIndex] = updatedTask;
        return newTasks;
      });

      try {
        await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
        toast.success('Görev durumu güncellendi!');
      } catch (error) {
        // Revert on error
        setTasks(originalTasks);
        toast.error('Görev durumu güncellenemedi.');
        console.error('Task update error:', error);
      }
    }
  };

  const handleTaskCreated = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/tasks`);
      if (response.data.success) {
        setTasks(response.data.tasks || []);
      }
    } catch (error) {
      console.error('Refresh tasks error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with create task button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Görevler</h2>
        <button
          onClick={() => setShowCreateTask(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg transition-colors transform hover:scale-105 shadow-lg text-lg"
        >
          ✨ YENİ GÖREV OLUŞTUR
        </button>
      </div>

      {/* BIG CREATE TASK BUTTON IF NO TASKS */}
      {tasks.length === 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-8 text-white text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-2">Henüz görev yok!</h3>
          <p className="text-purple-100 mb-6">İlk görevini oluşturarak projeyi başlat.</p>
          <button
            onClick={() => setShowCreateTask(true)}
            className="bg-white text-purple-600 font-bold py-4 px-8 rounded-lg hover:bg-gray-100 transition-colors text-xl transform hover:scale-105 shadow-lg"
          >
            🚀 İLK GÖREVİNİ OLUŞTUR
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByColumn[column.id] || []}
              projectId={projectId}
              onTaskAdded={(newTask) => setTasks(prev => [...prev, newTask])}
            />
          ))}
        </div>
      </DndContext>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={projectId}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
};

export default KanbanBoard;
