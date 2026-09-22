import React, { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import axios from "axios";


import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ForgotPassword from "./components/ForgotPassword"; 
import DinoGame from "./components/DinoGame"; 


import { useAuth } from "./context/AuthProvider";
import { useNetworkStatus } from "./hooks/useNetworkStatus"; 

function App() {
  const [authUser, setAuthUser] = useAuth(); 
  const navigate = useNavigate();
  
  
  const isOnline = useNetworkStatus();

  
  const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  
  const handleAutoLogout = () => {
    console.log("Token expired automatically! Logging out...");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthUser(null);
    navigate("/login");
  };

  
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (token) {
      const decodedToken = parseJwt(token);
      
      if (decodedToken && decodedToken.exp) {
        const expireTime = decodedToken.exp * 1000;
        const currentTime = Date.now();
        const timeRemaining = expireTime - currentTime;

        if (timeRemaining <= 0) {
          handleAutoLogout();
        } else {
          const logoutTimer = setTimeout(() => {
            handleAutoLogout();
          }, timeRemaining);
          return () => clearTimeout(logoutTimer);
        }
      }
    }
  }, [authUser, navigate, setAuthUser]);

  
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          handleAutoLogout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  
  if (!isOnline) {
    return <DinoGame />;
  }

  
  return (
    <div>
      <Routes>
        <Route
          path="/"
          element={authUser ? <Home /> : <Navigate to={"/login"} />}
        />
        <Route
          path="/login"
          element={authUser ? <Navigate to={"/"} /> : <Login />}
        />
        <Route
          path="/signup"
          element={authUser ? <Navigate to={"/"} /> : <Signup />}
        />
        <Route
          path="/forgot-password"
          element={authUser ? <Navigate to={"/"} /> : <ForgotPassword />}
        />
      </Routes>
    </div>
  );
}

export default App;