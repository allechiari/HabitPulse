import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../services/authService";

const initialRegisterState = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: ""
};

function AuthPage() {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [successBanner, setSuccessBanner] = useState("");
    const [loginError, setLoginError] = useState("");
    const [registerError, setRegisterError] = useState("");
    const [loginForm, setLoginForm] = useState({
        email: "",
        password: ""
    });
    const [registerForm, setRegisterForm] = useState(initialRegisterState);

    const navigate = useNavigate();

    const getPasswordChecks = (password) => {
        return {
            minLength: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(password)
        };
    };

    const passwordChecks = getPasswordChecks(registerForm.password);

    const handleLoginChange = (event) => {
        setLoginForm({
            ...loginForm,
            [event.target.name]: event.target.value
        });
    };

    const handleRegisterChange = (event) => {
        setRegisterForm({
            ...registerForm,
            [event.target.name]: event.target.value
        });
    };

    const handleLoginSubmit = async (event) => {
        event.preventDefault();
        setLoginError("");
        setSuccessBanner("");

        try {
            const data = await loginUser(loginForm);
            localStorage.setItem("habitpulseUser", JSON.stringify(data.user));
            navigate("/dashboard");
        } catch (error) {
            setLoginError(error.message);
        }
    };

    const handleRegisterSubmit = async (event) => {
        event.preventDefault();
        setRegisterError("");

        try {
            await registerUser(registerForm);

            setRegisterForm(initialRegisterState);
            setIsLoginMode(true);
            setSuccessBanner("Registration completed successfully. You can now log in.");
        } catch (error) {
            setRegisterError(error.message);
        }
    };

    return (
        <div className="auth-page">
            <div className={`auth-shell ${isLoginMode ? "login-active" : "register-active"}`}>
                <div className="auth-visual">
                    <div className="auth-visual-content">
                        <span className="brand-tag">HabitPulse</span>
                        <h1>Build better routines with a smoother daily flow.</h1>
                        <p>
                            Track habits, stay consistent, and access your personal wellness space
                            with a clean and intuitive experience.
                        </p>
                    </div>
                </div>

                <div className="auth-panel">
                    <div className="auth-panel-header">
                        <h2>{isLoginMode ? "Welcome back" : "Create your account"}</h2>
                        <p>
                            {isLoginMode
                                ? "Log in to continue your progress."
                                : "Join HabitPulse and start building stronger habits."}
                        </p>
                    </div>

                    {successBanner && isLoginMode && (
                        <div className="banner banner-success">{successBanner}</div>
                    )}

                    {isLoginMode ? (
                        <form className="auth-form" onSubmit={handleLoginSubmit}>
                            {loginError && <div className="banner banner-error">{loginError}</div>}

                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    value={loginForm.email}
                                    onChange={handleLoginChange}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={loginForm.password}
                                    onChange={handleLoginChange}
                                    required
                                />
                            </div>

                            <button type="submit" className="primary-btn">
                                Log In
                            </button>

                            <p className="switch-text">
                                Don&apos;t have an account?
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => {
                                        setIsLoginMode(false);
                                        setLoginError("");
                                        setSuccessBanner("");
                                    }}
                                >
                                    Create one
                                </button>
                            </p>
                        </form>
                    ) : (
                        <form className="auth-form" onSubmit={handleRegisterSubmit}>
                            {registerError && <div className="banner banner-error">{registerError}</div>}

                            <div className="form-row">
                                <div className="input-group">
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="John"
                                        value={registerForm.firstName}
                                        onChange={handleRegisterChange}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        placeholder="Doe"
                                        value={registerForm.lastName}
                                        onChange={handleRegisterChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="john.doe@email.com"
                                    value={registerForm.email}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Create a strong password"
                                    value={registerForm.password}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="password-rules">
                                <p>Password must include:</p>
                                <ul>
                                    <li className={passwordChecks.minLength ? "valid" : ""}>At least 8 characters</li>
                                    <li className={passwordChecks.uppercase ? "valid" : ""}>One uppercase letter</li>
                                    <li className={passwordChecks.lowercase ? "valid" : ""}>One lowercase letter</li>
                                    <li className={passwordChecks.number ? "valid" : ""}>One number</li>
                                    <li className={passwordChecks.special ? "valid" : ""}>One special character</li>
                                </ul>
                            </div>

                            <div className="input-group">
                                <label>Phone Number (optional)</label>
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="+39 333 1234567"
                                    value={registerForm.phone}
                                    onChange={handleRegisterChange}
                                />
                            </div>

                            <button type="submit" className="primary-btn">
                                Create Account
                            </button>

                            <p className="switch-text">
                                Already have an account?
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => {
                                        setIsLoginMode(true);
                                        setRegisterError("");
                                    }}
                                >
                                    Log in
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthPage;