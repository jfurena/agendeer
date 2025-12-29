import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView({ tasks }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: es });
    const endDate = endOfWeek(monthEnd, { locale: es });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getPriorityColor = (p) => {
        if (p === 'low') return 'bg-green-500';
        if (p === 'medium') return 'bg-yellow-400';
        if (p === 'high') return 'bg-red-500';
        return 'bg-gray-300';
    };

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="bg-white rounded-xl shadow-md p-4 animate-fade-in">
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
                    // Find tasks for this day
                    const dayTasks = tasks.filter(task => {
                        if (!task.dueDate) return false;
                        // Handle timezone issues loosely by just comparing YYYY-MM-DD strings if needed, 
                        // strictly parseISO works if format is YYYY-MM-DD
                        return isSameDay(parseISO(task.dueDate), day);
                    });

                    return (
                        <div
                            key={day.toString()}
                            className={`
                min-h-[80px] sm:min-h-[100px] border rounded-lg p-1 sm:p-2 flex flex-col transition-colors
                ${!isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-300' : 'bg-white'}
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
                                        className={`text-[10px] sm:text-xs truncate px-1 py-0.5 rounded text-white ${getPriorityColor(task.priority)} shadow-sm`}
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

            {/* Legend */}
            <div className="flex gap-4 justify-center mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Alta</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Media</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Baja</div>
            </div>
        </div>
    );
}
