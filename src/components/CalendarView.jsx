import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

export default function CalendarView({ tasks }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null); // NEW: For modal

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: es });
    const endDate = endOfWeek(monthEnd, { locale: es });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getPriorityColor = (t) => {
        // Fallback or re-calc if needed. Dashboard passes tasks already processed, but color logic might need urgency
        // For simplicity, we just check priority field which Dashboard updates/passes.
        // If dynamic priority is computed in Dashboard 'processedTasks' but not saved to DB field 'priority',
        // we might see base priority here unless tasks prop has calculated fields. 
        // Dashboard's 'processedTasks' does NOT mutate objects to add 'effectivePriority'.
        // FIX: Dashboard should probably pass a getPriorityColor fn or we replicate logic.
        // For now, let's assume standard priority field is what we visualize unless we replicate dynamic logic.
        // Replicating simple checks:
        if (t.recurrence) {
            // We can't access calculateDynamicPriority here easily without duplicating.
            // However, Dashboard.jsx passed 'processedTasks'. 
            // Let's assume for Calendar visual we rely on the base 'priority' or we need to duplicate logic?
            // The user visual requirement is critical. Let's duplicte the light-weight logic or simpler:
            // use the className passed? No, tasks is raw data usually.
            // Let's replicate simple dyamic logic for visual consistency:
            const todayDay = new Date().getDate(); // approximate for 'today' view
            const base = t.recurrence.basePriority;
            if (base === 'medium') return todayDay <= 15 ? 'bg-yellow-400' : 'bg-red-500';
            if (base === 'low') {
                if (todayDay <= 10) return 'bg-green-500';
                if (todayDay <= 20) return 'bg-yellow-400';
                return 'bg-red-500';
            }
        }

        const p = t.priority;
        if (p === 'low') return 'bg-green-500';
        if (p === 'medium') return 'bg-yellow-400';
        if (p === 'high') return 'bg-red-500';
        return 'bg-gray-300';
    };

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Get tasks for selected day
    const selectedDayTasks = selectedDay
        ? tasks.filter(task => task.dueDate && isSameDay(parseISO(task.dueDate), selectedDay))
        : [];

    return (
        <div className="bg-white rounded-xl shadow-md p-4 animate-fade-in relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold text-gray-800 capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 lg:gap-2">
                {calendarDays.map((day) => {
                    const dayTasks = tasks.filter(task => {
                        if (!task.dueDate) return false;
                        return isSameDay(parseISO(task.dueDate), day);
                    });

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => setSelectedDay(day)}
                            className={`
                min-h-[80px] sm:min-h-[100px] border rounded-lg p-1 sm:p-2 flex flex-col transition-all cursor-pointer hover:shadow-md
                ${!isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-300' : 'bg-white hover:border-brand-blue/50'}
                ${isToday(day) ? 'ring-2 ring-brand-blue ring-offset-1 z-10' : 'border-gray-100'}
              `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-brand-blue text-white' : ''}`}>
                                    {format(day, 'd')}
                                </span>
                                {dayTasks.length > 0 && (
                                    <span className="text-[10px] bg-brand-light text-brand-navy px-1.5 rounded-full font-bold sm:inline hidden">
                                        {dayTasks.length}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 mt-1 overflow-y-auto custom-scrollbar space-y-1">
                                {dayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`text-[10px] sm:text-xs truncate px-1 py-0.5 rounded text-white ${getPriorityColor(task)} shadow-sm`}
                                        title={task.text}
                                    >
                                        {task.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Day Detail Modal */}
            {selectedDay && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedDay(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-brand-navy p-4 flex justify-between items-center text-white">
                            <h3 className="text-lg font-bold flex items-center capitalize">
                                <Clock size={20} className="mr-2" />
                                {format(selectedDay, 'EEEE d, MMMM', { locale: es })}
                            </h3>
                            <button onClick={() => setSelectedDay(null)} className="text-white/80 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {selectedDayTasks.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <p>No tienes tareas para este día.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDayTasks.map(task => (
                                        <div key={task.id} className="flex items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <div className={`w-3 h-3 rounded-full mt-1.5 mr-3 flex-shrink-0 ${getPriorityColor(task)}`}></div>
                                            <div>
                                                <p className="text-gray-800 font-medium text-sm">{task.text}</p>
                                                {task.tags && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {task.tags.map(tag => (
                                                            <span key={tag} className="text-[10px] bg-white border border-gray-200 px-1.5 rounded text-gray-500">#{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 justify-center mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Alta</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Media</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Baja</div>
            </div>
        </div>
    );
}
