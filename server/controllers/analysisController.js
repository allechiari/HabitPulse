const Habit = require("../models/Habit");
const DailyProgress = require("../models/DailyProgress");

const getUserIdFromRequest = (req) => {
    return req.body?.userId || req.query?.userId;
};

// formato stabile per confrontare le date dentro le mappe
const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

// inizio giorno del filtro selezionato
const parseStartDate = (dateValue) => {
    return new Date(`${dateValue}T00:00:00`);
};

// fine giorno del filtro selezionato
const parseEndDate = (dateValue) => {
    return new Date(`${dateValue}T23:59:59.999`);
};

// tengo un numero dentro un minimo e un massimo
const clamp = (value, min, max) => {
    return Math.max(min, Math.min(value, max));
};

// creo la struttura di base di un giorno anche se non ho dati salvati
const createEmptyDay = (date) => {
    const dateKey = formatDateKey(date);

    return {
        date: dateKey,
        label: date.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short"
        }),
        monthKey: dateKey.slice(0, 7),
        monthLabel: date.toLocaleDateString("it-IT", {
            month: "long",
            year: "numeric"
        }),
        monthShort: date.toLocaleDateString("it-IT", {
            month: "short"
        }),
        dayOfMonth: date.getDate(),
        habitPercent: 0,
        vicePercent: 0,
        viceScore: 0,
        balanceScore: 0,
        trackingCoverage: 0,
        activeActivities: 0,
        trackedActivities: 0,
        inactiveActivities: 0,
        totalHabits: 0,
        trackedHabits: 0,
        totalVices: 0,
        trackedVices: 0,
        completedHabits: 0,
        vicesOverLimit: 0,
        activityPercentages: []
    };
};

// controllo se una habit/vice era attiva in quel giorno
const isHabitActiveOnDay = (habit, dayStart, dayEnd) => {
    const habitStart = new Date(habit.startDate);
    habitStart.setHours(0, 0, 0, 0);

    if (habitStart > dayEnd) {
        return false;
    }

    if (!habit.endDate) {
        return true;
    }

    const habitEnd = new Date(habit.endDate);
    habitEnd.setHours(23, 59, 59, 999);

    return habitEnd >= dayStart;
};

// calcolo percentuale giornaliera della singola attività, indipendentemente dall'unità di misura
const getActivityPercent = (habitType, counter, target) => {
    if (!target || target <= 0) {
        return 0;
    }

    const rawPercent = (counter / target) * 100;

    if (habitType == "vice") {
        return Math.round(clamp(rawPercent, 0, 200));
    }

    return Math.round(clamp(rawPercent, 0, 100));
};

// score normalizzato: habit alta = bene, vizio basso = bene
const getActivityScore = (habitType, percent) => {
    if (habitType == "vice") {
        return Math.round(100 - clamp(percent, 0, 100));
    }

    return Math.round(clamp(percent, 0, 100));
};

// contenitore statistiche per una singola attività
const createActivityStats = (habit) => {
    return {
        id: habit._id.toString(),
        title: habit.title,
        type: habit.type,
        color: habit.color,
        unit: habit.unit,
        daysActive: 0,
        daysTracked: 0,
        inactiveDays: 0,
        percentTotal: 0,
        scoreTotal: 0,
        averagePercent: 0,
        averageScore: 0,
        bestPercent: 0,
        worstPercent: null
    };
};

// media semplice usata per i riepiloghi finali
const getAverage = (items, key, filterKey) => {
    const filteredItems = filterKey
        ? items.filter((item) => item[filterKey] > 0)
        : items;

    if (!filteredItems.length) {
        return 0;
    }

    const total = filteredItems.reduce((sum, item) => sum + item[key], 0);

    return Math.round(total / filteredItems.length);
};

// chiamata principale della pagina analisi
const getAnalysisRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userId = getUserIdFromRequest(req);

        // controllo parametri obbligatori
        if (!startDate || !endDate || !userId) {
            return res.status(400).json({
                message: "Start date, end date and user id are required."
            });
        }

        const start = parseStartDate(startDate);
        const end = parseEndDate(endDate);

        // controllo che le date siano valide
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.status(400).json({
                message: "Invalid date range."
            });
        }

        // non posso analizzare un range invertito
        if (start > end) {
            return res.status(400).json({
                message: "Start date cannot be after end date."
            });
        }

        // prendo tutte le attività che esistono almeno in parte dentro al periodo richiesto
        const habits = await Habit.find({
            user: userId,
            startDate: { $lte: end },
            $or: [
                { endDate: null },
                { endDate: { $gte: start } }
            ]
        }).sort({ order: 1, createdAt: 1 });
        const habitIds = habits.map((habit) => habit._id);

        // prendo i progress già salvati nel periodo
        const progressEntries = await DailyProgress.find({
            habit: { $in: habitIds },
            date: {
                $gte: start,
                $lte: end
            }
        }).sort({ date: 1 });

        const progressMap = new Map();

        // creo una mappa veloce data-attività -> progress, così poi il ciclo giornaliero è più semplice
        for (const entry of progressEntries) {
            const habitId = entry.habit.toString();
            const dateKey = formatDateKey(entry.date);
            progressMap.set(`${dateKey}-${habitId}`, entry);
        }

        const dailyTrend = [];
        const activityMap = new Map();
        const cursor = new Date(start);
        cursor.setHours(0, 0, 0, 0);

        // ciclo tutti i giorni del periodo, anche quelli dove non è stato segnato nulla
        while (cursor <= end) {
            const dayStart = new Date(cursor);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(cursor);
            dayEnd.setHours(23, 59, 59, 999);

            const dayData = createEmptyDay(cursor);
            let habitPercentTotal = 0;
            let vicePercentTotal = 0;
            let viceScoreTotal = 0;
            let balanceScoreTotal = 0;
            let scoredActivities = 0;

            // per ogni giorno controllo tutte le attività attive in quel giorno
            for (const habit of habits) {
                if (!isHabitActiveOnDay(habit, dayStart, dayEnd)) {
                    continue;
                }

                const habitId = habit._id.toString();
                const progress = progressMap.get(`${dayData.date}-${habitId}`);
                const wasTracked = Boolean(progress);
                // se non ho segnato nulla, il counter vale 0 ma il giorno resta visibile nei grafici
                const counter = wasTracked ? Number(progress.counter) : 0;
                const target = wasTracked ? Number(progress.target) : Number(habit.targetDefault);
                const percent = getActivityPercent(habit.type, counter, target);
                const score = getActivityScore(habit.type, percent);

                // inizializzo le statistiche della singola attività solo la prima volta
                if (!activityMap.has(habitId)) {
                    activityMap.set(habitId, createActivityStats(habit));
                }

                const activityStats = activityMap.get(habitId);
                activityStats.daysActive += 1;
                activityStats.percentTotal += percent;
                activityStats.scoreTotal += score;
                activityStats.bestPercent = Math.max(activityStats.bestPercent, percent);
                activityStats.worstPercent = activityStats.worstPercent === null
                    ? percent
                    : Math.min(activityStats.worstPercent, percent);

                dayData.activeActivities += 1;
                balanceScoreTotal += score;
                scoredActivities += 1;

                // distinguo tra dato segnato e giorno inattivo/non compilato
                if (wasTracked) {
                    dayData.trackedActivities += 1;
                    activityStats.daysTracked += 1;
                } else {
                    dayData.inactiveActivities += 1;
                    activityStats.inactiveDays += 1;
                }

                // buone abitudini: più la percentuale è alta più va bene
                if (habit.type == "habit") {
                    dayData.totalHabits += 1;
                    habitPercentTotal += percent;

                    if (wasTracked) {
                        dayData.trackedHabits += 1;
                    }

                    if (percent >= 100) {
                        dayData.completedHabits += 1;
                    }
                }

                // vizi: più la percentuale è bassa più va bene
                if (habit.type == "vice") {
                    dayData.totalVices += 1;
                    vicePercentTotal += percent;
                    viceScoreTotal += score;

                    if (wasTracked) {
                        dayData.trackedVices += 1;
                    }

                    if (percent > 100) {
                        dayData.vicesOverLimit += 1;
                    }
                }

                // dettaglio giornaliero della singola attività, utile se domani voglio aprire un drilldown
                dayData.activityPercentages.push({
                    id: habitId,
                    title: habit.title,
                    type: habit.type,
                    unit: habit.unit,
                    counter,
                    target,
                    percent,
                    score,
                    wasTracked
                });
            }

            // medie giornaliere già normalizzate in percentuale
            dayData.habitPercent = dayData.totalHabits > 0
                ? Math.round(habitPercentTotal / dayData.totalHabits)
                : 0;
            dayData.vicePercent = dayData.totalVices > 0
                ? Math.round(vicePercentTotal / dayData.totalVices)
                : 0;
            dayData.viceScore = dayData.totalVices > 0
                ? Math.round(viceScoreTotal / dayData.totalVices)
                : 0;
            dayData.balanceScore = scoredActivities > 0
                ? Math.round(balanceScoreTotal / scoredActivities)
                : 0;
            dayData.trackingCoverage = dayData.activeActivities > 0
                ? Math.round((dayData.trackedActivities / dayData.activeActivities) * 100)
                : 0;

            dailyTrend.push(dayData);
            cursor.setDate(cursor.getDate() + 1);
        }

        // statistiche finali per attività su tutto il periodo
        const activityStats = Array.from(activityMap.values()).map((activity) => ({
            ...activity,
            averagePercent: activity.daysActive > 0
                ? Math.round(activity.percentTotal / activity.daysActive)
                : 0,
            averageScore: activity.daysActive > 0
                ? Math.round(activity.scoreTotal / activity.daysActive)
                : 0,
            worstPercent: activity.worstPercent === null ? 0 : activity.worstPercent
        }));

        const activeDays = dailyTrend.filter((day) => day.activeActivities > 0);
        const habitDays = dailyTrend.filter((day) => day.totalHabits > 0);
        const viceDays = dailyTrend.filter((day) => day.totalVices > 0);
        const totalActiveActivities = dailyTrend.reduce((sum, day) => sum + day.activeActivities, 0);
        const totalTrackedActivities = dailyTrend.reduce((sum, day) => sum + day.trackedActivities, 0);
        const totalInactiveActivities = dailyTrend.reduce((sum, day) => sum + day.inactiveActivities, 0);

        // giorno migliore in base allo score normalizzato
        const bestDay = activeDays.reduce((best, day) => {
            if (!best || day.balanceScore > best.balanceScore) return day;
            return best;
        }, null);

        // giorno peggiore in base allo score normalizzato
        const worstDay = activeDays.reduce((worst, day) => {
            if (!worst || day.balanceScore < worst.balanceScore) return day;
            return worst;
        }, null);

        // risposta finale pronta per i grafici del frontend
        return res.status(200).json({
            startDate,
            endDate,
            summary: {
                totalEntries: progressEntries.length,
                totalDays: dailyTrend.length,
                activeDays: activeDays.length,
                trackedDays: dailyTrend.filter((day) => day.trackedActivities > 0).length,
                inactiveDays: dailyTrend.filter((day) => day.activeActivities > 0 && day.trackedActivities == 0).length,
                totalActiveActivities,
                totalTrackedActivities,
                totalInactiveActivities,
                habitAveragePercent: getAverage(habitDays, "habitPercent"),
                viceAveragePercent: getAverage(viceDays, "vicePercent"),
                viceControlScore: getAverage(viceDays, "viceScore"),
                trackingCoverage: totalActiveActivities > 0
                    ? Math.round((totalTrackedActivities / totalActiveActivities) * 100)
                    : 0,
                averageBalanceScore: getAverage(activeDays, "balanceScore"),
                bestDay,
                worstDay
            },
            categoryComparison: [
                { name: "Habit %", value: getAverage(habitDays, "habitPercent") },
                { name: "Vizi %", value: getAverage(viceDays, "vicePercent") },
                { name: "Tracking %", value: totalActiveActivities > 0 ? Math.round((totalTrackedActivities / totalActiveActivities) * 100) : 0 }
            ],
            dailyTrend,
            activityStats,
            topActivities: [...activityStats].sort((a, b) => b.averageScore - a.averageScore).slice(0, 6),
            problematicActivities: [...activityStats].sort((a, b) => a.averageScore - b.averageScore).slice(0, 6)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error loading analysis data."
        });
    }
};

module.exports = {
    getAnalysisRange
};
