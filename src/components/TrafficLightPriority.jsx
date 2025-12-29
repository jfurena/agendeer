import React from 'react';

const priorities = [
    { value: 'high', color: 'bg-red-500', selectedColor: 'ring-red-500', label: 'Alta' },
    { value: 'medium', color: 'bg-yellow-400', selectedColor: 'ring-yellow-400', label: 'Media' },
    { value: 'low', color: 'bg-green-500', selectedColor: 'ring-green-500', label: 'Baja' },
];

export default function TrafficLightPriority({ value, onChange }) {
    return (
        <div className="flex space-x-4 items-center">
            <span className="text-gray-700 font-medium mr-2">Prioridad:</span>
            <div className="flex bg-gray-200 p-2 rounded-full space-x-2 shadow-inner">
                {priorities.map((p) => (
                    <button
                        key={p.value}
                        type="button"
                        onClick={() => onChange(p.value)}
                        className={`
              w-8 h-8 rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${p.color}
              ${value === p.value ? `ring-2 ring-offset-2 ${p.selectedColor} scale-110 shadow-lg` : 'opacity-60 hover:opacity-100'}
            `}
                        title={p.label}
                    />
                ))}
            </div>
        </div>
    );
}
