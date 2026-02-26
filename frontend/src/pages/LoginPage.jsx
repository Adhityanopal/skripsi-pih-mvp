// src/pages/LoginPage.jsx
// Versi BARU (Opsi D) - Form Login Sungguhan

import React, { useState } from 'react';
import { 
  Box, 
  Heading, 
  Button, 
  FormControl, 
  FormLabel, 
  Input, 
  VStack, // Tumpukan Vertikal
  useToast, // Notifikasi
  Container, // Pembungkus agar rapi
  Alert,
  AlertIcon
} from '@chakra-ui/react';

function LoginPage({ onLogin }) { // Terima prop onLogin dari App.jsx
  // State untuk menyimpan input form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // State untuk error
  const toast = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault(); // Mencegah form me-refresh halaman
    setError(null); // Reset error setiap kali submit

    // VALIDASI MANUAL: Mencegah popup browser bawaan ("Please fill out this field")
    if (!email.trim() || !password.trim()) {
      setError("data yang dimasukkan tidak valid");
      return;
    }

    setIsLoading(true);

    try {
      // Panggil fungsi handleLogin (dari App.jsx)
      const response = await onLogin(email, password);

      if (response === true) {
        // Jika sukses, App.jsx akan otomatis mengubah tampilan
      } else {
        // Jika gagal (dari App.jsx)
        setError(response);
        setIsLoading(false);
      }

    } catch (err) {
      // Tangani error
      setError(err.message || "data yang dimasukkan tidak valid");
      setIsLoading(false);
    }
    // Jangan set isLoading(false) di 'finally' agar tombol tetap loading
    // saat App.jsx sedang mengambil data user
  };

  return (
    // Container untuk memusatkan form
    <Container centerContent> 
      <Box 
        p={8} 
        mt={20} // Margin atas
        maxWidth="400px" 
        width="100%"
        borderWidth={1} 
        borderRadius="lg" 
        boxShadow="lg"
        as="form" // Jadikan Box sebagai form
        onSubmit={handleSubmit} // Panggil handleSubmit saat disubmit
      >
        <VStack spacing={4}>
          <Heading>Login Sistem</Heading>
          
          {/* PERBAIKAN: Hapus isRequired agar popup browser tidak muncul */}
          <FormControl isInvalid={!!error}>
            <FormLabel>Email</FormLabel>
            <Input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@pih.com"
            />
          </FormControl>
          
          {/* PERBAIKAN: Hapus isRequired agar popup browser tidak muncul */}
          <FormControl isInvalid={!!error}>
            <FormLabel>Password</FormLabel>
            <Input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormControl>
          
          {/* Tampilkan pesan error jika ada */}
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          <Button 
            colorScheme='teal' 
            width="full" // Lebar penuh
            type="submit" // Tipe submit
            isLoading={isLoading} // Tampilkan loading spinner
          >
            Login
          </Button>
        </VStack>
      </Box>
    </Container>
  );
}

export default LoginPage;