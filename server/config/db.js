/*
Questo file serve a collegare il backend a mongo.
*/
const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: "habitpulse"
        });
        console.log(`MongoDB Atlas connesso correttamente al database ${mongoose.connection.db.databaseName}`);
    } catch (error) {
        console.error("Errore connessione MongoDB:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;

/*
    temp .env
    PORT=5000
    0
    MONGO_URI=mongodb+srv://root:mhVbI8AwS69glkLE@habitpulse.wtp7bug.mongodb.net/habitpulse?appName=HabitPulse
*/