// =================================================================
// FILE: App.jsx (VERSI FULL CODE - LAMPIRAN SKRIPSI)
// FUNGSI: Router Utama, State Management, dan Konfigurasi Axios
// =================================================================

import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Flex, Button, Text } from '@chakra-ui/react';
import axios from 'axios';

// Impor komponen View yang sudah kita buat
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function App() {
  // // NOTES: Mengambil sesi yang tersimpan di browser agar user tidak perlu login terus menerus //
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  // // NOTES: Menerapkan skema keamanan Bearer Token pada setiap request Axios //
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const handleLogin = async (email, password) => {
    // Sesuai standar OAuth2 FastAPI, data dikirim dalam bentuk form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    // 1. Dapatkan Token dari Backend
    const res = await axios.post(`${API_URL}/token`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const newToken = res.data.access_token;
    setToken(newToken);
    localStorage.setItem('token', newToken);
    
    // Pasang token sementara agar request berikutnya lolos otorisasi
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    // 2. Tarik data profil user untuk mendapatkan 'role' dan 'nama'
    const usersRes = await axios.get(`${API_URL}/users`);
    const loggedInUser = usersRes.data.find(u => u.email === email);
    
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    
    return true; // Skenario Sukses: Kirim sinyal ke LoginView
  };

  const handleLogout = () => {
    // // NOTES: Menghapus token dari sistem saat pengguna keluar (Log Out) //
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <ChakraProvider>
      {/* // NOTES: [RBAC] Conditional Rendering: Tampilkan Dashboard jika login, jika tidak tampilkan Form Login // */}
      {user ? (
        <Box bg="gray.50" minH="100vh">
          {/* Header Navigasi Global */}
          <Flex bg="teal.600" color="white" p={4} justify="space-between" align="center" shadow="md">
            <Text fontSize="xl" fontWeight="bold" letterSpacing="wide">
              Sistem Kinerja PIH
            </Text>
            <Button colorScheme="red" size="sm" onClick={handleLogout} variant="solid">
              Logout
            </Button>
          </Flex>
          
          {/* Inject data user ke Dashboard */}
          <DashboardView user={user} />
        </Box>
      ) : (
        <LoginView onLogin={handleLogin} />
      )}
    </ChakraProvider>
  );
}

export default App;