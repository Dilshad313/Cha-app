import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import assets from "../../assets/assets";
import { useApp } from "../../context/AppContext";
import { toast } from "react-toastify";

function Login() {
  const [currState, setCurrState] = useState("Sign Up");
  const [userName, setUserName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { loginUser, registerUser } = useApp();
  const navigate = useNavigate();

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if (!termsAccepted) {
      toast.error("You must accept the terms of use!");
      return;
    }

    try {
      if (currState === "Sign Up") {
        if (!userName.trim() || !name.trim()) {
          toast.error("Username and name are required!");
          return;
        }
        await registerUser({ username: userName, email, password, name });
        toast.success("Account created successfully!");
        navigate("/chat");
      } else {
        await loginUser(email, password);
        toast.success("Logged in successfully!");
        navigate("/chat");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="login">
      <img src={assets.logo_big} alt="Logo" className="logo" />
      <form onSubmit={onSubmitHandler} className="login-form">
        <h2>{currState}</h2>
        {currState === "Sign Up" && (
          <>
            <input
              onChange={(e) => setUserName(e.target.value)}
              value={userName}
              type="text"
              placeholder="Username"
              className="form-input"
              required
            />
            <input
              onChange={(e) => setName(e.target.value)}
              value={name}
              type="text"
              placeholder="Your Name"
              className="form-input"
              required
            />
          </>
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