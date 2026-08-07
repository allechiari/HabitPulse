import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    updateUserProfile,
    updateUserPassword,
    deleteUser
} from "../services/authService";

function ProfilePage() {
    const navigate = useNavigate();
    const savedUser = JSON.parse(localStorage.getItem("habitpulseUser"));

    const [profileForm, setProfileForm] = useState({
        firstName: savedUser?.firstName || "",
        lastName: savedUser?.lastName || "",
        email: savedUser?.email || "",
        phone: savedUser?.phone || ""
    });

    const [passwordForm, setPasswordForm] = useState({
        password: ""
    });

    const [successBanner, setSuccessBanner] = useState("");
    const [errorBanner, setErrorBanner] = useState("");

    // se non ho un utente salvato torno alla login
    if (!savedUser) {
        navigate("/");
        return null;
    }

    // aggiorno il form prendendo il name dell'input modificato
    const handleProfileChange = (event) => {
        setProfileForm({
            ...profileForm,
            [event.target.name]: event.target.value
        });
    };

    // aggiorno il form della nuova password
    const handlePasswordChange = (event) => {
        setPasswordForm({
            ...passwordForm,
            [event.target.name]: event.target.value
        });
    };

    // salvo le modifiche del profilo nel database e poi aggiorno il localStorage
    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        setSuccessBanner("");
        setErrorBanner("");

        try {
            const data = await updateUserProfile(savedUser.id, {
                firstName: profileForm.firstName,
                lastName: profileForm.lastName,
                phone: profileForm.phone
            });

            localStorage.setItem("habitpulseUser", JSON.stringify(data.user));
            setSuccessBanner("Profile updated successfully.");
        } catch (error) {
            setErrorBanner(error.message);
        }
    };

    // aggiorno la password senza chiedere quella precedente
    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        setSuccessBanner("");
        setErrorBanner("");

        try {
            await updateUserPassword(savedUser.id, {
                password: passwordForm.password
            });

            setPasswordForm({
                password: ""
            });

            setSuccessBanner("Password updated successfully.");
        } catch (error) {
            setErrorBanner(error.message);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete your account?");

        if (!confirmDelete) {
            return;
        }

        try {
            await deleteUser(savedUser.id);
            localStorage.removeItem("habitpulseUser");
            navigate("/");
        } catch (error) {
            setErrorBanner(error.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("habitpulseUser");
        navigate("/");
    };

    return (
        <div className="profile-page">
            <header className="dashboard-topbar">
                <div>
                    <span className="brand-tag">HabitPulse</span>
                </div>

                <div className="dashboard-topbar-title">
                    <h1>Profile Details</h1>
                </div>

                <div className="dashboard-topbar-actions">
                    <button type="button" className="btn ghost-btn" onClick={() => navigate("/dashboard")}>
                        Back to dashboard
                    </button>

                    <button type="button" className="btn secondary-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="profile-main">
                <section className="profile-card">
                    <div className="profile-card-header">
                        <div className="profile-avatar-large">
                            {profileForm.firstName ? profileForm.firstName.charAt(0).toUpperCase() : "U"}
                        </div>

                        <div>
                            <h2>
                                {profileForm.firstName} {profileForm.lastName}
                            </h2>
                            <p>{profileForm.email}</p>
                        </div>
                    </div>

                    {successBanner && (
                        <div className="banner banner-success">{successBanner}</div>
                    )}

                    {errorBanner && (
                        <div className="banner banner-error">{errorBanner}</div>
                    )}

                    <form className="habit-form" onSubmit={handleProfileSubmit}>
                        <div className="form-row">
                            <div className="input-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={profileForm.firstName}
                                    onChange={handleProfileChange}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={profileForm.lastName}
                                    onChange={handleProfileChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={profileForm.email}
                                readOnly
                                style={{ background: "var(--platform-ghost-background)" }}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Phone Number</label>
                            <input
                                type="text"
                                name="phone"
                                value={profileForm.phone}
                                placeholder="+39 333 1234567"
                                onChange={handleProfileChange}
                            />
                        </div>

                        <div className="profile-actions">
                            <button type="button" className="btn ghost-btn" onClick={() => navigate("/dashboard")}>
                                Cancel
                            </button>

                            <button type="submit" className="btn primary-btn">
                                Save changes
                            </button>
                        </div>
                    </form>

                    <form className="habit-form" onSubmit={handlePasswordSubmit}>
                        <div className="input-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Create a new password"
                                value={passwordForm.password}
                                onChange={handlePasswordChange}
                                required
                            />
                        </div>

                        <div className="profile-actions">
                            
                            <button type="button" className="btn secondary-btn" onClick={handleDeleteAccount}>
                                Delete account
                            </button>
                            <button type="submit" className="btn primary-btn">
                                Update password
                            </button>
                        </div>
                        
                    </form>

                    
                </section>
            </main>
        </div>
    );
}

export default ProfilePage;