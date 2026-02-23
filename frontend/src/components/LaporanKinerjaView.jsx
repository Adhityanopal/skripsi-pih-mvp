// =================================================================
// FILE: LaporanKinerjaView.jsx (REVISI FINAL - SYNC BAB 4)
// FUNGSI: Implementasi Use Case Generate Laporan [UC-06]
// INTEGRASI: Decision Support System dengan Gemini AI
// =================================================================

import React, { useState } from 'react';
import {
  Box, Button, FormControl, FormLabel, Select, VStack, Heading, 
  Text, useToast, Spinner, Alert, AlertIcon, SimpleGrid, 
  Stat, StatLabel, StatNumber, Badge, Divider
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function LaporanKinerjaView({ users }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleGenerate = async () => {
    // // NOTES: [ALT-SCENARIO] Validasi Pilihan User //
    if (!selectedUserId) {
      return toast({
        title: "Skenario Gagal",
        description: "Silakan pilih anggota tim yang ingin dianalisis.",
        status: "warning",
      });
    }

    setIsLoading(true);
    try {
      // // NOTES: [SEQUENCE] Request ke endpoint AI di Backend //
      const res = await axios.post(`${API_URL}/generate-report?user_id=${selectedUserId}`);
      setReportData(res.data);
      
      toast({
        title: "Skenario Sukses",
        description: "Laporan berbasis AI berhasil dibuat.",
        status: "success",
      });
    } catch (error) {
      toast({
        title: "Skenario Gagal",
        description: error.response?.data?.detail || "Gagal menghubungi sistem AI.",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Box p={6} bg="white" shadow="sm" borderRadius="md" borderWidth="1px">
        <Heading size="md" mb={4}>Generate Analisis Kinerja (AI)</Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} alignItems="flex-end">
          <FormControl isRequired>
            <FormLabel>Pilih Anggota Tim</FormLabel>
            <Select 
              placeholder="Pilih Intern..." 
              value={selectedUserId} 
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {users.filter(u => u.role === 'intern').map(user => (
                <option key={user.id} value={user.id}>{user.nama} ({user.divisi})</option>
              ))}
            </Select>
          </FormControl>
          
          <Button 
            colorScheme="purple" 
            onClick={handleGenerate} 
            isLoading={isLoading}
            loadingText="Menganalisis..."
          >
            Mulai Analisis AI
          </Button>
        </SimpleGrid>
      </Box>

      {/* --- HASIL ANALISIS AI --- */}
      {reportData && (
        <Box p={6} bg="white" shadow="md" borderRadius="md" borderTop="4px solid" borderColor="purple.500">
          <Heading size="sm" mb={4}>Hasil Evaluasi Large Language Model (Gemini)</Heading>
          
          <Box mb={6} p={4} bg="gray.50" borderRadius="md">
            <Text fontWeight="bold" mb={2} color="purple.700">Narasi Evaluasi:</Text>
            <Text fontSize="md" fontStyle="italic" lineHeight="tall">
              "{reportData.evaluation_narrative || reportData.analysis}"
            </Text>
          </Box>

          <Divider mb={6} />

          <Heading size="xs" mb={4} color="gray.500" textTransform="uppercase">Skor Core Values (DSS):</Heading>
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
            {reportData.core_values?.map((val, idx) => (
              <Stat key={idx} p={3} border="1px solid" borderColor="gray.100" borderRadius="md" textAlign="center">
                <StatLabel fontSize="xs">{val.name}</StatLabel>
                <StatNumber color="purple.600">{val.score}/5</StatNumber>
                <Badge size="xs" colorScheme="purple" variant="subtle">AI Rated</Badge>
              </Stat>
            )) || <Text fontSize="xs">Data skor tidak tersedia dalam output AI.</Text>}
          </SimpleGrid>
        </Box>
      )}

      {!reportData && !isLoading && (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          Pilih anggota tim dan klik tombol untuk memulai pendukung keputusan berbasis AI.
        </Alert>
      )}
    </VStack>
  );
}

export default LaporanKinerjaView;