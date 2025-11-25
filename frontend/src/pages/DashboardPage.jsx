// src/pages/DashboardPage.jsx
// VERSI FINAL INTEGRASI: Filter Lengkap, Modal Detail, Logika Revisi, & User Management

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Heading, Text, Button, Spinner, Alert, AlertIcon,
  List, ListItem, ListIcon, IconButton, useToast, useDisclosure,
  Flex, Spacer, Tag, Badge, ButtonGroup,
  Tabs, TabList, TabPanels, Tab, TabPanel, Tooltip
} from '@chakra-ui/react';

// Impor Ikon (Termasuk Warning & Info)
import { 
  CheckCircleIcon, TimeIcon, CheckIcon, AddIcon, 
  StarIcon, EditIcon, InfoIcon, WarningTwoIcon, RepeatIcon 
} from '@chakra-ui/icons'; 

// Impor Semua Komponen
import AddTaskForm from '../components/AddTaskForm';
import ReviewTaskForm from '../components/ReviewTaskForm';
import CompleteTaskModal from '../components/CompleteTaskModal';
import ReportGenerator from '../components/ReportGenerator';
import UserManagement from '../components/UserManagement';
import TaskDetailModal from '../components/TaskDetailModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function DashboardPage({ user, usersList, onLogout }) { 
  // --- State ---
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentTask, setCurrentTask] = useState(null); 
  
  // --- Hooks Modal ---
  const addTaskDisclosure = useDisclosure();
  const reviewDisclosure = useDisclosure();
  const completeDisclosure = useDisclosure();
  const detailDisclosure = useDisclosure();
  
  // --- Fetch Data ---
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Logika Endpoint berdasarkan Role
      let endpointPath = '/tasks'; 
      if (user?.role === 'intern') {
        endpointPath = '/tasks/me'; 
      }
      const response = await axios.get(`${API_URL}${endpointPath}`);
      setTasks(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(`Gagal mengambil data. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTasks(); 
  }, [user]);

  // --- Update State Lokal (Optimistic UI) ---
  const updateLocalTask = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  const addTaskLocally = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  // --- Modal Handlers ---
  const openReviewModal = (task) => { setCurrentTask(task); reviewDisclosure.onOpen(); };
  const openCompleteModal = (task) => { setCurrentTask(task); completeDisclosure.onOpen(); };
  const openDetailModal = (task) => { setCurrentTask(task); detailDisclosure.onOpen(); };
  
  // Helper: Ambil Nama Assignee
  const getAssigneeName = (assigneeId) => {
      if (!usersList) return '...'; 
      const assignee = usersList.find(u => u.id === assigneeId);
      return assignee ? assignee.nama : 'Tidak Ditugaskan';
  };

  // --- LOGIKA FILTER CANGGIH ---
  const filteredTasks = tasks.filter(task => {
    const status = task.status ? task.status.trim() : "";
    
    if (filterStatus === 'my_tasks') return task.assignee_id === user.id;
    if (filterStatus === 'all') return true;
    
    if (filterStatus === 'to_do') return status === 'To Do';
    if (filterStatus === 'revision') return status === 'Need Revision';
    if (filterStatus === 'done') return status === 'Done';
    if (filterStatus === 'reviewed') return status === 'Reviewed';
    
    return true;
  });

  return (
    <Box p={5} maxWidth="1000px" margin="auto">
      
      {/* HEADER */}
      <Flex mb={6} alignItems="center" flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Dashboard</Heading>
          <Text fontSize="md" color="gray.600">User: <b>{user?.nama}</b> ({user?.role})</Text>
        </Box>
        <Spacer />
        {user?.role !== 'intern' && (
          <Button leftIcon={<AddIcon />} colorScheme='teal' size="sm" onClick={addTaskDisclosure.onOpen}>
            Tambah Tugas
          </Button>
        )}
        <Button colorScheme='red' variant='outline' size="sm" onClick={onLogout} ml={2}>
          Logout
        </Button>
      </Flex>

      {/* TABS */}
      <Tabs isFitted variant='enclosed' colorScheme='teal' isLazy>
        <TabList mb='1em'>
          <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Daftar Tugas</Tab>
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Laporan Kinerja</Tab>}
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Kelola Tim</Tab>}
        </TabList>

        <TabPanels>
          
          {/* PANEL 1: DAFTAR TUGAS */}
          <TabPanel p={0}>
            <Box overflowX="auto" pb={2} mb={4}>
                <ButtonGroup size="sm" isAttached variant="outline">
                <Button onClick={() => setFilterStatus('all')} isActive={filterStatus === 'all'} _active={{ bg: 'teal.600', color: 'white' }}>
                    Semua
                </Button>
                <Button onClick={() => setFilterStatus('my_tasks')} isActive={filterStatus === 'my_tasks'} _active={{ bg: 'teal.600', color: 'white' }}>
                    Tugas Saya
                </Button>
                <Button onClick={() => setFilterStatus('to_do')} isActive={filterStatus === 'to_do'} _active={{ bg: 'teal.600', color: 'white' }}>
                    Aktif (To Do)
                </Button>
                <Button onClick={() => setFilterStatus('revision')} isActive={filterStatus === 'revision'} _active={{ bg: 'red.500', color: 'white' }} colorScheme="red">
                    Perlu Revisi ⚠️
                </Button>
                
                {user?.role !== 'intern' && (
                    <Button onClick={() => setFilterStatus('done')} isActive={filterStatus === 'done'} _active={{ bg: 'teal.600', color: 'white' }}>
                    Perlu Review (Done)
                    </Button>
                )}
                
                <Button onClick={() => setFilterStatus('reviewed')} isActive={filterStatus === 'reviewed'} _active={{ bg: 'teal.600', color: 'white' }}>
                    Selesai
                </Button>
                </ButtonGroup>
            </Box>
            
            {isLoading && <Box textAlign="center" p={10}><Spinner thickness='4px' speed='0.65s' emptyColor='gray.200' color='teal.500' size='xl' /><Text mt={4}>Memuat...</Text></Box>}
            {error && <Alert status='error'><AlertIcon />{error}</Alert>}
            
            {!isLoading && !error && (
              <List spacing={3}>
                {filteredTasks.length === 0 ? (
                    <Box p={5} textAlign="center" bg="gray.50" borderRadius="md">
                        <Text color="gray.500">Tidak ada tugas di kategori ini.</Text>
                    </Box>
                ) : (
                  filteredTasks.map((task) => (
                    <ListItem key={task.id} p={3} borderWidth={1} borderRadius="md" _hover={{ shadow: 'md' }} bg="white" display="flex" alignItems="center">
                      
                      {/* Ikon Status */}
                      <ListIcon 
                        as={
                          task.status === 'Reviewed' ? CheckCircleIcon : 
                          (task.status === 'Done' ? CheckIcon : 
                          (task.status === 'Need Revision' ? WarningTwoIcon : TimeIcon))
                        } 
                        color={
                          task.status === 'Reviewed' ? 'green.500' : 
                          (task.status === 'Done' ? 'blue.500' : 
                          (task.status === 'Need Revision' ? 'red.500' : 'gray.400'))
                        }
                        fontSize="xl" mr={3}
                      />
                      
                      {/* Info Tugas */}
                      <Box flexGrow={1}>
                        <Flex alignItems="center">
                           <Heading size="xs" mr={2}>{task.title}</Heading>
                           {/* Tombol Detail (Mata) */}
                           <Tooltip label="Lihat Detail & Instruksi">
                             <IconButton icon={<InfoIcon />} size="xs" variant="ghost" colorScheme="blue" onClick={() => openDetailModal(task)} />
                           </Tooltip>
                        </Flex>
                        
                        <Text fontSize="xs" color="gray.500">
                          {user.role !== 'intern' && <span>To: <b>{getAssigneeName(task.assignee_id)}</b> • </span>}
                          Prioritas: <Badge colorScheme={task.priority === 'High' ? 'red' : 'gray'} fontSize="0.6em">{task.priority}</Badge>
                          {' • '}
                          <Tag size="sm" variant="subtle" colorScheme={task.status === 'Need Revision' ? 'red' : 'gray'}>{task.status}</Tag>
                        </Text>

                        {/* Rating (Jika Reviewed) */}
                        {task.status === 'Reviewed' && task.rating && (
                          <Tag size="sm" colorScheme="yellow" mt={1} variant="subtle">
                            <StarIcon mr={1} /> {task.rating}/5
                          </Tag>
                        )}
                        
                        {/* Pesan Revisi (Jika Need Revision) */}
                        {task.status === 'Need Revision' && task.feedback && (
                            <Text fontSize="xs" color="red.500" mt={1} fontStyle="italic">
                                ⚠️ Note: "{task.feedback}"
                            </Text>
                        )}
                      </Box>
                      
                      {/* TOMBOL AKSI */}

                      {/* Intern: Submit / Submit Ulang */}
                      {user.role === 'intern' && (task.status === 'To Do' || task.status === 'Need Revision') && (
                        <Tooltip label={task.status === 'Need Revision' ? "Submit Ulang Revisi" : "Selesaikan"}>
                            <IconButton 
                                icon={task.status === 'Need Revision' ? <RepeatIcon /> : <CheckIcon />} 
                                size='sm' 
                                colorScheme={task.status === 'Need Revision' ? 'red' : 'green'} 
                                onClick={() => openCompleteModal(task)} 
                                ml={2} 
                            />
                        </Tooltip>
                      )}
                      
                      {/* Manajer: Review (Hanya jika Done/Revisi kembali ke Done) */}
                      {user.role !== 'intern' && (task.status === 'Done') && (
                        <Tooltip label="Review Tugas">
                            <IconButton icon={<EditIcon />} size='sm' colorScheme='yellow' onClick={() => openReviewModal(task)} ml={2} />
                        </Tooltip>
                      )}

                    </ListItem>
                  ))
                )}
              </List>
            )}
          </TabPanel>
          
          {/* PANEL 2: Laporan */}
          {user?.role !== 'intern' && (
            <TabPanel p={0}><ReportGenerator users={usersList} /></TabPanel>
          )}

          {/* PANEL 3: Kelola Tim */}
          {user?.role !== 'intern' && (
            <TabPanel p={0}><UserManagement users={usersList} onRefresh={() => window.location.reload()} /></TabPanel>
          )}
        </TabPanels>
      </Tabs>

      {/* MODAL POPUPS */}
      {user?.role !== 'intern' && (
        <>
            <AddTaskForm isOpen={addTaskDisclosure.isOpen} onClose={addTaskDisclosure.onClose} projectId={1} users={usersList ? usersList.filter(u => u.role === 'intern') : []} onTaskAdded={addTaskLocally} />
            <ReviewTaskForm isOpen={reviewDisclosure.isOpen} onClose={reviewDisclosure.onClose} task={currentTask} onTaskReviewed={updateLocalTask} />
        </>
      )}
      <CompleteTaskModal isOpen={completeDisclosure.isOpen} onClose={completeDisclosure.onClose} task={currentTask} onTaskCompleted={updateLocalTask} />
      
      {/* Modal Detail untuk Semua User */}
      <TaskDetailModal isOpen={detailDisclosure.isOpen} onClose={detailDisclosure.onClose} task={currentTask} />
      
    </Box>
  );
}

export default DashboardPage;