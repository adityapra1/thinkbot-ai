import { Eye, EyeOff } from "lucide-react"; 
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../utils/utils"; 
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthProvider"; 

function Signup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [isOtpSent, setIsOtpSent] = useState(false); 
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  
  const navigate = useNavigate();
  const [, setAuthUser] = useAuth(); 

  const handleChange = (e) => {
    const value = e.target.value;
    const name = e.target.name;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/user/signup`,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        },
        {
          withCredentials: true,
        }
      );
      
      alert(data.message || "OTP Sent to your email!");
      setIsOtpSent(true); 
      
    } catch (error) {
      const msg = error?.response?.data?.error || error?.response?.data?.errors || "Signup Failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/user/verify-otp`,
        {
          email: formData.email,
          otp: otp,
        },
        {
          withCredentials: true,
        }
      );
      
      alert(data.message || "Email verified successfully!");
      navigate("/"); 
      
    } catch (error) {
      const msg = error?.response?.data?.error || "Invalid OTP. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.post(
          `${BACKEND_URL}/user/google-login`,
          {
            token: tokenResponse.access_token, 
          },
          {
            withCredentials: true,
          }
        );
        console.log("Google Data:", data);
        alert(data.message || "Google Signup Succeeded");
        
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        setAuthUser(data.token);
        navigate("/");
      } catch (error) {
        const msg = error?.response?.data?.message || "Google Auth Failed";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      console.log("Google Login Failed");
      setError("Google Auth Failed. Please try again.");
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="bg-[#1e1e1e] text-white w-full max-w-md rounded-2xl p-6 shadow-lg">
        
        {!isOtpSent ? (
          <>
            <h1 className="text-white items-center justify-center text-center text-2xl font-bold mb-4">
              Signup
            </h1>

            {/* firstName */}
            <div className="mb-4 mt-2">
              <input
                className="w-full bg-transparent text-white border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]"
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            {/* lastName */}
            <div className="mb-4 mt-2">
              <input
                className="w-full bg-transparent text-white border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]"
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            {/* email */}
            <div className="mb-4 mt-2">
              <input
                className="w-full bg-transparent text-white border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]"
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            {/* password */}
            <div className="mb-4 mt-2 relative">
              <input
                className="w-full bg-transparent text-white border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]"
                type={showPassword ? "text" : "password"} 
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <span 
                className="absolute right-3 top-3 text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            {error && <span className="text-red-500 text-sm mb-4 block text-center">{error}</span>}

            <p className="text-xs text-gray-400 mt-4 mb-6 text-center">
              By signing up or logging in, you consent to DeepSeek's{" "}
              <span className="underline cursor-pointer">Terms of Use</span> and{" "}
              <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-[#7a6ff6] hover:bg-[#6c61a6] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Sending OTP... " : "Signup"}
            </button>

            <div className="flex items-center my-5">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="px-4 text-gray-400 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <div className="flex justify-center w-full mb-4">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="w-full flex items-center justify-center gap-3 bg-transparent border border-gray-600 hover:bg-[#2a2a2a] hover:border-gray-400 text-white font-semibold py-3 rounded-lg transition-all duration-300"
              >
                <img 
                  src="https://www.svgrepo.com/show/475656/google-color.svg" 
                  alt="Google" 
                  className="w-5 h-5" 
                />
                Continue with Google
              </button>
            </div>

            <div className="flex justify-between mt-4 text-sm">
              <Link className="text-[#7a6ff6] hover:underline" to={"/login"}>
                Already registered? Login
              </Link>
            </div>
          </>
        ) : (
          
          /* Verify Form */
          <>
            <h1 className="text-white items-center justify-center text-center text-2xl font-bold mb-2">
              Verify Email
            </h1>
            <p className="text-sm text-gray-400 text-center mb-6">
              We've sent a 6-digit OTP to <br/><span className="text-white font-semibold">{formData.email}</span>
            </p>

            <div className="mb-6 mt-2">
              <input
                className="w-full bg-transparent text-white border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]"
                type="text"
                maxLength="6"
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            {error && <span className="text-red-500 text-sm mb-4 block text-center">{error}</span>}

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full bg-[#7a6ff6] hover:bg-[#6c61a6] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Verifying... " : "Verify & Login"}
            </button>
            
            <p 
              onClick={() => setIsOtpSent(false)} 
              className="text-[#7a6ff6] text-sm text-center mt-4 cursor-pointer hover:underline"
            >
              Change Email Address
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Signup;