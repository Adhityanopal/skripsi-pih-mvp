// src/pages/DashboardPage.jsx
// Versi FINAL dengan Debugging & Fix Tampilan

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Heading, Text, Button, Spinner, Alert, AlertIcon,
  List, ListItem, ListIcon, IconButton, useToast, useDisclosure,
  Flex, Spacer, Tag, Badge, ButtonGroup,
  Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, CheckIcon, AddIcon, StarIcon, EditIcon } from '@chakra-ui/icons'; 

// Impor komponen lain
import AddTaskForm from '../components/AddTaskForm';
import ReviewTaskForm from '../components/ReviewTaskForm';
import CompleteTaskModal from '../components/CompleteTaskModal';
import ReportGenerator from '../components/ReportGenerator';
import UserManagement from '../components/UserManagement';

// Ambil URL API
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function DashboardPage({ user, usersList, onLogout }) { 
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'to_do', 'done', 'reviewed'
  
  // State Modal
  const [currentTask, setCurrentTask] = useState(null); 
  const toast = useToast();
  
  const { isOpen: isAddTaskModalOpen, onOpen: onOpenAddTaskModal, onClose: onCloseAddTaskModal } = useDisclosure();
  const { isOpen: isReviewModalOpen, onOpen: onOpenReviewModal, onClose: onCloseReviewModal } = useDisclosure();
  const { isOpen: isCompleteModalOpen, onOpen: onOpenCompleteModal, onClose: onCloseCompleteModal } = useDisclosure();
  
  // --- FUNGSI FETCH UTAMA ---
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Tentukan endpoint
      let endpointPath = '/tasks'; // Default Manager: Ambil SEMUA
      if (user.role === 'intern') {
        endpointPath = '/tasks/me'; // Intern: Ambil punya sendiri
      }
      
      const fullUrl = `${API_URL}${endpointPath}`;
      console.log("🔍 Fetching tasks from:", fullUrl); // Debug Log

      const response = await axios.get(fullUrl);
      
      console.log("✅ Data tugas diterima dari API:", response.data); // Debug Log
      setTasks(response.data);
      
    } catch (err) {
      console.error("❌ Error fetching tasks:", err);
      setError(`Gagal mengambil data. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Panggil fetch saat user siap
  useEffect(() => {
    if (user) {
      fetchTasks(); 
    }
  }, [user]);

  // --- Fungsi Helper ---
  const getAssigneeName = (assigneeId) => {
      if (!usersList) return 'Loading...'; 
      const assignee = usersList.find(u => u.id === assigneeId);
      return assignee ? assignee.nama : 'Tidak Ditugaskan';
  };

  // --- LOGIKA FILTER YANG LEBIH AMAN ---
  const filteredTasks = tasks.filter(task => {
    // Normalisasi status agar aman (antisipasi huruf besar/kecil)
    const status = task.status ? task.status.trim() : "";
    
    if (filterStatus === 'all') return true;
    if (filterStatus === 'to_do') return status === 'To Do';
    if (filterStatus === 'done') return status === 'Done';
    if (filterStatus === 'reviewed') return status === 'Reviewed';
    return true;
  });

  // --- Handlers untuk Update State Lokal (Optimistic UI) ---
  const updateLocalTask = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  const addTaskLocally = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  // Handlers Modal
  const openReviewModal = (task) => { setCurrentTask(task); onOpenReviewModal(); };
  const openCompleteModal = (task) => { setCurrentTask(task); onOpenCompleteModal(); };

  return (
    <Box p={5} maxWidth="900px" margin="auto">
      
      {/* HEADER */}
      <Flex mb={6} alignItems="center" flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Dashboard</Heading>
          <Text fontSize="md" color="gray.600">User: <b>{user?.nama}</b> ({user?.role})</Text>
        </Box>
        <Spacer />
        {user?.role !== 'intern' && (
          <Button leftIcon={<AddIcon />} colorScheme='teal' size="sm" onClick={onOpenAddTaskModal}>
            Tambah Tugas
          </Button>
        )}
        <Button colorScheme='red' variant='outline' size="sm" onClick={onLogout} ml={2}>
          Logout
        </Button>
      </Flex>

      {/* TABS UTAMA */}
      <Tabs isFitted variant='enclosed' colorScheme='teal'>
        <TabList mb='1em'>
          <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Daftar Tugas</Tab>
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Laporan Kinerja</Tab>}
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Kelola Tim</Tab>}
        </TabList>

        <TabPanels>
          
          {/* PANEL 1: DAFTAR TUGAS */}
          <TabPanel p={0}>
            
            {/* Filter Buttons */}
            <ButtonGroup size="sm" isAttached variant="outline" mb={4} flexWrap="wrap">
              <Button onClick={() => setFilterStatus('all')} isActive={filterStatus === 'all'} _active={{ bg: 'teal.600', color: 'white' }}>
                Semua ({tasks.length})
              </Button>
              <Button onClick={() => setFilterStatus('to_do')} isActive={filterStatus === 'to_do'} _active={{ bg: 'teal.600', color: 'white' }}>
                To Do
              </Button>
              {user.role !== 'intern' && (
                <Button onClick={() => setFilterStatus('done')} isActive={filterStatus === 'done'} _active={{ bg: 'teal.600', color: 'white' }}>
                  Perlu Review
                </Button>
              )}
              <Button onClick={() => setFilterStatus('reviewed')} isActive={filterStatus === 'reviewed'} _active={{ bg: 'teal.600', color: 'white' }}>
                Selesai
              </Button>
            </ButtonGroup>
            
            {/* Kondisi Loading / Error / Kosong */}
            {isLoading && (
                <Box textAlign="center" p={10}>
                    <Spinner thickness='4px' speed='0.65s' emptyColor='gray.200' color='teal.500' size='xl' />
                    <Text mt={4}>Memuat data...</Text>
                </Box>
            )}
            
            {error && (
                <Alert status='error' borderRadius="md"><AlertIcon />{error}</Alert>
            )}
            
            {!isLoading && !error && (
              <List spacing={4}>
                {filteredTasks.length === 0 ? (
                  <Box p={5} borderWidth={1} borderRadius="md" bg="gray.50" textAlign="center">
                    <Text color="gray.500">
                      Tidak ada tugas dengan status <b>"{filterStatus}"</b>.
                    </Text>
                  </Box>
                ) : (
                  filteredTasks.map((task) => (
                    <ListItem key={task.id} p={4} borderWidth={1} borderRadius="md" _hover={{ shadow: 'md' }} bg="white" display="flex" alignItems="center">
                      
                      {/* Ikon Status */}
                      <ListIcon 
                        as={task.status === 'Reviewed' ? CheckCircleIcon : (task.status === 'Done' ? EditIcon : TimeIcon)} 
                        color={task.status === 'Reviewed' ? 'green.500' : (task.status === 'Done' ? 'orange.500' : 'gray.400')}
                        fontSize="2xl"
                        mr={4}
                      />
                      
                      {/* Detail Tugas */}
                      <Box flexGrow={1}>
                        <Heading size="sm" mb={1}>{task.title}</Heading>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          {user.role !== 'intern' && <span>Assigned to: <b>{getAssigneeName(task.assignee_id)}</b> • </span>}
                          Prioritas: <Badge colorScheme={task.priority === 'High' ? 'red' : 'gray'}>{task.priority}</Badge>
                          {' • '}
                          Status: <Tag size="sm" colorScheme={task.status === 'Reviewed' ? 'green' : (task.status === 'Done' ? 'orange' : 'gray')}>{task.status}</Tag>
                        </Text>
                        
                        {/* Tampilkan Rating/Feedback jika ada */}
                        {task.rating && (
                          <Flex mt={2} alignItems="center" bg="yellow.50" p={2} borderRadius="md" display="inline-flex">
                            <StarIcon color="orange.400" mr={2} />
                            <Text fontSize="sm" fontWeight="bold">{task.rating}/5</Text>
                            {task.feedback && <Text fontSize="sm" ml={2} color="gray.600">- "{task.feedback}"</Text>}
                          </Flex>
                        )}
                      </Box>
                      
                      {/* Tombol Aksi */}
                      {user.role === 'intern' && task.status === 'To Do' && (
                        <IconButton aria-label="Selesaikan" icon={<CheckIcon />} size='sm' colorScheme='green' onClick={() => openCompleteModal(task)} ml={2} />
                      )}
                      {user.role !== 'intern' && task.status === 'Done' && (
                        <IconButton aria-label="Review" icon={<EditIcon />} size='sm' colorScheme='yellow' onClick={() => openReviewModal(task)} ml={2} />
                      )}

                    </ListItem>
                  ))
                )}
              </List>
            )}
          </TabPanel>
          
          {/* PANEL 2: LAPORAN */}
          {user?.role !== 'intern' && (
            <TabPanel p={0}>
              <UserManagement 
                users={usersList} 
                onRefresh={() => window.location.reload()} 
              /> 
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      {/* Render Modals */}
      {user?.role !== 'intern' && (
        <>
            <AddTaskForm isOpen={isAddTaskModalOpen} onClose={onCloseAddTaskModal} projectId={1} users={usersList ? usersList.filter(u => u.role === 'intern') : []} onTaskAdded={addTaskLocally} />
            <ReviewTaskForm isOpen={isReviewModalOpen} onClose={onCloseReviewModal} task={currentTask} onTaskReviewed={updateLocalTask} />
        </>
      )}
      <CompleteTaskModal isOpen={isCompleteModalOpen} onClose={onCloseCompleteModal} task={currentTask} onTaskCompleted={updateLocalTask} />
    </Box>
  );
}

export default DashboardPage;