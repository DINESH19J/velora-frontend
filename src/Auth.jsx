
import { useState } from "react";
import "./Auth.css";

const API_URL = "http://localhost:8080/api/auth";

export default function Auth({ onLogin, onBack }) {
    const [mode, setMode] = useState("login");
    const [loginType, setLoginType] = useState("customer");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    function changeMode(nextMode) {
        setMode(nextMode);
        setMessage("");
        setPassword("");
    }

    function changeLoginType(type) {
        setLoginType(type);
        setMode("login");
        setMessage("");
        setPassword("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/${mode === "login" ? "login" : "register"}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(
                        mode === "login"
                            ? { email: email.trim(), password }
                            : {
                                name: name.trim(),
                                email: email.trim(),
                                password,
                            }
                    ),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Request failed. Please try again."
                );
            }

            if (mode === "register") {
                setMessage("Account created! Please sign in as a customer.");
                setMode("login");
                setLoginType("customer");
                setPassword("");
            } else {
                const actualRole = String(data.role || "")
                    .replace(/^ROLE_/, "")
                    .toUpperCase();

                if (
                    loginType === "admin" &&
                    actualRole !== "ADMIN"
                ) {
                    await fetch(`${API_URL}/logout`, {
                        method: "POST",
                        credentials: "include",
                    });

                    throw new Error(
                        "This account is not an administrator. Please use Customer Login."
                    );
                }

                if (
                    loginType === "customer" &&
                    actualRole === "ADMIN"
                ) {
                    await fetch(`${API_URL}/logout`, {
                        method: "POST",
                        credentials: "include",
                    });

                    throw new Error(
                        "This is an administrator account. Please use Admin Login."
                    );
                }

                setMessage("Welcome to VELORA!");
                onLogin(data);
            }
        } catch (error) {
            setMessage(
                error.message ||
                "Could not connect. Check that Spring Boot is running."
            );
        } finally {
            setLoading(false);
        }
    }

    const isRegister = mode === "register";
    const isAdmin = loginType === "admin" && !isRegister;

    return (
        <main className="auth-page">
            <section className="auth-card">
                <button
                    className="auth-back"
                    onClick={onBack}
                    type="button"
                >
                    ← Back to VELORA
                </button>

                <div className="auth-logo">
                    <span className="auth-mark">V</span>
                    <div>
                        <strong>VELORA</strong>
                        <small>DRIVE DIFFERENT.</small>
                    </div>
                </div>

                <p className="auth-eyebrow">
                    YOUR JOURNEY STARTS HERE
                </p>

                <h1>
                    {isRegister
                        ? "Join VELORA."
                        : isAdmin
                            ? "Admin access."
                            : "Welcome back."}
                </h1>

                <p className="auth-subtitle">
                    {isRegister
                        ? "Create your customer account to get started."
                        : isAdmin
                            ? "Sign in to manage vehicles and inventory."
                            : "Sign in to discover your next drive."}
                </p>

                {!isRegister && (
                    <div className="auth-switch">
                        <button
                            type="button"
                            className={!isAdmin ? "selected" : ""}
                            onClick={() => changeLoginType("customer")}
                        >
                            Customer Login
                        </button>

                        <button
                            type="button"
                            className={isAdmin ? "selected" : ""}
                            onClick={() => changeLoginType("admin")}
                        >
                            Admin Login
                        </button>
                    </div>
                )}

                {isAdmin && (
                    <div className="auth-role-note">
                        ADMINISTRATOR PORTAL
                        <p>
                            Only accounts with an ADMIN role can access
                            vehicle management.
                        </p>
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    {isRegister && (
                        <label>
                            Full name
                            <input
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder="Your full name"
                                autoComplete="name"
                                required
                            />
                        </label>
                    )}

                    <label>
                        Email address
                        <input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="you@example.com"
                            autoComplete="username"
                            required
                        />
                    </label>

                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder={
                                isRegister
                                    ? "At least 8 characters"
                                    : "Enter your password"
                            }
                            autoComplete={
                                isRegister
                                    ? "new-password"
                                    : "current-password"
                            }
                            minLength={isRegister ? 8 : undefined}
                            required
                        />
                    </label>

                    <button
                        className="auth-submit"
                        disabled={loading}
                        type="submit"
                    >
                        {loading
                            ? "Please wait..."
                            : isRegister
                                ? "Create customer account →"
                                : isAdmin
                                    ? "Sign in as Admin →"
                                    : "Sign in as Customer →"}
                    </button>

                    {message && (
                        <p className="auth-message" role="status">
                            {message}
                        </p>
                    )}
                </form>

                <div className="auth-register-prompt">
                    {isRegister ? (
                        <p>
                            Already registered?{" "}
                            <button
                                type="button"
                                onClick={() => changeMode("login")}
                            >
                                Sign in
                            </button>
                        </p>
                    ) : (
                        <p>
                            New to VELORA?{" "}
                            <button
                                type="button"
                                onClick={() => changeMode("register")}
                            >
                                Create customer account
                            </button>
                        </p>
                    )}
                </div>

                <p className="auth-footer">
                    Secure account access · VELORA
                </p>
            </section>
        </main>
    );
}
