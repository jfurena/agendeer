import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { LogOut, Plus, Trash2, Circle, Calendar as CalendarIcon, Archive, RefreshCcw, Pencil, X, Save, List, Grid, Filter, Tag, ArrowUpDown, XCircle, ChevronUp, ChevronDown, Check, Repeat, Settings, MoreVertical } from 'lucide-react';
import TrafficLightPriority from '../components/TrafficLightPriority';
import GoogleCalendarBtn from '../components/GoogleCalendarBtn';
import CalendarView from '../components/CalendarView';
import { format, differenceInDays, parseISO, getDate, isSameMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form inputs
    const [newTask, setNewTask] = useState('');
    const [priority, setPriority] = useState('medium');
    const [date, setDate] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [newTags, setNewTags] = useState([]);
    const [isRecurring, setIsRecurring] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed'
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
    const [showAddForm, setShowAddForm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showReorder, setShowReorder] = useState(false);

    // NEW: Action Menu State
    const [activeActionMenuId, setActiveActionMenuId] = useState(null);

    // Filters & Sort
    const [filterTag, setFilterTag] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [sortBy, setSortBy] = useState('priority');

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editPriority, setEditPriority] = useState('medium');
    const [editTags, setEditTags] = useState([]);
    const [editTagInput, setEditTagInput] = useState('');

    // Reorder State
    const [reorderList, setReorderList] = useState({ high: [], medium: [], low: [] });

    // --- Helpers for Dynamic Priority ---
    const calculateDynamicPriority = (task) => {
        if (!task.recurrence) return task.priority;

        const todayDay = getDate(new Date());
        const base = task.recurrence.basePriority;

        if (base === 'medium') {
            // Yellow (1-15) -> Red (16+)
            return todayDay <= 15 ? 'medium' : 'high';
        }
        if (base === 'low') {
            // Green (1-10) -> Yellow (11-20) -> Red (21+)
            if (todayDay <= 10) return 'low';
            if (todayDay <= 20) return 'medium';
            return 'high';
        }
        return base; // Default fallback
    };

    // --- Effects ---

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'todos'),
            where('uid', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const todosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setTasks(todosData);
            setLoading(false);

            try {
                const now = new Date();
                todosData.forEach(task => {
                    if (task.completed && task.recurrence && task.completedAt) {
                        const completedDate = parseISO(task.completedAt);
                        if (!isSameMonth(completedDate, now) && completedDate < now) {
                            console.log("Resetting recurring task:", task.text);
                            updateDoc(doc(db, 'todos', task.id), {
                                completed: false,
                                completedAt: null
                            }).catch(err => console.error("Error updating doc:", err));
                        }
                    }
                });
            } catch (err) {
                console.error("Error during recurrence reset check:", err);
            }
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Initialize Reorder List when simple list changes or drawer opens
    useEffect(() => {
        if (showReorder) {
            const pendingParams = tasks.filter(t => !t.completed);
            setReorderList({
                high: pendingParams.filter(t => (calculateDynamicPriority(t) === 'high')).sort((a, b) => (a.order || 0) - (b.order || 0)),
                medium: pendingParams.filter(t => (calculateDynamicPriority(t) === 'medium')).sort((a, b) => (a.order || 0) - (b.order || 0)),
                low: pendingParams.filter(t => (calculateDynamicPriority(t) === 'low')).sort((a, b) => (a.order || 0) - (b.order || 0)),
            });
        }
    }, [showReorder, tasks]);

    // Close action menu when clicking outside (simple implementation via global click is tricky in react without refs, 
    // but we can just rely on the 'X' button or toggling another one)

    // --- Helpers ---

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        try {
            const recurrenceData = isRecurring ? {
                type: 'monthly',
                basePriority: priority
            } : null;

            await addDoc(collection(db, 'todos'), {
                text: newTask,
                priority,
                recurrence: recurrenceData, // Save recurrence info
                dueDate: date,
                completed: false,
                createdAt: new Date().toISOString(),
                uid: currentUser.uid,
                tags: newTags,
                tag: newTags[0] || '',
                order: Date.now()
            });
            setNewTask('');
            setPriority('medium');
            setDate('');
            setNewTags([]);
            setIsRecurring(false);
            setShowAddForm(false);
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    const toggleComplete = async (task) => {
        await updateDoc(doc(db, 'todos', task.id), {
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : null
        });
    };

    const deleteTask = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta tarea?')) {
            await deleteDoc(doc(db, 'todos', id));
        }
    };

    const removeAutomation = async (id) => {
        if (window.confirm('¿Quieres eliminar la automatización de esta tarea? Dejará de repetirse mensualmente.')) {
            await updateDoc(doc(db, 'todos', id), {
                recurrence: null
            });
        }
    };

    // Tag Handling
    const handleAddTagInput = (e, isEdit) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = isEdit ? editTagInput.trim() : tagInput.trim();
            const currentTags = isEdit ? editTags : newTags;
            const setTags = isEdit ? setEditTags : setNewTags;
            const setInput = isEdit ? setEditTagInput : setTagInput;

            if (val && !currentTags.includes(val) && currentTags.length < 5) {
                setTags([...currentTags, val]);
                setInput('');
            }
        }
    };

    const removeTag = (tagToRemove, isEdit) => {
        if (isEdit) {
            setEditTags(editTags.filter(t => t !== tagToRemove));
        } else {
            setNewTags(newTags.filter(t => t !== tagToRemove));
        }
    };

    // Edit Logic
    const startEditing = (task) => {
        setEditingId(task.id);
        setActiveActionMenuId(null); // Close menu
        setEditText(task.text);
        setEditDate(task.dueDate || '');
        setEditTags(task.tags || []);
        setEditTagInput('');
        setEditPriority(task.priority || 'medium');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditText('');
        setEditDate('');
        setEditTags([]);
        setEditTagInput('');
        setEditPriority('medium');
    };

    const saveEdit = async (id) => {
        if (!editText.trim()) return;
        await updateDoc(doc(db, 'todos', id), {
            text: editText,
            dueDate: editDate,
            tags: editTags,
            tag: editTags[0] || '',
            priority: editPriority
        });
        setEditingId(null);
    };

    // Reorder Logic
    const moveItem = (group, idx, direction) => {
        const list = [...reorderList[group]];
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= list.length) return;

        const [movedItem] = list.splice(idx, 1);
        list.splice(newIdx, 0, movedItem);

        setReorderList({
            ...reorderList,
            [group]: list
        });
    };

    const saveReorder = async () => {
        // Only updates "visual" order relative to others, dynamic priority is computed
        const batch = writeBatch(db);
        ['high', 'medium', 'low'].forEach(group => {
            reorderList[group].forEach((task, index) => {
                const ref = doc(db, 'todos', task.id);
                batch.update(ref, { order: index });
            });
        });
        await batch.commit();
        setShowReorder(false);
        setSortBy('priority');
    };

    const openReorderHelper = () => {
        setShowReorder(true);
    };

    // Auth
    const handleLogout = () => auth.signOut();

    // Derived State
    const availableTags = useMemo(() => {
        const tags = new Set();
        tasks.forEach(t => t.tags && t.tags.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    }, [tasks]);

    const processedTasks = useMemo(() => {
        let filtered = tasks.filter(t => {
            if (activeTab === 'pending') return !t.completed;
            return t.completed;
        });

        if (filterTag !== 'all') {
            filtered = filtered.filter(t => t.tags && t.tags.includes(filterTag));
        }

        if (filterPriority !== 'all') {
            filtered = filtered.filter(t => calculateDynamicPriority(t) === filterPriority);
        }

        // Sorting
        return filtered.sort((a, b) => {
            if (activeTab === 'completed') {
                return (new Date(b.completedAt || 0)) - (new Date(a.completedAt || 0));
            }

            switch (sortBy) {
                case 'priority':
                    // Use Dynamic Priority for Sorting
                    const pA = calculateDynamicPriority(a);
                    const pB = calculateDynamicPriority(b);
                    const pWeight = { high: 0, medium: 1, low: 2 };

                    if (pWeight[pA] !== pWeight[pB]) {
                        return pWeight[pA] - pWeight[pB];
                    }
                    return (a.order || 0) - (b.order || 0);
                case 'createdAt':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'dueDate':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'alphabetical':
                    return a.text.localeCompare(b.text);
                default:
                    return 0;
            }
        });
    }, [tasks, activeTab, filterTag, filterPriority, sortBy]);

    // NEW: Priority Counts
    const priorityCounts = useMemo(() => {
        const pending = tasks.filter(t => !t.completed);
        return {
            high: pending.filter(t => calculateDynamicPriority(t) === 'high').length,
            medium: pending.filter(t => calculateDynamicPriority(t) === 'medium').length,
            low: pending.filter(t => calculateDynamicPriority(t) === 'low').length
        };
    }, [tasks]);

    // Styling
    const getPriorityColor = (task) => {
        const effectivePriority = calculateDynamicPriority(task);
        if (effectivePriority === 'low') return 'bg-green-50 border-l-4 border-green-500';
        if (effectivePriority === 'medium') return 'bg-yellow-50 border-l-4 border-yellow-400';
        if (effectivePriority === 'high') return 'bg-red-50 border-l-4 border-red-500';
        return 'bg-white border-l-4 border-gray-300';
    };

    const showCalendar = viewMode === 'calendar' && activeTab === 'pending';


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-50">
                <h1 className="text-xl font-bold text-brand-navy flex items-center">
                    <img src="/logo.png" alt="Agendeer Logo" className="h-10 w-auto mr-2 object-contain" />
                    {/* MODIFIED: Always visible */}
                    <span className="tracking-tight uppercase">Agendeer</span>
                </h1>

                {/* NEW: Counters in Navbar */}
                <div className="flex items-center gap-4 flex-1 justify-end">
                    {activeTab === 'pending' && (
                        <div className="flex items-center gap-2 sm:gap-4 mr-2 sm:mr-4">
                            <div className="flex items-center gap-1" title="Prioridad Alta">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs sm:text-sm font-bold text-gray-700">{priorityCounts.high}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Prioridad Media">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-400"></div>
                                <span className="text-xs sm:text-sm font-bold text-gray-700">{priorityCounts.medium}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Prioridad Baja">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                                <span className="text-xs sm:text-sm font-bold text-gray-700">{priorityCounts.low}</span>
                            </div>
                        </div>
                    )}

                    <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-xs sm:text-sm text-gray-600 hidden sm:block max-w-[150px] truncate">{currentUser?.email}</span>
                        <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors p-1" title="Cerrar Sesión">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-4xl mx-auto w-full p-4 relative">

                {/* Main Add Task Modal (No inline counters anymore) */}
                {showAddForm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAddForm(false)}>
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h2 className="text-lg font-semibold text-brand-navy">Nueva Tarea</h2>
                                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAddTask} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="¿Qué tienes pendiente?"
                                    className="w-full text-lg p-3 border-b-2 border-gray-200 focus:border-brand-blue focus:outline-none transition-colors text-gray-700"
                                    value={newTask}
                                    onChange={(e) => setNewTask(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex flex-col gap-4">

                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                        <span className="text-sm font-medium text-gray-500">Prioridad:</span>
                                        <TrafficLightPriority value={priority} onChange={setPriority} />
                                    </div>

                                    {/* RECURRENCE TOGGLE */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="recurring"
                                            checked={isRecurring}
                                            onChange={(e) => setIsRecurring(e.target.checked)}
                                            className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                                        />
                                        <label htmlFor="recurring" className="text-sm text-gray-600 flex items-center gap-1 cursor-pointer select-none">
                                            <Repeat size={16} className={isRecurring ? "text-brand-blue" : "text-gray-400"} />
                                            Repetir Mensualmente
                                        </label>
                                    </div>
                                    {isRecurring && (
                                        <p className="text-xs text-brand-blue bg-blue-50 p-2 rounded">
                                            {priority === 'medium'
                                                ? "Empieza Amarillo, se vuelve Rojo el día 16."
                                                : priority === 'low'
                                                    ? "Verde -> Amarillo (día 11) -> Rojo (día 21)."
                                                    : "Siempre prioridad Alta."}
                                        </p>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 border border-gray-200 rounded p-2">
                                            <Tag size={16} className="text-gray-400" />
                                            <input type="text" placeholder="Agregar etiqueta..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => handleAddTagInput(e, false)} disabled={newTags.length >= 5} className="flex-1 bg-transparent text-sm outline-none" />
                                        </div>
                                        {newTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {newTags.map(tag => (
                                                    <span key={tag} className="inline-flex items-center text-xs bg-brand-light text-brand-navy px-2 py-1 rounded-full">
                                                        {tag}<button type="button" onClick={() => removeTag(tag, false)} className="ml-1 hover:text-red-500">×</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 border border-gray-200 rounded p-2">
                                        <CalendarIcon size={16} className="text-gray-400" />
                                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 bg-transparent text-sm outline-none text-gray-600" />
                                    </div>
                                </div>

                                <button type="submit" disabled={!newTask} className="w-full bg-brand-navy hover:bg-brand-blue text-white py-3 rounded-xl font-medium transition-all shadow-md mt-2 flex items-center justify-center gap-2">
                                    <Plus size={20} /> Agregar Tarea
                                </button>
                            </form>
                        </div>
                    </div>
                )}


                {/* Controls */}
                {!showReorder && (
                    <div className="flex flex-col gap-4 mb-6 sticky top-[72px] z-40 bg-gray-50 py-2">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-full sm:w-fit shadow-inner">
                                <button onClick={() => { setActiveTab('pending'); setViewMode('list'); }} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Pendientes</button>
                                <button onClick={() => { setActiveTab('completed'); setViewMode('list'); }} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'completed' ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                    <Archive size={16} className="mr-1" /> Papelera
                                </button>
                            </div>

                            {activeTab === 'pending' && (
                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                    <button onClick={openReorderHelper} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white text-gray-600 hover:bg-gray-100 shadow-sm transition-all border border-gray-200" title="Organizar Prioridades">
                                        <ArrowUpDown size={18} />
                                        <span className="hidden sm:inline text-sm font-medium">Organizar</span>
                                    </button>

                                    <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all border ${showFilters || filterTag !== 'all' || filterPriority !== 'all' ? 'bg-brand-light text-brand-navy border-blue-200' : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-200 shadow-sm'}`}>
                                        <Filter size={18} /> <span className="hidden sm:inline text-sm font-medium">Filtros</span>
                                    </button>

                                    <div className="flex bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
                                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-gray-100 text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}><List size={20} /></button>
                                        <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded transition-all ${viewMode === 'calendar' ? 'bg-gray-100 text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}><Grid size={20} /></button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filter Menu */}
                        {showFilters && activeTab === 'pending' && (
                            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col sm:flex-row gap-4 animate-fade-in">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Ordenar por</label>
                                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm focus:border-brand-blue outline-none">
                                        <option value="priority">Prioridad (Configurada)</option>
                                        <option value="createdAt">Creación (Nuevos primero)</option>
                                        <option value="dueDate">Fecha de Vencimiento</option>
                                        <option value="alphabetical">Alfabético (A-Z)</option>
                                    </select>
                                </div>
                                <div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Filtrar por Etiqueta</label><select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm focus:border-brand-blue outline-none"><option value="all">Todas las etiquetas</option>{availableTags.map(tag => (<option key={tag} value={tag}>{tag}</option>))}</select></div>
                                <div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Filtrar por Prioridad</label><select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm focus:border-brand-blue outline-none"><option value="all">Todas las prioridades</option><option value="high">Alta 🔴</option><option value="medium">Media 🟡</option><option value="low">Baja 🟢</option></select></div>
                                <div className="flex items-end"><button onClick={() => { setSortBy('priority'); setFilterTag('all'); setFilterPriority('all'); }} className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded transition-colors w-full sm:w-auto">Limpiar</button></div>
                            </div>
                        )}
                    </div>
                )}

                {/* Reorder Drawer - Unchanged */}
                {showReorder && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-brand-light">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-lg font-bold text-brand-navy flex items-center">
                                <ArrowUpDown size={20} className="mr-2 text-brand-blue" />
                                Organizar Prioridades
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowReorder(false)} className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                                <button onClick={saveReorder} className="px-4 py-1 bg-brand-navy text-white rounded hover:bg-brand-blue flex items-center shadow-md transition-colors">
                                    <Check size={16} className="mr-1" /> Guardar Orden
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {['high', 'medium', 'low'].map(group => (
                                <div key={group} className="bg-gray-50 rounded-lg p-3">
                                    <h3 className="text-sm font-bold uppercase text-gray-500 mb-2 flex items-center">
                                        <div className={`w-3 h-3 rounded-full mr-2 ${group === 'high' ? 'bg-red-500' : group === 'medium' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                                        {group === 'high' ? 'Alta' : group === 'medium' ? 'Media' : 'Baja'}
                                    </h3>
                                    {reorderList[group].length === 0 ? (
                                        <p className="text-xs text-gray-400 italic pl-5">Sin tareas</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {reorderList[group].map((task, idx) => (
                                                <div key={task.id} className="flex items-center bg-white p-2 rounded shadow-sm border border-gray-100">
                                                    <div className="flex flex-col mr-3 gap-1">
                                                        <button onClick={() => moveItem(group, idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp size={16} /></button>
                                                        <button onClick={() => moveItem(group, idx, 'down')} disabled={idx === reorderList[group].length - 1} className="text-gray-400 hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown size={16} /></button>
                                                    </div>
                                                    <span className="text-sm text-gray-700 truncate">{task.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Normal Content Area */}
                {loading ? (
                    <p className="text-center text-gray-500 py-8">Cargando tareas...</p>
                ) : showCalendar ? (
                    <CalendarView tasks={processedTasks} />
                ) : !showReorder && (
                    /* Task List View */
                    <div className="space-y-3 pb-8">
                        {processedTasks.length === 0 ? (
                            <div className="text-center py-10 opacity-50 bg-white rounded-lg shadow-sm border border-dashed border-gray-300">
                                <p className="text-4xl mb-2">{activeTab === 'pending' ? '🔍' : '🗑️'}</p>
                                <p className="text-gray-500">{activeTab === 'pending' ? 'Sin tareas visibles.' : 'Papelera vacía.'}</p>
                            </div>
                        ) : (
                            processedTasks.map(task => (
                                <div key={task.id} className={`p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-start justify-between group transition-all hover:shadow-md ${task.completed ? 'bg-gray-100 opacity-75' : getPriorityColor(task)}`}>
                                    <div className="flex items-start sm:items-center gap-3 flex-1 w-full relative">
                                        <button onClick={() => toggleComplete(task)} className={`mt-1 sm:mt-0 transition-colors ${task.completed ? 'text-green-500' : 'text-gray-400 hover:text-brand-blue'}`} disabled={editingId === task.id}>{task.completed ? <RefreshCcw size={24} /> : <Circle size={24} />}</button>
                                        <div className="flex-1 w-full min-w-0 pr-8 sm:pr-0">
                                            {editingId === task.id ? (
                                                <div className="flex flex-col gap-3 w-full mr-2">
                                                    <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full p-2 bg-white/50 border-b-2 border-brand-blue outline-none text-lg text-gray-800 rounded-t" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(task.id); if (e.key === 'Escape') cancelEditing(); }} />

                                                    {/* NEW: Priority Editor inside Edit Mode */}
                                                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                                        <TrafficLightPriority value={editPriority} onChange={setEditPriority} />
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded border border-gray-200"><CalendarIcon size={14} className="text-gray-400" /><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-transparent outline-none text-sm text-gray-600" /></div>
                                                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                                                            <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded border border-gray-200 w-full sm:w-auto"><Tag size={14} className="text-gray-400" /><input type="text" placeholder="Máx 5" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)} onKeyDown={(e) => handleAddTagInput(e, true)} disabled={editTags.length >= 5} className="bg-transparent outline-none text-sm text-gray-600 w-full sm:w-28 disabled:cursor-not-allowed" /></div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {editTags.map(tag => (<span key={tag} className="inline-flex items-center text-[10px] bg-white text-brand-navy px-1.5 py-0.5 rounded-full border border-gray-200">{tag}<button onClick={() => removeTag(tag, true)} className="ml-1 hover:text-red-500">×</button></span>))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    {/* Title & Loop Icon */}
                                                    <div className="flex items-start gap-2 pr-4 sm:pr-0">
                                                        <p className={`text-lg transition-all break-words leading-tight ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.text}</p>
                                                        {task.recurrence && activeTab === 'pending' && <Repeat size={14} className="text-brand-blue mt-1.5 flex-shrink-0" title="Se repite mensualmente" />}
                                                    </div>

                                                    {/* Tags Row */}
                                                    {task.tags && task.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-0.5">{task.tags.map(tag => (<span key={tag} onClick={() => activeTab === 'pending' && !editingId && setFilterTag(tag)} className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/60 text-brand-navy border border-black/5 ${activeTab === 'pending' && !editingId ? 'cursor-pointer hover:bg-white' : ''}`}># {tag}</span>))}</div>
                                                    )}
                                                </div>
                                            )}
                                            {!editingId && (
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
                                                    {task.dueDate && <span className="flex items-center text-orange-600 bg-orange-50 px-2 py-0.5 rounded"><CalendarIcon size={12} className="mr-1" />{format(new Date(task.dueDate), 'dd MMM yyyy', { locale: es })}</span>}
                                                    {!task.completed && task.dueDate && <div className="hidden sm:block"><GoogleCalendarBtn title={task.text} date={task.dueDate} /></div>}
                                                    {task.completed && task.completedAt && <span className="text-gray-400 italic">Borrado automático en {30 - differenceInDays(new Date(), parseISO(task.completedAt))} días</span>}
                                                </div>
                                            )}
                                            {!task.completed && task.dueDate && !editingId && <div className="sm:hidden mt-2"><GoogleCalendarBtn title={task.text} date={task.dueDate} /></div>}
                                        </div>
                                    </div>

                                    {/* Actions: Replaced logic with Settings Menu */}
                                    <div className="flex items-center justify-end w-auto mt-0 sm:mt-0 gap-1 absolute top-4 right-2 sm:static">
                                        {editingId === task.id ? (
                                            <div className="flex items-center gap-2 w-full justify-end">
                                                <button onClick={() => saveEdit(task.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center"><Save size={18} /></button>
                                                <button onClick={cancelEditing} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center"><X size={18} /></button>
                                            </div>
                                        ) : (
                                            /* NEW ACTION MENU LOGIC */
                                            (!task.completed || activeTab === 'completed') && (
                                                <div className="relative">
                                                    {activeActionMenuId === task.id ? (
                                                        /* Expanded Menu */
                                                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-md border border-gray-200 animate-fade-in absolute right-0 -top-1 sm:-top-1.5 z-10 w-max">

                                                            {/* Automation - Only if recurring */}
                                                            {task.recurrence && !task.completed && (
                                                                <button onClick={() => removeAutomation(task.id)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-full" title="Configurar"><Settings size={18} /></button>
                                                            )}

                                                            {/* Edit - Only if pending */}
                                                            {!task.completed && (
                                                                <button onClick={() => startEditing(task)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full" title="Editar"><Pencil size={18} /></button>
                                                            )}

                                                            {/* Delete - Always */}
                                                            <button onClick={() => deleteTask(task.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Eliminar"><Trash2 size={18} /></button>

                                                            {/* Close Menu */}
                                                            <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                                            <button onClick={() => setActiveActionMenuId(null)} className="p-1 px-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        /* Settings Trigger Icon */
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(activeActionMenuId === task.id ? null : task.id); }}
                                                            className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-blue rounded-full transition-colors"
                                                        >
                                                            <Settings size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Fixed FAB for Universal Access */}
                {activeTab === 'pending' && !showAddForm && !showReorder && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-navy text-white rounded-full shadow-xl flex items-center justify-center z-50 hover:scale-110 transition-transform"
                    >
                        <Plus size={32} />
                    </button>
                )}
            </main>
        </div>
    );
}
