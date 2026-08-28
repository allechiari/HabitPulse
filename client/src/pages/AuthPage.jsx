import { useState } from "react"; // utilizzo la logica a stati cioè valori che possono cambiare nel tempo
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../services/authService";

// stato iniziale form di registrazione
const initialRegisterState = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: ""
};

function AuthPage() {
    // stato di stato XD -> sono in login o registrazione
    const [isLoginMode, setIsLoginMode] = useState(true);
    // stati per messaggi di errore o successo
    const [successBanner, setSuccessBanner] = useState("");
    const [loginError, setLoginError] = useState("");
    const [registerError, setRegisterError] = useState("");
    // stati dei form
    const [loginForm, setLoginForm] = useState({
        email: "",
        password: ""
    });
    const [registerForm, setRegisterForm] = useState(initialRegisterState);

    const navigate = useNavigate();

    // la password deve avere i requisiti minimi di sicurezza, coin questo posso vedere in realtime quali sono rispettati (sono tutti booleani)
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

    // aggiorna il form di login o registrazione quando scrivo nel campo con name="name"
    // lo fa settando lo stato copiando il valore precedente dello stato con il valoree scritto nell'input
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
        event.preventDefault(); // non faccio ricaricare la pagina, con form html lo farebbe da solo, blocchiamo quwesto comportamento
        setLoginError("");
        setSuccessBanner("");

        try {
            const data = await loginUser(loginForm);
            // se qui continuo significa che la mia richiesta ha vuto successo e quindi mi carico nel dom il mio user (mi servirà nella dashboard e)
            localStorage.setItem("habitpulseUser", JSON.stringify(data.user));
            navigate("/dashboard");
        } catch (error) {
            setLoginError(error.message);
        }
    };

    const handleRegisterSubmit = async (event) => {
        event.preventDefault(); // non faccio ricaricare la pagina, con form html lo farebbe da solo, blocchiamo quwesto comportamento
        setRegisterError("");

        try {
            await registerUser(registerForm);
            // se qui continuo significa che la mia richiesta ha avuto successo e quindi resetto il form di registrazione e riporto l'utente alla pagina di login
            setRegisterForm(initialRegisterState);
            setIsLoginMode(true);
            setSuccessBanner("Registration completed successfully. You can now log in.");
        } catch (error) {
            setRegisterError(error.message);
        }
    };

    return (
        <div className="auth-page">
            {/* BLOCCO GRAFICO A SINISTRA 
                questo blocco è puramente grafico e di presentazione, ha un css complicato, blocco di presentazione */ }
            <div className={`auth-shell ${isLoginMode ? "login-active" : "register-active"}`}>
                <div className="auth-visual">
                    <div className="auth-visual-content">
                        <span className="brand-tag">HabitPulse</span>
                        <h1>Small steps. Lasting change.</h1>
                        <p>
                            Track your habits, keep your goals in sight, and turn everyday progress into meaningful results.
                        </p>
                    </div>
                </div>

                <div className="auth-panel">
                    <div className="auth-panel-header">
                        <h2>{isLoginMode ? "Welcome back" : "Create your account"}</h2>
                        <p> {isLoginMode ? "Log in to continue your progress." : "Join HabitPulse and start building stronger habits."} </p>
                    </div>

                    {successBanner && isLoginMode && (
                        <div className="banner banner-success">{successBanner}</div>
                    )}

                    {isLoginMode ? (
                        // prima opzione del mio rendering condizionale -> sono nella LOGIN PAGE
                        // il suo handler lo metto nell'on submit dento al tag form e lo reinderizzo a l'handler che ho scritto prima
                        <form className="habit-form" onSubmit={handleLoginSubmit}>
                            {loginError && <div className="banner banner-error">{loginError}</div>}

                            <div className="input-group">
                                <label>Email</label>
                                <input type="email" name="email" placeholder="Enter your email"
                                    value={loginForm.email}
                                    onChange={handleLoginChange}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Password</label>
                                <input type="password" name="password" placeholder="Enter your password"
                                    value={loginForm.password}
                                    onChange={handleLoginChange}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn primary-btn">
                                Log In
                            </button>
                            {/* classico crea account, gestisce lo switch di stato da login a registrazione*/ }
                            <p>
                                Don&apos;t have an account?
                                <button type="button" className="link-btn"
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
                            // sconda opzione del mio rendering condizionale -> sono nella REGISTER PAGE
                            // il suo handler lo metto nell'on submit dento al tag form e lo reinderizzo a l'handler che ho scritto prima
                        <form className="habit-form" onSubmit={handleRegisterSubmit}>
                            {registerError && <div className="banner banner-error">{registerError}</div>}

                            <div className="form-row">
                                <div className="input-group">
                                    <label>First Name</label>
                                    <input type="text" name="firstName" placeholder="Name"
                                        value={registerForm.firstName}
                                        onChange={handleRegisterChange}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Last Name</label>
                                    <input type="text" name="lastName" placeholder="LastName"
                                        value={registerForm.lastName}
                                        onChange={handleRegisterChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Email</label>
                                <input type="email" name="email" placeholder="name.lastname@email.com"
                                    value={registerForm.email}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Password</label>
                                <input type="password" name="password" placeholder="Create a password"
                                    value={registerForm.password}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>
                                { /* mostro in tempo reale quali elementi richiesti sono presenti nella password */}
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
                                <input type="text" name="phone" placeholder="+39 333 1234567"
                                    value={registerForm.phone}
                                    onChange={handleRegisterChange}
                                />
                            </div>

                            <button type="submit" className="btn primary-btn">
                                Create Account
                            </button>

                            {/* classico ho già un account, gestisce lo switch di stato da reg a log*/}
                            <p>
                                Already have an account?
                                <button type="button" className="link-btn"
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
