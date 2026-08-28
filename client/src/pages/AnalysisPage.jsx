import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
        ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalysisData } from "../services/analysisService";

// chart colors in one place, so the palette is easy to change
const chartColors = {
    habit: "#57b579",
    vice: "#d36f6f",
    tracking: "#6e9be6",
    score: "#5f7168",
    inactive: "#d8c15f"
};

// colors used by the main avg chart
const categoryColors = ["#57b579", "#d36f6f", "#6e9be6"];

// labels shown in the summary chart
const categoryLabels = ["Habits %", "Vices %", "Tracking %"];

// convert a date into the yyyy-mm-dd format required by input type="date"
const toInputDate = (date) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate.toISOString().split("T")[0];
};

// today's date for the default end filter
const getTodayDate = () => {
    return toInputDate(new Date());
};

// default range: last 7 days
const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return toInputDate(date);
};

// short date used in charts and best/worst rows
const formatShortDate = (dateKey) => {
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short"
    });
};

// short month label used when the chart is grouped
const formatMonthShort = (monthKey) => {
    return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "short"
    });
};

// full month label used in the calendar section
const formatMonthLabel = (monthKey) => {
    return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });
};

// create an empty group for week/month aggregations
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

// add one day to its group, using percentages instead of mixed units
const addDayToGroup = (group, day) => {
    // only days with active items are included in each avg

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

// calculate final averages after all days have been added to the group
const completeGroup = (group) => {
    // keep the totals and add the calculated values used by the charts
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

// build chart data day by day, or grouped by week/month
const buildGroupedTrend = (dailyTrend, analysisMode) => {
    if (!dailyTrend || dailyTrend.length == 0) {
        return [];
    }

    // daily modes keep each day and only format the label
    if (analysisMode == "week" || analysisMode == "custom") {
        return dailyTrend.map((day) => ({ ...day, label: formatShortDate(day.date)}));
    }

    const groupedMap = new Map();
    // year groups by month, while month groups by week inside the month
    for (const day of dailyTrend) {
        const date = new Date(`${day.date}T00:00:00`);
        const weekNumber = Math.ceil(date.getDate() / 7);
        const key = analysisMode == "year" ? day.monthKey : `${day.monthKey}-${weekNumber}`; 
        const monthShort = formatMonthShort(day.monthKey);
        const label = analysisMode == "year" ? monthShort : `${monthShort} W${weekNumber}`;

        // create the group if it does not exist yet, then update it
        const group = groupedMap.get(key) || createEmptyGroup(label);
        addDayToGroup(group, day);
        groupedMap.set(key, group);
    }

    // return a list with final calculated percentages
    return Array.from(groupedMap.values()).map(completeGroup);
};


const buildMonthSections = (dailyTrend) => {
    // Example input shape:
    /*
        dailyTrend = [
            { date: "2026-07-30", monthKey: "2026-07", monthLabel: "July 2026" },
            { date: "2026-08-01", monthKey: "2026-08", monthLabel: "August 2026" },
            { date: "2026-08-02", monthKey: "2026-08", monthLabel: "August 2026" }
        ];
    */
    // group days by monthKey and translate the month label for the UI
    const monthMap = new Map();

    for (const day of dailyTrend || []) {
        if (!monthMap.has(day.monthKey)) {
            monthMap.set(day.monthKey, {
                monthKey: day.monthKey,
                monthLabel: formatMonthLabel(day.monthKey),
                days: []
            });
        }
        monthMap.get(day.monthKey).days.push(day);
    }
    return Array.from(monthMap.values());
};

// choose the calendar cell color from the daily result
const getHeatmapClass = (day) => {
    if (day.activeActivities == 0) return "empty";
    if (day.trackedActivities == 0) return "inactive";
    if (day.balanceScore >= 75) return "good";
    if (day.balanceScore >= 45) return "warning";
    return "danger";
};

// small row label that explains if the item is a vice or a good habit
const getActivityLabel = (activity) => {
    if (activity.type == "vice") {
        return `Vice avg ${activity.averagePercent}%`;
    }

    return `Habit avg ${activity.averagePercent}%`;
};

function AnalysisPage() {
    const navigate = useNavigate();
    const savedUser = JSON.parse(localStorage.getItem("habitpulseUser"));
    const userId = savedUser?.id || savedUser?._id;

    // filters and page data state
    const [analysisMode, setAnalysisMode] = useState("week");
    const [dateFilters, setDateFilters] = useState({startDate: getDefaultStartDate(), endDate: getTodayDate()});
    const [analysisData, setAnalysisData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorBanner, setErrorBanner] = useState("");

    // final data passed to the main charts
    // useMemo keeps the calculated result until analysis data or mode changes
    const chartData = useMemo(() => {
        if (!analysisData) {
            return [];
        }

        return buildGroupedTrend(analysisData.dailyTrend, analysisMode);
    }, [analysisData, analysisMode]);

    // data split by month for the calendar heatmap
    const monthSections = useMemo(() => {
        if (!analysisData) {
            return [];
        }

        return buildMonthSections(analysisData.dailyTrend);
    }, [analysisData]);

    // summary bar data: habits, vices and tracking coverage
    const categoryData = useMemo(() => {
        if (!analysisData) {
            return [];
        }

        return analysisData.categoryComparison.map((item, index) => ({
            ...item,
            name: categoryLabels[index] || item.name
        }));
    }, [analysisData]);

    // load analysis data from the backend with the selected dates
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

    // reload data when the selected date range changes
    useEffect(() => {
        loadAnalysisData();
    }, [loadAnalysisData]);

    // manual date changes switch the page to custom mode
    const handleDateChange = (event) => {
        const { name, value } = event.target;

        setAnalysisMode("custom");
        setDateFilters((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    // quick preset buttons: week / month / year
    const handlePresetRange = (mode) => {
        const end = new Date();
        const start = new Date();

        if (mode == "week") {
            start.setDate(end.getDate() - 6);
        }

        if (mode == "month") {
            start.setDate(1); // start at the first day of the current month
        }

        if (mode == "year") {
            start.setMonth(0);
            start.setDate(1); // start at the first day of January
        }

        setAnalysisMode(mode);
        setDateFilters({
            startDate: toInputDate(start),
            endDate: toInputDate(end)
        });
    };

    // handy variables to keep the JSX below cleaner
    const summary = analysisData?.summary;
    const hasActiveActivities = summary && summary.totalActiveActivities > 0;

    return (
        <div className="analysis-page">
            {/* NAVBAR shared with the other pages */}
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
                {/* DATE FILTERS AND PRESETS */}
                <section className="analysis-filter-panel">
                    <div className="analysis-mode-buttons">
                        <button type="button" className={analysisMode == "week" ? "active" : ""} onClick={() => handlePresetRange("week")}>
                            Week
                        </button>
                        <button type="button" className={analysisMode == "month" ? "active" : ""} onClick={() => handlePresetRange("month")}>
                            Month
                        </button>
                        <button type="button" className={analysisMode == "year" ? "active" : ""} onClick={() => handlePresetRange("year")}>
                            Year
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
                            Analyze
                        </button>
                    </div>
                </section>

                {errorBanner && (
                    <div className="banner banner-error">{errorBanner}</div>
                )}

                {/* main page states: loading, empty or charts */}
                {isLoading ? (
                    <div className="dashboard-empty-state">Loading analysis...</div>
                ) : !hasActiveActivities ? (
                    <div className="dashboard-empty-state">
                        No active habits or vices found for this date range.
                    </div>
                ) : (
                    <>
                        {/* SUMMARY CARDS */}
                        <section className="analysis-summary-grid">
                            <div className="analysis-stat-card">
                                <span>Habit avg</span>
                                <strong>{summary.habitAveragePercent}%</strong>
                            </div>

                            <div className="analysis-stat-card">
                                <span>Vice avg</span>
                                <strong>{summary.viceAveragePercent}%</strong>
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

                        {/* MAIN CHARTS */}
                        <section className="analysis-chart-grid">
                            <div className="analysis-chart-card wide">
                                <div className="analysis-chart-header">
                                    <h2>Daily percentages</h2>
                                </div>

                                {/* Line chart showing habits, vices and tracking over time. */}
                                <div className="analysis-chart-box">
                                    <ResponsiveContainer width="100%" height={330}>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="label" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Legend />
                                            <ReferenceLine y={100} stroke="#8b9a92" strokeDasharray="4 4" />
                                            <Line type="monotone" dataKey="habitPercent" name="Habits %" stroke={chartColors.habit} strokeWidth={3} dot={false} />
                                            <Line type="monotone" dataKey="vicePercent" name="Vices %" stroke={chartColors.vice} strokeWidth={3} dot={false} />
                                            <Line type="monotone" dataKey="trackingCoverage" name="Tracking %" stroke={chartColors.tracking} strokeWidth={2} strokeDasharray="6 4" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="analysis-chart-card">
                                <div className="analysis-chart-header">
                                    <h2>Data coverage</h2>
                                </div>

                                {/* Stacked bar chart showing tracked and missing activity logs. */}

                                <div className="analysis-chart-box">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="label" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="trackedActivities" name="Tracked" stackId="tracking" fill={chartColors.tracking} radius={[8, 8, 0, 0]} />
                                            <Bar dataKey="inactiveActivities" name="Not tracked" stackId="tracking" fill={chartColors.inactive} radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="analysis-chart-card">
                                <div className="analysis-chart-header">
                                    <h2>Main avg</h2>
                                </div>
                                        {/* Bar chart with the three main percentages. */ }
                                <div className="analysis-chart-box">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={categoryData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Bar dataKey="value" name="Percentage" radius={[8, 8, 0, 0]}>
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
                                    <h2>Activity scores</h2>
                                    <p>For vices, the score rises when the percentage stays low.</p>
                                </div>
                                        {/* Bar chart comparing the score of each activity. */}
                                <div className="analysis-chart-box">
                                    <ResponsiveContainer width="100%" height={330}>
                                        {/* normalized ranking: everything goes from 0 to 100 */}
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

                        {/* PERIOD CALENDAR / HEATMAP */}
                        <section className="analysis-chart-card wide">
                            <div className="analysis-chart-header">
                                <h2>Period calendar</h2>
                                <p>In yearly view, days are split by month.</p>
                            </div>

                            <div className="analysis-month-grid">
                                {monthSections.map((section) => (
                                    <div key={section.monthKey} className="analysis-month-section">
                                        <h3>{section.monthLabel}</h3>

                                        <div className="analysis-month-days">
                                            {/* each square is one day, with details in the tooltip */}
                                            {section.days.map((day) => (
                                                <div
                                                    key={day.date}
                                                    className={`heatmap-cell ${getHeatmapClass(day)}`}
                                                    title={`${day.date} | habits ${day.habitPercent}% | vices ${day.vicePercent}% | tracking ${day.trackingCoverage}%`}
                                                >
                                                    <span>{day.dayOfMonth}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* FINAL QUICK-READ LISTS */}
                        <section className="analysis-lower-grid">
                            <div className="analysis-chart-card">
                                <div className="analysis-chart-header">
                                    <h2>Watchlist</h2>
                                    <p>Lowest score in the period.</p>
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
                                    <p>Based on daily balance score.</p>
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
