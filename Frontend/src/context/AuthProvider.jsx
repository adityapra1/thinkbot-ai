import React, { createContext, useContext, useState } from "react";
import Cookies from "js-cookie";

export const AuthContext = createContext();

// Add this hook so you can easily use it in other components
export const useAuth = () => {
  return useContext(AuthContext);
};

export default function AuthProvider({ children }) {
  const initialToken = localStorage.getItem("token") || Cookies.get("JWT") || null;
  const [authUser, setAuthUser] = useState(initialToken);

  return (
    // FIXED: Changed curly braces {{}} to square brackets []
    <AuthContext.Provider value={[authUser, setAuthUser]}>
      {children}
    </AuthContext.Provider>
  );
}