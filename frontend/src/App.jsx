// src/App.jsx - FINAL FIX ReferenceError

import React, { useState, useEffect } from 'react';
import { Box, Spinner, Center } from '@chakra-ui/react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FUNGSI INI WAJIB DI ATAS ---
  const fetchInitialData = async () => {
    try {
      // 1. Ambil user yang login
      const meResponse = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`);
      const currentUser = meResponse.data;
      setUser(currentUser);

      // 2. Cek Peran (Role)
      if (currentUser.role !== 'intern') {
        const usersResponse = await axios.get(`${import.meta.env.VITE_API_URL}/users`);
        setUsersList(usersResponse.data);
      } else {
        setUsersList([]);
      }
      return true;
    } catch (error) {
      console.error("Gagal mengambil data user awal:", error);
      handleLogout();
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  // ------------------------------

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    
    if (storedToken) {
      try {
        const decodedToken = jwtDecode(storedToken);
        const isExpired = decodedToken.exp * 1000 < Date.now();

        if (isExpired) {
          console.log("Token kadaluarsa, menghapus...");
          localStorage.removeItem('authToken');
          setIsLoading(false);
        } else {
          console.log("Token valid ditemukan, set state login.");
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          // Panggil fungsi yang sudah didefinisikan di atas
          fetchInitialData(); 
        }
      } catch (error) {
        console.error("Token tidak valid:", error);
        localStorage.removeItem('authToken');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (email, password) => {
    // CCTV
    console.log("1. Tombol Login Ditekan!");
    console.log("3. URL Backend:", import.meta.env.VITE_API_URL);

    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/token`, 
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      console.log("5. BERHASIL! Respon:", response);

      const newToken = response.data.access_token;
      
      setToken(newToken);
      localStorage.setItem('authToken', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // PANGGIL FUNGSI YANG BENAR DI SINI
      const fetchSuccess = await fetchInitialData(); // Pastikan nama fungsinya sama!
      
      if (!fetchSuccess) {
         throw new Error("Gagal mengambil data user setelah login.");
      }

      return true;

    } catch (error) {
      console.error("6. ERROR TERJADI:", error);
      handleLogout(); 
      return false;
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setUsersList([]);
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  if (isLoading) {
    return (
      <Center height="100vh">
        <Spinner size="xl" color="teal.500" />
      </Center>
    );
  }

  return (
    <Box>
      {!token || !user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <DashboardPage 
          user={user} 
          usersList={usersList} 
          onLogout={handleLogout} 
        />
      )}
    </Box>
  );
}

export default App;