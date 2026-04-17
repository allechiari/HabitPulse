# HabitPulse

HabitPulse is a full-stack web application for tracking and managing daily habits.

This guide explains step by step how to run the project on a different computer after cloning it from GitHub.

---

# 🚀 Tech Stack

- Frontend: React (Vite)
- Backend: Node.js + Express
- Database: MongoDB Atlas

---

# 📦 Project Structure

HabitPulse/
- client/ → React frontend
- server/ → Node.js backend
- docs/ → documentation

---

# ⚙️ 1. REQUIREMENTS

Install the following:

- Git
- Node.js (version 20+ recommended)
- npm
- MongoDB Atlas account

---

# ✅ 2. CHECK INSTALLATIONS

Run:

git --version
node -v
npm -v

---

# 📥 3. CLONE PROJECT

git clone https://github.com/YOUR_USERNAME/HabitPulse.git
cd HabitPulse

---

# 🔧 4. BACKEND SETUP

cd server
npm install

---

# 🔐 5. CREATE .env FILE

Create file:

server/.env

Add:

PORT=5000
MONGO_URI=your_mongodb_connection_string

Example:

PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/habitpulse?retryWrites=true&w=majority

---

# 🌐 6. CONFIGURE MONGODB ATLAS

- Create cluster
- Create database user
- Add IP (0.0.0.0/0 for testing)
- Copy connection string into .env

---

# ▶️ 7. START BACKEND

cd server
npm run dev

---

# 🎨 8. FRONTEND SETUP

Open new terminal:

cd HabitPulse/client
npm install

---

# ▶️ 9. START FRONTEND

npm run dev

Open browser:

http://localhost:5173

---

# 🔄 10. RUN FULL PROJECT

Terminal 1:

cd server
npm run dev

Terminal 2:

cd client
npm run dev

---

# 🛑 11. STOP SERVERS

Press:

CTRL + C

---

# 🛠️ 12. TROUBLESHOOTING

If error:

Delete dependencies:

PowerShell:

Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

---

# 📌 13. API ENDPOINTS

POST /api/auth/register  
POST /api/auth/login  

Base URL:

http://localhost:5000

---

# 📌 14. FINAL CHECK

Make sure:

- Node installed
- Repo cloned
- .env exists
- MongoDB connected
- Backend running
- Frontend running

---

# 👨‍💻 Author

Alessandro Chiari
