import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../config/api';
import { toast } from 'react-toastify';
import './ResetPassword.css';

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
  const strengthText = ['Weak', 'Medium', 'Strong', 'Very Strong', 'Excellent'][strength - 1] || '';

  return (
    <div className="password-strength-indicator">
      <div className={`strength-bar strength-${strength}`}></div>
      <div className="strength-text">{strengthText}</div>
    </div>
  );
};

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
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
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      toast.error('Invalid reset link');
      navigate('/');
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
      toast.error('Passwords do not match');
      return;
    }

    const isPasswordValid = Object.values(passwordValidity).every(Boolean);
    if (!isPasswordValid) {
      toast.error('Password does not meet all the requirements.');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword({ token, password });
      toast.success('Password reset successfully. You can now login with your new password.');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = Object.values(passwordValidity).every(Boolean) && password === confirmPassword;


  return (
    <div className="reset-password">
      <div className="reset-container">
        <div className="reset-card">
          <h2>Reset Password</h2>
          <p>Enter your new password below.</p>
          
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={handlePasswordChange}
              required
            />
            <PasswordStrengthIndicator password={password} />
            <div className="password-requirements">
              <ul>
                <li className={passwordValidity.minLength ? 'valid' : 'invalid'}>At least 8 characters</li>
                <li className={passwordValidity.uppercase ? 'valid' : 'invalid'}>An uppercase letter</li>
                <li className={passwordValidity.lowercase ? 'valid' : 'invalid'}>A lowercase letter</li>
                <li className={passwordValidity.number ? 'valid' : 'invalid'}>A number</li>
                <li className={passwordValidity.specialChar ? 'valid' : 'invalid'}>A special character</li>
              </ul>
            </div>
            
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            
            <button type="submit" disabled={!isFormValid || loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="back-to-login">
            <a href="/">Back to Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;