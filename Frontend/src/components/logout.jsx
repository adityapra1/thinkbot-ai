import axios from "axios";
import { BACKEND_URL } from "../utils/utils"; 

export const logoutUser = async (setAuthUser, navigate) => {
  try {
    // बैकएंड को लॉगआउट रिक्वेस्ट भेजें
    await axios.get(`${BACKEND_URL}/user/logout`, { withCredentials: true });
  } catch (error) {
    console.error("Logout Error:", error);
  } finally {
    // लोकल स्टोरेज साफ करें
    localStorage.clear();
    
    // लॉगिन स्टेट हटाएँ और लॉगिन पेज पर भेजें
    if (setAuthUser) setAuthUser(null);
    if (navigate) navigate("/login");
  }
};