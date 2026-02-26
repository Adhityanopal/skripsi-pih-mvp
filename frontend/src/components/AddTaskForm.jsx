// src/components/AddTaskForm.jsx
import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Textarea, Select, useToast, Alert, AlertIcon, VStack
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function AddTaskForm({ isOpen, onClose, users, onTaskAdded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assigneeId, setAssigneeId] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // Tambah state error khusus modal
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError(null);

    // VALIDASI MANUAL: Gantikan "Please fill out this field"
    if (!title.trim() || !description.trim() || !dueDate || !assigneeId) {
      setError("parameter wajib diisi");
      return;
    }

    setIsLoading(true);

    const newTask = {
      title: title,
      description: description,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority: priority,
      user_id: assigneeId 
    };

    try {
      const token = localStorage.getItem('authToken'); // Pastikan token dikirim kalau backend butuh
      
      const response = await axios.post(`${API_URL}/tasks`, newTask, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onTaskAdded(response.data); 
      
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('Medium');
      setAssigneeId('');
      setError(null);
      onClose(); 
    } catch (err) {
      setError("parameter wajib diisi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg='blackAlpha.300' backdropFilter='blur(3px)' />
      {/* Hapus as="form" agar tidak pakai validasi bawaan HTML, kita validasi manual */}
      <ModalContent>
        <ModalHeader>Tambah Tugas Baru</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* KOTAK MERAH ERROR */}
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {/* isRequired DIHAPUS agar tidak muncul pesan popup browser */}
            <FormControl>
              <FormLabel>Judul Tugas</FormLabel>
              <Input 
                  placeholder="Masukkan judul tugas" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
              />
            </FormControl>

            <FormControl>
              <FormLabel>Deskripsi Tugas</FormLabel>
              <Textarea 
                  placeholder="Jelaskan kebutuhan tugas di sini (brief)..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={4}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Deadline</FormLabel>
              <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
              />
            </FormControl>

            <FormControl>
              <FormLabel>Prioritas</FormLabel>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Tugaskan Kepada</FormLabel>
              <Select 
                  placeholder="Pilih Anggota Tim" 
                  value={assigneeId} 
                  onChange={(e) => setAssigneeId(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.nama}</option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="teal" onClick={handleSubmit} isLoading={isLoading} width="full">
            Simpan Tugas
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default AddTaskForm;