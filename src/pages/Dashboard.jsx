import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { LogOut, Plus, Trash2, Circle, Calendar as CalendarIcon, Archive, RefreshCcw, Pencil, X, Save, List, Grid, Filter, Tag, ArrowUpDown, XCircle, ChevronUp, ChevronDown, Check } from 'lucide-react';
import TrafficLightPriority from '../components/TrafficLightPriority';
import GoogleCalendarBtn from '../components/GoogleCalendarBtn';
import CalendarView from '../components/CalendarView';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState([]);

    // New Task Form State
    const [newTask, setNewTask] = useState('');
    const [priority, setPriority] = useState('medium');
    const [date, setDate] = useState('');
    const [newTags, setNewTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    const [loading, setLoading] = useState(true);

    // View & Filter States
    const [activeTab, setActiveTab] = useState('pending');
    const [viewMode, setViewMode] = useState('list');
    const [showFilters, setShowFilters] = useState(false);
    const [showReorder, setShowReorder] = useState(false); // New: Toggle Reorder Mode/Modal

    // Filter Options - CHANGED DEFAULT TO PRIORITY
    const [sortBy, setSortBy] = useState('priority');
    const [filterTag, setFilterTag] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');

    // Editing state
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editTags, setEditTags] = useState([]);
    const [editTagInput, setEditTagInput] = useState('');

    // Reorder State
    const [reorderList, setReorderList] = useState({ high: [], medium: [], low: [] });

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'todos'),
            where('userId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskList = snapshot.docs.map(doc => {
                const data = doc.data();
                let tags = data.tags || [];
                if (data.tag && tags.length === 0) tags = [data.tag];

                return {
                    id: doc.id,
                    ...data,
                    tags: tags,
                    // Ensure order field exists, default to 0 if missing (older tasks)
                    order: typeof data.order === 'number' ? data.order : 0
                };
            });
            setTasks(taskList);
            cleanupExpiredTasks(taskList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Derived State: Process tasks
    const processedTasks = useMemo(() => {
        let result = tasks;

        if (activeTab === 'pending') result = result.filter(t => !t.completed);
        else result = result.filter(t => t.completed);

        if (filterTag !== 'all') {
            result = result.filter(t => t.tags && t.tags.includes(filterTag));
        }

        if (filterPriority !== 'all') {
            result = result.filter(t => t.priority === filterPriority);
        }

        result.sort((a, b) => {
            switch (sortBy) {
                case 'alphabetical':
                    return a.text.localeCompare(b.text);
                case 'dueDate':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return a.dueDate.localeCompare(b.dueDate);
                case 'priority':
                    // Sort by Priority Group first
                    const pVal = { high: 3, medium: 2, low: 1 };
                    const pDiff = (pVal[b.priority] || 0) - (pVal[a.priority] || 0);
                    if (pDiff !== 0) return pDiff;

                    // Then by Custom Order (Ascending: 0 is top, 1 is next...)
                    // If orders are equal (e.g. 0), fallback to creation date (newest first)
                    if (a.order !== b.order) return a.order - b.order;

                    const dateA = a.createdAt || '';
                    const dateB = b.createdAt || '';
                    return dateB.localeCompare(dateA);

                case 'createdAt':
                default:
                    const dA = a.createdAt || '';
                    const dB = b.createdAt || '';
                    return dB.localeCompare(dA);
            }
        });

        return result;
    }, [tasks, activeTab, filterTag, filterPriority, sortBy]);

    const availableTags = useMemo(() => {
        const allTags = tasks.flatMap(t => t.tags || []);
        const uniqueTags = new Set(allTags.filter(Boolean));
        return Array.from(uniqueTags).sort();
    }, [tasks]);

    const cleanupExpiredTasks = async (taskList) => {
        // ... (same as before)
        const now = new Date();
        const batch = writeBatch(db);
        let hasDeletions = false;
        taskList.forEach(task => {
            if (task.completed && task.completedAt) {
                if (differenceInDays(now, parseISO(task.completedAt)) > 30) {
                    batch.delete(doc(db, 'todos', task.id));
                    hasDeletions = true;
                }
            }
        });
        if (hasDeletions) try { await batch.commit(); } catch (e) { }
    };

    const handleAddTagInput = (e, isEdit = false) => {
        // ... (same logic)
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = isEdit ? editTagInput.trim() : tagInput.trim();
            const currentList = isEdit ? editTags : newTags;
            if (val && currentList.length < 5 && !currentList.includes(val)) {
                isEdit ? setEditTags([...editTags, val]) : setNewTags([...newTags, val]);
                isEdit ? setEditTagInput('') : setTagInput('');
            }
        }
    };

    const removeTag = (tagToRemove, isEdit = false) => {
        // ... (same logic)
        isEdit ? setEditTags(editTags.filter(t => t !== tagToRemove)) : setNewTags(newTags.filter(t => t !== tagToRemove));
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        // Use a simplified epoch as default order so new tasks appear at the end or start?
        // Request implies manual ordering, so we just give it a default.
        // Let's give it Date.now() so it's conceptually "last" if we sort ASC.
        const order = Date.now();

        await addDoc(collection(db, 'todos'), {
            text: newTask,
            priority,
            dueDate: date,
            tags: newTags,
            tag: newTags[0] || '',
            completed: false,
            completedAt: null,
            userId: currentUser.uid,
            createdAt: new Date().toISOString(),
            order
        });

        setNewTask('');
        setPriority('medium');
        setDate('');
        setNewTags([]);
        setTagInput('');
    };

    // ... (toggleComplete, deleteTask, editing functions same as before)
    const toggleComplete = async (task) => {
        const isCompleting = !task.completed;
        await updateDoc(doc(db, 'todos', task.id), { completed: isCompleting, completedAt: isCompleting ? new Date().toISOString() : null });
    };
    const deleteTask = async (id) => { if (window.confirm('Eliminar?')) await deleteDoc(doc(db, 'todos', id)); };
    const startEditing = (task) => { setEditingId(task.id); setEditText(task.text); setEditDate(task.dueDate || ''); setEditTags(task.tags || []); setEditTagInput(''); };
    const cancelEditing = () => { setEditingId(null); setEditText(''); setEditDate(''); setEditTags([]); setEditTagInput(''); };
    const saveEdit = async (id) => { if (!editText.trim()) return; await updateDoc(doc(db, 'todos', id), { text: editText, dueDate: editDate, tags: editTags, tag: editTags[0] || '' }); setEditingId(null); };
    const handleLogout = () => auth.signOut();

    // --- Reorder Logic ---
    const openReorderHelper = () => {
        // Group current pending tasks by priority
        const pending = tasks.filter(t => !t.completed);

        // Sort them by their current order value first to respect current state
        const sortFn = (a, b) => (a.order || 0) - (b.order || 0);

        setReorderList({
            high: pending.filter(t => t.priority === 'high').sort(sortFn),
            medium: pending.filter(t => t.priority === 'medium').sort(sortFn),
            low: pending.filter(t => t.priority === 'low').sort(sortFn),
        });
        setShowReorder(true);
    };

    const moveItem = (priorityGroup, index, direction) => {
        const list = [...reorderList[priorityGroup]];
        if (direction === 'up' && index > 0) {
            [list[index], list[index - 1]] = [list[index - 1], list[index]];
        } else if (direction === 'down' && index < list.length - 1) {
            [list[index], list[index + 1]] = [list[index + 1], list[index]];
        }
        setReorderList({ ...reorderList, [priorityGroup]: list });
    };

    const saveReorder = async () => {
        setLoading(true);
        const batch = writeBatch(db);

        // Assign new order values based on index
        // We can use a simple index relative to the group, but we want global priority.
        // Easiest is to keep them independent: Priority High is always above Medium.
        // So the absolute 'order' value determines position WITHIN the priority group.

        ['high', 'medium', 'low'].forEach(p => {
            reorderList[p].forEach((task, index) => {
                const ref = doc(db, 'todos', task.id);
                batch.update(ref, { order: index });
            });
        });

        try {
            await batch.commit();
            setShowReorder(false);
        } catch (e) {
            console.error("Error saving order:", e);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (p) => {
        if (p === 'low') return 'border-l-4 border-green-500';
        if (p === 'medium') return 'border-l-4 border-yellow-400';
        if (p === 'high') return 'border-l-4 border-red-500';
        return 'border-l-4 border-gray-300';
    };

    const showCalendar = viewMode === 'calendar' && activeTab === 'pending';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-brand-navy flex items-center">
                    <img src="/logo.png" alt="Agendeer Logo" className="h-10 w-auto mr-2 object-contain" />
                    <span className="tracking-tight uppercase">Agendeer</span>
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 hidden sm:block">{currentUser?.email}</span>
                    <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors" title="Cerrar Sesión">
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            <main className="flex-1 max-w-4xl mx-auto w-full p-4">

                {/* Input Area */}
                {activeTab === 'pending' && !showReorder && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4 text-brand-navy border-b pb-2">Nueva Tarea</h2>
                        {/* Copy existing form code exactly as before */}
                        <form onSubmit={handleAddTask} className="space-y-4">
                            <input
                                type="text"
                                placeholder="¿Qué tienes pendiente?"
                                className="w-full text-lg p-3 border-b-2 border-gray-200 focus:border-brand-blue focus:outline-none transition-colors text-gray-700"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                            />
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
                                    <TrafficLightPriority value={priority} onChange={setPriority} />
                                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                                        <div className="flex items-center gap-2">
                                            <Tag size={18} className="text-gray-400" />
                                            <input type="text" placeholder={newTags.length >= 5 ? "Max 5 alcanzado" : "Etiqueta + Enter"} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => handleAddTagInput(e, false)} disabled={newTags.length >= 5} className="bg-gray-50 text-sm p-2 rounded-md outline-none border border-transparent focus:border-brand-blue focus:bg-white transition-all w-full sm:w-48 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                                        </div>
                                        {newTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 ml-6">
                                                {newTags.map(tag => (
                                                    <span key={tag} className="inline-flex items-center text-[10px] bg-brand-light text-brand-navy px-1.5 py-0.5 rounded-full border border-blue-100">
                                                        {tag}<button type="button" onClick={() => removeTag(tag, false)} className="ml-1 hover:text-red-500">×</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-end sm:items-center">
                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 border rounded-md text-gray-600 focus:ring-1 focus:ring-brand-blue outline-none w-full sm:w-auto" />
                                    <button type="submit" disabled={!newTask} className="bg-brand-navy hover:bg-brand-blue text-white px-6 py-2 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full sm:w-auto shadow-md hover:shadow-lg">
                                        <Plus size={18} className="mr-1" /> Agregar
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Controls */}
                {!showReorder && (
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-full sm:w-fit">
                                <button onClick={() => { setActiveTab('pending'); setViewMode('list'); }} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Pendientes</button>
                                <button onClick={() => { setActiveTab('completed'); setViewMode('list'); }} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'completed' ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                    <Archive size={16} className="mr-1" /> Papelera
                                </button>
                            </div>

                            {activeTab === 'pending' && (
                                <div className="flex gap-2">
                                    <button onClick={openReorderHelper} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white text-gray-600 hover:bg-gray-100 shadow-sm transition-all" title="Organizar Prioridades">
                                        <ArrowUpDown size={18} />
                                        <span className="hidden sm:inline text-sm font-medium">Organizar</span>
                                    </button>

                                    <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${showFilters || filterTag !== 'all' || filterPriority !== 'all' ? 'bg-brand-light text-brand-navy border border-blue-100' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}>
                                        <Filter size={18} /> <span className="hidden sm:inline text-sm font-medium">Filtros</span>
                                    </button>

                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-brand-navy' : 'text-gray-500 hover:text-gray-700'}`}><List size={20} /></button>
                                        <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-brand-navy' : 'text-gray-500 hover:text-gray-700'}`}><Grid size={20} /></button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filter Menu (Reuse existing code) */}
                        {showFilters && activeTab === 'pending' && (
                            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 flex flex-col sm:flex-row gap-4">
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

                {/* Reorder Drawer - NEW */}
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
                                <div key={task.id} className={`bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between group transition-all hover:shadow-md ${getPriorityColor(task.priority)} ${task.completed ? 'opacity-75 bg-gray-50' : ''}`}>
                                    <div className="flex items-start sm:items-center gap-3 flex-1 w-full">
                                        <button onClick={() => toggleComplete(task)} className={`mt-1 sm:mt-0 transition-colors ${task.completed ? 'text-green-500' : 'text-gray-300 hover:text-brand-blue'}`} disabled={editingId === task.id}>{task.completed ? <RefreshCcw size={24} /> : <Circle size={24} />}</button>
                                        <div className="flex-1 w-full min-w-0">
                                            {editingId === task.id ? (
                                                // Edit Form (Reuse existing)
                                                <div className="flex flex-col gap-2 w-full mr-2">
                                                    <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full p-1 border-b-2 border-brand-blue outline-none text-lg text-gray-800" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(task.id); if (e.key === 'Escape') cancelEditing(); }} />
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded"><CalendarIcon size={14} className="text-gray-400" /><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-transparent outline-none text-sm text-gray-600" /></div>
                                                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                                                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded w-full sm:w-auto"><Tag size={14} className="text-gray-400" /><input type="text" placeholder="Máx 5" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)} onKeyDown={(e) => handleAddTagInput(e, true)} disabled={editTags.length >= 5} className="bg-transparent outline-none text-sm text-gray-600 w-full sm:w-28 disabled:cursor-not-allowed" /></div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {editTags.map(tag => (<span key={tag} className="inline-flex items-center text-[10px] bg-brand-light text-brand-navy px-1.5 py-0.5 rounded-full border border-blue-100">{tag}<button onClick={() => removeTag(tag, true)} className="ml-1 hover:text-red-500">×</button></span>))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Display Logic
                                                <div className="flex flex-col gap-0.5">
                                                    <p className={`text-lg transition-all break-words ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.text}</p>
                                                    {task.tags && task.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">{task.tags.map(tag => (<span key={tag} onClick={() => activeTab === 'pending' && !editingId && setFilterTag(tag)} className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-light text-brand-navy border border-blue-100 ${activeTab === 'pending' && !editingId ? 'cursor-pointer hover:bg-blue-100' : ''}`}># {tag}</span>))}</div>
                                                    )}
                                                </div>
                                            )}
                                            {!editingId && (
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                                                    {task.dueDate && <span className="flex items-center text-orange-600 bg-orange-50 px-2 py-0.5 rounded"><CalendarIcon size={12} className="mr-1" />{format(new Date(task.dueDate), 'dd MMM yyyy', { locale: es })}</span>}
                                                    {!task.completed && task.dueDate && <div className="hidden sm:block"><GoogleCalendarBtn title={task.text} date={task.dueDate} /></div>}
                                                    {task.completed && task.completedAt && <span className="text-gray-400 italic">Borrado automático en {30 - differenceInDays(new Date(), parseISO(task.completedAt))} días</span>}
                                                </div>
                                            )}
                                            {!task.completed && task.dueDate && !editingId && <div className="sm:hidden mt-2"><GoogleCalendarBtn title={task.text} date={task.dueDate} /></div>}
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center justify-end w-full sm:w-auto mt-3 sm:mt-0 border-t sm:border-0 pt-2 sm:pt-0 gap-1">
                                        {editingId === task.id ? (
                                            <div className="flex items-center gap-2 w-full justify-end">
                                                <button onClick={() => saveEdit(task.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center"><Save size={18} /><span className="sm:hidden ml-1 font-medium">Guardar</span></button>
                                                <button onClick={cancelEditing} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center"><X size={18} /><span className="sm:hidden ml-1 font-medium">Cancelar</span></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end w-full sm:w-auto gap-1">
                                                {!task.completed && <button onClick={() => startEditing(task)} className="p-2 text-gray-400 hover:text-brand-blue transition-colors flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Pencil size={18} /><span className="sm:hidden ml-1 text-sm">Editar</span></button>}
                                                <button onClick={() => deleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={18} /><span className="sm:hidden ml-1 text-sm">Eliminar</span></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
