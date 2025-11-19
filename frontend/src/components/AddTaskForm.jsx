// src/components/AddTaskForm.jsx
// Versi ini sudah DITAMBAHKAN input 'due_date' (Deadline)

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  VStack,
  Textarea, // Kita juga perlu Textarea untuk Deskripsi
  useToast
} from '@chakra-ui/react';
import axios from 'axios';

function AddTaskForm({ isOpen, onClose, projectId, users = [], onTaskAdded }) {
  // State untuk form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); // <-- TAMBAHAN (Sesuai Opsi C)
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState(''); // <-- TAMBAHAN (Sesuai Opsi C)
  const [assigneeId, setAssigneeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    // Siapkan data untuk dikirim ke API (sesuai skema TaskCreate)
    const taskData = {
      title: title,
      description: description,
      priority: priority,
      due_date: dueDate || null, // Kirim null jika string-nya kosong
      assignee_id: parseInt(assigneeId),
      project_id: projectId
    };

    try {
      // Panggil endpoint backend POST /tasks
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/tasks`, taskData);
      
      toast({
        title: "Tugas Ditambahkan.",
        description: `Tugas "${response.data.title}" berhasil dibuat.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });

      onTaskAdded(response.data); // Panggil callback
      handleClose(); // Tutup modal

    } catch (err) {
      console.error("Error adding task:", err);
      let errorDesc = "Terjadi kesalahan pada server.";
      if (err.response?.status === 422) {
          errorDesc = "Data tidak lengkap. Pastikan Judul, Assignee, dan Project ID terisi.";
      } else if (err.response?.data?.detail) {
          errorDesc = err.response.data.detail;
      }
      
      toast({
        title: "Gagal Menambahkan Tugas.",
        description: errorDesc,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk mereset form saat modal ditutup
  const handleClose = () => {
      setTitle('');
      setDescription(''); // <-- Reset
      setPriority('Medium');
      setDueDate(''); // <-- Reset
      setAssigneeId('');
      setIsLoading(false);
      onClose(); 
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Tambah Tugas Baru</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}> 
            <FormControl isRequired>
              <FormLabel>Judul Tugas</FormLabel>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Masukkan judul tugas" 
              />
            </FormControl>

            {/* --- FIELD BARU: DESKRIPSI TUGAS --- */}
            <FormControl>
              <FormLabel>Deskripsi Tugas</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kebutuhan tugas di sini (brief)..."
              />
            </FormControl>
            
            {/* --- FIELD BARU: DEADLINE --- */}
            <FormControl>
              <FormLabel>Tanggal Selesai (Deadline)</FormLabel>
              <Input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)} 
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Prioritas</FormLabel>
              <Select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value='Low'>Rendah</option>
                <option value='Medium'>Sedang</option>
                <option value='High'>Tinggi</option>
                <option value='Urgent'>Mendesak</option> 
              </Select>
            </FormControl>

            <FormControl isRequired> 
              <FormLabel>Tugaskan Kepada</FormLabel>
              <Select 
                placeholder='Pilih Anggota Tim' 
                value={assigneeId} 
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.nama}</option>
                ))}
              </Select>
            </FormControl>
            
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant='ghost' mr={3} onClick={handleClose} type="button">
            Batal
          </Button>
          <Button 
            colorScheme='teal' 
            type="submit"
            isLoading={isLoading}
          >
            Simpan Tugas
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default AddTaskForm;