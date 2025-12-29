import React from 'react';
import { Calendar } from 'lucide-react';

export default function GoogleCalendarBtn({ title, date }) {
    const handleAddToCalendar = () => {
        if (!date) return;

        // Create dates for Google Calendar URL (basic implementation, assumes 1 hour event)
        const startDate = new Date(date);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

        const formatDate = (d) => {
            return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        };

        const start = formatDate(startDate);
        const end = formatDate(endDate);

        const details = encodeURIComponent("Recordatorio de tarea de Agendeer App");
        const text = encodeURIComponent(title || "Nueva Tarea");

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;

        window.open(url, '_blank');
    };

    return (
        <button
            onClick={handleAddToCalendar}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            title="Agregar a Google Calendar"
        >
            <Calendar size={16} className="mr-1" />
            <span className="hidden sm:inline">Agendar</span>
        </button>
    );
}
