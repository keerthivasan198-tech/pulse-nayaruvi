import React from 'react';
import { Calendar, Flag, User, CheckCircle2, MessageSquare, Paperclip } from 'lucide-react';

export default function TaskListView({ tasks, columns, onTaskClick, projectMembers = [] }) {
  // Group tasks by column
  const groupedTasks = columns.map(colId => {
    return {
      id: colId,
      title: colId.replace('col-', '').replace('-', ' ').toUpperCase(),
      tasks: tasks.filter(t => t.status === colId)
    };
  });

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return 'text-danger bg-danger/10';
      case 'High': return 'text-warning bg-warning/10';
      case 'Low': return 'text-success bg-success/10';
      default: return 'text-text-secondary bg-slate-800/50';
    }
  };

  return (
    <div className="w-full bg-surface border border-[var(--color-border)] rounded-[16px] shadow-sm overflow-hidden">
      
      {/* Header Row */}
      <div className="flex items-center px-6 py-4 border-b border-[var(--color-border)] bg-[#F8FAFC]">
        <div className="w-[45%] text-xs font-bold text-text-secondary uppercase tracking-wider">Name</div>
        <div className="w-[20%] text-xs font-bold text-text-secondary uppercase tracking-wider">Assignee</div>
        <div className="w-[20%] text-xs font-bold text-text-secondary uppercase tracking-wider">Due Date</div>
        <div className="w-[15%] text-xs font-bold text-text-secondary uppercase tracking-wider">Priority</div>
      </div>

      <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
        {groupedTasks.map(group => (
          <div key={group.id} className="mb-2">
            
            {/* Group Header */}
            <div className="px-6 py-3 bg-surface flex items-center">
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md mr-2 flex items-center shadow-sm shadow-primary/20">
                {group.title} <span className="ml-2 opacity-80">{group.tasks.length}</span>
              </span>
            </div>

            {/* Task Rows */}
            <div className="space-y-[1px] bg-[var(--color-border)]">
              {group.tasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => onTaskClick(task)}
                  className="flex items-center px-6 py-4 bg-surface hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                >
                  <div className="w-[45%] flex items-center pr-4">
                    <CheckCircle2 size={16} className="text-text-secondary opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all mr-3 shrink-0" />
                    <span className="text-sm font-bold text-text-primary line-clamp-1">{task.content}</span>
                    {task.photoBase64 && <Paperclip size={14} className="text-text-secondary ml-3 shrink-0" />}
                    {task.description && <MessageSquare size={14} className="text-text-secondary ml-2 shrink-0" />}
                  </div>
                  
                  <div className="w-[20%] flex items-center">
                    {task.assigneeId ? (() => {
                      const assignee = projectMembers.find(m => m.uid === task.assigneeId);
                      const avatarUrl = assignee ? `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee.name || assignee.email)}&background=4F6370&color=fff` : null;
                      
                      return assignee ? (
                        <img 
                          src={avatarUrl} 
                          alt={assignee.name || assignee.email} 
                          title={assignee.name || assignee.email}
                          className="w-7 h-7 rounded-full shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] border border-white shadow-sm">
                          -
                        </div>
                      );
                    })() : (
                      <span className="text-xs font-medium text-text-secondary italic">Empty</span>
                    )}
                  </div>

                  <div className="w-[20%] flex items-center">
                    {task.dueDate ? (
                      <span className="text-xs font-bold text-text-secondary flex items-center">
                        <Calendar size={12} className="mr-1" /> {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-text-secondary italic">Empty</span>
                    )}
                  </div>

                  <div className="w-[15%] flex items-center">
                     <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center w-fit ${getPriorityColor(task.priority)}`}>
                        <Flag size={10} className="mr-1" /> {task.priority || 'Normal'}
                     </span>
                  </div>
                </div>
              ))}
              
              {group.tasks.length === 0 && (
                <div className="px-6 py-4 bg-surface text-xs font-medium text-text-secondary italic pl-[52px]">
                  No tasks in this list.
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
