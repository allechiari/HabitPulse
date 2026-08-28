const Habit = require("../models/Habit");
const DailyProgress = require("../models/DailyProgress");

// creo una chiave data in formato yyyy-mm-dd da usare nelle mappe
const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

// porto la data iniziale alle 00:00:00 del giorno scelto
const parseStartDate = (dateValue) => {
    return new Date(`${dateValue}T00:00:00`);
};

// porto la data finale alle 23:59:59.999 del giorno scelto
const parseEndDate = (dateValue) => {
    return new Date(`${dateValue}T23:59:59.999`);
};

// limito un numero: se è troppo basso uso min, se è troppo alto uso max
const clamp = (value, min, max) => {
    return Math.max(min, Math.min(value, max));
};

// preparo un giorno vuoto, così i grafici hanno dati anche quando non è stato segnato nulla
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

// controllo se l'attività era già iniziata e non era ancora finita in quel giorno
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

// calcolo quanto counter ha raggiunto target, sempre su base 100
// se counter supera target, la percentuale resta comunque 100
const getActivityPercent = (counter, target) => {
    if (!target || target <= 0) {
        return 0;
    }

    const rawPercent = (counter / target) * 100;
    return Math.round(clamp(rawPercent, 0, 100));
};

// controllo se counter supera davvero target, usando i valori non bloccati dalla percentuale
const isCounterOverTarget = (counter, target) => {
    return target > 0 && counter > target;
};

// trasformo la percentuale in score da 0 a 100
// per gli habit uso la percentuale, per i vizi la inverto perché meno è meglio
const getActivityScore = (habitType, percent) => {
    const normalizedPercent = clamp(percent, 0, 100);

    if (habitType == "vice") {
        return Math.round(100 - normalizedPercent);
    }

    return Math.round(normalizedPercent);
};

// preparo il contenitore delle statistiche di una singola attività
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

// calcolo la media arrotondata di una proprietà dentro una lista
const getAverage = (items, key) => {
    if (!items.length) return 0;

    const total = items.reduce((sum, item) => sum + item[key], 0);
    return Math.round(total / items.length);
};

// gestisco la chiamata che restituisce tutti i dati della pagina analisi
const getAnalysisRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.body?.userId || req.query?.userId;;

        // se manca un filtro obbligatorio, fermo subito la richiesta
        if (!startDate || !endDate || !userId) {
            return res.status(400).json({
                message: "Start date, end date and user id are required."
            });
        }

        const start = parseStartDate(startDate);
        const end = parseEndDate(endDate);

        // controllo che le date ricevute possano essere convertite in date valide
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.status(400).json({
                message: "Invalid date range."
            });
        }

        // blocco i range dove la data iniziale viene dopo quella finale
        if (start > end) {
            return res.status(400).json({
                message: "Start date cannot be after end date."
            });
        }

        // prendo le attività dell'utente attive almeno un giorno dentro il periodo richiesto
        const habits = await Habit.find({
            user: userId,
            startDate: { $lte: end },
            $or: [
                { endDate: null },
                { endDate: { $gte: start } }
            ]
        }).sort({ order: 1, createdAt: 1 });
        const habitIds = habits.map((habit) => habit._id);

        // prendo tutti i progress salvati per quelle attività dentro il periodo
        const progressEntries = await DailyProgress.find({
            habit: { $in: habitIds },
            date: {
                $gte: start,
                $lte: end
            }
        }).sort({ date: 1 });

        const progressMap = new Map();

        // salvo i progress in una mappa data-attività, così poi li trovo subito nel ciclo dei giorni
        for (const entry of progressEntries) {
            const habitId = entry.habit.toString();
            const dateKey = formatDateKey(entry.date);
            progressMap.set(`${dateKey}-${habitId}`, entry);
        }

        const dailyTrend = [];
        const activityMap = new Map();
        const cursor = new Date(start);
        cursor.setHours(0, 0, 0, 0);

        // passo su ogni giorno del periodo, anche se quel giorno non ha progress salvati
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

            // per il giorno corrente leggo solo le attività che erano attive
            for (const habit of habits) {
                if (!isHabitActiveOnDay(habit, dayStart, dayEnd)) {
                    continue;
                }

                const habitId = habit._id.toString();
                const progress = progressMap.get(`${dayData.date}-${habitId}`);
                const wasTracked = Boolean(progress);
                // se non esiste un progress, uso counter 0 e il target di default dell'attività
                const counter = wasTracked ? Number(progress.counter) : 0;
                const target = wasTracked ? Number(progress.target) : Number(habit.targetDefault);
                const percent = getActivityPercent(counter, target);
                // se l'attività non è tracciata, lo score resta 0 anche se è un vizio
                const score = wasTracked ? getActivityScore(habit.type, percent) : 0;
                const isOverTarget = wasTracked && isCounterOverTarget(counter, target);

                // se è la prima volta che incontro questa attività, creo le sue statistiche
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

                // aggiorno i contatori in base al fatto che il giorno sia stato compilato o no
                if (wasTracked) {
                    dayData.trackedActivities += 1;
                    activityStats.daysTracked += 1;
                } else {
                    dayData.inactiveActivities += 1;
                    activityStats.inactiveDays += 1;
                }

                // se è un habit, aggiungo la percentuale alla media degli habit
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

                // se è un vizio, aggiungo percentuale e score alla media dei vizi
                if (habit.type == "vice") {
                    dayData.totalVices += 1;
                    vicePercentTotal += percent;
                    viceScoreTotal += score;

                    if (wasTracked) {
                        dayData.trackedVices += 1;
                    }

                    if (isOverTarget) {
                        dayData.vicesOverLimit += 1;
                    }
                }

                // salvo anche il dettaglio della singola attività per questo giorno
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

            // calcolo le medie del giorno usando i totali raccolti sopra
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

        // trasformo la mappa delle attività in lista e calcolo le medie finali del periodo
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

        // scelgo il giorno con il balance score più alto
        const bestDay = activeDays.reduce((best, day) => {
            if (!best || day.balanceScore > best.balanceScore) return day;
            return best;
        }, null);

        // scelgo il giorno con il balance score più basso
        const worstDay = activeDays.reduce((worst, day) => {
            if (!worst || day.balanceScore < worst.balanceScore) return day;
            return worst;
        }, null);

        // restituisco riepiloghi, trend e classifiche già pronti per il frontend
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
