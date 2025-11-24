// src/components/ReportGenerator.jsx
// Versi SAFETY FIRST - Mencegah layar putih jika data LLM tidak sempurna

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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function ReportGenerator({ users }) { 
  
  // Guard clause aman
  if (!users) {
    return <Text>Memuat data pengguna...</Text>;
  }

  const [reportType, setReportType] = useState('individu');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDivisi, setSelectedDivisi] = useState(''); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const toast = useToast();

  const divisions = useMemo(() => {
    if (!users || users.length === 0) return [];
    const allDivisions = users
      .filter(u => u.role === 'intern' && u.divisi)
      .map(u => u.divisi);
    return [...new Set(allDivisions)].sort();
  }, [users]);

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
      const response = await axios.post(endpoint, requestBody);
      console.log("Data Laporan Diterima:", response.data); // Debugging
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
      const errorMessage = err.response?.data?.detail || "Gagal menghasilkan laporan. Cek koneksi atau data.";
      setError(errorMessage);
      toast({
        title: "Gagal Membuat Laporan",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Fungsi Chart Aman ---
  const getChartData = () => {
    // Cek apakah data chart ada dan valid
    if (!reportData || !reportData.chart_data) return null;
    
    const { label, actual, target } = reportData.chart_data;
    
    // Cek jika nilai actual/target undefined
    if (actual === undefined || target === undefined) return null;

    return {
      labels: [label || "Kinerja"],
      datasets: [
        { label: 'Aktual Selesai', data: [actual], backgroundColor: 'rgba(54, 162, 235, 0.6)' },
        { label: 'Target KPI', data: [target], backgroundColor: 'rgba(255, 99, 132, 0.6)' },
      ],
    };
  };
  const chartData = getChartData();

  return (
    <Box>
      {/* Form Input */}
      <Box as="form" onSubmit={handleSubmit} p={4} borderWidth={1} borderRadius="md" mb={6}>
        <VStack spacing={4}>
          <FormControl>
            <FormLabel>Tipe Laporan</FormLabel>
            <RadioGroup onChange={setReportType} value={reportType}>
              <Stack direction='row' spacing={5}>
                <Radio value='individu'>Per Individu</Radio>
                <Radio value='divisi'>Per Divisi</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          {reportType === 'individu' && (
            <FormControl isRequired>
              <FormLabel>Pilih Pengguna (Intern)</FormLabel>
              <Select placeholder='Pilih Anggota Tim Intern' value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                {users && users.filter(u => u.role === 'intern').map(user => (
                  <option key={user.id} value={user.id}>{user.nama} ({user.divisi})</option>
                ))}
              </Select>
            </FormControl>
          )}

          {reportType === 'divisi' && (
            <FormControl isRequired>
              <FormLabel>Pilih Divisi</FormLabel>
              <Select placeholder='Pilih Divisi' value={selectedDivisi} onChange={(e) => setSelectedDivisi(e.target.value)}>
                {divisions.map(divisi => (
                  <option key={divisi} value={divisi}>{divisi}</option>
                ))}
              </Select>
            </FormControl>
          )}
          
          <SimpleGrid columns={2} spacing={4} width="100%">
            <FormControl isRequired>
              <FormLabel>Tanggal Mulai</FormLabel>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Tanggal Selesai</FormLabel>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </FormControl>
          </SimpleGrid>
          
          <Button type="submit" colorScheme="teal" isLoading={isLoading} width="100%">
            Generate Laporan
          </Button>
        </VStack>
      </Box>

      {/* Area Hasil */}
      {isLoading && (
        <Box textAlign="center" p={10}>
          <Spinner size="xl" />
          <Text mt={4}>Menghubungi LLM... Mohon tunggu...</Text>
        </Box>
      )}
      
      {error && (
        <Alert status='error' borderRadius="md"><AlertIcon />{error}</Alert>
      )}

      {/* Render Hasil HANYA jika reportData ada */}
      {reportData && (
        <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
          <Heading size="md" mb={4}>Hasil Laporan Kinerja</Heading>
          
          {/* Grafik - Render hanya jika data valid */}
          {chartData ? (
            <Box mb={6} p={4} bg="white" borderRadius="md" shadow="sm">
              <Heading size="sm" mb={3}>Grafik KPI Objektif</Heading>
              <Bar data={chartData} options={{ responsive: true }} />
            </Box>
          ) : (
            <Alert status="warning" mb={4}><AlertIcon />Data grafik tidak lengkap dari LLM.</Alert>
          )}
          
          {/* Narasi */}
          <Box p={4} bg="white" borderRadius="md" shadow="sm">
            <Heading size="sm" mb={3}>Analisis Naratif (LLM)</Heading>
            <Text whiteSpace="pre-wrap"> 
              {reportData.narrative_report || "Tidak ada narasi yang dihasilkan."}
            </Text>
          </Box>
          
          {/* Core Values - Pastikan Array sebelum di-map */}
          {Array.isArray(reportData.value_scores) && reportData.value_scores.length > 0 && (
            <Box mt={6} p={4} bg="white" borderRadius="md" shadow="sm">
              <Heading size="sm" mb={4}>Analisis 5 Core Values</Heading>
              <VStack spacing={4} align="stretch">
                {reportData.value_scores.map((value, index) => (
                  <Stat key={index} p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                    <Flex>
                      <Box>
                        <StatLabel color="gray.600">{value.value_name || "Value"}</StatLabel>
                        <StatNumber fontSize="2xl">{value.score} / 5</StatNumber>
                      </Box>
                      <Spacer />
                      <Text fontSize="sm" color="gray.700" maxWidth="70%" fontStyle="italic">
                        "{value.justification || "-"}"
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