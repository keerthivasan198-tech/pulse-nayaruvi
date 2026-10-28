import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical, Check, Trash2, ListTodo } from 'lucide-react';
import { 
  subscribeToChecklist, 
  createChecklistItem, 
  updateChecklistItem, 
  deleteChecklistItem 
} from '../services/firebaseService';

export default function ChecklistView({ activeWorkspaceId, activeProjectId }) {
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    if (!activeProjectId) {
      setItems([]);
      return;
    }
    const unsubscribe = subscribeToChecklist(activeWorkspaceId, activeProjectId, (list) => {
      setItems(list);
    });
    return () => unsubscribe();
  }, [activeWorkspaceId, activeProjectId]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const itemsCopy = Array.from(items);
    const [reorderedItem] = itemsCopy.splice(result.source.index, 1);
    itemsCopy.splice(result.destination.index, 0, reorderedItem);

    // Update order optimistically
    setItems(itemsCopy);

    // Save to firebase
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
      try {
        await createChecklistItem(activeWorkspaceId, activeProjectId, {
          text: newItemText.trim(),
          completed: false,
          order: items.length
        });
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

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="flex h-full w-full flex-col p-4 md:p-8 bg-background overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight mb-2 uppercase">
            CHECKLIST
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Keep track of micro-tasks and deliverables for this project.
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
        <div className="max-w-3xl w-full mx-auto space-y-6">
          {/* Add New Item Input */}
          <div className="flex items-center gap-2 bg-surface p-2 rounded-2xl border border-border shadow-xs">
            <input 
              type="text" 
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              onKeyDown={handleAddItem}
              placeholder="Add a new checklist item (press Enter)..."
              className="flex-1 bg-transparent px-4 py-2.5 text-sm font-medium text-primary placeholder:text-text-secondary/60 focus:outline-none"
            />
            <button 
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-background rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add
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
                  {items.length === 0 ? (
                    <div className="celestique-card p-8 text-center rounded-2xl text-text-secondary">
                      <p className="text-sm font-medium">No items yet. Add your first item above!</p>
                    </div>
                  ) : (
                    items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                              snapshot.isDragging 
                                ? 'bg-surface shadow-lg border-primary' 
                                : 'bg-surface hover:border-border/80 border-border/50 shadow-2xs'
                            } ${item.completed ? 'opacity-60 bg-surface/40' : ''}`}
                          >
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
                        )}
                      </Draggable>
                    ))
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
