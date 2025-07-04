import React, { useState, useMemo } from 'react';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import KanbanColumn from './KanbanColumn';

const KanbanBoard = ({ tasks, setTasks, projectId }) => {
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

  return (
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
  );
};

export default KanbanBoard;
