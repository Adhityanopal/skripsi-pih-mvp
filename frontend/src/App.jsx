// src/App.jsx
// Versi BARU (Opsi D) - Menggunakan Token Sungguhan & Role

import React, { useState, useEffect } from 'react';
import { Box, Spinner, Center } from '@chakra-ui/react'; // Impor Spinner
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // Data user yang login
  const [usersList, setUsersList] = useState([]); // Daftar semua user (untuk manajer)
  const [isLoading, setIsLoading] = useState(true); // State loading awal

  // Efek ini berjalan HANYA SEKALI saat App pertama kali dibuka
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    
    if (storedToken) {
      try {
        const decodedToken = jwtDecode(storedToken);
        const isExpired = decodedToken.exp * 1000 < Date.now();

        if (isExpired) {
          console.log("Token kadaluarsa, menghapus...");
          localStorage.removeItem('authToken');
          setIsLoading(false); // Selesai loading
        } else {
          console.log("Token valid ditemukan, set state login.");
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          // Ambil data awal (user login DAN daftar user)
          fetchDataBasedOnRole(storedToken); 
        }
      } catch (error) {
        console.error("Token tidak valid:", error);
        localStorage.removeItem('authToken');
        setIsLoading(false); // Selesai loading
      }
    } else {
      setIsLoading(false); // Tidak ada token, selesai loading
    }
  }, []); // [] berarti hanya jalan sekali saat mount

  // Ambil data user 'me' DAN daftar 'users' (jika manajer)
  const fetchDataBasedOnRole = async (token) => {
    try {
      // 1. Ambil /users/me DULU
      const meResponse = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`);
      const currentUser = meResponse.data;
      setUser(currentUser); // <-- Set user yang login

      // 2. Cek Peran (Role)
      if (currentUser.role !== 'intern') {
        const usersResponse = await axios.get(`${import.meta.env.VITE_API_URL}/users`);
        setUsersList(usersResponse.data); // Simpan daftar user
      } else {
        setUsersList([]); // Intern tidak perlu daftar user
      }
      return true;
    } catch (error) {
      console.error("Gagal mengambil data user awal:", error);
      handleLogout();
      return false;
    } finally {
      setIsLoading(false); // Selesai loading setelah semua data diambil
    }
  };

// --- Fungsi untuk LOGIN ---
const handleLogin = async (email, password) => {
    
  // CCTV 1: Cek apakah fungsi ini dipanggil
  console.log("1. Tombol Login Ditekan!");
  console.log("2. Email:", email);
  console.log("3. URL Backend:", import.meta.env.VITE_API_URL);

  try {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    // CCTV 2: Sebelum kirim axios
    console.log("4. Mengirim request ke Backend...");

    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/token`, 
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // CCTV 3: Kalau berhasil
    console.log("5. BERHASIL! Respon:", response);

    const newToken = response.data.access_token;
    
    setToken(newToken);
    localStorage.setItem('authToken', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    await fetchInitialData(); 
    return true; 

  } catch (error) {
    // CCTV 4: Kalau Gagal
    console.error("6. ERROR TERJADI:", error);
    console.log("7. Detail Error:", error.response);
    
    handleLogout(); 
    return false; 
  }
};

  // --- Fungsi untuk LOGOUT ---
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setUsersList([]);
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  // --- Logika Render ---
  
  // Tampilkan loading spinner besar saat aplikasi pertama kali memvalidasi token
  if (isLoading) {
    return (
      <Center height="100vh">
        <Spinner size="xl" color="teal.500" />
      </Center>
    );
  }

  // Setelah loading selesai, tentukan tampilkan Login atau Dashboard
  return (
    <Box>
      {!token || !user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <DashboardPage 
          user={user} // Kirim data user 'me'
          usersList={usersList} // <-- Kirim daftar SEMUA user
          onLogout={handleLogout} 
        />
      )}
    </Box>
  );
}

export default App;