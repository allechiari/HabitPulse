import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { getAnalysisData } from "../services/analysisService";

// colori dei grafici, li tengo qui così se voglio cambiare palette lo faccio in un punto solo
const chartColors = {
    habit: "#57b579",
    vice: "#d36f6f",
    tracking: "#6e9be6",
    score: "#5f7168",
    inactive: "#d8c15f"
};

// colori usati nel grafico delle medie principali
const categoryColors = ["#57b579", "#d36f6f", "#6e9be6"];

// converto una data nel formato yyyy-mm-dd richiesto dagli input type="date"
const toInputDate = (date) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate.toISOString().split("T")[0];
};

// data di oggi per inizializzare il filtro finale
const getTodayDate = () => {
    return toInputDate(new Date());
};

// di default apro la pagina con gli ultimi 7 giorni
const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return toInputDate(date);
};

// formato più corto per non occupare troppo spazio sugli assi dei grafici
const formatShortDate = (dateKey) => {
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short"
    });
};

// creo un gruppo vuoto, mi serve quando raggruppo i giorni in settimane o mesi
const createEmptyGroup = (label) => {
    return {
        label,
        habitPercentTotal: 0,
        habitDays: 0,
        vicePercentTotal: 0,
        viceDays: 0,
        balanceScoreTotal: 0,
        activeDays: 0,
        activeActivities: 0,
        trackedActivities: 0,
        inactiveActivities: 0,
        habitPercent: 0,
        vicePercent: 0,
        balanceScore: 0,
        trackingCoverage: 0
    };
};

// sommo un giorno dentro al suo gruppo, ma sempre usando percentuali e non unità miste
const addDayToGroup = (group, day) => {
    if (day.totalHabits > 0) {
        group.habitPercentTotal += day.habitPercent;
        group.habitDays += 1;
    }

    if (day.totalVices > 0) {
        group.vicePercentTotal += day.vicePercent;
        group.viceDays += 1;
    }

    if (day.activeActivities > 0) {
        group.balanceScoreTotal += day.balanceScore;
        group.activeDays += 1;
    }

    group.activeActivities += day.activeActivities;
    group.trackedActivities += day.trackedActivities;
    group.inactiveActivities += day.inactiveActivities;
};

// dopo aver sommato i giorni calcolo le medie del gruppo
const completeGroup = (group) => {
    return {
        ...group,
        habitPercent: group.habitDays > 0
            ? Math.round(group.habitPercentTotal / group.habitDays)
            : 0,
        vicePercent: group.viceDays > 0
            ? Math.round(group.vicePercentTotal / group.viceDays)
            : 0,
        balanceScore: group.activeDays > 0
            ? Math.round(group.balanceScoreTotal / group.activeDays)
            : 0,
        trackingCoverage: group.activeActivities > 0
            ? Math.round((group.trackedActivities / group.activeActivities) * 100)
            : 0
    };
};

// preparo i dati per i grafici: giorno per giorno, oppure raggruppati per settimana/mese
const buildGroupedTrend = (dailyTrend, analysisMode) => {
    if (!dailyTrend || dailyTrend.length == 0) {
        return [];
    }

    if (analysisMode == "week" || analysisMode == "custom") {
        return dailyTrend.map((day) => ({
            ...day,
            label: formatShortDate(day.date)
        }));
    }

    const groupedMap = new Map();

    for (const day of dailyTrend) {
        const date = new Date(`${day.date}T00:00:00`);
        const weekNumber = Math.ceil(date.getDate() / 7);
        const key = analysisMode == "year"
            ? day.monthKey
            : `${day.monthKey}-${weekNumber}`;
        const label = analysisMode == "year"
            ? day.monthShort
            : `${day.monthShort} W${weekNumber}`;

        const group = groupedMap.get(key) || createEmptyGroup(label);
        addDayToGroup(group, day);
        groupedMap.set(key, group);
    }

    return Array.from(groupedMap.values()).map(completeGroup);
};

// divido i giorni per mese, soprattutto per rendere leggibile la vista annuale
const buildMonthSections = (dailyTrend) => {
    const monthMap = new Map();

    for (const day of dailyTrend || []) {
        if (!monthMap.has(day.monthKey)) {
            monthMap.set(day.monthKey, {
                monthKey: day.monthKey,
                monthLabel: day.monthLabel,
                days: []
            });
        }

        monthMap.get(day.monthKey).days.push(day);
    }

    return Array.from(monthMap.values());
};

// scelgo il colore del quadratino calendario in base al risultato del giorno
const getHeatmapClass = (day) => {
    if (day.activeActivities == 0) return "empty";
    if (day.trackedActivities == 0) return "inactive";
    if (day.balanceScore >= 75) return "good";
    if (day.balanceScore >= 45) return "warning";
    return "danger";
};

// testo piccolo per spiegare se una riga riguarda un vizio o una buona abitudine
const getActivityLabel = (activity) => {
    if (activity.type == "vice") {
        return `vizio medio ${activity.averagePercent}%`;
    }

    return `habit media ${activity.averagePercent}%`;
};

function AnalysisPage() {
    const navigate = useNavigate();
    const savedUser = JSON.parse(localStorage.getItem("habitpulseUser"));
    const userId = savedUser?.id || savedUser?._id;

    // stato dei filtri e dei dati della pagina di analisi
    const [analysisMode, setAnalysisMode] = useState("week");
    const [dateFilters, setDateFilters] = useState({
        startDate: getDefaultStartDate(),
        endDate: getTodayDate()
    });
    const [analysisData, setAnalysisData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorBanner, setErrorBanner] = useState("");

    // dati finali da passare ai grafici principali
    const chartData = useMemo(() => {
        if (!analysisData) {
            return [];
        }

        return buildGroupedTrend(analysisData.dailyTrend, analysisMode);
    }, [analysisData, analysisMode]);

    // dati divisi per mese per il calendario/heatmap
    const monthSections = useMemo(() => {
        if (!analysisData) {
            return [];
        }

        return buildMonthSections(analysisData.dailyTrend);
    }, [analysisData]);

    // dati delle barre di riepilogo: habit, vizi e copertura del tracking
    const categoryData = useMemo(() => {
        if (!analysisData) {
            return [];
        }

        return analysisData.categoryComparison;
    }, [analysisData]);

    // chiamo il backend passando le date selezionate
    const loadAnalysisData = useCallback(async () => {
        try {
            if (!userId) {
                navigate("/");
                return;
            }

            setIsLoading(true);
            setErrorBanner("");

            const data = await getAnalysisData(dateFilters.startDate, dateFilters.endDate, userId);
            setAnalysisData(data);
        } catch (error) {
            setErrorBanner(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [dateFilters.startDate, dateFilters.endDate, navigate, userId]);

    // ricarico i dati quando cambia il range delle date
    useEffect(() => {
        loadAnalysisData();
    }, [loadAnalysisData]);

    // cambio manuale delle date, quindi passo in modalità custom
    const handleDateChange = (event) => {
        const { name, value } = event.target;

        setAnalysisMode("custom");
        setDateFilters((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    // pulsanti rapidi settimana / mese / anno
    const handlePresetRange = (mode) => {
        const end = new Date();
        const start = new Date();

        if (mode == "week") {
            start.setDate(end.getDate() - 6);
        }

        if (mode == "month") {
            start.setDate(1);
        }

        if (mode == "year") {
            start.setMonth(0);
            start.setDate(1);
        }

        setAnalysisMode(mode);
        setDateFilters({
            startDate: toInputDate(start),
            endDate: toInputDate(end)
        });
    };

    // variabili comode per non sporcare troppo il jsx sotto
    const summary = analysisData?.summary;
    const hasActiveActivities = summary && summary.totalActiveActivities > 0;

    return (
        <div className="analysis-page">
            {/* NAVBAR uguale alle altre pagine */}
            <header className="dashboard-topbar">
                <div>
                    <span className="brand-tag">HabitPulse</span>
                </div>

                <div className="dashboard-topbar-title">
                    <h1>Analysis</h1>
                </div>

                <div className="dashboard-topbar-actions">
                    <button type="button" className="btn ghost-btn" onClick={() => navigate("/dashboard")}>
                        Back to dashboard
                    </button>

                    <button type="button" className="btn primary-btn" onClick={() => navigate("/profile")}>
                        Profile
                    </button>
                </div>
            </header>

            <main className="analysis-main">
                {/* FILTRI DATE E PRESET */}
                <section className="analysis-filter-panel">
                    <div className="analysis-mode-buttons">
                        <button type="button" className={analysisMode == "week" ? "active" : ""} onClick={() => handlePresetRange("week")}>
                            Settimana
                        </button>
                        <button type="button" className={analysisMode == "month" ? "active" : ""} onClick={() => handlePresetRange("month")}>
                            Mese
                        </button>
                        <button type="button" className={analysisMode == "year" ? "active" : ""} onClick={() => handlePresetRange("year")}>
                            Anno
                        </button>
                    </div>

                    <div className="analysis-date-row">
                        <div className="input-group">
                            <label>Start date</label>
                            <input type="date" name="startDate" value={dateFilters.startDate} onChange={handleDateChange} />
                        </div>

                        <div className="input-group">
                            <label>End date</label>
                            <input type="date" name="endDate" value={dateFilters.endDate} onChange={handleDateChange} />
                        </div>

                        <button type="button" className="btn primary-btn" onClick={loadAnalysisData}>
                            Analizza
                        </button>
                    </div>
                </section>

                {errorBanner && (
                    <div className="banner banner-error">{errorBanner}</div>
                )}

                {/* stati principali della pagina: loading, vuoto oppure grafici */}
                {isLoading ? (
                    <div className="dashboard-empty-state">Loading analysis...</div>
                ) : !hasActiveActivities ? (
                    <div className="dashboard-empty-state">
                        No active habits or vices found for this date range.
                    </div>
                ) : (
                    <>
                        {/* CARD DI RIEPILOGO */}
                        <section className="analysis-summary-grid">
                            <div className="analysis-stat-card">
                                <span>Habit average</span>
                                <strong>{summary.habitAveragePercent}%</strong>
                                <p>Higher is better.</p>
                            </div>

                            <div className="analysis-stat-card">
                                <span>Vice average</span>
                                <strong>{summary.viceAveragePercent}%</strong>
                                <p>Lower is better.</p>
                            </div>

                            <div className="analysis-stat-card">
                                <span>Tracking coverage</span>
                                <strong>{summary.trackingCoverage}%</strong>
                                <p>{summary.totalTrackedActivities} / {summary.totalActiveActivities} expected logs</p>
                            </div>

                            <div className="analysis-stat-card">
                                <span>Inactive days</span>
                                <strong>{summary.inactiveDays}</strong>
                                <p>No activity logged on expected days.</p>
                            </div>
                        </section>

                        {/* GRAFICI PRINCIPALI */}
                        <section className="analysis-chart-grid">
                            <div className="analysis-chart-card wide">
                                <div className="analysis-chart-header">
                                    <h2>Percentuali giornaliere</h2>
                                    <p>Habit alte buone, vizi bassi buoni.</p>
                                </div>

                                <div className="analysis-chart-box">
                                    <ResponsiveContainer width="100%" height={330}>
                                        {/* linea principale: confronto solo percentuale, niente unità diverse mischiate */}
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="label" />
                                            <YAxis domain={[0, 200]} />
                                            <Tooltip />
                                            <Legend />
                                            <ReferenceLine y={100} stroke="#8b9a92" strokeDasharray="4 4" />
                                            <Line type="monotone" dataKey="habitPercent" name="Buone abitudini %" stroke={chartColors.habit} strokeWidth={3} dot={false} />
                                            <Line type="monotone" dataKey="vicePercent" name="Vizi %" stroke={chartColors.vice} strokeWidth={3} dot={false} />
                                            <Line type="monotone" dataKey="trackingCoverage" name="Tracking %" stroke={chartColors.tracking} strokeWidth={2} strokeDasharray="6 4" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="analysis-chart-card">
                                <div className="analysis-chart-header">
                                    <h2>Copertura dati</h2>
                                    <p>Mostra cosa hai segnato e cosa manca.</p>
                                </div>

                                <div className="analysis-chart-box">
                                    <ResponsiveContainer width="100%" height={300}>
                                        {/* barre stacked: attività segnate vs non segnate */}
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="label" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="trackedActivities" name="Segnate" stackId="tracking" fill={chartColors.tracking} radius={[8, 8, 0, 0]} />
                                            <Bar dataKey="inactiveActivities" name="Non segnate" stackId="tracking" fill={chartColors.inactive} radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="analysis-chart-card">
                                <div className="analysis-chart-header">
                                    <h2>Medie principali</h2>
                                    <p>Solo percentuali, nessuna unita mista.</p>
                                </div>

                                <div className="analysis-chart-box">
                                    <ResponsiveContainer width="100%" height={300}>
                                        {/* riepilogo delle tre percentuali più importanti */}
                                        <BarChart data={categoryData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Bar dataKey="value" name="Percentuale" radius={[8, 8, 0, 0]}>
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={entry.name} fill={categoryColors[index] || chartColors.score} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="analysis-chart-card wide">
                                <div className="analysis-chart-header">
                                    <h2>Score per attivita</h2>
                                    <p>Per i vizi lo score sale quando la percentuale resta bassa.</p>
                                </div>

                                <div className="analysis-chart-box">
                                    <ResponsiveContainer width="100%" height={330}>
                                        {/* classifica normalizzata: tutto da 0 a 100 */}
                                        <BarChart data={analysisData.topActivities} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" domain={[0, 100]} />
                                            <YAxis type="category" dataKey="title" width={130} />
                                            <Tooltip />
                                            <Bar dataKey="averageScore" name="Score" fill={chartColors.score} radius={[0, 8, 8, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </section>

                        {/* CALENDARIO / HEATMAP DEL PERIODO */}
                        <section className="analysis-chart-card wide">
                            <div className="analysis-chart-header">
                                <h2>Calendario del periodo</h2>
                                <p>Nel periodo annuale i giorni sono divisi per mese.</p>
                            </div>

                            <div className="analysis-month-grid">
                                {monthSections.map((section) => (
                                    <div key={section.monthKey} className="analysis-month-section">
                                        <h3>{section.monthLabel}</h3>

                                        <div className="analysis-month-days">
                                            {/* ogni quadratino è un giorno, col tooltip posso vedere i dettagli */}
                                            {section.days.map((day) => (
                                                <div
                                                    key={day.date}
                                                    className={`heatmap-cell ${getHeatmapClass(day)}`}
                                                    title={`${day.date} | habit ${day.habitPercent}% | vizi ${day.vicePercent}% | tracking ${day.trackingCoverage}%`}
                                                >
                                                    <span>{day.dayOfMonth}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* LISTE FINALI DI LETTURA RAPIDA */}
                        <section className="analysis-lower-grid">
                            <div className="analysis-chart-card">
                                <div className="analysis-chart-header">
                                    <h2>Da tenere d'occhio</h2>
                                    <p>Score piu basso nel periodo.</p>
                                </div>

                                <div className="analysis-activity-list">
                                    {analysisData.problematicActivities.map((activity) => (
                                        <div key={activity.id} className="analysis-activity-row">
                                            <div>
                                                <strong>{activity.title}</strong>
                                                <span>{getActivityLabel(activity)} - {activity.inactiveDays} inactive days</span>
                                            </div>
                                            <strong>{activity.averageScore}%</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="analysis-chart-card">
                                <div className="analysis-chart-header">
                                    <h2>Best and worst</h2>
                                    <p>Basato sul balance score giornaliero.</p>
                                </div>

                                <div className="analysis-activity-list">
                                    <div className="analysis-activity-row">
                                        <div>
                                            <strong>Best day</strong>
                                            <span>{summary.bestDay ? formatShortDate(summary.bestDay.date) : "No data"}</span>
                                        </div>
                                        <strong>{summary.bestDay ? `${summary.bestDay.balanceScore}%` : "-"}</strong>
                                    </div>

                                    <div className="analysis-activity-row">
                                        <div>
                                            <strong>Worst day</strong>
                                            <span>{summary.worstDay ? formatShortDate(summary.worstDay.date) : "No data"}</span>
                                        </div>
                                        <strong>{summary.worstDay ? `${summary.worstDay.balanceScore}%` : "-"}</strong>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default AnalysisPage;
