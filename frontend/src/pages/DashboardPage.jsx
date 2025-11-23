// src/pages/DashboardPage.jsx
// Versi FINAL FIX TABS - Urutan Tab Laporan & Kelola Tim Sudah Benar

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Heading, Text, Button, Spinner, Alert, AlertIcon,
  List, ListItem, ListIcon, IconButton, useToast, useDisclosure,
  Flex, Spacer, Tag, Badge, ButtonGroup,
  Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, CheckIcon, AddIcon, StarIcon, EditIcon } from '@chakra-ui/icons'; 

import AddTaskForm from '../components/AddTaskForm';
import ReviewTaskForm from '../components/ReviewTaskForm';
import CompleteTaskModal from '../components/CompleteTaskModal';
import ReportGenerator from '../components/ReportGenerator';
import UserManagement from '../components/UserManagement'; // Impor UserManagement

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function DashboardPage({ user, usersList, onLogout }) { 
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentTask, setCurrentTask] = useState(null); 
  const toast = useToast();
  
  const { isOpen: isAddTaskModalOpen, onOpen: onOpenAddTaskModal, onClose: onCloseAddTaskModal } = useDisclosure();
  const { isOpen: isReviewModalOpen, onOpen: onOpenReviewModal, onClose: onCloseReviewModal } = useDisclosure();
  const { isOpen: isCompleteModalOpen, onOpen: onOpenCompleteModal, onClose: onCloseCompleteModal } = useDisclosure();
  
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let endpointPath = '/tasks'; 
      if (user.role === 'intern') {
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

  const handleTaskCompleted = (completedTask) => {
    setTasks(prev => prev.map(t => t.id === completedTask.id ? completedTask : t));
  };
  const handleTaskAdded = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
  };
  const handleTaskReviewed = (reviewedTask) => {
    setTasks(prev => prev.map(t => t.id === reviewedTask.id ? reviewedTask : t));
  };
  const openReviewModal = (task) => { setCurrentTask(task); onOpenReviewModal(); };
  const openCompleteModal = (task) => { setCurrentTask(task); onOpenCompleteModal(); };
  
  const getAssigneeName = (assigneeId) => {
      if (!usersList) return 'Loading...'; 
      const assignee = usersList.find(u => u.id === assigneeId);
      return assignee ? assignee.nama : 'Tidak Ditugaskan';
  };

  const filteredTasks = tasks.filter(task => {
    const status = task.status ? task.status.trim() : "";
    if (filterStatus === 'all') return true;
    if (filterStatus === 'to_do') return status === 'To Do';
    if (filterStatus === 'done') return status === 'Done';
    if (filterStatus === 'reviewed') return status === 'Reviewed';
    return true;
  });

  return (
    <Box p={5} maxWidth="900px" margin="auto">
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

      <Tabs isFitted variant='enclosed' colorScheme='teal' isLazy>
        <TabList mb='1em'>
          {/* TAB 1 */}
          <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Daftar Tugas</Tab>
          
          {/* TAB 2 (Hanya Manajer) */}
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Laporan Kinerja</Tab>}
          
          {/* TAB 3 (Hanya Manajer) */}
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Kelola Tim</Tab>}
        </TabList>

        <TabPanels>
          
          {/* --- PANEL 1: Daftar Tugas --- */}
          <TabPanel p={0}>
            <ButtonGroup size="sm" isAttached variant="outline" mb={4} flexWrap="wrap">
              <Button onClick={() => setFilterStatus('all')} isActive={filterStatus === 'all'} _active={{ bg: 'teal.600', color: 'white' }}>Semua ({tasks.length})</Button>
              <Button onClick={() => setFilterStatus('to_do')} isActive={filterStatus === 'to_do'} _active={{ bg: 'teal.600', color: 'white' }}>To Do</Button>
              {user.role !== 'intern' && <Button onClick={() => setFilterStatus('done')} isActive={filterStatus === 'done'} _active={{ bg: 'teal.600', color: 'white' }}>Perlu Review</Button>}
              <Button onClick={() => setFilterStatus('reviewed')} isActive={filterStatus === 'reviewed'} _active={{ bg: 'teal.600', color: 'white' }}>Selesai</Button>
            </ButtonGroup>
            
            {isLoading && <Box textAlign="center" p={10}><Spinner /><Text mt={4}>Memuat...</Text></Box>}
            {error && <Alert status='error'><AlertIcon />{error}</Alert>}
            
            {!isLoading && !error && (
              <List spacing={4}>
                {filteredTasks.length === 0 ? (
                  <Box p={5} borderWidth={1} borderRadius="md" bg="gray.50" textAlign="center"><Text color="gray.500">Tidak ada tugas.</Text></Box>
                ) : (
                  filteredTasks.map((task) => (
                    <ListItem key={task.id} p={4} borderWidth={1} borderRadius="md" _hover={{ shadow: 'md' }} bg="white" display="flex" alignItems="center">
                      <ListIcon as={task.status === 'Reviewed' ? CheckCircleIcon : (task.status === 'Done' ? EditIcon : TimeIcon)} color={task.status === 'Reviewed' ? 'green.500' : (task.status === 'Done' ? 'orange.500' : 'gray.400')} fontSize="2xl" mr={4} />
                      <Box flexGrow={1}>
                        <Heading size="sm" mb={1}>{task.title}</Heading>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          {user.role !== 'intern' && <span>Assigned to: <b>{getAssigneeName(task.assignee_id)}</b> • </span>}
                          Priority: <Badge>{task.priority}</Badge> | Status: <Tag size="sm">{task.status}</Tag>
                        </Text>
                        {task.rating && <Tag size="sm" colorScheme="yellow" mt={2}><StarIcon mr={2} /> {task.rating}/5</Tag>}
                      </Box>
                      {user.role === 'intern' && task.status === 'To Do' && <IconButton icon={<CheckIcon />} size='sm' colorScheme='green' onClick={() => openCompleteModal(task)} ml={2} />}
                      {user.role !== 'intern' && task.status === 'Done' && <IconButton icon={<EditIcon />} size='sm' colorScheme='yellow' onClick={() => openReviewModal(task)} ml={2} />}
                    </ListItem>
                  ))
                )}
              </List>
            )}
          </TabPanel>
          
          {/* --- PANEL 2: Laporan Kinerja --- */}
          {user?.role !== 'intern' && (
            <TabPanel p={0}>
              <ReportGenerator users={usersList} /> 
            </TabPanel>
          )}

          {/* --- PANEL 3: Kelola Tim (User Management) --- */}
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

      {/* Modals */}
      {user?.role !== 'intern' && (
        <>
            <AddTaskForm isOpen={isAddTaskModalOpen} onClose={onCloseAddTaskModal} projectId={1} users={usersList ? usersList.filter(u => u.role === 'intern') : []} onTaskAdded={handleTaskAdded} />
            <ReviewTaskForm isOpen={isReviewModalOpen} onClose={onCloseReviewModal} task={currentTask} onTaskReviewed={handleTaskReviewed} />
        </>
      )}
      <CompleteTaskModal isOpen={isCompleteModalOpen} onClose={onCloseCompleteModal} task={currentTask} onTaskCompleted={handleTaskCompleted} />
    </Box>
  );
}

export default DashboardPage;