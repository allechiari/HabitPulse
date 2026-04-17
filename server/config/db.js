/*
Questo file serve a collegare il backend a MongoDB Atlas.
*/
const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Atlas connesso correttamente");
    } catch (error) {
        console.error("Errore connessione MongoDB:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;