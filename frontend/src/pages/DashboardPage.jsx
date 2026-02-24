import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Heading, Text, Button, Spinner, Alert, AlertIcon,
  Flex, Spacer, Tag, Badge, ButtonGroup,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Input, InputGroup, InputLeftElement, useDisclosure,
  Table, Thead, Tbody, Tr, Th, Td
} from '@chakra-ui/react';
import { 
  CheckIcon, EditIcon, RepeatIcon, SearchIcon 
} from '@chakra-ui/icons'; 
import AddTaskForm from '../components/AddTaskForm';
import ReviewTaskForm from '../components/ReviewTaskForm';
import CompleteTaskModal from '../components/CompleteTaskModal';
import ReportGenerator from '../components/ReportGenerator';
import UserManagement from '../components/UserManagement';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// --- KONFIGURASI BOBOT SORTING ---
const PRIORITY_ORDER = { 'Urgent': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
const STATUS_ORDER_WEIGHT = { 
    'Done': 1,            
    'To Do': 2,           
    'Need Revision': 2,   
    'Reviewed': 3         
};

function DashboardPage({ user, usersList, onLogout }) { 
  // --- STATE ---
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter & Search
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // State untuk Modal
  const [currentTask, setCurrentTask] = useState(null); 
  
  // --- HOOKS DISCLOSURE ---
  const addTaskDisclosure = useDisclosure();
  const reviewDisclosure = useDisclosure();
  const completeDisclosure = useDisclosure();
  
  // --- FETCH DATA ---
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/tasks`);
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

  // --- UPDATE LOKAL ---
  const updateLocalTask = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  const addTaskLocally = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  // --- HANDLER MODAL ---
  const openReviewModal = (task) => { setCurrentTask(task); reviewDisclosure.onOpen(); };
  const openCompleteModal = (task) => { setCurrentTask(task); completeDisclosure.onOpen(); };
  
  // --- LOGIKA FILTERING ---
  let filteredTasks = tasks.filter(task => {
    const status = task.status ? task.status.trim() : "";
    
    if (filterStatus === 'my_tasks') return task.assignee_id === user?.id;
    if (filterStatus === 'to_do') return status === 'To Do' || status === 'Need Revision';
    if (filterStatus === 'finished') return status === 'Done' || status === 'Reviewed';
    
    return true; 
  });

  // Filter Search
  if (searchKeyword) {
    const lowerKeyword = searchKeyword.toLowerCase();
    filteredTasks = filteredTasks.filter(task => {
      const assigneeName = task.assignee ? task.assignee.nama.toLowerCase() : '';
      return task.title.toLowerCase().includes(lowerKeyword) || assigneeName.includes(lowerKeyword);
    });
  }

  // Sorting
  filteredTasks.sort((a, b) => {
    const statusWeightA = STATUS_ORDER_WEIGHT[a.status] || 99;
    const statusWeightB = STATUS_ORDER_WEIGHT[b.status] || 99;
    if (statusWeightA !== statusWeightB) return statusWeightA - statusWeightB;
    
    const priorityA = PRIORITY_ORDER[a.priority] || 99;
    const priorityB = PRIORITY_ORDER[b.priority] || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    return b.id - a.id; 
  });

  return (
    <Box p={5} maxWidth="1200px" margin="auto">
      
      {/* HEADER UTAMA */}
      <Flex mb={6} alignItems="center" flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Dashboard Kinerja PIH</Heading>
          <Text fontSize="md" color="gray.600">
            Halo, <b>{user?.nama}</b> <Badge colorScheme="purple" ml={2}>{user?.role?.toUpperCase()}</Badge>
          </Text>
        </Box>
        <Spacer />
        
        {/* Tombol Logout */}
        <Button colorScheme='red' variant='outline' size="sm" onClick={onLogout} ml={2}>
          Logout
        </Button>
      </Flex>

      {/* TABS NAVIGASI UTAMA */}
      <Tabs isFitted variant='enclosed' colorScheme='teal' isLazy>
        <TabList mb='1em'>
          <Tab _selected={{ color: 'white', bg: 'teal.500', fontWeight: 'bold' }}>
            Daftar Tugas
          </Tab>
          
          {user?.role === 'kepala pih & koordinator' && (
              <Tab _selected={{ color: 'white', bg: 'purple.500', fontWeight: 'bold' }}>Laporan Kinerja AI</Tab>
          )}

          {user?.role === 'admin' && (
              <Tab _selected={{ color: 'white', bg: 'blue.500', fontWeight: 'bold' }}>Kelola Data Tim</Tab>
          )}
        </TabList>

        <TabPanels>
          
          {/* PANEL 1: DAFTAR TUGAS */}
          <TabPanel p={0}>
            
            {/* TOOLBAR */}
            <Flex mb={4} gap={4} flexWrap="wrap" alignItems="center">
                <ButtonGroup size="sm" isAttached variant="outline">
                    <Button onClick={() => setFilterStatus('all')} isActive={filterStatus === 'all'} _active={{ bg: 'teal.600', color: 'white' }}>Semua</Button>
                    <Button onClick={() => setFilterStatus('my_tasks')} isActive={filterStatus === 'my_tasks'} _active={{ bg: 'teal.600', color: 'white' }}>Tugas Saya</Button>
                    <Button onClick={() => setFilterStatus('to_do')} isActive={filterStatus === 'to_do'} colorScheme="blue" _active={{ bg: 'blue.500', color: 'white' }}>To Do</Button>
                    <Button onClick={() => setFilterStatus('finished')} isActive={filterStatus === 'finished'} colorScheme="green" _active={{ bg: 'green.500', color: 'white' }}>Done / Reviewed</Button>
                </ButtonGroup>

                {/* TOMBOL TAMBAH TUGAS (Eksklusif: Team Lead) */}
                {user?.role === 'team lead' && (
                  <Button colorScheme='teal' size="sm" onClick={addTaskDisclosure.onOpen}>
                    + Buat Tugas
                  </Button>
                )}

                <Spacer />
                
                <InputGroup size="sm" maxWidth="300px">
                    <InputLeftElement pointerEvents='none'><SearchIcon color='gray.300' /></InputLeftElement>
                    <Input placeholder='Cari judul / nama...' value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} bg="white"/>
                </InputGroup>
            </Flex>
            
            {/* TABEL DATA TUGAS */}
            {isLoading ? (
                <Box textAlign="center" p={10}><Spinner color='teal.500' size='xl' /><Text mt={4}>Memuat data...</Text></Box>
            ) : error ? (
                <Alert status='error'><AlertIcon />{error}</Alert>
            ) : (
              <Box overflowX="auto" borderWidth="1px" borderRadius="lg" bg="white" shadow="sm">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Judul Tugas</Th>
                      <Th>PIC (Intern)</Th>
                      <Th>Prioritas</Th>
                      <Th>Status</Th>
                      <Th>Deadline</Th>
                      <Th textAlign="center">Aksi</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTasks.length === 0 ? (
                        <Tr><Td colSpan={6} textAlign="center" py={5} color="gray.500">Tidak ada tugas yang sesuai filter.</Td></Tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <Tr key={task.id} _hover={{ bg: "gray.50" }}>
                          <Td>
                              {/* Ikon Detail dihapus, sisa Judul dan Rating */}
                              <Text fontWeight="medium" mb={task.status === 'Reviewed' ? 1 : 0}>{task.title}</Text>
                              {task.status === 'Reviewed' && task.rating && <Badge colorScheme="yellow" variant="subtle" size="sm">⭐ {task.rating}/5</Badge>}
                          </Td>
                          <Td>
                             {task.assignee ? <Badge colorScheme="purple" variant="subtle" px={2} borderRadius="full">{task.assignee.nama}</Badge> : <Text fontSize="sm" color="gray.400">Unassigned</Text>}
                          </Td>
                          <Td>
                            <Badge colorScheme={task.priority === 'Urgent' ? 'purple' : (task.priority === 'High' ? 'red' : (task.priority === 'Medium' ? 'orange' : 'green'))}>{task.priority}</Badge>
                          </Td>
                          
                          <Td>
                            <Tag size="sm" variant="subtle" colorScheme={task.status === 'Reviewed' ? 'green' : (task.status === 'Done' ? 'blue' : (task.status === 'Need Revision' ? 'red' : 'gray'))}>{task.status}</Tag>
                          </Td>
                          
                          <Td fontSize="xs">{task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}</Td>
                          
                          {/* KOLOM AKSI */}
                          <Td textAlign="center">
                            {user?.role === 'intern' && task.assignee_id === user?.id && (task.status === 'To Do' || task.status === 'Need Revision') && (
                                <Button size="xs" colorScheme={task.status === 'Need Revision' ? 'red' : 'teal'} leftIcon={task.status === 'Need Revision' ? <RepeatIcon /> : <CheckIcon />} onClick={() => openCompleteModal(task)}>
                                    Submit Tugas
                                </Button>
                            )}
                            {user?.role === 'staf media' && task.status === 'Done' && (
                                <Button size="xs" colorScheme="purple" leftIcon={<EditIcon />} onClick={() => openReviewModal(task)}>
                                    Review
                                </Button>
                            )}
                          </Td>

                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>
          
          {user?.role === 'kepala pih & koordinator' && (
            <TabPanel p={0}><ReportGenerator users={usersList} /></TabPanel>
          )}

          {user?.role === 'admin' && (
            <TabPanel p={0}><UserManagement users={usersList} onRefresh={() => window.location.reload()} /></TabPanel>
          )}

        </TabPanels>
      </Tabs>

      {/* MODAL KOMPONEN */}
      <AddTaskForm isOpen={addTaskDisclosure.isOpen} onClose={addTaskDisclosure.onClose} projectId={1} users={usersList ? usersList.filter(u => u.role === 'intern') : []} onTaskAdded={addTaskLocally} />
      <ReviewTaskForm isOpen={reviewDisclosure.isOpen} onClose={reviewDisclosure.onClose} task={currentTask} onTaskReviewed={updateLocalTask} />
      <CompleteTaskModal isOpen={completeDisclosure.isOpen} onClose={completeDisclosure.onClose} task={currentTask} onTaskCompleted={updateLocalTask} />
      
    </Box>
  );
}

export default DashboardPage;