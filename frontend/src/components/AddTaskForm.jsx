import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Textarea, Select, useToast
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function AddTaskForm({ isOpen, onClose, projectId, users, onTaskAdded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);

    const newTask = {
      title: title,
      description: description,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority: priority,
      project_id: projectId,
      assignee_id: assigneeId ? parseInt(assigneeId) : null
    };

    try {
      const response = await axios.post(`${API_URL}/tasks`, newTask);
      onTaskAdded(response.data); 
      
      toast({
        title: 'Tugas berhasil dibuat.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
      
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('Medium');
      setAssigneeId('');
      onClose(); 
    } catch (error) {
      toast({
        title: 'Gagal membuat tugas.',
        description: error.response?.data?.detail || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg='blackAlpha.300' backdropFilter='blur(3px)' />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Tambah Tugas Baru</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <FormControl isRequired>
            <FormLabel>Judul Tugas</FormLabel>
            <Input 
                placeholder="Masukkan judul tugas" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
            />
          </FormControl>

          <FormControl mt={4} isRequired>
            <FormLabel>Deskripsi Tugas</FormLabel>
            <Textarea 
                placeholder="Jelaskan kebutuhan tugas di sini (brief)..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={4}
            />
          </FormControl>

          <FormControl mt={4} isRequired>
            <FormLabel>Tanggal Selesai (Deadline)</FormLabel>
            <Input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
            />
          </FormControl>

          <FormControl mt={4} isRequired>
            <FormLabel>Prioritas</FormLabel>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </Select>
          </FormControl>

          <FormControl mt={4} isRequired>
            <FormLabel>Tugaskan Kepada</FormLabel>
            <Select 
                placeholder="Pilih Anggota Tim" 
                value={assigneeId} 
                onChange={(e) => setAssigneeId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </Select>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="teal" type="submit" isLoading={isLoading}>
            Simpan Tugas
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default AddTaskForm;