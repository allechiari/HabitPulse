import {
    useCallback,
    useEffect, // questo mi serve per eseguire del codice in automatico quando certe condizioni cambiano
    useMemo, //memorizza un valore così da non doverlo ricalcolare più volente inutilmente
    useRef, //useref mi serve per mantenere un riferimento ad un elemento del dom
    useState // utilizzo la logica a stati cioè valori che possono cambiare nel tempo
} from "react"; 

import { useNavigate } from "react-router-dom"; // per navigare tra pagine

import {
    getHabits,
    createHabit,
    stopHabit,
    updateHabit,
    reorderHabits
} from "../services/habitService";

import {
    getTodayProgress,
    updateProgressCounter,
    updateProgressTarget
} from "../services/progressService";

// questo mi serve per resettare i valori del form e inizializzarli vuoti 
// il form in questione è quello della modal di creazione
const initialHabitForm = { 
    title: "",
    type: "",
    description: "",
    startDate: "",
    endDate: "",
    color: "#4f7cff",
    targetDefault: 1,
    unit: "times"
};

function DashboardPage() {
    const navigate = useNavigate();
    const profileMenuRef = useRef(null); // salvo riferimento del profilo (quando schiaccio sull'icona)

    const savedUser = JSON.parse(localStorage.getItem("habitpulseUser"));
    const userId = savedUser?.id || savedUser?._id;

    // sattui che contengono i dati principali
    const [habits, setHabits] = useState([]);
    const [todayProgress, setTodayProgress] = useState([]);
    const [habitForm, setHabitForm] = useState(initialHabitForm);
    // stati per user intreface 
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [showStoppedActivities, setShowStoppedActivities] = useState(false);
    // stati drag and drop
    const [draggedHabitId, setDraggedHabitId] = useState(null);
    const [dragOverHabitId, setDragOverHabitId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    // stato di modifica
    const [editingHabitId, setEditingHabitId] = useState(null);

    // serve per mostrare la lettera del nome profilo dell'utente (utilizza u se non presente)
    // useMemo mi permette di non doverla ricalcolare se già valorizzata e user non cambia
    const initialLetter = useMemo(() => {
        if (!savedUser?.firstName) return "U";
        return savedUser.firstName.charAt(0).toUpperCase();
    }, [savedUser]);

    //carico i dati (le habit e i loro progress)
    const loadDashboardData = useCallback(async () => {
        try {
            if (!userId) {
                navigate("/");
                return;
            }

            setIsLoading(true);

            const habitsData = await getHabits(showStoppedActivities, userId);
            const progressData = await getTodayProgress(userId);

            // siccome sort modifica la lista, prima copio habitsData e poi ordino per order
            // a.order - b.order fa in modo che se a < b = neg -> a prima di b e viceversa
            const sortedHabits = [...habitsData].sort((a, b) => a.order - b.order);

            setHabits(sortedHabits);
            setTodayProgress(progressData);
        } catch (error) {
            console.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [navigate, showStoppedActivities, userId]);

    // ogni volta che il valore dello stato cambia richiamo la funzione che mi carica i dati
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);


    // questo mi chiude il menu del profilo se clicco fuori dal menu
    // il listener viene aggiunto solo quando lo stato isProfile open è a true
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (!isProfileMenuOpen) return;
            // se il ref è aperto e il click è fuori dal ref allora chiudo il menu
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target))
            {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);

        //rimuovo l'eventlistener
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [isProfileMenuOpen]);

    // logout, rimuovo l'utente salvato e poi torno alla login page
    const handleLogout = () => {
        localStorage.removeItem("habitpulseUser");
        navigate("/");
    };

    // mi serve per aggiornare il valore di habitForm prendendo il campo corretto
    // prev mi contiene il valore dell'habitform al momento in cui scrivo e casmbia il valore
    // soltanto dell'input con il name che prendo dall'eventtarget es: 
    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setHabitForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };


    const handleCreateHabit = async (event) => {
        event.preventDefault(); // non voglio refreshare la pagina
        try {
            // chiamo il service per creare l'habit ma devo castare a null la data fine se non presente e a number il target
            await createHabit({
                ...habitForm,
                userId,
                targetDefault: Number(habitForm.targetDefault),
                endDate: habitForm.endDate || null
            });

            // resrtto il form e chiudo la modal
            setHabitForm(initialHabitForm);
            setIsCreateModalOpen(false);
            // natuiralmente devo ricaricare i valori XD
            await loadDashboardData();
        } catch (error) {
            console.error(error.message);
        }
    };

    // mongodb non è relazionale, ma devo collegare il progresso giornalieto alla sua habit e lo faccio con l'id
    // per evitare errori devo anche controllare che effettivamente sia presente l'id habit nel progresso
    const getTodayProgressForHabit = (habitId) => {
        return todayProgress.find((entry) => entry.habit?._id == habitId);
    };


    const getProgressPercentage = (progressEntry) => {
        // per risultati non validi o target a 0 o minore (non possibile)
        if (!progressEntry || !progressEntry.target || progressEntry.target <= 0) {
            return 0;
        }

        const ratio = (progressEntry.counter / progressEntry.target) * 100;
        return Math.max(0, Math.min(ratio, 100)); // non deve essere sotto a 0 o sopra a 100
    };

    // modifico la classe della progress bar per cambiare il colore
    const getProgressBarClass = (habit, progressEntry) => {
        const percentage = getProgressPercentage(progressEntry);

        if (habit.isStopped || !progressEntry || progressEntry.counter == 0) {
            return "neutral";
        }

        // habit
        if (habit.type == "habit") {
            
            if (percentage < 40) return "danger";
            if (percentage < 75) return "warning";
            return "good";
        }
        

        // vice
        if (percentage < 40) return "good";
        if (percentage < 75) return "warning";
        return "danger";
    };

    // modifico il testo del badge dle progress bar
    const getProgressStatus = (habit, progressEntry) => {

        if (habit.isStopped || !progressEntry || (progressEntry.counter == 0 && habit.type == "habit")) {
            return "No progress yet";
        }

        //habit
        if (habit.type == "habit") {
            return progressEntry.counter >= progressEntry.target
                ? "On target"
                : "Below target";
        }
        //vice
        return progressEntry.counter <= progressEntry.target
            ? "On target"
            : "Above limit";
    };

    // gestisco il cambio del valore del contatore
    const handleCounterChange = async (progressId, value) => {
        const numericValue = Number(value);
        if (numericValue < 0) return;

        try {
            const updatedProgress = await updateProgressCounter(progressId, numericValue, userId);

            // modifico il today progress con il valore restituito dalla api
            setTodayProgress((prev) =>
                prev.map((entry) =>
                    entry._id == progressId ? updatedProgress : entry
                )
            );
        } catch (error) {
            console.error(error.message);
        }
    };

    // modifico il target
    const handleTargetChange = async (habitId, progressId, value) => {
        const numericValue = Number(value);
        if (numericValue <= 0) return;

        try {
            const updatedProgress = await updateProgressTarget(progressId, numericValue, userId);

            // modifico il today progress con il valore restituito dalla api
            setTodayProgress((prev) =>
                prev.map((entry) =>
                    entry._id == progressId ? updatedProgress : entry
                )
            );
            // modifico il target default nella habit
            setHabits((prev) =>
                prev.map((habit) =>
                    habit._id == habitId ? { ...habit, targetDefault: numericValue } : habit
                )
            );
        } catch (error) {
            console.error(error.message);
        }
    };

    // modifico il colore
    const handleColorChange = async (habitId, color) => {
        try {
            const updatedHabit = await updateHabit(habitId, { color }, userId);

            // modifico la abit con il valroe restiutuito dalla api (devo rifare il sort iniziale)
            setHabits((prev) =>
                prev.map((habit) => (habit._id == habitId ? updatedHabit : habit)).sort((a, b) => a.order - b.order)
            );
        } catch (error) {
            console.error(error.message);
        }
    };

    // stoppo una habit
    const handleStopHabit = async (habitId) => {
        try {
            await stopHabit(habitId, userId);
            await loadDashboardData();
        } catch (error) {
            console.error(error.message);
        }
    };

    // inziio il drag, imposto move come tipo di drag, salvol l'id nello stato, salvo lo stato dragging a treu (sto eseguendo il drag)
    //set drag over habit id mi indica su qualke habit sto passando
    const handleDragStart = (event, habitId) => {
        event.dataTransfer.effectAllowed = "move";
        setDraggedHabitId(habitId);
        setIsDragging(true);
        setDragOverHabitId(null);
    };

    //  svuoto gli stati alla fine del drag
    const handleDragEnd = () => {
        setDraggedHabitId(null);
        setDragOverHabitId(null);
        setIsDragging(false);
    };

    // passaggio di quello che sto draggando sopra ad un altra card, aggiorno lo stato
    const handleDragOver = (event, habitId) => {
        event.preventDefault(); // di solito non posso fare il drag sopra un elemento, così invece si
        event.dataTransfer.dropEffect = "move";

        if (draggedHabitId && draggedHabitId != habitId) {
            setDragOverHabitId(habitId);
        }
    };

    // gerstisco il drop ---> targethabitId e l'id della card sopra cui faccio il drop
    const handleDrop = async (targetHabitId) => {
        // controllo nello stato che esista davvero una card draggata o che non stia droppando sopra la card stessa
        if (!draggedHabitId || draggedHabitId == targetHabitId) {
            handleDragEnd();
            return;
        }

        const updatedHabits = [...habits];
        const draggedIndex = updatedHabits.findIndex((h) => h._id == draggedHabitId);
        const targetIndex = updatedHabits.findIndex((h) => h._id == targetHabitId);
        // -1 -> findIndex restituisce che non ha trovato l'id 
        if (draggedIndex == -1 || targetIndex == -1) {
            handleDragEnd();
            return;
        }


        // con il primo splice rimuovo l'elemento e lo salvo in draggeditem con il secondo rimuovo 0 elementi e inserisco quello rimosso prima
        const [draggedItem] = updatedHabits.splice(draggedIndex, 1);
        updatedHabits.splice(targetIndex, 0, draggedItem);

        // ricalcol o il campo order
        const reorderedHabits = updatedHabits.map((habit, index) => ({
            ...habit,
            order: index + 1
        }));

        setHabits(reorderedHabits);
        handleDragEnd();

        try {
            await reorderHabits(
                reorderedHabits.map((habit) => ({
                    id: habit._id,
                    order: habit.order
                })),
                userId
            );

            await loadDashboardData();
        } catch (error) {
            console.error(error.message);
            await loadDashboardData();
        }
    };

    return (
        // TOPBAR | brand       titolo      checkNascosti - add - prof  |
        <div className="dashboard-page">
            <header className="dashboard-topbar">
                <div>
                    <span className="brand-tag">HabitPulse</span>
                </div>

                <div className="dashboard-topbar-title">
                    <h1>Daily Dashboard</h1>
                </div>
                
                <div className="dashboard-topbar-actions">
                    <label className="toggle-switch">
                        <input type="checkbox" checked={showStoppedActivities} onChange={(event) => setShowStoppedActivities(event.target.checked)} />
                        <span className="slider"></span>
                        <span className="toggle-label">Show stopped activities</span>
                    </label>
                    <button type="button" className="btn primary-btn" onClick={() => navigate("/analysis")}>
                        Vai ad analisi
                    </button>
                    {/* apro la modal, setto lo stato in open */}
                    <button type="button" className="btn primary-btn" onClick={() => setIsCreateModalOpen(true)}>
                        Add activity
                    </button>
                    {/* se il menu profilo è chiuso (lo capisco dallo stato) lo chiudo o viceversa */ }
                    <div ref={profileMenuRef}>
                        <button type="button" className="profile-avatar-btn" onClick={() => setIsProfileMenuOpen((prev) => !prev)} >
                            {initialLetter}
                        </button>
                        { /* MENU PROFILO */}
                        {isProfileMenuOpen && (
                            <div className="profile-dropdown">
                                <button type="button" className="profile-dropdown-item" onClick={() => { setIsProfileMenuOpen(false); navigate("/profile");}}>
                                    Profile details
                                </button>
                                <button type="button" className="profile-dropdown-item logout-item" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            {/* DASHBOARD BODY -> caricamento o vuoto o mostro la grid con le mie card */ }
            <main className="dashboard-main">
                {isLoading ? (
                    <div className="dashboard-empty-state">Loading dashboard...</div>
                ) : habits.length == 0 ? (
                    <div className="dashboard-empty-state">
                        No activities yet. Click <strong>Add activity</strong> to create your first one.
                    </div>
                ) : (
                    <div className="activities-grid">
                        {/* per ogni card ciclo attraverso map e dtampo la sua card*/ }
                        {habits.map((habit) => {
                            const progressEntry = getTodayProgressForHabit(habit._id);
                            const progressPercent = getProgressPercentage(progressEntry);
                            const progressBarClass = getProgressBarClass(habit, progressEntry);
                            const statusText = getProgressStatus(habit, progressEntry);
                            const isEditing = editingHabitId == habit._id;

                            return (
                                // è come un div ma con contenuto indipendente a se, viene usato per seo e per semantica, di per se non cambia da un div
                                <article
                                    key={habit._id}
                                    
                                    className={[
                                        "activity-card",
                                        draggedHabitId == habit._id && isDragging ? "dragging" : "",
                                        dragOverHabitId == habit._id ? "drop-target" : "",
                                        habit.isStopped ? "stopped-card" : ""
                                    ].filter(Boolean).join(" ")} //filter boolean rimuove tutti i valori falsi, vuoti o null 

                                    style={{ borderTop: `5px solid ${habit.color}` }} // fa la banda colorata in base al colore scelto
                                    onDragOver={(event) => handleDragOver(event, habit._id)}
                                    onDrop={() => handleDrop(habit._id)}
                                >
                                    <div className="activity-card-header">
                                        <div className="activity-card-header-left">
                                            {/* PULSANTE DRAG AND DROP */ }
                                            <button type="button" className="drag-handle-btn" draggable title="Drag to reorder"
                                                onDragStart={(event) => handleDragStart(event, habit._id)}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <span className="drag-cross-icon">✥</span>
                                            </button>

                                            <div className="activity-card-title-block">
                                                <h3 title={habit.title}>{habit.title}</h3>
                                                <p title={habit.description || "No description provided."}>{habit.description}</p>
                                            </div>
                                        </div>
                                        {/* Badge che mi dice se habit o vice */ }
                                        <span className={`activity-type ${habit.type}`}>{habit.type}</span>
                                    </div>

                                    <div className="activity-card-meta">
                                        <span>
                                            <strong>Start:</strong>{" "}
                                            {new Date(habit.startDate).toLocaleDateString()}
                                        </span>
                                        <span>
                                            <strong>Unit:</strong> {habit.unit}
                                        </span>
                                    </div>

                                    {/* con react non posso mettere più elementi nel retourn del renderinf condizionale quindi uso il tag vuoto per racchiuderli */}
                                    {/* BLOCCO PER PROGRESS BAR */ }
                                    <div className="progress-visual-block">
                                        <div className="progress-visual-top">
                                            <div className={`activity-status-badge ${progressBarClass}`}>
                                                {statusText}
                                            </div>
                                            {!habit.isStopped && (
                                                <span className="progress-percentage-label">
                                                    {Math.round(progressPercent)}%
                                                </span>
                                            )}
                                        </div>

                                        <div className="progress-bar-track">
                                            <div className={`progress-bar-fill ${progressBarClass}`} style={{ width: `${progressPercent}%`}}></div>
                                        </div>
                                    </div>

                                    <div className="activity-card-controls">
                                        {/* INPUT COUNTER */}
                                        <div className="mini-input-box">
                                            <label>Counter</label>
                                            <input type="number" min="0" value={progressEntry ? progressEntry.counter : 0} disabled={!progressEntry || habit.isStopped}
                                                onChange={(event) =>
                                                    progressEntry &&
                                                    handleCounterChange(progressEntry._id, event.target.value)
                                                }
                                            />
                                        </div>
                                        {/* INPUT TARGET */}
                                        <div className="mini-input-box">
                                            <label>Target</label>
                                            <input type="number" min="0.01" value={progressEntry ? progressEntry.target : habit.targetDefault} disabled={!progressEntry || habit.isStopped || !isEditing}
                                                onChange={(event) =>
                                                    progressEntry &&
                                                    handleTargetChange(habit._id, progressEntry._id, event.target.value)
                                                }                                                
                                            />
                                        </div>
                                        {/* INPUT COLOR */}
                                        {isEditing && (
                                            <div className="mini-input-box color-box">
                                                <label>Color</label>
                                                <input type="color" value={habit.color} disabled={habit.isStopped}
                                                    onChange={(event) =>
                                                        handleColorChange(habit._id, event.target.value)
                                                    }                                                    
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="activity-card-footer">
                                        {!habit.isStopped ? (
                                            //edit e stop bottoni
                                            <>
                                                <button type="button" className="btn ghost-btn"
                                                    onClick={() =>
                                                        setEditingHabitId((prev) =>
                                                            prev == habit._id ? null : habit._id
                                                        )
                                                    }
                                                >
                                                    {isEditing ? "Done" : "Edit"}
                                                </button>

                                                <button type="button" className="btn secondary-btn"
                                                    onClick={() => handleStopHabit(habit._id)}
                                                >
                                                    Stop activity
                                                </button>
                                            </>
                                        ) : (
                                            <div className="closed-activity-footer-label">
                                                Closed
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL CREAZIONE habit/vice, form con i campi di creazione*/ }
            {isCreateModalOpen && (
                <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)} > {/*area che racchiude la modal se clicco fuori chgiudo la modal*/ }
                    <div className="modal-card" onClick={(event) => event.stopPropagation()} >
                        <div className="modal-header">
                            <div>
                                <h2>Add new activity</h2>
                                <p>Create a new habit or vice.</p>
                            </div>

                            <button type="button" className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)} >
                                ✕
                            </button>
                        </div>

                        <form className="habit-form" onSubmit={handleCreateHabit}>
                            <div className="input-group">
                                <label>Title</label>
                                <input type="text" name="title" placeholder="e.g. Drink water"
                                    value={habitForm.title}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Type</label>
                                    <select name="type" value={habitForm.type}
                                        onChange={handleFormChange}
                                        required
                                    >
                                        <option value="" disabled hidden>Select one..</option>
                                        <option value="habit">Habit</option>
                                        <option value="vice">Vice</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Daily target</label>
                                    <input type="number" min="0.01" name="targetDefault"
                                        value={habitForm.targetDefault}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea name="description" placeholder="Describe the activity"
                                    value={habitForm.description}
                                    onChange={handleFormChange}
                                />
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Start date</label>
                                    <input type="date" name="startDate"
                                        value={habitForm.startDate}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>End date</label>
                                    <input type="date" name="endDate"
                                        value={habitForm.endDate}
                                        onChange={handleFormChange}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Unit</label>
                                    <input type="text" name="unit" placeholder="e.g. glasses, liters, minutes"
                                        value={habitForm.unit}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </div>
                                <div className="input-group input-group-color">
                                    <label>Color</label>
                                    <div className="color-picker-row">
                                        <input type="color" name="color"
                                            value={habitForm.color}
                                            onChange={handleFormChange}
                                        />
                                        <span className="color-preview-value">{habitForm.color}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn ghost-btn" onClick={() => setIsCreateModalOpen(false)} >
                                    Cancel
                                </button>
                                <button type="submit" className="btn primary-btn">
                                    Create activity
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardPage;
