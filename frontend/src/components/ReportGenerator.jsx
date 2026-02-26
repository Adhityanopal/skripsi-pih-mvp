// src/components/ReportGenerator.jsx
import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  Box, Button, FormControl, FormLabel, Select, Input,
  VStack, Heading, Text, Spinner, Alert, AlertIcon,
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
  if (!users) return <Text>Memuat data pengguna...</Text>;

  const [reportType, setReportType] = useState('individu');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDivisi, setSelectedDivisi] = useState(''); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // State error khusus
  const [reportData, setReportData] = useState(null);

  const divisions = useMemo(() => {
    if (!users || users.length === 0) return [];
    const allDivisions = users
      .filter(u => u.role === 'intern' && u.divisi)
      .map(u => u.divisi);
    return [...new Set(allDivisions)].sort();
  }, [users]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg(null);
    
    // Validasi Kosong (Sesuai Diagram)
    if (!startDate || !endDate) {
        setErrorMsg("data yang dimasukkan tidak valid");
        return;
    }
    
    let endpoint = '';
    let requestBody = {};

    if (reportType === 'individu') {
      if (selectedUserId) {
        endpoint = `${API_URL}/generate-report`;
        requestBody = { user_id: selectedUserId, start_date: startDate, end_date: endDate };
      } else {
        setErrorMsg("data yang dimasukkan tidak valid");
        return;
      }
    } else {
      if (!selectedDivisi) {
        setErrorMsg("data yang dimasukkan tidak valid");
        return;
      }
      endpoint = `${API_URL}/generate-report/division`; 
      requestBody = { divisi: selectedDivisi, start_date: startDate, end_date: endDate };
    }

    setIsLoading(true);
    setReportData(null);

    try {
      // PERBAIKAN: Kirim Token Login agar tidak di-blokir Backend
      const token = localStorage.getItem('authToken');
      
      const response = await axios.post(endpoint, requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReportData(response.data); 
    } catch (err) {
      console.error("Error AI:", err);
      // Tangkap pesan gagal (misal: "Tidak ada data tugas")
      setErrorMsg("data yang dimasukkan tidak valid");
    } finally {
      setIsLoading(false);
    }
  };
  
  const getChartData = () => {
    if (!reportData || !reportData.chart_data) return null;
    const { label, actual, target } = reportData.chart_data;
    return {
      labels: [label],
      datasets: [
        { label: 'Aktual', data: [actual], backgroundColor: 'rgba(54, 162, 235, 0.6)' },
        { label: 'Target', data: [target], backgroundColor: 'rgba(255, 99, 132, 0.6)' },
      ],
    };
  };
  
  const getValueScores = () => {
      if (!reportData) return [];
      const scores = reportData.value_scores || [];
      return Array.isArray(scores) ? scores : [];
  };

  const chartData = getChartData();
  const valueScores = getValueScores();

  return (
    <Box>
      <Box as="form" onSubmit={handleSubmit} p={4} borderWidth={1} borderRadius="md" mb={6}>
        <VStack spacing={4} align="stretch">
          
          {/* KOTAK MERAH ERROR */}
          {errorMsg && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {errorMsg}
            </Alert>
          )}

          <FormControl>
            <FormLabel>Tipe Laporan</FormLabel>
            <RadioGroup onChange={setReportType} value={reportType}>
              <Stack direction='row' spacing={5}>
                <Radio value='individu'>Individu</Radio>
                <Radio value='divisi'>Divisi</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          {reportType === 'individu' && (
            <FormControl isRequired>
              <FormLabel>Pilih Intern</FormLabel>
              {/* PERBAIKAN: Placeholder diperjelas agar form tidak nge-bug */}
              <Select placeholder='Pilih Intern...' value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                {users && users.filter(u => u.role === 'intern').map(user => (
                  <option key={user.user_id} value={user.user_id}>{user.nama} ({user.divisi})</option>
                ))}
              </Select>
            </FormControl>
          )}

          {reportType === 'divisi' && (
            <FormControl isRequired>
              <FormLabel>Pilih Divisi</FormLabel>
              <Select placeholder='Pilih Divisi...' value={selectedDivisi} onChange={(e) => setSelectedDivisi(e.target.value)}>
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
              <FormLabel>Hingga Tanggal</FormLabel>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </FormControl>
          </SimpleGrid>
          
          <Button type="submit" colorScheme="teal" isLoading={isLoading} width="100%">Generate Laporan</Button>
        </VStack>
      </Box>

      {isLoading && <Box textAlign="center" p={10}><Spinner size="xl" /><Text mt={4}>Analisis AI sedang berjalan...</Text></Box>}

      {reportData && (
        <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
          <Heading size="md" mb={4}>Hasil Laporan</Heading>
          
          {chartData && (
            <Box mb={6} p={4} bg="white" borderRadius="md" shadow="sm">
              <Heading size="sm" mb={3}>Grafik Pencapaian</Heading>
              <Bar data={chartData} options={{ responsive: true }} />
            </Box>
          )}
          
          <Box p={4} bg="white" borderRadius="md" shadow="sm" mb={6}>
            <Heading size="sm" mb={3}>Analisis Naratif</Heading>
            <Text whiteSpace="pre-wrap"> 
              {reportData.narrative_report || "Tidak ada narasi."}
            </Text>
          </Box>
          
          {valueScores.length > 0 && (
            <Box p={4} bg="white" borderRadius="md" shadow="sm">
              <Heading size="sm" mb={4}>Analisis 5 Core Values</Heading>
              <VStack spacing={4} align="stretch">
                {valueScores.map((value, index) => (
                  <Stat key={index} p={3} borderWidth={1} borderRadius="md" bg="gray.50">
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