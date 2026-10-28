import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, MessageSquare, CheckSquare, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const COLUMNS = {
  'col-todo': { id: 'col-todo', title: 'TO DO', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  'col-progress': { id: 'col-progress', title: 'IN PROGRESS', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  'col-complete': { id: 'col-complete', title: 'COMPLETE', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};
const COLUMN_ORDER = ['col-todo', 'col-progress', 'col-complete'];

export default function BoardView() {
  const [tasks, setTasks] = useState([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksData);
    });
    return () => unsubscribe();
  }, []);

  const getTasksByColumn = (columnId) => {
    return tasks.filter(t => t.status === columnId);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic UI update could be done here, but we'll rely on Firebase real-time sync for simplicity in this demo.
    // Calculate new order
    const destTasks = getTasksByColumn(destination.droppableId);
    let newOrder = 0;
    
    if (destTasks.length === 0) {
      newOrder = 1000;
    } else if (destination.index === 0) {
      newOrder = destTasks[0].order - 1000;
    } else if (destination.index === destTasks.length) {
      newOrder = destTasks[destTasks.length - 1].order + 1000;
    } else {
      const prevOrder = destTasks[destination.index - 1].order;
      const nextOrder = destTasks[destination.index].order;
      newOrder = prevOrder + (nextOrder - prevOrder) / 2;
    }

    const taskRef = doc(db, 'tasks', draggableId);
    await updateDoc(taskRef, {
      status: destination.droppableId,
      order: newOrder
    });
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskContent.trim()) {
      setIsAdding(false);
      return;
    }

    const todoTasks = getTasksByColumn('col-todo');
    const order = todoTasks.length > 0 ? todoTasks[todoTasks.length - 1].order + 1000 : 1000;

    await addDoc(collection(db, 'tasks'), {
      content: newTaskContent,
      status: 'col-todo',
      order: order,
      subtasks: 0,
      createdAt: new Date().toISOString()
    });

    setNewTaskContent('');
    setIsAdding(false);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white font-display tracking-tight">Phase 1</h1>
        <div className="flex items-center gap-2">
          {isAdding ? (
            <form onSubmit={handleAddTask} className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                onBlur={() => !newTaskContent && setIsAdding(false)}
                placeholder="Task title..."
                className="px-3 py-1.5 bg-[#141418] border border-[#1e1e24] rounded-md text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              />
              <button type="submit" className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-colors">
                Save
              </button>
            </form>
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 h-full">
          {COLUMN_ORDER.map((columnId) => {
            const column = COLUMNS[columnId];
            const columnTasks = getTasksByColumn(columnId);
            return <Column key={columnId} column={column} tasks={columnTasks} />;
          })}
          
          <div className="w-[320px] flex-shrink-0 flex items-start mt-2">
            <button className="flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
              <Plus size={16} className="mr-1" /> Add group
            </button>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

function Column({ column, tasks }) {
  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center">
          <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${column.bg} ${column.color} border border-white/[0.05]`}>
            {column.title}
          </div>
          <span className="ml-3 text-xs font-medium text-zinc-500">{tasks.length}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
          <button className="p-1 text-zinc-500 hover:text-white rounded"><Plus size={14}/></button>
          <button className="p-1 text-zinc-500 hover:text-white rounded"><MoreHorizontal size={14}/></button>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[150px] transition-colors rounded-xl ${
              snapshot.isDraggingOver ? 'bg-surface/[0.02]' : ''
            }`}
          >
            <div className="space-y-3 min-h-[50px]">
              {tasks.map((task, index) => (
                <Task key={task.id} task={task} index={index} />
              ))}
              {provided.placeholder}
            </div>
            
            <button className="w-full mt-3 py-2 rounded-lg border border-dashed border-[#2a2a30] text-zinc-500 text-sm font-medium hover:bg-surface/[0.02] hover:text-zinc-300 transition-colors flex items-center justify-center">
              <Plus size={16} className="mr-1" /> Add Task
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}

function Task({ task, index }) {
  const handleDelete = async () => {
    await deleteDoc(doc(db, 'tasks', task.id));
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-[#141418] border border-[#1e1e24] p-4 rounded-xl shadow-lg group hover:border-zinc-700 transition-all relative ${
            snapshot.isDragging ? 'shadow-2xl shadow-emerald-500/10 rotate-2 border-emerald-500/30 z-50' : ''
          }`}
          style={provided.draggableProps.style}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-zinc-100 pr-6">{task.content}</h3>
            <button 
              onClick={handleDelete}
              className="absolute top-4 right-4 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
          
          <div className="flex items-center gap-3 mt-4 text-xs text-zinc-500">
            <div className="flex items-center hover:text-zinc-300 cursor-pointer transition-colors" title="Subtasks">
              <CheckSquare size={14} className="mr-1.5" />
              <span>{task.subtasks || 0} subtasks</span>
            </div>
            <div className="flex items-center hover:text-zinc-300 cursor-pointer transition-colors" title="Comments">
              <MessageSquare size={14} className="mr-1.5" />
              <span>0</span>
            </div>
          </div>
          
          <div className="mt-4 h-1 w-full bg-[#1e1e24] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${task.status === 'col-complete' ? 'bg-emerald-500 w-full' : task.status === 'col-progress' ? 'bg-indigo-500 w-1/2' : 'bg-zinc-600 w-0'}`}></div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
