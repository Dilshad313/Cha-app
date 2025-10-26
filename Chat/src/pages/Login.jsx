import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import assets from "../assets/assets";
import { useApp } from "../context/AppContext";
import { toast } from "react-toastify";

function Login() {
  const [currState, setCurrState] = useState("Sign Up");
  const [userName, setUserName] = useState("");
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
        if (!userName.trim()) {
          toast.error("Username and name are required!");
          return;
        }
        await registerUser({ username: userName, email, password, name });
        toast.success("Account created successfully!");
        navigate("/profile-setup");
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        
        {/* Left Side - Branding */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4 lg:space-y-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-2xl">
              <img
                src={assets.logo_icon}
                alt="Talko Logo"
                className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16"
              />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
                Talko
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-indigo-100 font-medium">
                Stay Connected
              </p>
            </div>
          </div>
          
          <div className="hidden lg:block max-w-md">
            <p className="text-lg text-white/90 leading-relaxed">
              Connect with friends and family through instant messaging, voice calls, and more.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-white/90">
                <svg className="w-6 h-6 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Real-time messaging</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <svg className="w-6 h-6 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Group chats & channels</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <svg className="w-6 h-6 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure & private</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <form
          onSubmit={onSubmitHandler}
          className="bg-white p-6 sm:p-8 lg:p-10 flex flex-col gap-4 sm:gap-5 rounded-2xl lg:rounded-3xl shadow-2xl w-full max-w-sm lg:max-w-md"
        >
          <div className="text-center mb-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              {currState === "Sign Up" ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-sm sm:text-base text-gray-500">
              {currState === "Sign Up" 
                ? "Join Talko and start chatting" 
                : "Sign in to continue to Talko"}
            </p>
          </div>

          {currState === "Sign Up" && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                onChange={(e) => setUserName(e.target.value)}
                value={userName}
                type="text"
                placeholder="Username"
                className="w-full pl-10 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                required
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              type="email"
              placeholder="Email Address"
              className="w-full pl-10 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              type="password"
              placeholder="Password"
              className="w-full pl-10 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              required
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="terms" className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              I agree to the terms of use & privacy policy
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {currState === "Sign Up" ? "Create Account" : "Sign In"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                {currState === "Sign Up" ? "Already have an account?" : "New to Talko?"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrState(currState === "Sign Up" ? "Login" : "Sign Up")}
            className="w-full py-2.5 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
          >
            {currState === "Sign Up" ? "Sign in instead" : "Create an account"}
          </button>

          {currState === "Login" && (
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
