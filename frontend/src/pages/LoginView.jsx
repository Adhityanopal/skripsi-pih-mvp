// =================================================================
// FILE: LoginView.jsx (REVISI FINAL - SYNC BAB 4)
// FUNGSI: Implementasi Use Case Autentikasi [UC-01]
// AKTOR: Semua Role (Administrator, Team Lead, Staf Media, Intern, Pimpinan)
// =================================================================

import React, { useState } from 'react';
import { 
  Box, Heading, Button, FormControl, FormLabel, Input, 
  VStack, useToast, Container, Alert, AlertIcon, Text, Flex
} from '@chakra-ui/react';

function LoginView({ onLogin }) { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); 
  const toast = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault(); 
    setIsLoading(true);
    setErrorMsg(null); 

    // // NOTES: [ALT-SCENARIO] Validasi Input Kosong sebelum menembak API //
    if (!email || !password) {
      setIsLoading(false);
      setErrorMsg("Email dan Password wajib diisi.");
      return;
    }

    try {
      // // NOTES: [SEQUENCE] Fungsi onLogin (dari App.jsx) akan memanggil endpoint /token //
      const success = await onLogin(email, password);

      if (success) {
        toast({
          title: "Skenario Sukses",
          description: "Autentikasi berhasil, mengalihkan ke Dashboard...",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      }
    } catch (err) {
      // // NOTES: [ALT-SCENARIO] Menangkap error dari backend jika kredensial salah //
      setErrorMsg(err.response?.data?.detail || "Skenario Gagal: Email atau Password salah.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex minHeight="100vh" width="full" align="center" justify="center" bg="gray.50">
      <Container maxW="md">
        <Box 
          p={8} 
          bg="white" 
          borderRadius="xl" 
          boxShadow="lg"
          as="form" 
          onSubmit={handleSubmit} 
        >
          <VStack spacing={6} align="stretch">
            
            <Box textAlign="center">
              <Heading size="lg" color="teal.600">Sistem Kinerja PIH</Heading>
              <Text color="gray.500" mt={2}>Silakan login ke akun Anda</Text>
            </Box>
            
            <FormControl isRequired isInvalid={!!errorMsg}>
              <FormLabel fontWeight="bold">Email (Username)</FormLabel>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                bg="gray.50"
              />
            </FormControl>
            
            <FormControl isRequired isInvalid={!!errorMsg}>
              <FormLabel fontWeight="bold">Password</FormLabel>
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                bg="gray.50"
              />
            </FormControl>
            
            {/* // NOTES: [ACTIVITY] Menampilkan pesan error jika login gagal // */}
            {errorMsg && (
              <Alert status="error" borderRadius="md" size="sm">
                <AlertIcon />
                <Text fontSize="sm">{errorMsg}</Text>
              </Alert>
            )}
            
            <Button 
              colorScheme="teal" 
              size="lg"
              width="full" 
              type="submit" 
              isLoading={isLoading} 
              loadingText="Memverifikasi..."
              mt={2}
            >
              Login Sistem
            </Button>
            
          </VStack>
        </Box>
      </Container>
    </Flex>
  );
}

export default LoginView;