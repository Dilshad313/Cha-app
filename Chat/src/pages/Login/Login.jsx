import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
    <div
      className="min-h-screen bg-[url('/background.png')] bg-cover flex items-center justify-evenly"
    >
      <img
        src={assets.logo_big}
        alt="Logo"
        className="w-[max(20vw,200px)]"
      />

      <form
        onSubmit={onSubmitHandler}
        className="bg-white p-6 md:p-8 flex flex-col gap-5 rounded-lg shadow-lg w-full max-w-sm"
      >
        <h2 className="text-xl font-medium text-center">{currState}</h2>

        {currState === "Sign Up" && (
          <input
            onChange={(e) => setUserName(e.target.value)}
            value={userName}
            type="text"
            placeholder="Username"
            className="p-2 border border-gray-300 rounded outline-[#077eff]"
            required
          />
        )}

        <input
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          type="email"
          placeholder="Email Address"
          className="p-2 border border-gray-300 rounded outline-[#077eff]"
          required
        />

        <input
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          type="password"
          placeholder="Password"
          className="p-2 border border-gray-300 rounded outline-[#077eff]"
          required
        />

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <p>Agree to the terms of use & privacy policy</p>
        </div>

        <button
          type="submit"
          className="p-2 bg-[#077eff] text-white text-base rounded cursor-pointer hover:bg-[#0566d1] transition"
        >
          {currState === "Sign Up" ? "Create Account" : "Login Now"}
        </button>

        <div className="flex flex-col gap-2 mt-2 text-center">
          {currState === "Sign Up" ? (
            <p className="text-sm text-gray-600">
              Already have an Account?{" "}
              <span
                className="font-medium text-[#077eff] cursor-pointer"
                onClick={() => setCurrState("Login")}
              >
                Login here
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Create an Account?{" "}
              <span
                className="font-medium text-[#077eff] cursor-pointer"
                onClick={() => setCurrState("Sign Up")}
              >
                Click here
              </span>
            </p>
          )}
        </div>

        <div className="mt-3 text-center">
          <Link
            to="/forgot-password"
            className="text-blue-600 text-sm hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
      </form>
    </div>
  );
}

export default Login;
