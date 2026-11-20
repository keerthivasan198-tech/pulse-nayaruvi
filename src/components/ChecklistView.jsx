import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical, Check, Trash2, ListTodo, Globe, UserCheck } from 'lucide-react';
import { 
  subscribeToChecklist, 
  createChecklistItem, 
  updateChecklistItem, 
  deleteChecklistItem,
  subscribeToTasks
} from '../services/firebaseService';
import { auth } from '../firebase';

export default function ChecklistView({ activeWorkspaceId, activeProjectId }) {
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [filterScope, setFilterScope] = useState('all'); // 'all', 'common', 'tasks'

  useEffect(() => {
    if (!activeProjectId) {
      setItems([]);
      setTasks([]);
      return;
    }
    const unsubscribeChecklist = subscribeToChecklist(activeWorkspaceId, activeProjectId, (list) => {
      setItems(list);
    });

    const unsubscribeTasks = subscribeToTasks(activeWorkspaceId, activeProjectId, (taskList) => {
      setTasks(taskList);
    });

    return () => {
      unsubscribeChecklist();
      unsubscribeTasks();
    };
  }, [activeWorkspaceId, activeProjectId]);

  const currentUid = auth.currentUser?.uid;
  const currentEmail = (auth.currentUser?.email || '').toLowerCase().trim();

  // Privacy Rule:
  // 1. Common checklist items: seen by all workspace & project members.
  // 2. Task-specific checklist items: seen ONLY by the person that task is assigned to (and the creator).
  const visibleItems = items.filter(item => {
    const isCommon = item.isCommon || (!item.taskId && !item.assigneeId && !item.assigneeEmail);
    if (isCommon) return true;

    // Check if current user is the task's assignee
    const aId = (item.assigneeId || '').trim();
    const aEmail = (item.assigneeEmail || '').toLowerCase().trim();

    if (currentUid && aId && aId === currentUid) return true;
    if (currentEmail && aEmail && aEmail === currentEmail) return true;

    // Also check if current user is assignee of the referenced task
    if (item.taskId) {
      const parentTask = tasks.find(t => t.id === item.taskId);
      if (parentTask) {
        const pAssigneeId = (parentTask.assigneeId || parentTask.assignee || '').trim();
        const pAssigneeEmail = (parentTask.assigneeEmail || '').toLowerCase().trim();
        if (currentUid && pAssigneeId === currentUid) return true;
        if (currentEmail && pAssigneeEmail === currentEmail) return true;
      }
    }

    // Also allow item creator to view
    if (item.createdBy && item.createdBy === currentUid) return true;

    return false;
  });

  const commonItems = visibleItems.filter(i => i.isCommon || (!i.taskId && !i.assigneeId && !i.assigneeEmail));
  const myTaskItems = visibleItems.filter(i => !(i.isCommon || (!i.taskId && !i.assigneeId && !i.assigneeEmail)));

  let displayedItems = visibleItems;
  if (filterScope === 'common') {
    displayedItems = commonItems;
  } else if (filterScope === 'tasks') {
    displayedItems = myTaskItems;
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const itemsCopy = Array.from(displayedItems);
    const [reorderedItem] = itemsCopy.splice(result.source.index, 1);
    itemsCopy.splice(result.destination.index, 0, reorderedItem);

    try {
      itemsCopy.forEach((item, index) => {
        updateChecklistItem(activeWorkspaceId, activeProjectId, item.id, { order: index });
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async (e) => {
    if ((e.type === 'click' || e.key === 'Enter') && newItemText.trim() && activeProjectId) {
      if (e.preventDefault) e.preventDefault();

      const selectedTask = tasks.find(t => t.id === selectedTaskId);
      const isCommon = !selectedTask;

      const payload = {
        text: newItemText.trim(),
        completed: false,
        order: items.length,
        isCommon: isCommon,
        taskId: selectedTask ? selectedTask.id : '',
        taskTitle: selectedTask ? (selectedTask.content || '') : '',
        assigneeId: selectedTask ? (selectedTask.assigneeId || selectedTask.assignee || '') : '',
        assigneeName: selectedTask ? (selectedTask.assigneeName || '') : '',
        assigneeEmail: selectedTask ? (selectedTask.assigneeEmail || '') : '',
        createdBy: currentUid || ''
      };

      try {
        await createChecklistItem(activeWorkspaceId, activeProjectId, payload);
        setNewItemText('');
      } catch (err) {
        console.error(err);
        alert("Failed to save checklist item: " + err.message);
      }
    }
  };

  const toggleItem = async (id, currentStatus) => {
    try {
      await updateChecklistItem(activeWorkspaceId, activeProjectId, id, {
        completed: !currentStatus
      });
    } catch (err) {
      console.error(err);
    }
  };

  const updateItemText = async (id, newText) => {
    if (!newText.trim()) return;
    try {
      await updateChecklistItem(activeWorkspaceId, activeProjectId, id, {
        text: newText.trim()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = async (id) => {
    try {
      await deleteChecklistItem(activeWorkspaceId, activeProjectId, id);
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = displayedItems.filter(i => i.completed).length;
  const totalCount = displayedItems.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="flex h-full w-full flex-col p-4 md:p-8 bg-background overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight mb-2 uppercase">
            CHECKLIST
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Keep track of deliverables — common for everyone or private to task assignees.
          </p>
        </div>
        
        {/* Progress Card */}
        {activeProjectId && totalCount > 0 && (
          <div className="flex items-center gap-4 bg-surface px-5 py-3 rounded-2xl border border-border shadow-xs">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Progress</span>
              <span className="text-lg font-black text-primary">{progress}%</span>
            </div>
            <div className="w-24 bg-border/40 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-text-secondary">
              {completedCount}/{totalCount}
            </span>
          </div>
        )}
      </div>

      {!activeProjectId ? (
        <div className="celestique-card p-12 text-center flex flex-col items-center justify-center rounded-2xl max-w-xl mx-auto my-auto text-primary">
          <div className="w-16 h-16 rounded-2xl bg-border/20 flex items-center justify-center mb-4">
            <ListTodo size={32} className="text-primary/70" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Project Selected</h3>
          <p className="text-text-secondary text-sm max-w-sm">
            Please select a project from the top navigation to view or create its checklist items.
          </p>
        </div>
      ) : (
        <div className="max-w-3xl w-full mx-auto space-y-5">
          {/* Add New Item Container with Scope Selector */}
          <div className="bg-surface p-3 rounded-2xl border border-border shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input 
                type="text" 
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={handleAddItem}
                placeholder="Add a new checklist item (press Enter)..."
                className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-primary placeholder:text-text-secondary/60 focus:outline-none"
              />

              <button 
                onClick={handleAddItem}
                disabled={!newItemText.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-background rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                Add Item
              </button>
            </div>

            {/* Target Scope Selection */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs">
              <span className="font-semibold text-text-secondary flex items-center gap-1 shrink-0">
                <Globe size={13} />
                Assign Scope:
              </span>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="flex-1 bg-background text-text-primary px-3 py-1.5 rounded-lg border border-border text-xs font-medium focus:outline-none focus:border-primary"
              >
                <option value="">🌐 Common Checklist (Visible to Everyone)</option>
                {tasks.map(t => {
                  const assignee = t.assigneeName || t.assigneeEmail || 'Unassigned';
                  return (
                    <option key={t.id} value={t.id}>
                      📋 Task: {t.content.length > 40 ? t.content.slice(0, 40) + '...' : t.content} (Assignee: {assignee})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Scope Filters */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setFilterScope('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterScope === 'all'
                  ? 'bg-primary text-background'
                  : 'bg-surface text-text-secondary hover:text-primary border border-border'
              }`}
            >
              All Visible ({visibleItems.length})
            </button>
            <button
              onClick={() => setFilterScope('common')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterScope === 'common'
                  ? 'bg-primary text-background'
                  : 'bg-surface text-text-secondary hover:text-primary border border-border'
              }`}
            >
              <Globe size={12} />
              Common ({commonItems.length})
            </button>
            <button
              onClick={() => setFilterScope('tasks')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterScope === 'tasks'
                  ? 'bg-primary text-background'
                  : 'bg-surface text-text-secondary hover:text-primary border border-border'
              }`}
            >
              <UserCheck size={12} />
              My Task Checklist ({myTaskItems.length})
            </button>
          </div>

          {/* Checklist Drag and Drop Container */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="checklist-items">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="space-y-2.5"
                >
                  {displayedItems.length === 0 ? (
                    <div className="celestique-card p-8 text-center rounded-2xl text-text-secondary">
                      <p className="text-sm font-medium">
                        {filterScope === 'tasks' 
                          ? 'No task-specific checklist items assigned to you.'
                          : filterScope === 'common'
                            ? 'No common checklist items yet.'
                            : 'No checklist items yet. Add your first item above!'}
                      </p>
                    </div>
                  ) : (
                    displayedItems.map((item, index) => {
                      const isCommon = item.isCommon || (!item.taskId && !item.assigneeId && !item.assigneeEmail);

                      return (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`group flex flex-col p-3.5 rounded-xl border transition-all ${
                                snapshot.isDragging 
                                  ? 'bg-surface shadow-lg border-primary' 
                                  : 'bg-surface hover:border-border/80 border-border/50 shadow-2xs'
                              } ${item.completed ? 'opacity-65 bg-surface/40' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div {...provided.dragHandleProps} className="text-text-secondary/40 hover:text-text-secondary cursor-grab p-1">
                                    <GripVertical size={16} />
                                  </div>
                                  <button 
                                    onClick={() => toggleItem(item.id, item.completed)}
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                      item.completed 
                                        ? 'bg-primary border-primary text-background' 
                                        : 'border-border hover:border-primary'
                                    }`}
                                  >
                                    {item.completed && <Check size={12} strokeWidth={3} />}
                                  </button>
                                  <input 
                                    type="text" 
                                    defaultValue={item.text}
                                    onBlur={e => updateItemText(item.id, e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.target.blur();
                                      }
                                    }}
                                    className={`flex-1 bg-transparent text-sm font-medium text-primary focus:outline-none focus:bg-background/50 px-2 py-1 rounded transition-colors ${
                                      item.completed ? 'line-through text-text-secondary' : ''
                                    }`}
                                  />
                                </div>
                                <button 
                                  onClick={() => deleteItem(item.id)}
                                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>

                              {/* Scope Badge */}
                              <div className="flex items-center gap-2 mt-2 ml-10">
                                {isCommon ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary/80 bg-primary/8 px-2 py-0.5 rounded-md border border-primary/15">
                                    <Globe size={10} />
                                    Common Checklist (Everyone)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                    <ListTodo size={10} />
                                    Task: {item.taskTitle || 'Assigned Task'} • {item.assigneeName || item.assigneeEmail || 'Assigned'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}
    </div>
  );
}
