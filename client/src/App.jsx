/*
Questo è il contenitore principale dell' applicazione.
*/
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

//function App() {
//    const [habits, setHabits] = useState([]);

//    useEffect(() => {
//        fetch("http://localhost:5000/api/habits")
//            .then(res => res.json())
//            .then(data => setHabits(data))
//            .catch(err => console.error(err));
//    }, []);

//    return (
//        <div style={{ padding: "20px" }}>
//            <h1>HabitPulse</h1>

//            <h2>Abitudini</h2>

//            <ul>
//                {habits.map((h, index) => (
//                    <li key={index}>{h.title || "Habit"}</li>
//                ))}
//            </ul>
//        </div>
//    );
//}

//export default App;