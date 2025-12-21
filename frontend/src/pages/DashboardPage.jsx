import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Heading, Text, Button, Spinner, Alert, AlertIcon,
  Flex, Spacer, Tag, Badge, ButtonGroup,
  Tabs, TabList, TabPanels, Tab, TabPanel, Tooltip,
  Input, InputGroup, InputLeftElement, IconButton, useDisclosure,
  Table, Thead, Tbody, Tr, Th, Td
} from '@chakra-ui/react';
import { 
  CheckIcon, AddIcon, EditIcon, InfoIcon, RepeatIcon, SearchIcon 
} from '@chakra-ui/icons'; 
import AddTaskForm from '../components/AddTaskForm';
import ReviewTaskForm from '../components/ReviewTaskForm';
import CompleteTaskModal from '../components/CompleteTaskModal';
import ReportGenerator from '../components/ReportGenerator';
import UserManagement from '../components/UserManagement';
import TaskDetailModal from '../components/TaskDetailModal';

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
  const detailDisclosure = useDisclosure();
  
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

  // --- UPDATE LOKAL (Optimistic UI) ---
  const updateLocalTask = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  const addTaskLocally = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  // --- HANDLER MODAL ---
  const openReviewModal = (task) => { setCurrentTask(task); reviewDisclosure.onOpen(); };
  const openCompleteModal = (task) => { setCurrentTask(task); completeDisclosure.onOpen(); };
  const openDetailModal = (task) => { setCurrentTask(task); detailDisclosure.onOpen(); };
  
  // --- LOGIKA FILTERING ---
  let filteredTasks = tasks.filter(task => {
    const status = task.status ? task.status.trim() : "";
    
    // Filter Tab
    if (filterStatus === 'my_tasks') {
      return task.assignee_id === user.id; // Hanya tugas saya
    }
    if (filterStatus === 'to_do') return status === 'To Do';
    if (filterStatus === 'revision') return status === 'Need Revision';
    
    // Tab "Perlu Review / Selesai" digabung agar rapi
    if (filterStatus === 'finished') return status === 'Done' || status === 'Reviewed';
    
    return true; // 'all'
  });

  // Filter Search (UPDATED LOGIC)
  if (searchKeyword) {
    const lowerKeyword = searchKeyword.toLowerCase();
    
    filteredTasks = filteredTasks.filter(task => {
      // Ambil nama dari data baru (backend sudah kirim task.assignee)
      const assigneeName = task.assignee ? task.assignee.nama.toLowerCase() : '';
      
      return (
        task.title.toLowerCase().includes(lowerKeyword) ||
        assigneeName.includes(lowerKeyword)
      );
    });
  }

  // --- LOGIKA SORTING CANGGIH (UPDATED) ---
  filteredTasks.sort((a, b) => {
    // 1. Sort berdasarkan Status (Done > To Do > Reviewed)
    const statusWeightA = STATUS_ORDER_WEIGHT[a.status] || 99;
    const statusWeightB = STATUS_ORDER_WEIGHT[b.status] || 99;
    if (statusWeightA !== statusWeightB) return statusWeightA - statusWeightB;
    
    // 2. Jika status sama, sort berdasarkan Prioritas (Urgent > High > Medium)
    const priorityA = PRIORITY_ORDER[a.priority] || 99;
    const priorityB = PRIORITY_ORDER[b.priority] || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // 3. Jika prioritas sama, sort berdasarkan ID Descending (Tugas Baru di Atas)
    return b.id - a.id; 
  });

  return (
    <Box p={5} maxWidth="1200px" margin="auto">
      
      {/* HEADER */}
      <Flex mb={6} alignItems="center" flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Dashboard Kinerja</Heading>
          <Text fontSize="md" color="gray.600">
            Halo, <b>{user?.nama}</b> <Badge colorScheme="purple">{user?.role}</Badge>
          </Text>
        </Box>
        <Spacer />
        
        {user?.role !== 'intern' && (
          <Button leftIcon={<AddIcon />} colorScheme='teal' size="sm" onClick={addTaskDisclosure.onOpen}>
            Buat Tugas
          </Button>
        )}
        
        <Button colorScheme='red' variant='outline' size="sm" onClick={onLogout} ml={2}>
          Logout
        </Button>
      </Flex>

      {/* TABS UTAMA */}
      <Tabs isFitted variant='enclosed' colorScheme='teal' isLazy>
        <TabList mb='1em'>
          <Tab _selected={{ color: 'white', bg: 'teal.500', fontWeight: 'bold' }}>Daftar Tugas</Tab>
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500', fontWeight: 'bold' }}>Laporan Kinerja AI</Tab>}
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500', fontWeight: 'bold' }}>Kelola Tim</Tab>}
        </TabList>

        <TabPanels>
          
          {/* PANEL 1: DAFTAR TUGAS */}
          <TabPanel p={0}>
            
            {/* TOOLBAR */}
            <Flex mb={4} gap={4} flexWrap="wrap" alignItems="center">
                <ButtonGroup size="sm" isAttached variant="outline">
                    <Button onClick={() => setFilterStatus('all')} isActive={filterStatus === 'all'} _active={{ bg: 'teal.600', color: 'white' }}>
                        Semua
                    </Button>
                    <Button onClick={() => setFilterStatus('my_tasks')} isActive={filterStatus === 'my_tasks'} _active={{ bg: 'teal.600', color: 'white' }}>
                        Tugas Saya
                    </Button>
                    <Button onClick={() => setFilterStatus('to_do')} isActive={filterStatus === 'to_do'} colorScheme="blue" _active={{ bg: 'blue.500', color: 'white' }}>
                        Aktif (To Do)
                    </Button>
                    <Button onClick={() => setFilterStatus('finished')} isActive={filterStatus === 'finished'} colorScheme="green" _active={{ bg: 'green.500', color: 'white' }}>
                        Selesai / Review
                    </Button>
                </ButtonGroup>

                <Spacer />

                <InputGroup size="sm" maxWidth="300px">
                    <InputLeftElement pointerEvents='none'><SearchIcon color='gray.300' /></InputLeftElement>
                    <Input 
                        placeholder='Cari judul / nama...' 
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        bg="white"
                    />
                </InputGroup>
            </Flex>
            
            {/* TABLE CONTENT */}
            {isLoading && <Box textAlign="center" p={10}><Spinner thickness='4px' speed='0.65s' emptyColor='gray.200' color='teal.500' size='xl' /><Text mt={4}>Memuat data...</Text></Box>}
            {error && <Alert status='error'><AlertIcon />{error}</Alert>}
            
            {!isLoading && !error && (
              <Box overflowX="auto" borderWidth="1px" borderRadius="lg" bg="white" shadow="sm">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Judul Tugas</Th>
                      <Th>PIC (Intern)</Th>
                      <Th>Prioritas</Th>
                      <Th>Status</Th>
                      <Th>Deadline</Th>
                      <Th>Aksi</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTasks.length === 0 ? (
                        <Tr>
                            <Td colSpan={6} textAlign="center" py={5} color="gray.500">
                                Tidak ada tugas yang sesuai filter.
                            </Td>
                        </Tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <Tr key={task.id} _hover={{ bg: "gray.50" }}>
                          
                          {/* Judul */}
                          <Td>
                              <Flex alignItems="center">
                                  <Text fontWeight="medium" mr={2}>{task.title}</Text>
                                  <Tooltip label="Lihat Detail">
                                      <IconButton icon={<InfoIcon />} size="xs" variant="ghost" colorScheme="blue" onClick={() => openDetailModal(task)} />
                                  </Tooltip>
                              </Flex>
                              {task.status === 'Reviewed' && task.rating && (
                                  <Badge colorScheme="yellow" variant="subtle" size="sm">⭐ {task.rating}/5</Badge>
                              )}
                          </Td>

                          {/* PIC (UPDATED) */}
                          <Td>
                             {task.assignee ? (
                                <Badge colorScheme="purple" variant="subtle" px={2} borderRadius="full">
                                    {task.assignee.nama}
                                </Badge>
                             ) : (
                                <Text fontSize="sm" color="gray.400">Unassigned</Text>
                             )}
                          </Td>

                          {/* Prioritas */}
                          <Td>
                            <Badge 
                                colorScheme={task.priority === 'Urgent' ? 'purple' : (task.priority === 'High' ? 'red' : (task.priority === 'Medium' ? 'orange' : 'green'))}
                            >
                                {task.priority}
                            </Badge>
                          </Td>

                          {/* Status */}
                          <Td>
                            <Tag 
                                size="sm" 
                                variant="subtle" 
                                colorScheme={
                                    task.status === 'Reviewed' ? 'green' : 
                                    (task.status === 'Done' ? 'blue' : 
                                    (task.status === 'Need Revision' ? 'red' : 'gray'))
                                }
                            >
                                {task.status}
                            </Tag>
                            {/* BADGE REVISI */}
                            {task.revision_count > 0 && task.status !== 'Reviewed' && task.status !== 'Done' && (
                                <Badge ml={1} colorScheme="orange" fontSize="0.6em" variant="solid" borderRadius="full">
                                    {task.revision_count}x
                                </Badge>
                            )}
                          </Td>

                          {/* Deadline */}
                          <Td fontSize="xs">
                              {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}
                          </Td>

                          {/* Aksi */}
                          <Td>
                            {/* Intern: Submit */}
                            {user.role === 'intern' && task.assignee_id === user.id && (task.status === 'To Do' || task.status === 'Need Revision') && (
                                <Tooltip label={task.status === 'Need Revision' ? "Submit Revisi" : "Selesaikan"}>
                                    <IconButton 
                                        icon={task.status === 'Need Revision' ? <RepeatIcon /> : <CheckIcon />} 
                                        size='sm' 
                                        colorScheme={task.status === 'Need Revision' ? 'red' : 'green'} 
                                        onClick={() => openCompleteModal(task)} 
                                    />
                                </Tooltip>
                            )}
                            
                            {/* Manajer: Review (Hanya jika Done) */}
                            {user.role !== 'intern' && (task.status === 'Done') && (
                                <Tooltip label="Review Tugas">
                                    <Button size="xs" colorScheme="purple" leftIcon={<EditIcon />} onClick={() => openReviewModal(task)}>
                                        Review
                                    </Button>
                                </Tooltip>
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

      {/* MODAL (Render Conditional) */}
      {user?.role !== 'intern' && (
        <>
            <AddTaskForm isOpen={addTaskDisclosure.isOpen} onClose={addTaskDisclosure.onClose} projectId={1} users={usersList ? usersList.filter(u => u.role === 'intern') : []} onTaskAdded={addTaskLocally} />
            <ReviewTaskForm isOpen={reviewDisclosure.isOpen} onClose={reviewDisclosure.onClose} task={currentTask} onTaskReviewed={updateLocalTask} />
        </>
      )}
      <CompleteTaskModal isOpen={completeDisclosure.isOpen} onClose={completeDisclosure.onClose} task={currentTask} onTaskCompleted={updateLocalTask} />
      <TaskDetailModal isOpen={detailDisclosure.isOpen} onClose={detailDisclosure.onClose} task={currentTask} />
      
    </Box>
  );
}

export default DashboardPage;