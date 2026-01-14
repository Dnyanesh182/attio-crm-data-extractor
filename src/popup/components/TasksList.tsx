import React, { useState } from 'react';
import type { Task } from '../../shared/types';

interface TasksListProps {
    tasks: Task[];
    onDelete: (id: string) => void;
}

const TasksList: React.FC<TasksListProps> = ({ tasks, onDelete }) => {
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const formatDueDate = (dueDate: string | null): { text: string; isOverdue: boolean } => {
        if (!dueDate) return { text: 'No due date', isOverdue: false };

        const lowerDate = dueDate.toLowerCase();
        if (lowerDate === 'overdue') {
            return { text: 'Overdue', isOverdue: true };
        }

        // Try to parse and compare with today
        try {
            const date = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (date < today) {
                return { text: dueDate, isOverdue: true };
            }
        } catch {
            // Return as-is if parsing fails
        }

        return { text: dueDate, isOverdue: false };
    };

    if (tasks.length === 0) {
        return (
            <div className="empty-state">
                <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h3 className="empty-state-title">No tasks yet</h3>
                <p className="empty-state-text">Navigate to Attio's Tasks view and click "Extract Now"</p>
            </div>
        );
    }

    const handleDelete = (id: string) => {
        if (deleteConfirm === id) {
            onDelete(id);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(id);
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    return (
        <div className="space-y-2 pt-3">
            {tasks.map((task, index) => {
                const dueDateInfo = formatDueDate(task.dueDate);

                return (
                    <div
                        key={task.id}
                        className="card group animate-fadeIn"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            {/* Checkbox & Task Info */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${task.done
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'border-slate-600'
                                    }`}>
                                    {task.done && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className={`font-medium truncate ${task.done ? 'text-slate-400 line-through' : 'text-white'}`}>
                                        {task.title}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm mt-1">
                                        {task.dueDate && (
                                            <span className={dueDateInfo.isOverdue ? 'text-red-400' : 'text-slate-400'}>
                                                📅 {dueDateInfo.text}
                                            </span>
                                        )}
                                        {task.assignee && (
                                            <>
                                                {task.dueDate && <span className="text-slate-600">•</span>}
                                                <span className="text-slate-500 truncate">👤 {task.assignee}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Delete Button */}
                            <button
                                onClick={() => handleDelete(task.id)}
                                className={`btn-danger opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${deleteConfirm === task.id ? 'opacity-100 !bg-red-500/30' : ''
                                    }`}
                                title={deleteConfirm === task.id ? 'Click again to confirm' : 'Delete'}
                            >
                                {deleteConfirm === task.id ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TasksList;
