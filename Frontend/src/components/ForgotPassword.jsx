import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react"; 
import { BACKEND_URL } from "../utils/utils";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); 
  
  // पासवर्ड Show/Hide करने के लिए स्टेट
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [step, setStep] = useState(1); // 1 = Email पूछें, 2 = OTP & Password पूछें
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const navigate = useNavigate();

  // Step 1: OTP भेजने का फंक्शन
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${BACKEND_URL}/user/forgot-password`, { email });
      setSuccess(res.data.message);
      setStep(2); 
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: नया पासवर्ड सेट करने का फंक्शन
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // चेक कर रहे हैं कि दोनों पासवर्ड मैच कर रहे हैं या नहीं
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match! Please check again.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/user/reset-password`, {
        email,
        otp,
        newPassword
      });
      setSuccess(res.data.message);
      setTimeout(() => {
        navigate("/login"); // 2 सेकंड बाद लॉगिन पर भेज दें
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP or Error!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-gray-700 rounded-3xl p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {step === 1 ? "Reset Password" : "Create New Password"}
        </h2>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center mb-4">{success}</p>}

        {step === 1 ? (
          // --- STEP 1: EMAIL FORM ---
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#2a2a2f] text-white border border-gray-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7a6ff6] hover:bg-[#6c61a6] text-white font-semibold rounded-lg px-4 py-3 transition-colors disabled:bg-gray-600"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => navigate("/login")} className="text-gray-400 hover:text-white text-sm transition-colors">
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          // --- STEP 2: OTP, NEW PASSWORD & CONFIRM PASSWORD FORM ---
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full bg-[#2a2a2f] text-white border border-gray-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors tracking-widest"
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
            
            {/* New Password Box with Eye Button */}
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-[#2a2a2f] text-white border border-gray-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <span 
                className="absolute right-3 top-3.5 text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            {/* Confirm Password Box with Eye Button */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#2a2a2f] text-white border border-gray-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <span 
                className="absolute right-3 top-3.5 text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#10a37f] hover:bg-[#0e906f] text-white font-semibold rounded-lg px-4 py-3 transition-colors disabled:bg-gray-600 mt-2"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;