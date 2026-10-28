import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, LayoutGrid, List as ListIcon, Calendar, Flag, MessageSquare, Paperclip, User, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase';
import { 
  subscribeToTasks, 
  createTask, 
  updateTask, 
  subscribeToProjects, 
  getProject, 
  logActivity 
} from '../services/firebaseService';
import TaskListView from './TaskListView';
import TaskDetailModal from './TaskDetailModal';

import { useSearchParams } from 'react-router-dom';

const COLUMNS = {
  'col-todo': { id: 'col-todo', title: 'To Do', color: 'text-text-primary', badge: 'bg-[#F1F5F9] text-text-secondary' },
  'col-progress': { id: 'col-progress', title: 'In Progress', color: 'text-warning', badge: 'bg-warning/10 text-warning' },
  'col-review': { id: 'col-review', title: 'Review', color: 'text-purple-600', badge: 'bg-purple-100 text-purple-600' },
  'col-completed': { id: 'col-completed', title: 'Completed', color: 'text-success', badge: 'bg-success/10 text-success' },
};
const COLUMN_ORDER = ['col-todo', 'col-progress', 'col-review', 'col-completed'];

export default function TasksView({ activeWorkspaceId, activeProjectId }) {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [activeAddCol, setActiveAddCol] = useState(null);
  
  const [viewMode, setViewMode] = useState('board');
  const [selectedTask, setSelectedTask] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);

  useEffect(() => {
    if (!activeWorkspaceId || !auth.currentUser) {
      setProjects([]);
      return;
    }

    const unsubProjects = subscribeToProjects(activeWorkspaceId, auth.currentUser.uid, (myProjects) => {
      setProjects(myProjects);
    });

    return () => {
      if (unsubProjects) unsubProjects();
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeProjectId) {
      setTasks([]);
      setProjectMembers([]);
      return;
    }

    const unSubTasks = subscribeToTasks(activeWorkspaceId, activeProjectId, (taskList) => {
      setTasks(taskList);
    });

    const fetchMembers = async () => {
      try {
        const proj = await getProject(activeWorkspaceId, activeProjectId);
        if (proj) {
          setProjectMembers(proj.members || []);
        } else {
          setProjectMembers([]);
        }
      } catch (err) {
        console.error("Error fetching project members:", err);
      }
    };
    
    fetchMembers();

    return () => { 
      if (unSubTasks) unSubTasks(); 
    };
  }, [activeWorkspaceId, activeProjectId]);

  const getTasksByColumn = (columnId) => {
    return tasks.filter(t => t.status === columnId);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

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

    try {
      await updateTask(activeWorkspaceId, activeProjectId, draggableId, {
        status: destination.droppableId,
        order: newOrder
      });
    } catch (error) {
      console.error("Move task error:", error);
    }
  };

  const handleAddTask = async (e, columnId, taskData = {}) => {
    e.preventDefault();
    if (!activeProjectId) {
      alert("Please create or select a project before adding tasks.");
      setActiveAddCol(null);
      return;
    }
    if (!newTaskContent.trim()) {
      setActiveAddCol(null);
      return;
    }

    const colTasks = getTasksByColumn(columnId);
    const lastOrder = colTasks.length > 0 ? (colTasks[colTasks.length - 1].order || 0) : 0;
    const order = lastOrder + 1000;
    const projectTitle = projects.find(p => p.id === activeProjectId)?.title || 'General';

    try {
      await createTask(activeWorkspaceId, activeProjectId, {
        content: newTaskContent,
        status: columnId,
        order: order,
        projectId: activeProjectId,
        project: projectTitle,
        priority: taskData.priority || 'Normal',
        assigneeId: taskData.assigneeId || '',
        dueDate: taskData.dueDate || '',
        description: '',
        photoBase64: taskData.photoBase64 || null,
        createdAt: new Date().toISOString()
      });

      if (taskData.assigneeId && taskData.assigneeId !== auth.currentUser?.uid) {
        const assignee = projectMembers.find(m => m.uid === taskData.assigneeId);
        await logActivity(activeWorkspaceId, {
          user: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0],
          action: 'assigned a task to',
          target: assignee ? (assignee.name || assignee.email) : 'someone',
          targetUserId: taskData.assigneeId,
          content: newTaskContent,
          type: 'task_assignment',
          workspaceId: activeWorkspaceId,
          projectId: activeProjectId || null,
          uid: auth.currentUser?.uid,
          timestamp: new Date().toISOString()
        });
      }

      setNewTaskContent('');
      setActiveAddCol(null);
    } catch (error) {
      console.error("Add task error:", error);
      alert("Failed to save task. Error: " + error.message);
    }
  };

  return (
    <div className="flex h-full w-full flex-col p-4 md:p-8 bg-[#DFD6AE] overflow-hidden">
      
      {/* Header & Toggles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6 shrink-0">
        <div>
          <h2 className="text-3xl font-normal text-[#274245] tracking-wide mb-1 flex items-center font-heading uppercase">
            Tasks
          </h2>
          <p className="text-sm font-medium text-[#5C6E6F]">
            Organize tasks, manage board columns, and assign creations.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-[#FAF7EC]/70 backdrop-blur-md rounded-xl p-1 border border-[#D4C99E] shadow-xs">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'btn-matte-primary text-[#FAF7EC]' : 'text-[#274245]/80 hover:text-[#274245]'}`}
            >
              <ListIcon size={15} className="mr-1.5" /> List
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={`flex items-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'board' ? 'btn-matte-primary text-[#FAF7EC]' : 'text-[#274245]/80 hover:text-[#274245]'}`}
            >
              <LayoutGrid size={15} className="mr-1.5" /> Board
            </button>
          </div>
        </div>
      </div>
      
      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'board' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 h-full snap-x snap-mandatory">
              {COLUMN_ORDER.map((columnId) => {
                const column = COLUMNS[columnId];
                const columnTasks = getTasksByColumn(columnId);
                return (
                  <KanbanColumn 
                    key={column.id} 
                    column={column} 
                    tasks={columnTasks} 
                    isAdding={activeAddCol === column.id}
                    setIsAdding={(val) => setActiveAddCol(val ? column.id : null)}
                    newTaskContent={newTaskContent}
                    setNewTaskContent={setNewTaskContent}
                    handleAddTask={(e, colId, taskData) => handleAddTask(e, colId, taskData)}
                    onTaskClick={setSelectedTask}
                    projectMembers={projectMembers}
                    activeWorkspaceId={activeWorkspaceId}
                    activeProjectId={activeProjectId}
                  />
                );
              })}
            </div>
          </DragDropContext>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <TaskListView 
              tasks={tasks} 
              columns={COLUMN_ORDER} 
              onTaskClick={setSelectedTask} 
              projectMembers={projectMembers}
            />
          </div>
        )}
      </div>

      {/* Task Detail Modal Overlay */}
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          projectId={activeProjectId}
          workspaceId={activeWorkspaceId}
          onClose={() => setSelectedTask(null)} 
        />
      )}
    </div>
  );
}

function KanbanColumn({ column, tasks, isAdding, setIsAdding, newTaskContent, setNewTaskContent, handleAddTask, onTaskClick, projectMembers, activeWorkspaceId, activeProjectId }) {
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [photoBase64, setPhotoBase64] = useState(null);

  const onSubmit = (e) => {
    handleAddTask(e, column.id, { assigneeId, dueDate, priority, photoBase64 });
    // Reset local state after submission
    setAssigneeId('');
    setDueDate('');
    setPriority('Normal');
    setPhotoBase64(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('File too large (Max 2MB)');
      const reader = new FileReader();
      reader.onloadend = () => setPhotoBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-[85vw] md:w-[300px] snap-center flex-shrink-0 flex flex-col bg-[#F8FAFC] rounded-[16px] p-3 border border-[var(--color-border)] shadow-sm h-fit max-h-full">
      <div className="flex items-center justify-between mb-3 px-2 pt-1">
        <div className="flex items-center">
          <h4 className={`font-bold text-sm ${column.color}`}>{column.title}</h4>
          <span className={`ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full ${column.badge}`}>
            {tasks.length}
          </span>
        </div>
        <button className="text-text-secondary hover:text-text-primary bg-white p-1 rounded-md shadow-sm border border-[var(--color-border)]" onClick={() => setIsAdding(true)}>
          <Plus size={14} />
        </button>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[150px] overflow-y-auto custom-scrollbar transition-colors rounded-xl space-y-3 ${
              snapshot.isDraggingOver ? 'bg-[#EEF2FF]' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <KanbanCard 
                key={task.id} 
                task={task} 
                index={index} 
                onTaskClick={onTaskClick} 
                projectMembers={projectMembers} 
                activeWorkspaceId={activeWorkspaceId}
                activeProjectId={activeProjectId}
              />
            ))}
            {provided.placeholder}

            {isAdding && (
              <div className="bg-white p-4 rounded-[12px] shadow-md border border-primary/40 mt-2 flex flex-col">
                <input
                  type="text"
                  autoFocus
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onSubmit(e);
                    }
                  }}
                  placeholder="Task Name..."
                  className="w-full text-sm font-bold text-text-primary focus:outline-none mb-4 placeholder:text-text-secondary"
                />
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-xs font-medium text-text-secondary">
                    <User size={14} className="mr-2" />
                    <select 
                      value={assigneeId} 
                      onChange={e => setAssigneeId(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer w-full"
                    >
                      <option value="">Add assignee</option>
                      {projectMembers.map(m => (
                        <option key={m.uid} value={m.uid}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center text-xs font-medium text-text-secondary">
                    <Calendar size={14} className="mr-2" />
                    <input 
                      type="date" 
                      value={dueDate} 
                      onChange={e => setDueDate(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer w-full"
                    />
                  </div>

                  <div className="flex items-center text-xs font-medium text-text-secondary">
                    <Flag size={14} className="mr-2" />
                    <select 
                      value={priority} 
                      onChange={e => setPriority(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer w-full"
                    >
                      <option value="Normal">Add priority</option>
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Normal">Normal</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div className="flex items-center text-xs font-medium text-text-secondary relative cursor-pointer hover:text-primary">
                    <Paperclip size={14} className="mr-2" />
                    <span className="truncate max-w-[150px]">{photoBase64 ? 'Image Attached' : 'Add file'}</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button onClick={() => setIsAdding(false)} className="px-3 py-1 text-xs font-bold text-text-secondary hover:bg-gray-100 rounded-md">Cancel</button>
                  <button onClick={onSubmit} className="px-3 py-1 text-xs font-bold bg-primary text-white rounded-md shadow-sm hover:bg-primary/90">Save ↵</button>
                </div>
              </div>
            )}
            
            {!isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full mt-2 py-2.5 flex items-center justify-center text-xs font-bold text-text-secondary hover:text-primary hover:bg-[#EEF2FF] rounded-[10px] transition-colors border border-transparent hover:border-primary/20"
              >
                <Plus size={14} className="mr-1" /> Add Task
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function KanbanCard({ task, index, onTaskClick, projectMembers = [], activeWorkspaceId, activeProjectId }) {
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return 'text-danger bg-danger/10';
      case 'High': return 'text-warning bg-warning/10';
      case 'Low': return 'text-success bg-success/10';
      default: return 'text-text-secondary bg-gray-100';
    }
  };

  const assignee = task.assigneeId ? projectMembers.find(m => m.uid === task.assigneeId) : null;
  const avatarUrl = assignee ? `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee.name || assignee.email)}&background=4F6370&color=fff` : null;

  const handleComplete = async (e) => {
    e.stopPropagation();
    try {
      await updateTask(task.workspaceId || activeWorkspaceId, task.projectId || activeProjectId, task.id, { status: 'col-completed' });
    } catch (err) {
      console.error("Complete task error:", err);
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onTaskClick(task)}
          className={`bg-white border border-[var(--color-border)] rounded-[12px] shadow-sm group hover:border-primary/40 hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col ${
            snapshot.isDragging ? 'shadow-xl shadow-primary/20 rotate-3 border-primary z-50' : ''
          }`}
          style={provided.draggableProps.style}
        >
          {/* Hover Menu */}
          <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-[var(--color-border)] p-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onTaskClick(task); }} 
              className="p-1 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
              title="Edit Task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button 
              onClick={handleComplete} 
              className="p-1 text-text-secondary hover:text-success rounded-md hover:bg-success/10 transition-colors"
              title="Mark Completed"
            >
              <CheckCircle2 size={14} />
            </button>
          </div>

          {/* Optional Header Image */}
          {task.photoBase64 && (
            <div className="w-full h-32 border-b border-[var(--color-border)] overflow-hidden">
              <img src={task.photoBase64} alt="Task Thumbnail" className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="p-4 flex flex-col flex-1">
            <h4 className="text-[15px] font-bold text-[#2A2B2F] mb-3 leading-tight tracking-tight">
              {task.content}
            </h4>
            
            {/* Description & Attachment Icons */}
            <div className="flex items-center space-x-4 mb-4 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              <div className="flex items-center space-x-1">
                <Paperclip size={14} />
                <span className="text-xs font-bold">{task.photoBase64 ? '1' : '0'}</span>
              </div>
            </div>
            
            {/* Footer Row */}
            <div className="flex justify-between items-center mt-auto">
              {/* Assignee Avatar */}
              {assignee ? (
                <img 
                  src={avatarUrl} 
                  alt={assignee.name || assignee.email} 
                  title={assignee.name || assignee.email}
                  className="w-7 h-7 rounded-full shadow-sm"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#4F6370] text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                  -
                </div>
              )}

              {/* Status Row Icons */}
              <div className="flex items-center space-x-2">
                <div className="p-1 border border-gray-200 rounded text-gray-400 flex items-center justify-center">
                  <Calendar size={14} />
                </div>
                
                {task.priority && (
                  <div className={`flex items-center border border-gray-200 rounded px-2 py-1 ${getPriorityColor(task.priority)}`}>
                    <Flag size={12} className="mr-1.5" />
                    <span className="text-xs font-bold">{task.priority}</span>
                  </div>
                )}
                
                <div className="p-1 border border-gray-200 rounded text-gray-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}