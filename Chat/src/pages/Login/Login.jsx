import React, { useState } from "react";
import "./Login.css";
import assets from "../../assets/assets";
import { signup, login } from "../../config/firebase";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Login() {
  const [currState, setCurrState] = useState("Sign Up");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    // Validate checkbox
    if (!termsAccepted) {
      toast.error("You must accept the terms of use!");
      return;
    }

    if (currState === "Sign Up") {
      if (!userName.trim()) {
        toast.error("Username is required!");
        return;
      }
      try {
        await signup(userName, email, password);
        toast.success("Account created successfully!");
      } catch (error) {
        toast.error(error.message || "Error during sign-up!");
      }
    } else {
      try {
        await login(email, password);
        toast.success("Logged in successfully!");
      } catch (error) {
        toast.error(error.message || "Error during login!");
      }
    }
  };

  return (
    <div className="login">
      <ToastContainer />
      <img src={assets.logo_big} alt="Logo" className="logo" />
      <form onSubmit={onSubmitHandler} className="login-form">
        <h2>{currState}</h2>
        {currState === "Sign Up" && (
          <input
            onChange={(e) => setUserName(e.target.value)}
            value={userName}
            type="text"
            placeholder="Username"
            className="form-input"
            required
          />
        )}
        <input
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          type="email"
          placeholder="Email Address"
          className="form-input"
          required
        />
        <input
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          type="password"
          placeholder="Password"
          className="form-input"
          required
        />
        <div className="login-term">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <p>Agree to the terms of use & privacy policy</p>
        </div>
        <button type="submit">
          {currState === "Sign Up" ? "Create Account" : "Login Now"}
        </button>
        <div className="login-forgot">
          {currState === "Sign Up" ? (
            <p className="login-toggle">
              Already have an Account?{" "}
              <span onClick={() => setCurrState("Login")}>Login here</span>
            </p>
          ) : (
            <p className="login-toggle">
              Create an Account?{" "}
              <span onClick={() => setCurrState("Sign Up")}>Click here</span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

export default Login;
