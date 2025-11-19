// src/components/ReportGenerator.jsx
// Versi ini sudah mendukung Laporan Individu & Divisi
// DAN sudah menggunakan VITE_API_URL

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  Box, Button, FormControl, FormLabel, Select, Input,
  VStack, Heading, Text, useToast, Spinner, Alert, AlertIcon,
  SimpleGrid, Stat, StatLabel, StatNumber, Flex, Spacer,
  Radio, RadioGroup, Stack
} from '@chakra-ui/react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';

// Registrasi komponen Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Ambil URL API dari environment variable yang kita buat di .env
const API_URL = import.meta.env.VITE_API_URL;

function ReportGenerator({ users }) { 
  
  // Guard clause jika prop 'users' belum siap
  if (!users) {
    return <Text>Memuat data pengguna...</Text>;
  }

  // --- State Management ---
  const [reportType, setReportType] = useState('individu'); // 'individu' or 'divisi'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDivisi, setSelectedDivisi] = useState(''); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const toast = useToast();

  // Memo-isasi daftar divisi
  const divisions = useMemo(() => {
    if (!users || users.length === 0) return [];
    const allDivisions = users
      .filter(u => u.role === 'intern')
      .map(u => u.divisi);
    return [...new Set(allDivisions)].sort();
  }, [users]);

  // --- Handle Submit (Sudah menggunakan VITE_API_URL) ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!startDate || !endDate) {
        toast({ title: "Tanggal wajib diisi", status: "warning", duration: 3000, isClosable: true });
        return;
    }
    
    let endpoint = '';
    let requestBody = {};
    let isFormValid = false;

    if (reportType === 'individu') {
      if (selectedUserId) {
        // Gunakan variabel API_URL
        endpoint = `${API_URL}/generate-report`;
        requestBody = {
          user_id: parseInt(selectedUserId),
          start_date: startDate,
          end_date: endDate
        };
        isFormValid = true;
      } else {
        toast({ title: "Pengguna wajib dipilih", status: "warning", duration: 3000, isClosable: true });
      }
    } else if (reportType === 'divisi') {
      if (selectedDivisi) {
        // Gunakan variabel API_URL
        endpoint = `${API_URL}/generate-report/division`; 
        requestBody = {
          divisi: selectedDivisi,
          start_date: startDate,
          end_date: endDate
        };
        isFormValid = true;
      } else {
        toast({ title: "Divisi wajib dipilih", status: "warning", duration: 3000, isClosable: true });
      }
    }

    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      // Panggil endpoint backend (token sudah ada di default header)
      const response = await axios.post(endpoint, requestBody); 
      setReportData(response.data); 
      toast({
        title: "Laporan Berhasil Dibuat",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } catch (err) {
      console.error("Error generating report:", err);
      const errorMessage = err.response?.data?.detail || "Gagal menghasilkan laporan. Cek log server.";
      setError(errorMessage);
      toast({
        title: "Gagal Membuat Laporan.",
        description: errorMessage,
        status: "error",
        duration: 9000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Fungsi getChartData (Tidak Berubah) ---
  const getChartData = () => {
    if (!reportData || !reportData.chart_data) return null;
    const { label, actual, target } = reportData.chart_data;
    return {
      labels: [label],
      datasets: [
        { label: 'Aktual Selesai', data: [actual], backgroundColor: 'rgba(54, 162, 235, 0.6)' },
        { label: 'Target KPI', data: [target], backgroundColor: 'rgba(255, 99, 132, 0.6)' },
      ],
    };
  };
  const chartData = getChartData();

  // --- Render Utama ---
  return (
    <Box>
      {/* --- 1. Form Input --- */}
      <Box as="form" onSubmit={handleSubmit} p={4} borderWidth={1} borderRadius="md" mb={6}>
        <VStack spacing={4}>
          
          <FormControl isRequired>
            <FormLabel>Tipe Laporan</FormLabel>
            <RadioGroup onChange={setReportType} value={reportType}>
              <Stack direction='row' spacing={5}>
                <Radio value='individu'>Per Individu</Radio>
                <Radio value='divisi'>Per Divisi</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          {/* Tampilkan jika tipe 'individu' */}
          {reportType === 'individu' && (
            <FormControl isRequired>
              <FormLabel>Pilih Pengguna (Intern)</FormLabel>
              <Select 
                placeholder='Pilih Anggota Tim Intern' 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users && users.filter(u => u.role === 'intern').map(user => (
                  <option key={user.id} value={user.id}>{user.nama} ({user.divisi})</option>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Tampilkan jika tipe 'divisi' */}
          {reportType === 'divisi' && (
            <FormControl isRequired>
              <FormLabel>Pilih Divisi</FormLabel>
              <Select 
                placeholder='Pilih Divisi' 
                value={selectedDivisi}
                onChange={(e) => setSelectedDivisi(e.target.value)}
              >
                {divisions.map(divisi => (
                  <option key={divisi} value={divisi}>{divisi}</option>
                ))}
              </Select>
            </FormControl>
          )}
          
          {/* Pilihan Tanggal */}
          <SimpleGrid columns={2} spacing={4} width="100%">
            <FormControl isRequired>
              <FormLabel>Tanggal Mulai</FormLabel>
              <Input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Tanggal Selesai</FormLabel>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </FormControl>
          </SimpleGrid>
          
          <Button 
            type="submit" 
            colorScheme="teal" 
            isLoading={isLoading} 
            width="100%"
          >
            Generate Laporan
          </Button>
        </VStack>
      </Box>

      {/* --- 2. Area Hasil (Tidak Berubah) --- */}
      {isLoading && (
        <Box textAlign="center" p={10}>
          <Spinner size="xl" />
          <Text mt={4}>Menghubungi LLM... Ini mungkin butuh beberapa detik...</Text>
        </Box>
      )}
      
      {error && (
        <Alert status='error' borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {reportData && (
        <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
          <Heading size="md" mb={4}>Hasil Laporan Kinerja</Heading>
          
          <Box mb={6} p={4} bg="white" borderRadius="md" shadow="sm">
            <Heading size="sm" mb={3}>Grafik KPI Objektif</Heading>
            {chartData && <Bar data={chartData} options={{ responsive: true }} />}
          </Box>
          
          <Box p={4} bg="white" borderRadius="md" shadow="sm">
            <Heading size="sm" mb={3}>Analisis Naratif (Dihasilkan oleh LLM)</Heading>
            <Text whiteSpace="pre-wrap"> 
              {reportData.narrative_report}
            </Text>
          </Box>
          
          {reportData.value_scores && (
            <Box mt={6} p={4} bg="white" borderRadius="md" shadow="sm">
              <Heading size="sm" mb={4}>Analisis 5 Core Values</Heading>
              <VStack spacing={4} align="stretch">
                {reportData.value_scores.map((value) => (
                  <Stat key={value.value_name} p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                    <Flex>
                      <Box>
                        <StatLabel color="gray.600">{value.value_name}</StatLabel>
                        <StatNumber fontSize="2xl">{value.score} / 5</StatNumber>
                      </Box>
                      <Spacer />
                      <Text fontSize="sm" color="gray.700" maxWidth="70%" fontStyle="italic">
                        "{value.justification}"
                      </Text>
                    </Flex>
                  </Stat>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ReportGenerator;