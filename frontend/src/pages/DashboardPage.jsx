// src/pages/DashboardPage.jsx
// VERSI FINAL: Memastikan ReportGenerator dan UserManagement dipanggil di Tab yang BENAR

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Heading, Text, Button, Spinner, Alert, AlertIcon,
  List, ListItem, ListIcon, IconButton, useToast, useDisclosure,
  Flex, Spacer, Tag, Badge, ButtonGroup,
  Tabs, TabList, TabPanels, Tab, TabPanel, Tooltip
} from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, CheckIcon, AddIcon, StarIcon, EditIcon, InfoIcon, WarningTwoIcon, RepeatIcon } from '@chakra-ui/icons'; 

import AddTaskForm from '../components/AddTaskForm';
import ReviewTaskForm from '../components/ReviewTaskForm';
import CompleteTaskModal from '../components/CompleteTaskModal';
import ReportGenerator from '../components/ReportGenerator';
import UserManagement from '../components/UserManagement';
import TaskDetailModal from '../components/TaskDetailModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function DashboardPage({ user, usersList, onLogout }) { 
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentTask, setCurrentTask] = useState(null); 
  const toast = useToast();
  
  const addTaskDisclosure = useDisclosure();
  const reviewDisclosure = useDisclosure();
  const completeDisclosure = useDisclosure();
  const detailDisclosure = useDisclosure();
  
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let endpointPath = '/tasks'; 
      if (user?.role === 'intern') {
        endpointPath = '/tasks/me'; 
      }
      const response = await axios.get(`${API_URL}${endpointPath}`);
      setTasks(response.data);
    } catch (err) {
      setError(`Gagal mengambil data. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTasks(); 
  }, [user]);

  const updateLocalTask = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  const addTaskLocally = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  const openReviewModal = (task) => { setCurrentTask(task); reviewDisclosure.onOpen(); };
  const openCompleteModal = (task) => { setCurrentTask(task); completeDisclosure.onOpen(); };
  const openDetailModal = (task) => { setCurrentTask(task); detailDisclosure.onOpen(); };
  
  const getAssigneeName = (assigneeId) => {
      if (!usersList) return '...'; 
      const assignee = usersList.find(u => u.id === assigneeId);
      return assignee ? assignee.nama : 'Tidak Ditugaskan';
  };

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
        <Button colorScheme='red' variant='outline' size="sm" onClick={onLogout} ml={2}>Logout</Button>
      </Flex>

      <Tabs isFitted variant='enclosed' colorScheme='teal' isLazy>
        <TabList mb='1em'>
          <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Daftar Tugas</Tab>
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Laporan Kinerja</Tab>}
          {user?.role !== 'intern' && <Tab _selected={{ color: 'white', bg: 'teal.500' }}>Kelola Tim</Tab>}
        </TabList>

        <TabPanels>
          
          {/* PANEL 1: DAFTAR TUGAS */}
          <TabPanel p={0}>
            <ButtonGroup size="sm" isAttached variant="outline" mb={4} flexWrap="wrap">
              <Button onClick={() => setFilterStatus('all')} isActive={filterStatus === 'all'}>Semua</Button>
              <Button onClick={() => setFilterStatus('my_tasks')} isActive={filterStatus === 'my_tasks'}>Tugas Saya</Button>
              <Button onClick={() => setFilterStatus('to_do')} isActive={filterStatus === 'to_do'}>To Do</Button>
              <Button onClick={() => setFilterStatus('revision')} isActive={filterStatus === 'revision'} colorScheme="red">Perlu Revisi</Button>
              {user?.role !== 'intern' && <Button onClick={() => setFilterStatus('done')} isActive={filterStatus === 'done'}>Perlu Review</Button>}
              <Button onClick={() => setFilterStatus('reviewed')} isActive={filterStatus === 'reviewed'}>Selesai</Button>
            </ButtonGroup>
            
            {isLoading && <Box textAlign="center" p={10}><Spinner /><Text>Memuat...</Text></Box>}
            {error && <Alert status='error'><AlertIcon />{error}</Alert>}
            
            {!isLoading && !error && (
              <List spacing={3}>
                {filteredTasks.map((task) => (
                    <ListItem key={task.id} p={3} borderWidth={1} borderRadius="md" _hover={{ shadow: 'md' }} bg="white" display="flex" alignItems="center">
                      <ListIcon as={CheckCircleIcon} fontSize="xl" mr={3} />
                      <Box flexGrow={1}>
                        <Flex alignItems="center">
                           <Heading size="xs" mr={2}>{task.title}</Heading>
                           <Tooltip label="Detail"><IconButton icon={<InfoIcon />} size="xs" variant="ghost" onClick={() => openDetailModal(task)} /></Tooltip>
                        </Flex>
                        <Text fontSize="xs" color="gray.500">Status: {task.status}</Text>
                        {task.rating && <Tag size="sm" colorScheme="yellow" mt={1}><StarIcon mr={1} /> {task.rating}/5</Tag>}
                      </Box>
                      
                      {user.role === 'intern' && (task.status === 'To Do' || task.status === 'Need Revision') && (
                        <IconButton icon={task.status === 'Need Revision' ? <RepeatIcon /> : <CheckIcon />} size='sm' colorScheme={task.status === 'Need Revision' ? 'red' : 'green'} onClick={() => openCompleteModal(task)} ml={2} />
                      )}
                      {user.role !== 'intern' && (task.status === 'Done' || task.status === 'Need Revision') && (
                        <IconButton icon={<EditIcon />} size='sm' colorScheme='yellow' onClick={() => openReviewModal(task)} ml={2} />
                      )}
                    </ListItem>
                  ))}
              </List>
            )}
          </TabPanel>
          
          {/* PANEL 2: LAPORAN (Memanggil ReportGenerator) */}
          {user?.role !== 'intern' && (
            <TabPanel p={0}>
              <ReportGenerator users={usersList} /> 
            </TabPanel>
          )}

          {/* PANEL 3: KELOLA TIM (Memanggil UserManagement) */}
          {user?.role !== 'intern' && (
            <TabPanel p={0}>
              <UserManagement users={usersList} onRefresh={() => window.location.reload()} />
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

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