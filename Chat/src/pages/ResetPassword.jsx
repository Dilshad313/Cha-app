import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "../config/api";
import { toast } from "react-toastify";

const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const strengthText =
    ["Weak", "Medium", "Strong", "Very Strong", "Excellent"][strength - 1] || "";

  const strengthColors = {
    0: "w-0 bg-gray-200",
    1: "w-1/5 bg-red-500",
    2: "w-2/5 bg-orange-400",
    3: "w-3/5 bg-yellow-400",
    4: "w-4/5 bg-lime-400",
    5: "w-full bg-green-400",
  };

  return (
    <div className="w-full mt-[-8px] mb-2">
      <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strengthColors[strength]}`}
        ></div>
      </div>
      <div className="text-xs text-gray-600 text-right">{strengthText}</div>
    </div>
  );
};

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [passwordValidity, setPasswordValidity] = useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      toast.error("Invalid reset link");
      navigate("/");
    }
    setToken(tokenParam);
  }, [searchParams, navigate]);

  const validatePassword = (password) => {
    setPasswordValidity({
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[^A-Za-z0-9]/.test(password),
    });
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const isPasswordValid = Object.values(passwordValidity).every(Boolean);
    if (!isPasswordValid) {
      toast.error("Password does not meet all the requirements.");
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword({ token, password });
      toast.success(
        "Password reset successfully. You can now login with your new password."
      );
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    Object.values(passwordValidity).every(Boolean) && password === confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="w-full max-w-md px-5">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-semibold mb-3 text-gray-800">Reset Password</h2>
          <p className="text-gray-600 mb-6">Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={handlePasswordChange}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <PasswordStrengthIndicator password={password} />

            {/* Password Requirements */}
            <div className="text-left text-sm mb-4">
              <ul className="space-y-1">
                <li
                  className={passwordValidity.minLength ? "text-green-600" : "text-red-500"}
                >
                  At least 8 characters
                </li>
                <li
                  className={passwordValidity.uppercase ? "text-green-600" : "text-red-500"}
                >
                  An uppercase letter
                </li>
                <li
                  className={passwordValidity.lowercase ? "text-green-600" : "text-red-500"}
                >
                  A lowercase letter
                </li>
                <li
                  className={passwordValidity.number ? "text-green-600" : "text-red-500"}
                >
                  A number
                </li>
                <li
                  className={passwordValidity.specialChar ? "text-green-600" : "text-red-500"}
                >
                  A special character
                </li>
              </ul>
            </div>

            {/* Confirm Password */}
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full p-3 rounded-md text-white font-medium ${
                !isFormValid || loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 transition"
              }`}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-5">
            <a
              href="/"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
