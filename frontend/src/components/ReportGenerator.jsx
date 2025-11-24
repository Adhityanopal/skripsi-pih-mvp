// src/components/ReportGenerator.jsx
// Versi ROBUST & DEBUG - Toleransi tinggi terhadap format JSON LLM

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
  if (!users) return <Text>Memuat data...</Text>;

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

    if (reportType === 'individu') {
      if (!selectedUserId) {
        toast({ title: "Pilih pengguna", status: "warning", duration: 3000, isClosable: true });
        return;
      }
      endpoint = `${API_URL}/generate-report`;
      requestBody = { user_id: parseInt(selectedUserId), start_date: startDate, end_date: endDate };
    } else {
      if (!selectedDivisi) {
        toast({ title: "Pilih divisi", status: "warning", duration: 3000, isClosable: true });
        return;
      }
      endpoint = `${API_URL}/generate-report/division`; 
      requestBody = { divisi: selectedDivisi, start_date: startDate, end_date: endDate };
    }

    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      const response = await axios.post(endpoint, requestBody);
      console.log("🔍 RAW DATA DARI LLM:", response.data); // <-- CEK CONSOLE (F12) DISINI!
      setReportData(response.data); 
      toast({ title: "Laporan Siap", status: "success", duration: 3000, isClosable: true, position: "top" });
    } catch (err) {
      console.error("Error:", err);
      setError(err.response?.data?.detail || "Gagal generate laporan.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Fungsi Chart Super Aman ---
  const getChartData = () => {
    if (!reportData) return null;
    
    // Coba cari di berbagai kemungkinan nama key
    const chartObj = reportData.chart_data || reportData.chartData || reportData.data_grafik;

    if (!chartObj) {
        console.warn("Objek chart tidak ditemukan di JSON");
        return null;
    }
    
    // Ambil nilai dengan aman (handle string atau number)
    const label = chartObj.label || "Kinerja";
    const actual = parseInt(chartObj.actual || chartObj.aktual || 0);
    const target = parseInt(chartObj.target || 0);

    return {
      labels: [label],
      datasets: [
        { label: 'Aktual', data: [actual], backgroundColor: 'rgba(54, 162, 235, 0.6)' },
        { label: 'Target', data: [target], backgroundColor: 'rgba(255, 99, 132, 0.6)' },
      ],
    };
  };
  
  // --- Fungsi Value Scores Aman ---
  const getValueScores = () => {
      if (!reportData) return [];
      // Coba berbagai key
      const scores = reportData.value_scores || reportData.valueScores || reportData.nilai_inti || [];
      return Array.isArray(scores) ? scores : [];
  };

  const chartData = getChartData();
  const valueScores = getValueScores();

  return (
    <Box>
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
              <FormLabel>Pilih Pengguna</FormLabel>
              <Select placeholder='Pilih Anggota' value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
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
              <FormLabel>Dari Tanggal</FormLabel>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Sampai Tanggal</FormLabel>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </FormControl>
          </SimpleGrid>
          
          <Button type="submit" colorScheme="teal" isLoading={isLoading} width="100%">Generate Laporan</Button>
        </VStack>
      </Box>

      {isLoading && <Box textAlign="center" p={10}><Spinner size="xl" /><Text mt={4}>Analisis AI sedang berjalan...</Text></Box>}
      
      {error && <Alert status='error'><AlertIcon />{error}</Alert>}

      {reportData && (
        <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
          <Heading size="md" mb={4}>Laporan Kinerja</Heading>
          
          {/* Grafik */}
          {chartData ? (
            <Box mb={6} p={4} bg="white" borderRadius="md" shadow="sm">
              <Heading size="sm" mb={3}>Grafik Pencapaian</Heading>
              <Bar data={chartData} options={{ responsive: true }} />
            </Box>
          ) : (
            <Alert status="warning" mb={4}><AlertIcon />Data grafik tidak terdeteksi. Cek Console.</Alert>
          )}
          
          {/* Narasi */}
          <Box p={4} bg="white" borderRadius="md" shadow="sm" mb={6}>
            <Heading size="sm" mb={3}>Analisis Naratif</Heading>
            <Text whiteSpace="pre-wrap"> 
              {reportData.narrative_report || reportData.laporan_naratif || "Tidak ada narasi."}
            </Text>
          </Box>
          
          {/* 5 Core Values */}
          {valueScores.length > 0 ? (
            <Box p={4} bg="white" borderRadius="md" shadow="sm">
              <Heading size="sm" mb={4}>Analisis 5 Core Values</Heading>
              <VStack spacing={4} align="stretch">
                {valueScores.map((value, index) => (
                  <Stat key={index} p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                    <Flex>
                      <Box>
                        <StatLabel color="gray.600">{value.value_name || value.name || "Value"}</StatLabel>
                        <StatNumber fontSize="2xl">{value.score || 0} / 5</StatNumber>
                      </Box>
                      <Spacer />
                      <Text fontSize="sm" color="gray.700" maxWidth="70%" fontStyle="italic">
                        "{value.justification || value.reason || "-"}"
                      </Text>
                    </Flex>
                  </Stat>
                ))}
              </VStack>
            </Box>
          ) : (
            <Alert status="info"><AlertIcon />Detail Core Values tidak tersedia di respons ini.</Alert>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ReportGenerator;