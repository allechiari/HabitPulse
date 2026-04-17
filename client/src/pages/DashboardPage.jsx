import { useNavigate } from "react-router-dom";

function DashboardPage() {
    const navigate = useNavigate();
    const savedUser = JSON.parse(localStorage.getItem("habitpulseUser"));

    const handleLogout = () => {
        localStorage.removeItem("habitpulseUser");
        navigate("/");
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-card">
                <h1>Welcome back{savedUser ? `, ${savedUser.firstName}` : ""}.</h1>
                <p>You have successfully logged into HabitPulse.</p>

                <button className="primary-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
}

export default DashboardPage;