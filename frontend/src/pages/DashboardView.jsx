// =================================================================
// FILE: DashboardView.jsx (REVISI FINAL - SYNC BAB 4)
// FUNGSI: View Utama dengan Role-Based Access Control (RBAC)
// AKTOR: Administrator, Team Lead, Staf Media, Intern, Kepala PIH
// =================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Button, 
  Badge, useDisclosure, useToast, Flex, Text, Tabs, TabList, Tab, TabPanels, TabPanel
} from '@chakra-ui/react';

// Import Komponen sesuai Class Diagram
import TambahTugasView from '../components/TambahTugasView';
import ReviewTugasView from '../components/ReviewTugasView';
import SubmitTugasView from '../components/SubmitTugasView';
import LaporanKinerjaView from '../components/LaporanKinerjaView';
import KelolaTimView from '../components/KelolaTimView';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const DashboardView = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const toast = useToast();

  // Disclosure untuk Modal-modal sesuai Use Case
  const addDisclosure = useDisclosure();
  const reviewDisclosure = useDisclosure();
  const submitDisclosure = useDisclosure();

  useEffect(() => {
    fetchTasks();
    if (user.role === 'administrator' || user.role === 'team lead') fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      setTasks(res.data);
    } catch (err) {
      toast({ title: "Skenario Gagal: Gagal mengambil data tugas.", status: "error" });
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // --- [RBAC LOGIC] MERENDER TOMBOL AKSI SESUAI ROLE DI DIAGRAM ---
  const renderActions = (task) => {
    return (
      <Flex gap={2}>
        {/* [UC-04] SUBMIT TUGAS: Hanya muncul untuk Intern */}
        {user.role === 'intern' && (task.status === 'To Do' || task.status === 'Need Revision') && (
          <Button size="sm" colorScheme="green" onClick={() => { setCurrentTask(task); submitDisclosure.onOpen(); }}>
            Submit Tugas
          </Button>
        )}

        {/* [UC-05] REVIEW & FEEDBACK: Hanya muncul untuk Staf Media */}
        {user.role === 'staf media' && task.status === 'Done' && (
          <Button size="sm" colorScheme="orange" onClick={() => { setCurrentTask(task); reviewDisclosure.onOpen(); }}>
            Review
          </Button>
        )}
      </Flex>
    );
  };

  return (
    <Box p={8}>
      <Flex mb={6} justify="space-between" align="center">
        <Box>
          <Heading size="lg">Dashboard Tim Media</Heading>
          <Text color="gray.600">Selamat datang, {user.nama} ({user.role})</Text>
        </Box>

        {/* [UC-03] MENGINPUT TUGAS: Tombol hanya untuk Team Lead */}
        {user.role === 'team lead' && (
          <Button leftIcon={<span>+</span>} colorScheme="blue" onClick={addDisclosure.onOpen}>
            Tambah Tugas
          </Button>
        )}
      </Flex>

      <Tabs variant="enclosed" colorScheme="teal">
        <TabList>
          <Tab>Daftar Tugas</Tab>
          {/* OPSI TAB BERDASARKAN ROLE */}
          {(user.role === 'kepala pih & koordinator' || user.role === 'staf media') && <Tab>Laporan AI</Tab>}
          {user.role === 'administrator' && <Tab>Kelola Tim</Tab>}
        </TabList>

        <TabPanels>
          <TabPanel>
            <Table variant="simple" bg="white" borderRadius="md" shadow="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Tugas</Th>
                  <Th>Prioritas</Th>
                  <Th>Deadline</Th>
                  <Th>Status</Th>
                  <Th textAlign="right">Aksi</Th>
                </Tr>
              </Thead>
              <Tbody>
                {tasks.map((task) => (
                  <Tr key={task.id}>
                    <Td fontWeight="bold">{task.title}</Td>
                    <Td>
                      <Badge colorScheme={task.priority === 'Urgent' ? 'red' : 'gray'}>
                        {task.priority}
                      </Badge>
                    </Td>
                    <Td>{task.due_date || '-'}</Td>
                    <Td>
                      <Badge variant="outline" colorScheme={task.status === 'Reviewed' ? 'green' : 'blue'}>
                        {task.status}
                      </Badge>
                    </Td>
                    <Td textAlign="right">{renderActions(task)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>

          {/* [UC-06] GENERATE LAPORAN: Panel khusus Pimpinan/Staf */}
          <TabPanel>
             <LaporanKinerjaView users={users} />
          </TabPanel>

          {/* [UC-02] KELOLA DATA TIM: Panel khusus Administrator */}
          <TabPanel>
             <KelolaTimView users={users} onRefresh={fetchUsers} />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* MODAL COMPONENTS */}
      <TambahTugasView 
        isOpen={addDisclosure.isOpen} 
        onClose={addDisclosure.onClose} 
        users={users.filter(u => u.role === 'intern')} 
        onTaskAdded={fetchTasks} 
      />
      
      <ReviewTugasView 
        isOpen={reviewDisclosure.isOpen} 
        onClose={reviewDisclosure.onClose} 
        task={currentTask} 
        onTaskReviewed={fetchTasks} 
      />

      <SubmitTugasView 
        isOpen={submitDisclosure.isOpen} 
        onClose={submitDisclosure.onClose} 
        task={currentTask} 
        onTaskCompleted={fetchTasks} 
      />
    </Box>
  );
};

export default DashboardView;